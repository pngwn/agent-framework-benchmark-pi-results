# Pokédex benchmark: extend-team task

Model `deepseek-ai/DeepSeek-V4.1-Flash-1017` (HF provider: together), thinking `high`, pi 1.4.0. 3 iteration(s) per framework; values are medians.
Values in parentheses are the Opus 5.5 medians from Nolan Lawson's published build-task runs (code size of the apps the extension started from).

## Agent cost and page loads (upstream metrics)

`Tests`: the final acceptance run, as upstream. `Retests`: extra runs of the same tests in clean containers (harness/retest.mjs), to tell flaky results from real ones. Cost is pi's estimate from the model catalog prices, not an invoice. Lighthouse is the home page on mobile, as upstream.

| Framework | Tests | Retests | Tokens (M) | Output (k) | Cost ($) | Time (min) | Turns | Perf | LCP (ms) | TBT (ms) | JS (KiB) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| vanilla | 3/3 | — | 0.83 | 14 | 0.03 | 1.1 | 25 | — | — | — | — |
| astro | 3/3 | — | 0.71 | 14 | 0.03 | 1.1 | 22 | — | — | — | — |
| next | 3/3 | — | 0.97 | 16 | 0.03 | 1.6 | 25 | — | — | — | — |
| hono-htmx | 3/3 | — | 0.92 | 16 | 0.03 | 1.3 | 25 | — | — | — | — |
| react-router | 3/3 | — | 1.04 | 17 | 0.03 | 1.9 | 27 | — | — | — | — |
| nuxt | 3/3 | — | 1.19 | 13 | 0.03 | 1.5 | 22 | — | — | — | — |
| sveltekit | 3/3 | — | 0.91 | 16 | 0.03 | 1.7 | 22 | — | — | — | — |
| tanstack-start | 3/3 | — | 1.19 | 17 | 0.03 | 1.4 | 30 | — | — | — | — |
| gracile | 3/3 | — | 1.38 | 18 | 0.04 | 1.5 | 35 | — | — | — | — |
| solidstart | 3/3 | — | 1.53 | 19 | 0.04 | 1.5 | 35 | — | — | — | — |
| angular | 3/3 | — | 2.58 | 23 | 0.05 | 2.9 | 44 | — | — | — | — |
| qwik | 3/3 | — | 1.61 | 21 | 0.06 | 1.7 | 37 | — | — | — | — |

## Code size: significant code vs. lines

`LOC` is upstream's count. `Significant` drops CSS, config/entry boilerplate, imports, type declarations, comments and bare punctuation/closing tags. `Concepts` counts distinct framework vocabulary (package imports, ambient APIs like runes or auto-imports, template directives, file conventions).

| Framework | LOC | Significant | Script | Template | CSS | Tokens (k) | Functions | Complexity | Concepts | Deps | Test cases |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| vanilla | 1749 (1492) | 781 (665) | 1153 | 28 | 559 | 11.8 | 167 | 208 | 6 (6) | 2 | 0 |
| astro | 1713 (1461) | 732 (592) | 686 | 429 | 557 | 10.8 | 114 | 179 | 4 (4) | 2 | 0 |
| next | 1808 (1539) | 791 (673) | 889 | 421 | 496 | 11.8 | 175 | 163 | 49 (47) | 8 | 0 |
| hono-htmx | 1616 (1370) | 779 (631) | 616 | 486 | 518 | 10.9 | 146 | 166 | 54 (51) | 6 | 0 |
| react-router | 1858 (1564) | 814 (694) | 867 | 450 | 532 | 11.6 | 179 | 163 | 60 (56) | 14 | 0 |
| nuxt | 1646 (1415) | 753 (613) | 731 | 367 | 492 | 11.2 | 170 | 123 | 46 (44) | 2 | 0 |
| sveltekit | 1877 (1611) | 767 (643) | 778 | 392 | 619 | 11.6 | 135 | 117 | 19 (19) | 8 | 0 |
| tanstack-start | 2025 (1697) | 882 (725) | 1041 | 456 | 525 | 11.8 | 215 | 175 | 58 (53) | 11 | 0 |
| gracile | 2053 (1717) | 1008 (743) | 1119 | 413 | 522 | 10.6 | 196 | 214 | 7 (13) | 7 | 0 |
| solidstart | 1937 (1630) | 881 (720) | 888 | 501 | 511 | 12.6 | 221 | 165 | 58 (52) | 6 | 0 |
| angular | 2307 (1944) | 1041 (885) | 1584 | 172 | 515 | 12.7 | 187 | 174 | 58 (50) | 20 | 3 |
| qwik | 2051 (1744) | 847 (733) | 855 | 461 | 512 | 11.6 | 178 | 189 | 59 (57) | 13 | 0 |

