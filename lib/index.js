/**
 * dsh-cost-meter — host half.
 *
 * Registers a `sessionCost` projection unit on the session-projection seam.
 * The fold tracks the current provider/model from `request/header` events and
 * accumulates USD cost from the same disjoint usage buckets token-meter uses
 * (`assistant/chunk` usage + `assistant/message` usage), reusing its
 * "replace the same (turn, step) sample instead of double-counting" rule.
 *
 * Pricing (USD per million tokens, `{ input, output, cacheRead, cacheWrite }`)
 * is read once at boot from a JSON file. Defaults ship for the DeepSeek
 * official models; edit the file and restart `dsh web` to apply changes.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { z } from "zod";

const name = "dsh-cost-meter";
const inject = ["sessionProjections"];

const PER = 1_000_000;

const DEFAULT_PRICING = {
  version: 1,
  currency: "USD",
  per: PER,
  default: { input: 0.435, output: 0.87, cacheRead: 0.003625, cacheWrite: 0 },
  models: {
    "deepseek-official/deepseek-v4-pro": { input: 0.435, output: 0.87, cacheRead: 0.003625, cacheWrite: 0 },
    "deepseek-official/deepseek-v4-flash": { input: 0.14, output: 0.28, cacheRead: 0.0028, cacheWrite: 0 },
  },
};

function defaultPricingPath() {
  return process.env.DSH_COST_PRICING || join(homedir(), ".dsh", "cost-pricing.json");
}

/** Coerce a parsed pricing document into the runtime shape with numeric per-key defaults. */
function normalizePricing(doc) {
  const fallback = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  const per = typeof doc?.per === "number" && doc.per > 0 ? doc.per : PER;
  const defaultPrice = { ...fallback, ...(doc?.default ?? DEFAULT_PRICING.default) };
  const models = {};
  const raw = doc?.models;
  if (raw && typeof raw === "object") {
    for (const [key, entry] of Object.entries(raw)) {
      models[key] = { ...fallback, ...(entry ?? {}) };
    }
  }
  return { per, default: defaultPrice, models, currency: doc?.currency ?? "USD" };
}

function loadPricing(path) {
  if (existsSync(path)) {
    try {
      return normalizePricing(JSON.parse(readFileSync(path, "utf8")));
    } catch (error) {
      console.error(`[dsh-cost-meter] failed to read ${path}: ${error?.message ?? error}`);
    }
  }
  // First run: write the editable defaults so the user can tune prices.
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(DEFAULT_PRICING, null, 2) + "\n", "utf8");
    console.error(`[dsh-cost-meter] wrote default pricing table to ${path}`);
  } catch {
    /* read-only home is non-fatal: fall back to built-in defaults */
  }
  return normalizePricing(DEFAULT_PRICING);
}

const costBucketsSchema = z.object({
  totalUsd: z.number(),
  inputUsd: z.number(),
  outputUsd: z.number(),
  cacheReadUsd: z.number(),
  cacheWriteUsd: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadTokens: z.number(),
  cacheWriteTokens: z.number(),
});

const turnCostSchema = costBucketsSchema
  .extend({
    turn: z.number().int().nullable(),
  })
  .strict();

const sessionCostSchema = costBucketsSchema
  .extend({
    provider: z.string().nullable(),
    model: z.string().nullable(),
    priced: z.boolean(),
    turn: turnCostSchema,
  })
  .strict();

