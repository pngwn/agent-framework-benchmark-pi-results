# Pokédex benchmark: build task

Model `deepseek-ai/DeepSeek-V4.1-Flash-1017` (HF provider: together), thinking `high`, pi 1.4.0. 5 iteration(s) per framework; values are medians.
Values in parentheses are the Opus 5.5 medians from Nolan Lawson's published build-task runs, judged the same way.

## Agent cost and page loads (upstream metrics)

`Tests`: the final acceptance run, as upstream. `Retests`: extra runs of the same tests in clean containers (harness/retest.mjs), to tell flaky results from real ones. Cost is pi's estimate from the model catalog prices, not an invoice. Lighthouse is the home page on mobile, as upstream; in parentheses, Opus 5.5's apps re-measured on the same machine.

| Framework | Tests | Retests | Tokens (M) | Output (k) | Cost ($) | Time (min) | Turns | Perf | LCP (ms) | TBT (ms) | JS (KiB) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| nuxt | 5/5 | 10/10 | 4.50 | 56 | 0.10 | 5.7 | 54 | 98 (99) | 2013 (1773) | 77 (63) | 86 (84) |
| gracile | 5/5 | 10/10 | 9.68 | 67 | 0.12 | 7.7 | 84 | 100 (100) | 1660 (981) | 0 (0) | 2 (8) |
| react-router | 5/5 | 10/10 | 5.27 | 64 | 0.12 | 5.1 | 64 | 99 (99) | 1732 (1735) | 41 (0) | 115 (115) |
| tanstack-start | 5/5 | 10/10 | 6.79 | 61 | 0.13 | 5.3 | 76 | 99 (99) | 1879 (1961) | 58 (26) | 118 (118) |
| solidstart | 5/5 | 10/10 | 10.71 | 81 | 0.13 | 9.2 | 95 | 100 (100) | 1402 (1207) | 14 (19) | 39 (40) |
| vanilla | 5/5 | 10/10 | 5.91 | 74 | 0.14 | 6.7 | 66 | 97 (97) | 1535 (1528) | 40 (0) | 7 (7) |
| hono-htmx | 5/5 | 10/10 | 7.20 | 78 | 0.14 | 7.2 | 78 | 100 (100) | 1026 (1030) | 0 (0) | 18 (18) |
| angular | 5/5 | 10/10 | 9.09 | 91 | 0.18 | 9.3 | 90 | 87 (96) | 2138 (1937) | 346 (105) | 87 (93) |
| next | 5/5 | 10/10 | 12.34 | 93 | 0.19 | 9.4 | 108 | 99 (98) | 2014 (2087) | 122 (102) | 136 (142) |
| qwik | 4/5 | 10/10 | 13.18 | 87 | 0.20 | 9.3 | 118 | 100 (100) | 1495 (1030) | 0 (14) | 39 (40) |
| sveltekit | 5/5 | 10/10 | 11.29 | 95 | 0.21 | 8.8 | 108 | 100 (100) | 1188 (1174) | 0 (0) | 35 (36) |
| astro | 5/5 | 10/10 | 13.23 | 105 | 0.22 | 9.6 | 122 | 100 (100) | 1683 (830) | 0 (0) | 0 (0) |

## Code size: significant code vs. lines

`LOC` is upstream's count. `Significant` drops CSS, config/entry boilerplate, imports, type declarations, comments and bare punctuation/closing tags. `Concepts` counts distinct framework vocabulary (package imports, ambient APIs like runes or auto-imports, template directives, file conventions).