## Trace: failures, loops and verification

`Edit/write`: edit and write tool calls; `Bash writes`: files changed through bash instead (sed -i, heredoc scripts, redirects). `Fix cycles`: failing test runs followed by edits and another run. `Stuck`: tests failing in 3+ consecutive runs. `Repeats`: identical tool calls. `Re-reads`: full reads of a file unchanged since the last read. `Reverts`: edits restoring text an earlier edit removed. `Loopy thinking`: thinking blocks mostly repeating an earlier one. `Verified`: iterations whose last code change was followed by a full passing test run.

| Framework | Tool calls | Failed % | Edit/write | Bash writes | Edit misses | Bash ≠0 | Test runs | Fix cycles | Stuck | Repeats | Re-reads | Reverts | Loopy thinking | Compactions | Verified | Browser | MCP used | Tool CLI used | Skills used | Searches |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| vanilla | 33 | 10.5 | 10 | 0 | 1 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2/3 | 0 | 0/3 | 0/3 | 0/3 | 0 |
| astro | 27 | 0.0 | 7 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3/3 | 0 | 0/3 | 0/3 | 0/3 | 0 |
| next | 34 | 5.9 | 8 | 0 | 0 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3/3 | 0 | 0/3 | 0/3 | 0/3 | 0 |
| hono-htmx | 33 | 3.4 | 9 | 0 | 0 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3/3 | 0 | 0/3 | 0/3 | 1/3 | 0 |
| react-router | 31 | 12.9 | 2 | 7 | 0 | 3 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2/3 | 0 | 0/3 | 0/3 | 0/3 | 0 |
| nuxt | 32 | 3.7 | 6 | 0 | 0 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3/3 | 0 | 0/3 | 0/3 | 0/3 | 0 |
| sveltekit | 27 | 7.4 | 0 | 8 | 0 | 2 | 2 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 3/3 | 0 | 0/3 | 0/3 | 0/3 | 0 |
| tanstack-start | 38 | 0.0 | 2 | 6 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3/3 | 0 | 0/3 | 0/3 | 0/3 | 0 |
| gracile | 51 | 7.8 | 12 | 0 | 1 | 2 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 3/3 | 0 | 0/3 | 0/3 | 0/3 | 0 |
| solidstart | 40 | 6.5 | 11 | 1 | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3/3 | 0 | 0/3 | 0/3 | 0/3 | 0 |
| angular | 51 | 7.8 | 16 | 0 | 1 | 2 | 5 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 3/3 | 0 | 2/3 | 0/3 | 1/3 | 0 |
| qwik | 48 | 4.7 | 7 | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3/3 | 0 | 0/3 | 0/3 | 0/3 | 0 |

## Extension task: the change

`Files`: files changed in app/ (lockfiles excluded). `Δ significant`: change in significant LOC. `New concepts`: framework vocabulary the change introduced. `Feature fails` / `Regressions`: failing feature tests / failing original tests in the final run.

| Framework | Tests | Files | + lines | − lines | Δ significant | New concepts | Feature fails | Regressions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| vanilla | 3/3 | 7 | 303 | 2 | 126 | 0 | 0 | 0 |
| astro | 3/3 | 7 | 286 | 1 | 133 | 0 | 0 | 0 |
| next | 3/3 | 8 | 306 | 1 | 131 | 2 | 0 | 0 |
| hono-htmx | 3/3 | 7 | 281 | 6 | 129 | 3 | 0 | 0 |
| react-router | 3/3 | 9 | 335 | 4 | 139 | 3 | 0 | 0 |
| nuxt | 3/3 | 6 | 265 | 0 | 119 | 5 | 0 | 0 |
| sveltekit | 3/3 | 7 | 317 | 2 | 126 | 2 | 0 | 0 |
| tanstack-start | 3/3 | 10 | 395 | 6 | 157 | 5 | 0 | 0 |
| gracile | 3/3 | 10 | 404 | 21 | 191 | 0 | 0 | 0 |
| solidstart | 3/3 | 10 | 370 | 26 | 161 | 4 | 0 | 0 |
| angular | 3/3 | 9 | 347 | 0 | 165 | 3 | 0 | 0 |
| qwik | 3/3 | 6 | 352 | 4 | 155 | 1 | 0 | 0 |