function makeProjection(pricing) {
  const { per, default: defaultPrice, models } = pricing;

  function priceOf(provider, model) {
    if (provider && model && Object.prototype.hasOwnProperty.call(models, `${provider}/${model}`)) {
      return models[`${provider}/${model}`];
    }
    return defaultPrice;
  }

  const zeroBuckets = () => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
  const zeroUsd = () => ({ inputUsd: 0, outputUsd: 0, cacheReadUsd: 0, cacheWriteUsd: 0 });

  const usdFor = (buckets, price) => ({
    inputUsd: (buckets.input * price.input) / per,
    outputUsd: (buckets.output * price.output) / per,
    cacheReadUsd: (buckets.cacheRead * price.cacheRead) / per,
    cacheWriteUsd: (buckets.cacheWrite * price.cacheWrite) / per,
  });

  const addReplacing = (totals, previous, next) => ({
    input: totals.input - (previous?.input ?? 0) + next.input,
    output: totals.output - (previous?.output ?? 0) + next.output,
    cacheRead: totals.cacheRead - (previous?.cacheRead ?? 0) + next.cacheRead,
    cacheWrite: totals.cacheWrite - (previous?.cacheWrite ?? 0) + next.cacheWrite,
  });
  const addUsdReplacing = (totals, previous, next) => ({
    inputUsd: totals.inputUsd - (previous?.inputUsd ?? 0) + next.inputUsd,
    outputUsd: totals.outputUsd - (previous?.outputUsd ?? 0) + next.outputUsd,
    cacheReadUsd: totals.cacheReadUsd - (previous?.cacheReadUsd ?? 0) + next.cacheReadUsd,
    cacheWriteUsd: totals.cacheWriteUsd - (previous?.cacheWriteUsd ?? 0) + next.cacheWriteUsd,
  });

  return {
    key: "sessionCost",
    schema: sessionCostSchema,
    init: () => ({
      totals: zeroBuckets(),
      usd: zeroUsd(),
      last: null,
      turn: null,
      turnTotals: zeroBuckets(),
      turnUsd: zeroUsd(),
      turnLast: null,
      provider: null,
      model: null,
      priced: false,
    }),
    apply: (state, event) => {
      if (event.type === "request/header") {
        const cfg = event.data?.header?.config ?? {};
        const provider = cfg.provider ?? state.provider;
        const model = cfg.model ?? state.model;
        if (provider === state.provider && model === state.model) return state;
        return { ...state, provider, model };
      }

      // A new top-level turn begins: the turn accumulator resets to zero.
      if (event.type === "turn/start") {
        return {
          ...state,
          turn: event.data?.turn ?? null,
          turnTotals: zeroBuckets(),
          turnUsd: zeroUsd(),
          turnLast: null,
        };
      }

      let turn;
      let step;
      let usage;
      if (event.type === "assistant/chunk" && event.data?.chunk?.type === "usage") {
        ({ turn, step } = event.data);
        usage = event.data.chunk.usage;
      } else if (event.type === "assistant/message" && event.data?.usage !== void 0) {
        ({ turn, step, usage } = event.data);
      } else {
        return state;
      }

      const buckets = {
        input: usage.inputTokens ?? 0,
        output: usage.outputTokens ?? 0,
        cacheRead: usage.cacheReadTokens ?? 0,
        cacheWrite: usage.cacheWriteTokens ?? 0,
      };
      const contribution = usdFor(buckets, priceOf(state.provider, state.model));

      // Whole-session fold: replace the same (turn, step) sample.
      const previous =
        state.last !== null && state.last.turn === turn && state.last.step === step ? state.last : void 0;
      const totals = addReplacing(state.totals, previous?.buckets, buckets);
      const usd = addUsdReplacing(state.usd, previous?.usd, contribution);

      // Current-turn fold: reset when the usage belongs to a different turn.
      const sameTurn = state.turn === turn;
      const turnPrevious =
        sameTurn && state.turnLast !== null && state.turnLast.step === step ? state.turnLast : void 0;
      const turnTotals = sameTurn
        ? addReplacing(state.turnTotals, turnPrevious?.buckets, buckets)
        : buckets;
      const turnUsd = sameTurn
        ? addUsdReplacing(state.turnUsd, turnPrevious?.usd, contribution)
        : contribution;

      const anyUsage = buckets.input + buckets.output + buckets.cacheRead + buckets.cacheWrite > 0;

      return {
        ...state,
        totals,
        usd,
        last: { turn, step, buckets, usd: contribution },
        turn,
        turnTotals,
        turnUsd,
        turnLast: { turn, step, buckets, usd: contribution },
        priced: state.priced || anyUsage,
      };
    },
    view: (state) => ({
      totalUsd: state.usd.inputUsd + state.usd.outputUsd + state.usd.cacheReadUsd + state.usd.cacheWriteUsd,
      inputUsd: state.usd.inputUsd,
      outputUsd: state.usd.outputUsd,
      cacheReadUsd: state.usd.cacheReadUsd,
      cacheWriteUsd: state.usd.cacheWriteUsd,
      inputTokens: state.totals.input,
      outputTokens: state.totals.output,
      cacheReadTokens: state.totals.cacheRead,
      cacheWriteTokens: state.totals.cacheWrite,
      provider: state.provider,
      model: state.model,
      priced: state.priced,
      turn: {
        turn: state.turn,
        totalUsd: state.turnUsd.inputUsd + state.turnUsd.outputUsd + state.turnUsd.cacheReadUsd + state.turnUsd.cacheWriteUsd,
        inputUsd: state.turnUsd.inputUsd,
        outputUsd: state.turnUsd.outputUsd,
        cacheReadUsd: state.turnUsd.cacheReadUsd,
        cacheWriteUsd: state.turnUsd.cacheWriteUsd,
        inputTokens: state.turnTotals.input,
        outputTokens: state.turnTotals.output,
        cacheReadTokens: state.turnTotals.cacheRead,
        cacheWriteTokens: state.turnTotals.cacheWrite,
      },
    }),
    stateVersion: 2,
  };
}

/**
 * Register the `sessionCost` unit. The registration is an effect on this
 * plugin's fiber, so unloading the plugin removes the key.
 * @param ctx - registrant context carrying the projection registry.
 * @param config - optional row config; `pricingPath` overrides the pricing file.
 */
function apply(ctx, config) {
  const pricingPath = config?.pricingPath ?? defaultPricingPath();
  const pricing = loadPricing(pricingPath);
  ctx.sessionProjections.register(makeProjection(pricing));
}

export { apply, inject, name };