| Framework | LOC | Significant | Script | Template | CSS | Tokens (k) | Functions | Complexity | Concepts | Deps | Test cases |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| nuxt | 1791 (1415) | 832 (613) | 723 | 367 | 553 | 10.4 | 147 | 194 | 26 (44) | 1 | 0 |
| gracile | 1716 (1717) | 890 (743) | 868 | 375 | 548 | 8.0 | 161 | 199 | 11 (13) | 7 | 0 |
| react-router | 1912 (1564) | 873 (694) | 865 | 403 | 570 | 10.0 | 149 | 183 | 49 (56) | 12 | 0 |
| tanstack-start | 2127 (1697) | 930 (725) | 962 | 426 | 596 | 10.4 | 174 | 201 | 47 (53) | 11 | 0 |
| solidstart | 2016 (1630) | 926 (720) | 919 | 507 | 565 | 11.2 | 169 | 195 | 49 (52) | 6 | 0 |
| vanilla | 1836 (1492) | 857 (665) | 1230 | 23 | 575 | 9.2 | 138 | 243 | 6 (6) | 1 | 0 |
| hono-htmx | 1557 (1370) | 764 (631) | 808 | 222 | 545 | 7.2 | 136 | 179 | 13 (51) | 3 | 0 |
| angular | 2310 (1944) | 1040 (885) | 1375 | 360 | 556 | 13.1 | 154 | 163 | 28 (50) | 15 | 0 |
| next | 2055 (1539) | 868 (673) | 1096 | 438 | 576 | 9.3 | 171 | 188 | 42 (47) | 3 | 0 |
| qwik | 2116 (1744) | 939 (733) | 999 | 474 | 595 | 10.9 | 160 | 188 | 53 (57) | 14 | 0 |
| sveltekit | 1731 (1611) | 780 (643) | 670 | 360 | 626 | 9.1 | 109 | 146 | 16 (19) | 6 | 0 |
| astro | 1902 (1461) | 822 (592) | 805 | 387 | 589 | 10.9 | 99 | 215 | 3 (4) | 2 | 0 |

## Trace: failures, loops and verification

`Edit/write`: edit and write tool calls; `Bash writes`: files changed through bash instead (sed -i, heredoc scripts, redirects). `Fix cycles`: failing test runs followed by edits and another run. `Stuck`: tests failing in 3+ consecutive runs. `Repeats`: identical tool calls. `Re-reads`: full reads of a file unchanged since the last read. `Reverts`: edits restoring text an earlier edit removed. `Loopy thinking`: thinking blocks mostly repeating an earlier one. `Verified`: iterations whose last code change was followed by a full passing test run.

| Framework | Tool calls | Failed % | Edit/write | Bash writes | Edit misses | Bash ≠0 | Test runs | Fix cycles | Stuck | Repeats | Re-reads | Reverts | Loopy thinking | Compactions | Verified | Browser | MCP used | Tool CLI used | Skills used | Searches |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| nuxt | 77 | 4.5 | 0 | 10 | 0 | 3 | 4 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 5/5 | 0 | 0/5 | 0/5 | 0/5 | 0 |
| gracile | 111 | 5.6 | 0 | 15 | 0 | 7 | 3 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 5/5 | 1 | 0/5 | 0/5 | 0/5 | 0 |
| react-router | 83 | 7.2 | 13 | 9 | 0 | 5 | 3 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 5/5 | 2 | 0/5 | 0/5 | 5/5 | 0 |
| tanstack-start | 99 | 4.5 | 15 | 7 | 0 | 2 | 3 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 5/5 | 6 | 0/5 | 0/5 | 0/5 | 1 |
| solidstart | 104 | 8.7 | 14 | 8 | 0 | 8 | 7 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 5/5 | 0 | 0/5 | 0/5 | 0/5 | 1 |
| vanilla | 77 | 10.4 | 8 | 9 | 0 | 7 | 5 | 1 | 0 | 2 | 0 | 0 | 0 | 0 | 5/5 | 0 | 0/5 | 0/5 | 0/5 | 0 |
| hono-htmx | 92 | 5.4 | 5 | 9 | 0 | 5 | 4 | 1 | 0 | 2 | 0 | 0 | 0 | 0 | 5/5 | 5 | 0/5 | 0/5 | 1/5 | 0 |
| angular | 108 | 7.0 | 32 | 12 | 0 | 7 | 7 | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 5/5 | 0 | 2/5 | 0/5 | 4/5 | 0 |
| next | 133 | 5.6 | 27 | 3 | 0 | 6 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5/5 | 9 | 3/5 | 0/5 | 1/5 | 0 |
| qwik | 136 | 5.5 | 0 | 15 | 0 | 7 | 4 | 1 | 0 | 4 | 0 | 0 | 0 | 0 | 5/5 | 1 | 0/5 | 0/5 | 0/5 | 0 |
| sveltekit | 145 | 5.6 | 17 | 12 | 0 | 7 | 5 | 2 | 0 | 4 | 2 | 0 | 0 | 0 | 5/5 | 1 | 1/5 | 2/5 | 2/5 | 0 |
| astro | 154 | 7.1 | 17 | 12 | 0 | 8 | 5 | 1 | 0 | 4 | 0 | 0 | 0 | 0 | 5/5 | 10 | 3/5 | 0/5 | 0/5 | 0 |