## Judge scores (1–5)

Median of samples, then of iterations.

| Framework | editability | mergeability | trace |
| --- | ---: | ---: | ---: |
| vanilla | 4.0 | 4.0 | 4.0 |
| astro | 4.0 | 4.0 | 4.5 |
| next | 4.0 | 4.0 | 5.0 |
| hono-htmx | 4.0 | 4.0 | 4.5 |
| react-router | 4.0 | 4.0 | 4.0 |
| nuxt | 4.0 | 4.0 | 4.5 |
| sveltekit | 4.0 | 4.0 | 4.5 |
| tanstack-start | 4.0 | 4.0 | 5.0 |
| gracile | 4.0 | 4.0 | 4.5 |
| solidstart | 4.0 | 4.0 | 4.0 |
| angular | 4.0 | 4.0 | 4.5 |
| qwik | 4.0 | 4.0 | 4.0 |

## Judge detail: editability



| Framework | removability | changeability | coupling | abstraction_design |
| --- | ---: | ---: | ---: | ---: |
| vanilla | 3.0 | 4.0 | 4.0 | 4.0 |
| astro | 4.0 | 3.5 | 3.0 | 4.0 |
| next | 4.0 | 4.0 | 4.0 | 4.0 |
| hono-htmx | 3.5 | 4.0 | 4.0 | 4.0 |
| react-router | 4.0 | 4.0 | 4.0 | 4.0 |
| nuxt | 4.0 | 3.0 | 4.0 | 4.0 |
| sveltekit | 3.5 | 3.5 | 4.5 | 4.0 |
| tanstack-start | 3.5 | 4.0 | 4.0 | 4.0 |
| gracile | 4.0 | 4.0 | 4.0 | 4.0 |
| solidstart | 4.0 | 3.5 | 4.0 | 4.0 |
| angular | 3.5 | 4.0 | 4.0 | 3.5 |
| qwik | 4.0 | 4.0 | 4.0 | 4.0 |

## Judge detail: mergeability



| Framework | idiomatic | correctness_risks | global_abstractions | readability | review_cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| vanilla | 4.0 | 3.0 | 4.0 | 4.0 | 3.5 |
| astro | 4.0 | 4.0 | 3.5 | 4.0 | 4.0 |
| next | 4.0 | 4.0 | 4.0 | 5.0 | 4.0 |
| hono-htmx | 5.0 | 3.5 | 4.0 | 4.0 | 4.0 |
| react-router | 4.0 | 4.0 | 4.0 | 5.0 | 4.0 |
| nuxt | 4.0 | 3.5 | 3.5 | 4.0 | 4.0 |
| sveltekit | 4.0 | 4.0 | 4.0 | 4.5 | 4.0 |
| tanstack-start | 5.0 | 4.0 | 4.0 | 4.5 | 4.0 |
| gracile | 4.0 | 3.5 | 4.0 | 4.0 | 4.0 |
| solidstart | 5.0 | 4.0 | 4.0 | 4.5 | 4.0 |
| angular | 4.0 | 4.0 | 4.0 | 4.5 | 4.0 |
| qwik | 5.0 | 3.5 | 4.0 | 4.0 | 4.0 |

## Judge detail: trace



