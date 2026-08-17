# Sharing a dsh plugin

Checklist for publishing a DeepSeek Harness (dsh) plugin for discovery.
Last researched 2026-08-17.

## Prerequisites (once per repo)

1. Declare a `dsh.bundle` manifest — a root `cordis.patch.yml` plus
   `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }` in `package.json`.
   This is what makes it installable via `dsh plugin add`. `dsh.client` alone
   is **not** enough and most submissions get rejected for that.
2. Add the GitHub topic **`dsh-plugin`** (plus `deepseek-harness`, `deepseek`).
   This is the official-endorsed discovery signal and a hard prerequisite for
   the registry + auto-catalogs.
3. Set a GitHub repo description (needed by auto-catalogs).

## Channels (ranked)

| Priority | Channel | Method | URL |
|---|---|---|---|
| ★★★ | **awesome-dsh-plugin** registry — single data source for awesome-dsh-plugin.com **and** the in-app **dsh-market** | PR: add `data/plugins/<owner>__<repo>.yml` and regenerate the READMEs | github.com/awesome-dsh-plugin/awesome-dsh-plugin |
| ★★★ | **dsh-market** (in-app market, Settings → Plugin Market) | automatic — it sources its catalog exclusively from the awesome-dsh-plugin registry | github.com/dsh-market/dsh-market |
| ★★ | **awesome-deepseek-harness** (0xsline) | PR: add an entry to `README.md` + `README.zh-CN.md` | github.com/0xsline/awesome-deepseek-harness |
| ★★ | **bruc3van/awesome-dsh-plugin** (auto-generated catalog) | automatic via `dsh-plugin` topic + description | github.com/bruc3van/awesome-dsh-plugin |
| ★ | **DSH Get** (searchable web directory) | check submission via its data repo | dshget.com · github.com/bobby-sheng/dshget-data |
| ★ | **Dominic789654/awesome-deepseek-harness** | PR | github.com/Dominic789654/awesome-deepseek-harness |

## The one YAML that matters

`data/plugins/<owner>__<repo>.yml`:

```yaml
url: https://github.com/owner/repo
name: owner/repo
category: session   # ui|theme|model|session|memory|tools|skill|workflow|notify|dev|market|fun|usage
description:
  en: 'One-line description ending with a period. Quote it if it contains ": ".'
  zh: 一句话描述，以句号结尾。
```

Then regenerate the READMEs and commit them with the YAML:

```sh
npm ci
node scripts/generate-readme.mjs
```

## Skip (stale / dead / superseded)

- `dsh-plugins` CLI (`dsp`) — superseded by dsh-market.
- `whalehub-dsh` — dead.
- The long tail of 3–10 ⭐ lists/registries.

## Notes

- The registry auto-checks: repo declares `dsh.bundle`, is ≥1 day old with
  ≥10 commits, and carries the `dsh-plugin` topic.
- There is still **no official marketplace** — the official README only points
  to the `dsh-plugin` topic + Discussions/Discord. The awesome-dsh-plugin
  registry → dsh-market is the de-facto central channel.