## Judge scores (1–5)

Median of samples, then of iterations. Experimentalness is descriptive, not better-is-higher: it is the `reach` criterion (5 = central features rest on experimental APIs, 1 = only long-stable APIs), and `n exp.` is the count of distinct experimental APIs.

| Framework | editability | experimental | n exp. | forward-thinking | mergeability | tests | trace |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| nuxt | 4.0 (4.0) | 1.0 (1.0) | 0 (0) | 3.5 (4.0) | 4.0 (4.0) | 1.0 (1.0) | 4.5 |
| gracile | 3.5 (4.0) | 3.0 (2.5) | 0 (1.5) | 4.0 (4.5) | 3.0 (4.0) | 1.0 (1.0) | 4.5 |
| react-router | 3.5 (4.0) | 1.0 (1.0) | 0 (0) | 3.5 (4.0) | 3.0 (4.0) | 1.0 (1.0) | 4.5 |
| tanstack-start | 3.5 (4.0) | 3.0 (3.0) | 1 (0) | 4.0 (4.0) | 4.0 (4.0) | 1.0 (1.0) | 4.5 |
| solidstart | 3.0 (4.0) | 3.0 (3.0) | 1 (1) | 4.0 (4.5) | 3.0 (4.0) | 1.0 (1.0) | 4.0 |
| vanilla | 3.5 (4.0) | 1.5 (2.0) | 0 (0) | 4.0 (4.0) | 4.0 (4.0) | 1.0 (1.0) | 4.0 |
| hono-htmx | 3.0 (4.0) | 1.5 (2.5) | 0 (0) | 4.0 (4.0) | 3.5 (4.0) | 1.0 (1.0) | 4.0 |
| angular | 4.0 (4.0) | 2.0 (3.0) | 0 (0) | 4.0 (4.0) | 3.5 (4.0) | 1.0 (2.5) | 4.5 |
| next | 3.5 (4.0) | 1.0 (1.0) | 0 (0) | 3.5 (4.0) | 4.0 (4.0) | 1.0 (1.0) | 4.5 |
| qwik | 3.5 (4.0) | 1.0 (1.0) | 0 (0) | 4.0 (4.0) | 3.0 (4.0) | 1.0 (1.0) | 4.0 |
| sveltekit | 3.5 (4.0) | 3.0 (3.0) | 0 (0) | 4.0 (5.0) | 4.0 (4.0) | 1.0 (1.0) | 4.0 |
| astro | 3.0 (4.0) | 1.0 (1.0) | 0 (0) | 4.0 (4.0) | 3.5 (4.0) | 1.0 (1.0) | 4.0 |

## Judge detail: editability



| Framework | removability | changeability | coupling | abstraction_design |
| --- | ---: | ---: | ---: | ---: |
| nuxt | 4.0 (4.5) | 4.0 (4.0) | 3.5 (4.0) | 3.0 (4.0) |
| gracile | 3.5 (4.0) | 3.5 (3.5) | 3.5 (4.0) | 3.0 (4.0) |
| react-router | 4.0 (4.0) | 3.0 (3.5) | 4.0 (4.0) | 3.0 (4.0) |
| tanstack-start | 3.0 (3.5) | 3.5 (4.0) | 4.0 (4.0) | 3.5 (4.0) |
| solidstart | 3.5 (3.5) | 3.0 (4.0) | 3.5 (5.0) | 3.0 (4.0) |
| vanilla | 3.0 (4.0) | 4.0 (4.0) | 3.5 (4.0) | 3.0 (4.0) |
| hono-htmx | 3.0 (3.5) | 3.5 (3.5) | 3.0 (4.0) | 3.0 (4.0) |
| angular | 4.0 (4.0) | 3.0 (4.0) | 4.0 (4.0) | 3.0 (4.0) |
| next | 4.0 (4.0) | 3.0 (4.0) | 4.0 (4.0) | 3.0 (4.0) |
| qwik | 3.5 (4.0) | 3.5 (4.0) | 4.0 (4.5) | 3.0 (4.0) |
| sveltekit | 3.5 (4.0) | 3.0 (4.0) | 4.0 (4.5) | 4.0 (4.0) |
| astro | 4.5 (5.0) | 3.0 (4.0) | 3.0 (4.0) | 3.0 (4.0) |