| Framework | circularity | debugging | verification_quality | tool_use | planning |
| --- | ---: | ---: | ---: | ---: | ---: |
| vanilla | 4.0 | 4.0 | 3.5 | 3.5 | 5.0 |
| astro | 4.5 | 4.0 | 3.5 | 4.5 | 4.5 |
| next | 5.0 | 5.0 | 4.5 | 4.5 | 5.0 |
| hono-htmx | 5.0 | 4.0 | 4.0 | 4.5 | 5.0 |
| react-router | 5.0 | 5.0 | 4.0 | 4.0 | 5.0 |
| nuxt | 5.0 | 4.0 | 4.0 | 4.0 | 5.0 |
| sveltekit | 5.0 | 5.0 | 4.0 | 4.0 | 5.0 |
| tanstack-start | 5.0 | 4.5 | 4.0 | 4.0 | 5.0 |
| gracile | 4.5 | 4.5 | 4.0 | 4.0 | 5.0 |
| solidstart | 4.5 | 4.0 | 3.0 | 3.5 | 5.0 |
| angular | 5.0 | 5.0 | 4.0 | 4.0 | 5.0 |
| qwik | 4.5 | 4.5 | 4.5 | 4.0 | 5.0 |

## Iterations

| Iteration | Tests | Tokens (M) | Cost ($) | Turns | Significant LOC | Notes |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| angular-1 | pass | 2.58 | 0.05 | 44 | 1041 |  |
| angular-2 | pass | 0.94 | 0.03 | 21 | 1028 |  |
| angular-3 | pass | 3.12 | 0.05 | 50 | 1045 |  |
| astro-1 | pass | 0.33 | 0.04 | 12 | 745 |  |
| astro-2 | pass | 0.79 | 0.03 | 22 | 732 |  |
| astro-3 | pass | 0.71 | 0.02 | 22 | 711 |  |
| gracile-1 | pass | 1.38 | 0.04 | 35 | 1007 |  |
| gracile-2 | pass | 0.97 | 0.03 | 26 | 1008 |  |
| gracile-3 | pass | 2.84 | 0.11 | 51 | 1021 |  |
| hono-htmx-1 | pass | 0.92 | 0.03 | 25 | 779 |  |
| hono-htmx-2 | pass | 0.78 | 0.03 | 19 | 768 |  |
| hono-htmx-3 | pass | 1.67 | 0.04 | 35 | 807 |  |
| next-1 | pass | 0.97 | 0.03 | 25 | 787 |  |
| next-2 | pass | 1.42 | 0.03 | 32 | 792 |  |
| next-3 | pass | 0.65 | 0.03 | 19 | 791 |  |
| nuxt-1 | pass | 0.70 | 0.03 | 20 | 753 |  |
| nuxt-2 | pass | 1.82 | 0.05 | 34 | 763 |  |
| nuxt-3 | pass | 1.19 | 0.03 | 22 | 743 |  |
| qwik-1 | pass | 1.61 | 0.04 | 37 | 847 |  |
| qwik-2 | pass | 3.59 | 0.06 | 56 | 860 |  |
| qwik-3 | pass | 1.01 | 0.07 | 25 | 829 |  |
| react-router-1 | pass | 0.73 | 0.03 | 18 | 814 |  |
| react-router-2 | pass | 1.83 | 0.05 | 36 | 833 |  |
| react-router-3 | pass | 1.04 | 0.03 | 27 | 805 |  |
| solidstart-1 | pass | 1.53 | 0.04 | 38 | 888 |  |
| solidstart-2 | pass | 1.60 | 0.04 | 35 | 881 |  |
| solidstart-3 | pass | 0.83 | 0.07 | 22 | 878 |  |
| sveltekit-1 | pass | 0.61 | 0.03 | 18 | 763 |  |
| sveltekit-2 | pass | 0.91 | 0.03 | 22 | 767 |  |
| sveltekit-3 | pass | 1.60 | 0.04 | 34 | 785 |  |
| tanstack-start-1 | pass | 1.19 | 0.03 | 32 | 882 |  |
| tanstack-start-2 | pass | 1.68 | 0.04 | 30 | 896 |  |
| tanstack-start-3 | pass | 0.81 | 0.03 | 22 | 881 |  |
| vanilla-1 | pass | 0.83 | 0.03 | 23 | 781 |  |
| vanilla-2 | pass | 1.60 | 0.03 | 42 | 812 |  |
| vanilla-3 | pass | 0.83 | 0.03 | 25 | 780 |  |
