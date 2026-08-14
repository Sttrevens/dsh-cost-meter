# @4dgames/dsh-cost-meter

Out-of-tree [dsh](https://github.com/deepseek-ai/deepseek-harness) plugin that
shows a live **USD cost badge** for the open conversation in the Web UI.

It is a dual-face `dsh.client` package:

- **Host half** (`lib/index.js`) registers a `sessionCost` projection on the
  session-projection seam. The fold tracks the current provider/model from
  `request/header` events and accumulates cost from the provider-reported usage
  buckets (uncached input / output / cache-read / cache-write), reusing
  token-meter's "replace the same `(turn, step)` sample instead of
  double-counting" rule.
- **Client half** (`lib/client.js`) registers a badge into the
  `conversation.session.header.utilities` slot: `$total · +$this-turn` — the
  first figure is the whole-session cost, the `+` figure is the current
  top-level turn's incremental cost. Hover for the full per-bucket breakdown of
  both. The turn figure resets on each new user turn via `turn/start`.

## Pricing table

Pricing is USD per **million** tokens, keyed by `provider/model`:

```jsonc
{
  "per": 1000000,
  "currency": "USD",
  "default": { "input": 0.435, "output": 0.87, "cacheRead": 0.003625, "cacheWrite": 0 },
  "models": {
    "deepseek-official/deepseek-v4-pro":   { "input": 0.435, "output": 0.87,   "cacheRead": 0.003625, "cacheWrite": 0 },
    "deepseek-official/deepseek-v4-flash": { "input": 0.14,  "output": 0.28,   "cacheRead": 0.0028,   "cacheWrite": 0 }
  }
}
```

The plugin reads `~/.dsh/cost-pricing.json` on boot (override the path with the
`DSH_COST_PRICING` env var or the row's `config.pricingPath`). On first run it
writes the default table to that path; edit it and restart `dsh web` to apply
changes. A model without a `models` entry falls back to `default` (zero cost
when no `default` is present).

## Install

```sh
# 1. add the plugin to the web profile (from npm)
dsh plugin --profile web add @4dgames/dsh-cost-meter

#    …or from a local checkout during development:
#    dsh plugin --profile web add file:/path/to/dsh-cost-meter

# 2. mount it in the profile's patch layer
cat >> ~/.dsh/profiles/web/cordis.patch.yml <<'YAML'
- insert:
    - id: cost-meter
      name: '@4dgames/dsh-cost-meter'
YAML

# 3. restart
# (stop the running `dsh --profile web`, then start it again)
```

Notes:
- `@deepseek-ai/dsh-*` are declared as **peerDependencies** (resolved from the
  harness), never as `dependencies` — installing them into a profile shadows the
  harness copy and can pull a stale dist-tag.
- The Settings "Plugins" panel is read-only (inventory + config cards); install
  happens only through `dsh plugin --profile … add`.

The `sessionCost` projection is delivered through the same seam as
`tokenUsage` / `sessionStats`, so it also appears in every projection carrier
(history tail page, `session/projection` push frames) without extra wiring.
