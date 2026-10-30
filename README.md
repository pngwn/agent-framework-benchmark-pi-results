# agent-framework-benchmark-pi results

Results from [pngwn/agent-framework-benchmark-pi](https://github.com/pngwn/agent-framework-benchmark-pi):
Nolan Lawson's [agent framework benchmark](https://github.com/nolanlawson/agent-framework-benchmark)
([blog post](https://nolanlawson.com/2026/10/28/the-ai-cost-of-javascript-frameworks/)) run with the
[Pi](https://pi.dev) coding agent and `deepseek-ai/DeepSeek-V4.1-Flash-1017` on Hugging Face
Inference Providers, with extra analyses of the code and the agents' traces.

Full agent traces (every thinking block, tool call and result), judge sessions and Lighthouse
reports are in the Hugging Face dataset
[pngwn/agent-framework-benchmark-pi-traces](https://huggingface.co/datasets/pngwn/agent-framework-benchmark-pi-traces).

## Headline results

Runs on 2026-10-29/30: 12 frameworks, using the same spec, tests, prompt and MCP servers/skills
as upstream. The agent was DeepSeek V4.1 Flash through Pi with `web_search`/`web_fetch`, and the
judge was GLM-5.3, also through Pi, read-only. Full tables are in
[`runs/build-deepseek-v4.1-flash/report.md`](runs/build-deepseek-v4.1-flash/report.md) and
[`runs/extend-team-deepseek-v4.1-flash/report.md`](runs/extend-team-deepseek-v4.1-flash/report.md).

- **Build task:** 59 of 60 runs passed `npm test`. qwik-1 failed one timing-sensitive test,
  then passed both clean re-runs, so it's flaky rather than broken. Every app passed every
  re-run: 120/120 for the build task and 72/72 for the extension task.
  Total cost was $10.08 at catalog prices; the median run cost $0.14, took 7.3 min and 84 turns.
  Opus 5.5's median time in Nolan's runs was 10.8 min.
- **More code than Opus everywhere:** DeepSeek's significant LOC is higher in all 12
  frameworks, by 1.18× to 1.39× (median 1.28×). It uses less framework vocabulary
  ("concepts") in all 12, most sharply in Hono (13 vs 51), Angular (28 vs 50) and Nuxt (26 vs 44).
  It writes more hand-rolled code and leans less on the framework.
- **The judges rate it slightly below Opus:** the median across frameworks is 3.5 vs 4.0 for
  mergeability and for editability, and 4.0 vs 4.0 for forward-thinking. The gap comes mostly
  from `abstraction_design` and `changeability`.
- **Neither model writes its own tests:** the agents wrote 0 test cases, apart from 3 in
  Angular's Opus apps. The tests judge gives 1/5 across the board.
- **Framework tooling goes largely unused:** skills were read in 13 of 60 runs and MCP servers
  called in 9 of 60. React Router's skill (5/5) and Angular's skills (4/5) are the exceptions.
- **The agent edits through bash:** it made 628 file writes through bash (mostly
  `python3 - <<'PY'` scripts), against 716 edit/write tool calls. Edits are rarely
  circular: there were 0 compactions and almost no stuck tests or reverts. Every passing run
  re-ran the full tests after its last change.
- **Page loads, measured on the same machine as Opus:** results are mostly level. Perf
  scores are within 1 point in 11 frameworks. Angular is the clear exception: TBT is 346 ms
  vs 105 ms and perf 87 vs 96. DeepSeek's median LCP looks about 2× worse in Astro (1688 vs
  830 ms), Gracile and Qwik, but that is a sampling artefact. LCP is bimodal for both models
  (about 0.8–1.0 s or 1.7–1.9 s, depending on which element Lighthouse's simulation counts as
  largest). DeepSeek's apps landed in the slow mode more often (Astro 4/5 vs 2/5), and with
  5 samples that's enough to flip the median.
- **Extension task** (add a team builder to Nolan's Opus apps): 36 of 36 runs passed, with no
  regressions, at a median of $0.03 and 1.5 min. The change was +265 to +404 lines across 6–10 files.
  The judges scored every framework 4.0 for mergeability and editability, so this task
  doesn't separate frameworks.

### Build task, per framework

Values in parentheses are Opus 5.5 (Nolan's apps), analysed and judged the same way.
Judge scores are 1–5: the median of 3 samples, over the 2 apps per framework nearest the
median size.

| Framework | Tests | Cost ($) | Time (min) | Significant LOC | Concepts | Mergeability | Editability | Forward-thinking | Skills / MCP used |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| hono-htmx | 5/5 | 0.14 | 7.2 | 765 (631) | 13 (51) | 3.5 (4.0) | 3.0 (4.0) | 4.0 (4.0) | 1/5 / 0/5 |
| sveltekit | 5/5 | 0.21 | 8.8 | 780 (643) | 16 (19) | 4.0 (4.0) | 3.5 (4.0) | 4.0 (5.0) | 2/5 / 1/5 |
| astro | 5/5 | 0.22 | 9.6 | 822 (592) | 3 (4) | 3.5 (4.0) | 3.0 (4.0) | 4.0 (4.0) | 0/5 / 3/5 |
| nuxt | 5/5 | 0.10 | 5.7 | 832 (613) | 26 (44) | 4.0 (4.0) | 4.0 (4.0) | 3.5 (4.0) | 0/5 / 0/5 |
| vanilla | 5/5 | 0.14 | 6.7 | 857 (665) | 6 (6) | 4.0 (4.0) | 3.5 (4.0) | 4.0 (4.0) | 0/5 / 0/5 |
| next | 5/5 | 0.19 | 9.4 | 868 (673) | 42 (47) | 4.0 (4.0) | 3.5 (4.0) | 3.5 (4.0) | 1/5 / 3/5 |
| react-router | 5/5 | 0.12 | 5.1 | 873 (694) | 49 (56) | 3.0 (4.0) | 3.5 (4.0) | 3.5 (4.0) | 5/5 / 0/5 |
| gracile | 5/5 | 0.12 | 7.7 | 890 (743) | 11 (13) | 3.0 (4.0) | 3.5 (4.0) | 4.0 (4.5) | 0/5 / 0/5 |
| solidstart | 5/5 | 0.13 | 9.2 | 926 (720) | 49 (52) | 3.0 (4.0) | 3.0 (4.0) | 4.0 (4.3) | 0/5 / 0/5 |
| tanstack-start | 5/5 | 0.13 | 5.3 | 930 (725) | 47 (53) | 4.0 (4.0) | 3.5 (4.0) | 4.0 (4.0) | 0/5 / 0/5 |
| qwik | 4/5 | 0.20 | 9.3 | 939 (733) | 53 (57) | 3.0 (4.0) | 3.5 (4.0) | 4.0 (4.0) | 0/5 / 0/5 |
| angular | 5/5 | 0.18 | 9.3 | 1040 (885) | 28 (50) | 3.5 (4.0) | 4.0 (4.0) | 4.0 (4.0) | 4/5 / 2/5 |

### Extension task, per framework

| Framework | Tests | Cost ($) | Time (min) | Files | + lines | Δ significant | Mergeability | Editability | Trace |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| nuxt | 3/3 | 0.03 | 1.5 | 6 | 265 | 119 | 4.0 | 4.0 | 4.5 |
| sveltekit | 3/3 | 0.03 | 1.7 | 7 | 317 | 126 | 4.0 | 4.0 | 4.5 |
| vanilla | 3/3 | 0.03 | 1.1 | 7 | 303 | 126 | 4.0 | 4.0 | 4.0 |
| hono-htmx | 3/3 | 0.03 | 1.3 | 7 | 281 | 129 | 4.0 | 4.0 | 4.5 |
| next | 3/3 | 0.03 | 1.6 | 8 | 306 | 131 | 4.0 | 4.0 | 5.0 |
| astro | 3/3 | 0.03 | 1.1 | 7 | 286 | 133 | 4.0 | 4.0 | 4.5 |
| react-router | 3/3 | 0.03 | 1.9 | 9 | 335 | 139 | 4.0 | 4.0 | 4.0 |
| qwik | 3/3 | 0.06 | 1.7 | 6 | 352 | 155 | 4.0 | 4.0 | 4.0 |
| tanstack-start | 3/3 | 0.03 | 1.4 | 10 | 395 | 157 | 4.0 | 4.0 | 5.0 |
| solidstart | 3/3 | 0.04 | 1.5 | 10 | 370 | 161 | 4.0 | 4.0 | 4.0 |
| angular | 3/3 | 0.05 | 2.9 | 9 | 347 | 165 | 4.0 | 4.0 | 4.5 |
| gracile | 3/3 | 0.04 | 1.5 | 10 | 404 | 191 | 4.0 | 4.0 | 4.5 |

### Page loads (Lighthouse, mobile, home page)

DeepSeek's apps, with Nolan's Opus 5.5 apps re-measured on the same machine in parentheses
(upstream's `measure.mjs`, 5 runs each, medians):

| Framework | Perf | LCP (ms) | TBT (ms) | JS (KiB) |
| --- | ---: | ---: | ---: | ---: |
| hono-htmx | 100 (100) | 1026 (1030) | 0 (0) | 18 (18) |
| sveltekit | 100 (100) | 1188 (1174) | 0 (0) | 35 (36) |
| solidstart | 100 (100) | 1402 (1207) | 14 (19) | 39 (40) |
| qwik | 100 (100) | 1495 (1030) | 0 (14) | 39 (40) |
| vanilla | 97 (97) | 1535 (1528) | 40 (0) | 7 (7) |
| gracile | 100 (100) | 1660 (981) | 0 (0) | 2 (8) |
| astro | 100 (100) | 1683 (830) | 0 (0) | 0 (0) |
| react-router | 99 (99) | 1732 (1735) | 41 (0) | 115 (115) |
| tanstack-start | 99 (99) | 1879 (1961) | 58 (26) | 118 (118) |
| nuxt | 98 (99) | 2013 (1773) | 77 (63) | 86 (84) |
| next | 99 (98) | 2014 (2087) | 122 (102) | 136 (142) |
| angular | 87 (96) | 2138 (1937) | 346 (105) | 87 (93) |

The re-measure ran on a 48-thread EPYC VPS under Docker, while Nolan's original ran under
Podman. One Opus app (astro-5) bound only to `::1` under Docker, so it was measured with
`--measure-env=HOST=0.0.0.0` (see its `measure-same-machine/NOTE.txt`). Nolan's original
numbers are kept in `baselines/opus-5.5/<app>/measure/`, and the re-measure is in
`measure-same-machine/`.

### Caveats

- **Judges:** GLM-5.3 is a single model family, so treat the scores as relative within this
  benchmark, not absolute. GLM wrote unparseable JSON in 4 of about 1,000 samples. Those
  samples were re-run, and every app has 3 valid samples per dimension.
- **Cost:** Pi's estimate from the HF catalog prices for the `together` provider, not an
  invoice. Nolan's results don't record Opus costs, so there's no cost comparison here.
- **Sample sizes:** 5 build runs and 3 extension runs per framework, and judges on 2 apps per
  framework. Differences of 0.5 in a judge median are within noise.

## Layout

| Path | |
| --- | --- |
| `runs/build-deepseek-v4.1-flash/`, `runs/extend-team-deepseek-v4.1-flash/` | The build task (5 iterations × 12 frameworks) and the extension task (3 × 12) |
| `runs/<run>/report.md`, `summary.json` | Per-framework medians and every iteration's metrics |
| `runs/<run>/config.json` | Harness settings, model, versions, image IDs |
| `runs/<run>/<framework>-<n>/app/` | The app the agent wrote (dependencies and build output removed) |
| `runs/<run>/<framework>-<n>/agent/` | Run info, tooling and MCP versions, final acceptance test log |
| `runs/<run>/<framework>-<n>/analysis/` | `code.json` (significant-code stats), `trace.json` (trace metrics); extension runs add `diff.json` and `changes.diff` |
| `runs/<run>/<framework>-<n>/measure/results.json` | Lighthouse medians (mobile) and upstream's LOC |
| `runs/<run>/<framework>-<n>/judge/<dimension>/<n>/verdict.json` | LLM judge verdicts with file:line evidence |
| `baselines/opus-5.5/` | The same code analyses and judges applied to Nolan's published Opus 5.5 apps; `measure-same-machine/` holds the like-for-like Lighthouse re-measure |

## Redaction

Exported with `scripts/export-results.mjs` from the harness repo: API key values and
token-shaped strings are replaced with `[REDACTED]`, local paths and the account email are
removed, and the export is re-scanned before publishing. The keys were only environment
variables inside the agent containers, and no key value appeared in any trace even before
redaction.

## License

Apache-2.0, like the benchmark it builds on. The apps were written by DeepSeek V4.1 Flash
(MIT-licensed model) through the harness.
