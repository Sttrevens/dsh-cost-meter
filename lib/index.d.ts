/**
 * dsh-cost-meter — host half type surface.
 *
 * Augments the session-projection key table with the `sessionCost` unit the
 * plugin registers, and types the cordis plugin body exported by
 * `lib/index.js`.
 */

declare module "@deepseek-ai/dsh-session-projection/types" {
  interface CostBucketView {
    totalUsd: number;
    inputUsd: number;
    outputUsd: number;
    cacheReadUsd: number;
    cacheWriteUsd: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
  }

  interface SessionProjectionMap {
    /** Whole-session USD cost plus the current turn's incremental cost. */
    sessionCost: CostBucketView & {
      provider: string | null;
      model: string | null;
      /** True once any priced usage has been folded. */
      priced: boolean;
      turn: CostBucketView & {
        /** Top-level turn number the incremental figure belongs to. */
        turn: number | null;
      };
    };
  }
}

/** Cordis plugin display name. */
export const name: string;
/** Cordis service-injection list the plugin requires. */
export const inject: string[];
/** Plugin body: reads the pricing table and registers the `sessionCost` unit. */
export function apply(ctx: unknown, config?: { pricingPath?: string }): void;