## Judge detail: experimental



| Framework | reach | containment | justification |
| --- | ---: | ---: | ---: |
| nuxt | 1.0 (1.0) | 5.0 (5.0) | 5.0 (5.0) |
| gracile | 3.0 (2.5) | 4.5 (4.5) | 5.0 (4.5) |
| react-router | 1.0 (1.0) | 5.0 (5.0) | 5.0 (5.0) |
| tanstack-start | 3.0 (3.0) | 5.0 (4.5) | 5.0 (5.0) |
| solidstart | 3.0 (3.0) | 5.0 (5.0) | 5.0 (5.0) |
| vanilla | 1.5 (2.0) | 5.0 (5.0) | 5.0 (5.0) |
| hono-htmx | 1.5 (2.5) | 5.0 (5.0) | 5.0 (5.0) |
| angular | 2.0 (3.0) | 4.0 (4.5) | 5.0 (4.5) |
| next | 1.0 (1.0) | 5.0 (5.0) | 5.0 (5.0) |
| qwik | 1.0 (1.0) | 5.0 (5.0) | 5.0 (5.0) |
| sveltekit | 3.0 (3.0) | 5.0 (5.0) | 4.5 (5.0) |
| astro | 1.0 (1.0) | 5.0 (5.0) | 5.0 (5.0) |

## Judge detail: forward-thinking



| Framework | latest_apis | platform | dependencies | churn_resistance |
| --- | ---: | ---: | ---: | ---: |
| nuxt | 4.5 (4.5) | 3.5 (4.5) | 5.0 (5.0) | 3.0 (3.5) |
| gracile | 5.0 (5.0) | 4.0 (5.0) | 5.0 (4.5) | 3.0 (4.0) |
| react-router | 3.5 (5.0) | 4.0 (4.0) | 4.5 (4.0) | 3.0 (4.0) |
| tanstack-start | 4.5 (5.0) | 4.0 (4.0) | 5.0 (5.0) | 4.0 (4.0) |
| solidstart | 4.5 (5.0) | 4.0 (4.5) | 5.0 (5.0) | 3.0 (4.0) |
| vanilla | 4.0 (5.0) | 4.0 (4.0) | 5.0 (5.0) | 4.0 (4.0) |
| hono-htmx | 4.5 (5.0) | 4.0 (4.0) | 5.0 (5.0) | 3.0 (3.5) |
| angular | 4.0 (4.5) | 4.0 (5.0) | 3.5 (4.0) | 4.0 (4.0) |
| next | 3.0 (3.5) | 4.0 (4.5) | 5.0 (5.0) | 3.0 (4.0) |
| qwik | 4.0 (5.0) | 4.0 (4.0) | 3.5 (4.0) | 3.5 (4.0) |
| sveltekit | 4.0 (5.0) | 4.0 (4.5) | 5.0 (5.0) | 4.0 (4.0) |
| astro | 4.5 (4.5) | 4.5 (4.5) | 5.0 (5.0) | 3.5 (4.0) |

## Judge detail: mergeability



