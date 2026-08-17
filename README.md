# @steven-wu/dsh-cost-meter

Out-of-tree [dsh](https://github.com/deepseek-ai/deepseek-harness) plugin that
shows a live **USD cost badge** for the open conversation in the Web UI.

It is a dual-face `dsh.client` package:

- **Host half** (`lib/index.js`) registers a `sessionCost` projection on the
  session-projection seam. The fold tracks the current provider/model from
  `request/header` events and accumulates cost from the provider-reported usage
  buckets (uncached input / output / cache-read / cache-write), reusing
  token-meter's "replace the same `(turn, step)` sample instead of
  double-counting" rule. The view exposes the whole-session totals plus a
  `byTurn` map keyed by turn number.
- **Client half** (`lib/client.js`) registers a badge into the
  `conversation.chat.assistant-actions` slot — the action row at the end of each
  assistant message, alongside the turn's time/duration info. Each badge shows
  **that turn's** cost; hovering opens a tooltip with the per-bucket breakdown
  (input / output / cache-read / cache-write) plus the session total.

## Pricing table

Pricing is USD per **million** tokens, keyed by `provider/model`:

```jsonc
{
  "per": 1000000,
  "currency": "USD",
  "default": { "input": 0.6525, "output": 1.9575, "cacheRead": 0.02175, "cacheWrite": 0 },
  "models": {
    "deepseek-official/deepseek-v4-pro":   { "input": 0.6525, "output": 1.9575,  "cacheRead": 0.02175, "cacheWrite": 0 },
    "deepseek-official/deepseek-v4-flash": { "input": 0.2175, "output": 0.6525,  "cacheRead": 0.00725, "cacheWrite": 0 }
  }
}
```

The plugin reads `~/.dsh/cost-pricing.json` on boot (override the path with the
`DSH_COST_PRICING` env var or the row's `config.pricingPath`). On first run it
writes the default table to that path; edit it and restart `dsh web` to apply
changes. A model without a `models` entry falls back to `default` (zero cost
when no `default` is present).

## Install

The package declares a `dsh.bundle` manifest, so `dsh plugin add` installs it
**and** adds it to the profile's bundle layers automatically — no manual patch
edit:

```sh
dsh plugin --profile web add @steven-wu/dsh-cost-meter
# restart the web profile, then refresh the page
```

For a local checkout during development:

```sh
dsh plugin --profile web add file:/path/to/dsh-cost-meter
```

Notes:
- `@deepseek-ai/dsh-*` are declared as **peerDependencies** (resolved from the
  harness), never as `dependencies` — installing them into a profile shadows the
  harness copy and can pull a stale dist-tag.
- The Settings "Plugins" panel is read-only (inventory + config cards); install
  happens only through `dsh plugin --profile … add`.
- Purely-cordis mounting (a `cordis.patch.yml` insert row) also works — the
  shipped `cordis.patch.yml` holds that row for either path.

The `sessionCost` projection is delivered through the same seam as
`tokenUsage` / `sessionStats`, so it also appears in every projection carrier
(history tail page, `session/projection` push frames) without extra wiring.
