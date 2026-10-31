# agent-framework-benchmark-pi results

Results from [pngwn/agent-framework-benchmark-pi](https://github.com/pngwn/agent-framework-benchmark-pi):
Nolan Lawson's [agent framework benchmark](https://github.com/nolanlawson/agent-framework-benchmark)
([blog post](https://nolanlawson.com/2026/10/28/the-ai-cost-of-javascript-frameworks/)) run with the
[Pi](https://pi.dev) coding agent and two open-weight models on Hugging Face Inference Providers,
`deepseek-ai/DeepSeek-V4.1-Flash-1017` and `moonshotai/Kimi-K3`, with extra analyses of the
code and the agents' traces.

Full agent traces (every thinking block, tool call and result), judge sessions and Lighthouse
reports are in the Hugging Face dataset
[pngwn/agent-framework-benchmark-pi-traces](https://huggingface.co/datasets/pngwn/agent-framework-benchmark-pi-traces).

| Run | Model (HF provider) | Task | Report |
| --- | --- | --- | --- |
| `build-deepseek-v4.1-flash` | DeepSeek V4.1 Flash (together) | build, 5 × 12 | [report.md](runs/build-deepseek-v4.1-flash/report.md) |
| `extend-team-deepseek-v4.1-flash` | DeepSeek V4.1 Flash (together) | extension, 3 × 12 | [report.md](runs/extend-team-deepseek-v4.1-flash/report.md) |
| `build-kimi-k3` | Kimi K3 (deepinfra) | build, 5 × 12 | [report.md](runs/build-kimi-k3/report.md) |

Every run uses the same spec, tests, prompt and per-framework MCP servers/skills as upstream,
Pi with `web_search`/`web_fetch`, thinking `high`, and the same judges (see the caveats on the
judge model). Opus 5.5 numbers are from Nolan's published runs, analysed and judged here the
same way.

## Across three models

Each framework's medians, ranked across the 12 frameworks, compared between models (Spearman ρ,
permutation p-values):

| Metric | Kimi ~ DeepSeek | Kimi ~ Opus | DeepSeek ~ Opus |
| --- | ---: | ---: | ---: |
| Significant LOC | 0.93 (p<0.001) | 0.90 (p<0.001) | 0.90 (p<0.001) |
| Concepts | 0.99 (p<0.001) | 0.88 (p=0.001) | 0.91 (p<0.001) |
| JS shipped | 0.99 (p<0.001) | 0.98 (p<0.001) | 0.99 (p<0.001) |
| TBT | 0.94 (p<0.001) | 0.87 (p=0.001) | 0.83 (p=0.002) |
| Turns | 0.25 (p=0.44) | **0.84 (p=0.001)** | 0.22 (p=0.49) |
| Cost | 0.24 (p=0.44) | 0.28 (p=0.37) | −0.15 (p=0.65) |

- **The framework decides what the app looks like.** All three models rank the frameworks
  almost identically on code size, framework vocabulary, JS shipped and main-thread blocking.
- **How much effort a framework costs depends on the model.** Cost rankings don't agree
  between any pair of models. Within a model, the framework effect on cost is real but
  modest: eta² 0.36 (p=0.02) for DeepSeek and 0.32 (p=0.04) for Kimi.
- **The exception is turns for Kimi and Opus,** which rank the frameworks the same way
  (ρ 0.84). Angular takes the most turns for both, with Gracile and SvelteKit close behind;
  Astro and Hono are among the fewest. DeepSeek doesn't follow that order.
- **No framework is cheapest across models.** Nuxt is the cheapest framework for DeepSeek and
  the third cheapest for Opus, but sits mid-table for Kimi. Angular is the most expensive
  for Kimi and Opus, and fifth most expensive for DeepSeek.
- **The judges don't separate frameworks.** Almost every app scores 4/5 on mergeability,
  editability and forward-thinking, for every model. The same four frameworks get
  experimentalness 3 for both Kimi and Opus: TanStack Start, SvelteKit, Gracile and SolidStart.

## Kimi K3, build task

- **59 of 60 runs passed** `npm test`; solidstart-4 failed. Clean re-runs passed 117 of 120:
  solidstart-4's two, plus one of an Angular app's two re-runs.
- **Closer to Opus than DeepSeek is:** significant LOC is a median 1.05× Opus's (0.93× to
  1.30×; DeepSeek is 1.28×), and the judges' medians match Opus's (4.0 for mergeability,
  editability and forward-thinking; DeepSeek 3.5, 3.5, 4.0). It still uses slightly less
  framework vocabulary than Opus in 11 of 12 frameworks, and much less in Hono (11 vs 51).
- **Slower and pricier than DeepSeek:** median 20.5 min and 85 turns per run, against 7.3 min
  for DeepSeek and 10.8 min for Opus. Pi's estimate is $127.67 for the 60 runs (median $2.12),
  but that doesn't price the 410.8M cached input tokens (see the caveats).
- **It edits with Pi's tools,** unlike DeepSeek: 1,572 edit/write calls and 72 file writes
  through bash.
- **It uses framework tooling more often:** skills in 21 of 60 runs and MCP servers in 13
  (DeepSeek: 13 and 9). It wrote no tests of its own, like the other two models.
- **It never wrote a `.gitignore`,** so build output sits in some apps (`.output/`, `.nuxt/`,
  `.svelte-kit/`, `build/`, Qwik's `server/`). Upstream's LOC metric counts every file git
  doesn't ignore, which puts its LOC at 28k for TanStack Start and SvelteKit and 17k for Nuxt.
  The significant-LOC numbers skip build directories and minified files, so they're unaffected.

| Framework | Tests | Cost ($) | Time (min) | Turns (Opus) | Significant LOC (Opus) | Concepts (Opus) | Mergeability | Editability | Forward-thinking | Skills / MCP used |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| react-router | 5/5 | 1.81 | 15.2 | 74 (98) | 750 (694) | 49 (56) | 3.5 (4.0) | 4.0 (4.0) | 4.0 (4.0) | 5/5 / 0/5 |
| vanilla | 5/5 | 1.86 | 19.3 | 65 (85) | 677 (665) | 5 (6) | 3.5 (4.0) | 4.0 (4.0) | 4.0 (4.0) | 0/5 / 0/5 |
| tanstack-start | 5/5 | 1.86 | 18.7 | 84 (94) | 808 (725) | 47 (53) | 4.0 (4.0) | 4.0 (4.0) | 4.0 (4.0) | 0/5 / 0/5 |
| hono-htmx | 5/5 | 1.91 | 16.8 | 69 (75) | 588 (631) | 11 (51) | 4.0 (4.0) | 4.0 (4.0) | 4.0 (4.0) | 5/5 / 0/5 |
| next | 5/5 | 2.02 | 16.7 | 94 (100) | 670 (673) | 40 (47) | 4.0 (4.0) | 4.0 (4.0) | 4.0 (4.0) | 1/5 / 2/5 |
| sveltekit | 5/5 | 2.12 | 20.5 | 99 (103) | 661 (643) | 16 (19) | 4.0 (4.0) | 4.0 (4.0) | 4.5 (5.0) | 5/5 / 4/5 |
| nuxt | 5/5 | 2.13 | 20.2 | 76 (71) | 675 (613) | 38 (44) | 4.0 (4.0) | 3.5 (4.0) | 4.0 (4.0) | 0/5 / 0/5 |
| qwik | 5/5 | 2.16 | 38.1 | 83 (89) | 951 (733) | 54 (57) | 4.0 (4.0) | 4.0 (4.0) | 4.0 (4.0) | 0/5 / 0/5 |
| gracile | 5/5 | 2.22 | 32.9 | 101 (107) | 828 (743) | 12 (13) | 4.0 (4.0) | 4.0 (4.0) | 4.0 (4.5) | 0/5 / 0/5 |
| astro | 5/5 | 2.25 | 35.2 | 66 (73) | 656 (592) | 4 (4) | 4.0 (4.0) | 3.0 (4.0) | 4.0 (4.0) | 0/5 / 4/5 |
| solidstart | 4/5 | 2.31 | 16.8 | 94 (108) | 722 (720) | 49 (52) | 4.0 (4.0) | 4.0 (4.0) | 4.0 (4.5) | 0/5 / 0/5 |
| angular | 5/5 | 2.81 | 27.1 | 103 (117) | 868 (885) | 45 (50) | 4.0 (4.0) | 4.0 (4.0) | 4.0 (4.0) | 5/5 / 3/5 |

Kimi K3 was meant to run on `together` like DeepSeek, but together returned empty completions
for it (no text or tool call, stop reason `stop`) on about 8% of requests, sometimes for the
same request five times running, which ended runs early. Those attempts were discarded and
the grid ran on deepinfra, where no request needed a retry. The harness's
[run guard](https://github.com/pngwn/agent-framework-benchmark-pi/blob/main/harness/container/pi/extensions/run-guard.ts)
now retries such completions and records each one in the session.

## DeepSeek V4.1 Flash

- **Build task:** 59 of 60 runs passed `npm test`. qwik-1 failed one timing-sensitive test,
  then passed both clean re-runs, so it's flaky rather than broken. Every app passed every
  re-run: 120/120 for the build task and 72/72 for the extension task.
  The median run took 7.3 min and 84 turns; Opus 5.5's median in Nolan's runs was 10.8 min.
  Pi estimated $10.08 for the build task (median $0.14 per run), but the HF bill was about
  half of Pi's estimate (see the caveats).
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
median size. Costs are Pi's estimates.

| Framework | Tests | Cost ($) | Time (min) | Significant LOC | Concepts | Mergeability | Editability | Forward-thinking | Skills / MCP used |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| hono-htmx | 5/5 | 0.14 | 7.2 | 764 (631) | 13 (51) | 3.5 (4.0) | 3.0 (4.0) | 4.0 (4.0) | 1/5 / 0/5 |
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
(upstream's `measure.mjs`, 5 runs each, medians). Kimi's are in its
[report](runs/build-kimi-k3/report.md), measured on the same machine.

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

## Caveats

- **Judge model:** the judges were configured as `zai-org/GLM-5.3` pinned to `together`, and
  the router's responses name that model. But HF billing lists the judge calls under
  `zai-org/GLM-5.3-Flash`, and the billed amount ($20.27 for the DeepSeek runs' judges) fits
  Flash's price, not GLM-5.3's: at the cheapest GLM-5.3 list price the same tokens would cost
  at least about $77. So the judge may have been GLM-5.3-Flash. It was the same for every run
  and for the Opus baseline, so scores are comparable within this benchmark either way. Treat
  them as relative, not absolute. GLM wrote unparseable JSON in 4 of about 1,000 DeepSeek-run
  samples; those were re-run, and every judged app has 3 valid samples per dimension.
- **Cost:** the costs in the reports are Pi's estimates from its catalog prices, not invoices,
  and Pi prices cached input at $0. For DeepSeek, HF billed $5.51 for calls Pi put at about
  $11.5, so the DeepSeek costs here are roughly 2× too high; the ranking between frameworks is
  unaffected. For Kimi, Pi's $127.67 leaves out 410.8M cached input tokens, and deepinfra's
  cached-input price isn't published on the router, so the real cost isn't known yet. Opus
  costs are Claude Code's own API-price reports from Nolan's runs.
- **Different providers:** DeepSeek ran on together and Kimi on deepinfra. Providers differ in
  quantisation, speed and tool-call parsing, so a model comparison here is also a provider
  comparison.
- **Harness:** Opus ran in Claude Code and the open models in Pi, so model differences are
  mixed with harness differences.
- **Sample sizes:** 5 build runs and 3 extension runs per framework, and judges on 2 apps per
  framework. Differences of 0.5 in a judge median are within noise. With 12 frameworks, a rank
  correlation needs to be above about 0.6 to reach p<0.05.

## Layout

| Path | |
| --- | --- |
| `runs/build-deepseek-v4.1-flash/`, `runs/extend-team-deepseek-v4.1-flash/`, `runs/build-kimi-k3/` | The runs listed above |
| `runs/<run>/report.md`, `summary.json` | Per-framework medians and every iteration's metrics |
| `runs/<run>/config.json` | Harness settings, model, versions, image IDs |
| `runs/<run>/<framework>-<n>/app/` | The app the agent wrote (dependencies and common build directories removed) |
| `runs/<run>/<framework>-<n>/agent/` | Run info, tooling and MCP versions, final acceptance test log |
| `runs/<run>/<framework>-<n>/analysis/` | `code.json` (significant-code stats), `trace.json` (trace metrics); extension runs add `diff.json` and `changes.diff` |
| `runs/<run>/<framework>-<n>/measure/results.json` | Lighthouse medians (mobile) and upstream's LOC |
| `runs/<run>/<framework>-<n>/judge/<dimension>/<n>/verdict.json` | LLM judge verdicts with file:line evidence |
| `baselines/opus-5.5/` | The same code analyses and judges applied to Nolan's published Opus 5.5 apps; `measure-same-machine/` holds the like-for-like Lighthouse re-measure |

The code analysis classes minified files (over 300 characters per line on average) as
generated, so vendored libraries such as `htmx.min.js` and bundler output don't count as code.
That changed three DeepSeek apps' published stats (hono-htmx-2, hono-htmx-4 and qwik-2: code
tokens, functions, complexity and concepts) and Hono's median significant LOC by one line.

## Redaction

Exported with `scripts/export-results.mjs` from the harness repo: API key values and
token-shaped strings are replaced with `[REDACTED]`, local paths and the account email are
removed, and the export is re-scanned before publishing. The keys were only environment
variables inside the agent containers, and no key value appeared in any trace even before
redaction.

## License

Apache-2.0, like the benchmark it builds on. The apps were written by the models named in each
run (DeepSeek V4.1 Flash and Kimi K3) through the harness.