| Framework | idiomatic | correctness_risks | global_abstractions | readability | review_cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| nuxt | 4.0 (4.5) | 3.0 (4.0) | 3.5 (4.0) | 4.0 (4.5) | 3.0 (4.0) |
| gracile | 4.0 (4.0) | 3.0 (4.0) | 3.0 (4.0) | 3.5 (5.0) | 3.0 (4.0) |
| react-router | 3.0 (4.5) | 3.0 (3.5) | 3.5 (4.0) | 3.5 (4.0) | 3.0 (4.0) |
| tanstack-start | 4.0 (5.0) | 3.5 (4.0) | 3.5 (4.5) | 4.0 (4.0) | 3.0 (4.0) |
| solidstart | 3.5 (5.0) | 3.0 (3.0) | 3.0 (4.0) | 4.0 (4.0) | 3.0 (4.0) |
| vanilla | 4.0 (4.0) | 3.0 (3.5) | 3.5 (4.0) | 4.0 (4.5) | 4.0 (4.0) |
| hono-htmx | 4.0 (5.0) | 3.5 (4.0) | 3.0 (4.0) | 3.5 (4.0) | 3.5 (4.0) |
| angular | 3.5 (4.5) | 3.0 (4.0) | 4.0 (4.0) | 4.0 (5.0) | 3.0 (4.0) |
| next | 3.0 (4.0) | 3.5 (4.0) | 4.0 (4.0) | 4.0 (4.0) | 3.5 (4.0) |
| qwik | 4.0 (4.0) | 3.0 (3.5) | 3.0 (4.0) | 4.0 (4.0) | 3.0 (4.0) |
| sveltekit | 4.0 (5.0) | 3.5 (4.0) | 4.0 (4.5) | 4.0 (4.5) | 3.5 (4.0) |
| astro | 4.0 (4.0) | 3.0 (3.5) | 3.5 (3.5) | 3.0 (4.0) | 3.0 (4.0) |

## Judge detail: tests



| Framework | coverage_of_risk | behaviour_not_implementation | regression_power | signal_to_noise |
| --- | ---: | ---: | ---: | ---: |
| nuxt | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |
| gracile | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |
| react-router | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |
| tanstack-start | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |
| solidstart | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |
| vanilla | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |
| hono-htmx | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |
| angular | 1.0 (1.5) | 1.0 (3.5) | 1.0 (2.5) | 3.0 (4.5) |
| next | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |
| qwik | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |
| sveltekit | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |
| astro | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |

## Judge detail: trace



| Framework | circularity | debugging | verification_quality | tool_use | planning |
| --- | ---: | ---: | ---: | ---: | ---: |
| nuxt | 4.5 | 5.0 | 5.0 | 4.0 | 5.0 |
| gracile | 5.0 | 4.5 | 5.0 | 3.5 | 5.0 |
| react-router | 5.0 | 4.0 | 5.0 | 4.0 | 5.0 |
| tanstack-start | 4.5 | 4.5 | 5.0 | 4.0 | 5.0 |
| solidstart | 4.0 | 4.5 | 4.0 | 3.0 | 4.0 |
| vanilla | 4.0 | 4.5 | 5.0 | 3.5 | 5.0 |
| hono-htmx | 4.0 | 4.0 | 5.0 | 3.5 | 5.0 |
| angular | 4.5 | 4.5 | 4.5 | 4.0 | 5.0 |
| next | 4.5 | 4.5 | 5.0 | 3.5 | 4.5 |
| qwik | 4.0 | 4.0 | 5.0 | 4.0 | 4.0 |
| sveltekit | 4.0 | 4.5 | 5.0 | 3.5 | 4.5 |
| astro | 4.0 | 4.5 | 5.0 | 4.0 | 4.5 |

## Iterations

| Iteration | Tests | Tokens (M) | Cost ($) | Turns | Significant LOC | Notes |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| angular-1 | pass | 6.13 | 0.14 | 71 | 1134 |  |
| angular-2 | pass | 11.04 | 0.18 | 101 | 1100 |  |
| angular-3 | pass | 11.66 | 0.18 | 112 | 1024 |  |
| angular-4 | pass | 9.09 | 0.18 | 90 | 1040 |  |
| angular-5 | pass | 7.04 | 0.12 | 75 | 983 |  |
| astro-1 | pass | 13.51 | 0.19 | 128 | 869 |  |
| astro-2 | pass | 12.53 | 0.22 | 107 | 812 |  |
| astro-3 | pass | 4.66 | 0.11 | 65 | 806 |  |
| astro-4 | pass | 13.23 | 0.22 | 122 | 873 |  |
| astro-5 | pass | 21.82 | 0.29 | 169 | 822 |  |
| gracile-1 | pass | 9.33 | 0.11 | 84 | 939 |  |
| gracile-2 | pass | 10.38 | 0.12 | 87 | 890 |  |
| gracile-3 | pass | 7.45 | 0.11 | 76 | 792 |  |
| gracile-4 | pass | 9.68 | 0.20 | 83 | 1052 |  |
| gracile-5 | pass | 10.80 | 0.14 | 118 | 848 |  |
| hono-htmx-1 | pass | 3.88 | 0.11 | 47 | 835 |  |
| hono-htmx-2 | pass | 6.90 | 0.14 | 70 | 762 |  |
| hono-htmx-3 | pass | 8.58 | 0.15 | 78 | 793 |  |
| hono-htmx-4 | pass | 7.20 | 0.12 | 84 | 764 |  |
| hono-htmx-5 | pass | 10.77 | 0.17 | 100 | 718 |  |
| next-1 | pass | 13.90 | 0.19 | 120 | 868 |  |
| next-2 | pass | 8.65 | 0.12 | 95 | 868 |  |
| next-3 | pass | 12.34 | 0.22 | 108 | 870 |  |
| next-4 | pass | 13.12 | 0.27 | 120 | 782 |  |
| next-5 | pass | 7.53 | 0.13 | 90 | 976 |  |
| nuxt-1 | pass | 4.50 | 0.09 | 55 | 734 |  |
| nuxt-2 | pass | 3.83 | 0.10 | 48 | 857 |  |
| nuxt-3 | pass | 4.60 | 0.12 | 54 | 816 |  |
| nuxt-4 | pass | 3.97 | 0.10 | 44 | 1094 |  |
| nuxt-5 | pass | 6.97 | 0.13 | 84 | 832 |  |
| qwik-1 | fail | 13.80 | 0.18 | 124 | 963 |  |
| qwik-2 | pass | 25.96 | 0.18 | 172 | 1330 |  |
| qwik-3 | pass | 6.01 | 0.30 | 71 | 810 |  |
| qwik-4 | pass | 13.18 | 0.20 | 118 | 863 |  |
| qwik-5 | pass | 9.49 | 0.43 | 97 | 939 |  |
| react-router-1 | pass | 4.24 | 0.08 | 64 | 873 |  |
| react-router-2 | pass | 8.44 | 0.17 | 83 | 866 |  |
| react-router-3 | pass | 3.68 | 0.11 | 49 | 879 |  |
| react-router-4 | pass | 5.27 | 0.13 | 58 | 833 |  |
| react-router-5 | pass | 6.08 | 0.12 | 72 | 884 |  |
| solidstart-1 | pass | 5.78 | 0.12 | 65 | 875 |  |
| solidstart-2 | pass | 12.77 | 0.17 | 96 | 897 |  |
| solidstart-3 | pass | 12.41 | 0.44 | 124 | 926 |  |
| solidstart-4 | pass | 6.66 | 0.12 | 65 | 944 |  |
| solidstart-5 | pass | 10.71 | 0.13 | 95 | 970 |  |
| sveltekit-1 | pass | 20.42 | 0.26 | 160 | 797 |  |
| sveltekit-2 | pass | 11.29 | 0.21 | 108 | 761 |  |
| sveltekit-3 | pass | 9.23 | 0.19 | 90 | 833 |  |
| sveltekit-4 | pass | 10.15 | 0.12 | 98 | 774 |  |
| sveltekit-5 | pass | 24.55 | 0.33 | 154 | 780 |  |
| tanstack-start-1 | pass | 6.34 | 0.13 | 61 | 888 |  |
| tanstack-start-2 | pass | 5.18 | 0.12 | 61 | 887 |  |
| tanstack-start-3 | pass | 6.79 | 0.15 | 76 | 946 |  |
| tanstack-start-4 | pass | 8.83 | 0.13 | 81 | 930 |  |
| tanstack-start-5 | pass | 7.97 | 0.10 | 100 | 935 |  |
| vanilla-1 | pass | 4.61 | 0.12 | 56 | 849 |  |
| vanilla-2 | pass | 5.91 | 0.11 | 66 | 857 |  |
| vanilla-3 | pass | 5.17 | 0.14 | 61 | 1097 |  |
| vanilla-4 | pass | 7.39 | 0.15 | 73 | 762 |  |
| vanilla-5 | pass | 13.02 | 0.24 | 108 | 1145 |  |
