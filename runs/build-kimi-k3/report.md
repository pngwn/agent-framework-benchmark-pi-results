# Pokédex benchmark: build task

Model `moonshotai/Kimi-K3` (HF provider: deepinfra), thinking `high`, pi 1.4.0. 5 iteration(s) per framework; values are medians.
Values in parentheses are the Opus 5.5 medians from Nolan Lawson's published build-task runs, judged the same way.

## Agent cost and page loads (upstream metrics)

`Tests`: the final acceptance run, as upstream. `Retests`: extra runs of the same tests in clean containers (harness/retest.mjs), to tell flaky results from real ones. Cost is pi's estimate from the model catalog prices, not an invoice. Lighthouse is the home page on mobile, as upstream; in parentheses, Opus 5.5's apps re-measured on the same machine.

| Framework | Tests | Retests | Tokens (M) | Output (k) | Cost ($) | Time (min) | Turns | Perf | LCP (ms) | TBT (ms) | JS (KiB) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| react-router | 5/5 | 10/10 | 5.33 | 59 | 1.81 | 15.2 | 74 | 98 (99) | 1881 (1735) | 40 (0) | 117 (115) |
| vanilla | 5/5 | 10/10 | 4.42 | 57 | 1.86 | 19.3 | 65 | 100 (97) | 1528 (1528) | 0 (0) | 2 (7) |
| tanstack-start | 5/5 | 10/10 | 6.68 | 62 | 1.86 | 18.7 | 84 | 99 (99) | 1858 (1961) | 84 (26) | 116 (118) |
| hono-htmx | 5/5 | 10/10 | 5.16 | 54 | 1.91 | 16.8 | 69 | 100 (100) | 984 (1030) | 0 (0) | 18 (18) |
| next | 5/5 | 10/10 | 6.97 | 58 | 2.02 | 16.7 | 94 | 97 (98) | 1948 (2087) | 186 (102) | 136 (142) |
| sveltekit | 5/5 | 10/10 | 9.74 | 71 | 2.12 | 20.5 | 99 | 100 (100) | 1203 (1174) | 0 (0) | 35 (36) |
| nuxt | 5/5 | 10/10 | 6.42 | 69 | 2.13 | 20.2 | 76 | 98 (99) | 2073 (1773) | 77 (63) | 87 (84) |
| qwik | 5/5 | 10/10 | 6.93 | 72 | 2.16 | 38.1 | 83 | 100 (100) | 1248 (1030) | 0 (14) | 39 (40) |
| gracile | 5/5 | 10/10 | 9.44 | 72 | 2.22 | 32.9 | 101 | 100 (100) | 1684 (981) | 0 (0) | 2 (8) |
| astro | 5/5 | 10/10 | 5.26 | 63 | 2.25 | 35.2 | 66 | 100 (100) | 1533 (830) | 0 (0) | 0 (0) |
| solidstart | 4/5 | 8/10 | 7.56 | 70 | 2.31 | 16.8 | 94 | 100 (100) | 1284 (1207) | 23 (19) | 40 (40) |
| angular | 5/5 | 9/10 | 10.02 | 82 | 2.81 | 27.1 | 103 | 93 (96) | 2284 (1937) | 252 (105) | 102 (93) |

## Code size: significant code vs. lines

`LOC` is upstream's count. `Significant` drops CSS, config/entry boilerplate, imports, type declarations, comments and bare punctuation/closing tags. `Concepts` counts distinct framework vocabulary (package imports, ambient APIs like runes or auto-imports, template directives, file conventions).

| Framework | LOC | Significant | Script | Template | CSS | Tokens (k) | Functions | Complexity | Concepts | Deps | Test cases |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| react-router | 1770 (1564) | 750 (694) | 743 | 389 | 433 | 9.2 | 145 | 172 | 49 (56) | 11 | 0 |
| vanilla | 1380 (1492) | 677 (665) | 915 | 10 | 442 | 7.1 | 120 | 206 | 5 (6) | 1 | 0 |
| tanstack-start | 28113 (1697) | 808 (725) | 834 | 393 | 445 | 9.2 | 165 | 179 | 47 (53) | 11 | 0 |
| hono-htmx | 1256 (1370) | 588 (631) | 506 | 251 | 438 | 6.0 | 122 | 162 | 11 (51) | 3 | 0 |
| next | 3414 (1539) | 670 (673) | 611 | 360 | 442 | 7.9 | 137 | 150 | 40 (47) | 3 | 0 |
| sveltekit | 27721 (1611) | 661 (643) | 567 | 335 | 501 | 8.1 | 87 | 129 | 16 (19) | 5 | 0 |
| nuxt | 16901 (1415) | 675 (613) | 618 | 335 | 473 | 9.3 | 116 | 152 | 38 (44) | 3 | 0 |
| qwik | 2102 (1744) | 951 (733) | 1040 | 418 | 491 | 14.6 | 202 | 332 | 54 (57) | 7 | 0 |
| gracile | 3110 (1717) | 828 (743) | 818 | 390 | 521 | 7.2 | 139 | 162 | 12 (13) | 4 | 0 |
| astro | 1669 (1461) | 656 (592) | 580 | 378 | 462 | 8.7 | 92 | 133 | 4 (4) | 2 | 0 |
| solidstart | 1584 (1630) | 722 (720) | 676 | 439 | 444 | 9.1 | 155 | 156 | 49 (52) | 6 | 0 |
| angular | 1963 (1944) | 868 (885) | 1347 | 161 | 422 | 9.6 | 134 | 123 | 45 (50) | 20 | 0 |

## Trace: failures, loops and verification

`Edit/write`: edit and write tool calls; `Bash writes`: files changed through bash instead (sed -i, heredoc scripts, redirects). `Fix cycles`: failing test runs followed by edits and another run. `Stuck`: tests failing in 3+ consecutive runs. `Repeats`: identical tool calls. `Re-reads`: full reads of a file unchanged since the last read. `Reverts`: edits restoring text an earlier edit removed. `Loopy thinking`: thinking blocks mostly repeating an earlier one. `Verified`: iterations whose last code change was followed by a full passing test run.

| Framework | Tool calls | Failed % | Edit/write | Bash writes | Edit misses | Bash ≠0 | Test runs | Fix cycles | Stuck | Repeats | Re-reads | Reverts | Loopy thinking | Compactions | Verified | Browser | MCP used | Tool CLI used | Skills used | Searches |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| react-router | 105 | 5.7 | 27 | 1 | 0 | 5 | 2 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 5/5 | 8 | 0/5 | 0/5 | 5/5 | 0 |
| vanilla | 90 | 4.7 | 21 | 1 | 0 | 4 | 3 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 5/5 | 8 | 0/5 | 0/5 | 0/5 | 0 |
| tanstack-start | 102 | 5.4 | 21 | 2 | 0 | 5 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5/5 | 10 | 0/5 | 0/5 | 0/5 | 1 |
| hono-htmx | 92 | 5.9 | 18 | 1 | 0 | 5 | 4 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 5/5 | 8 | 0/5 | 1/5 | 5/5 | 0 |
| next | 125 | 6.1 | 26 | 1 | 0 | 4 | 3 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 5/5 | 11 | 2/5 | 0/5 | 1/5 | 0 |
| sveltekit | 144 | 6.4 | 34 | 1 | 0 | 10 | 5 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 5/5 | 2 | 4/5 | 1/5 | 5/5 | 0 |
| nuxt | 106 | 6.3 | 29 | 1 | 0 | 7 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5/5 | 10 | 0/5 | 0/5 | 0/5 | 0 |
| qwik | 111 | 6.3 | 30 | 0 | 0 | 6 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5/5 | 8 | 0/5 | 0/5 | 0/5 | 0 |
| gracile | 131 | 6.1 | 28 | 1 | 1 | 6 | 3 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 5/5 | 10 | 0/5 | 0/5 | 0/5 | 0 |
| astro | 94 | 4.3 | 23 | 1 | 0 | 4 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5/5 | 9 | 4/5 | 0/5 | 0/5 | 0 |
| solidstart | 117 | 5.4 | 25 | 1 | 0 | 4 | 4 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 5/5 | 10 | 0/5 | 0/5 | 0/5 | 0 |
| angular | 140 | 6.0 | 37 | 1 | 1 | 6 | 4 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 5/5 | 16 | 3/5 | 0/5 | 5/5 | 0 |


## Judge scores (1–5)

Median of samples, then of iterations. Experimentalness is descriptive, not better-is-higher: it is the `reach` criterion (5 = central features rest on experimental APIs, 1 = only long-stable APIs), and `n exp.` is the count of distinct experimental APIs.

| Framework | editability | experimental | n exp. | forward-thinking | mergeability | tests | trace |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| react-router | 4.0 (4.0) | 1.0 (1.0) | 0 (0) | 4.0 (4.0) | 3.5 (4.0) | 1.0 (1.0) | 4.8 |
| vanilla | 4.0 (4.0) | 1.0 (2.0) | 0 (0) | 4.0 (4.0) | 3.5 (4.0) | 1.0 (1.0) | 4.5 |
| tanstack-start | 4.0 (4.0) | 3.0 (3.0) | 1 (0) | 4.0 (4.0) | 4.0 (4.0) | 1.0 (1.0) | 5.0 |
| hono-htmx | 4.0 (4.0) | 1.0 (2.5) | 0 (0) | 4.0 (4.0) | 4.0 (4.0) | 1.0 (1.0) | 5.0 |
| next | 4.0 (4.0) | 1.0 (1.0) | 0 (0) | 4.0 (4.0) | 4.0 (4.0) | 1.0 (1.0) | 4.5 |
| sveltekit | 4.0 (4.0) | 3.0 (3.0) | 0 (0) | 4.5 (5.0) | 4.0 (4.0) | 1.0 (1.0) | 4.0 |
| nuxt | 3.5 (4.0) | 1.0 (1.0) | 0 (0) | 4.0 (4.0) | 4.0 (4.0) | 1.0 (1.0) | 4.5 |
| qwik | 4.0 (4.0) | 1.0 (1.0) | 0 (0) | 4.0 (4.0) | 4.0 (4.0) | 1.0 (1.0) | 4.0 |
| gracile | 4.0 (4.0) | 3.0 (2.5) | 1 (1.5) | 4.0 (4.5) | 4.0 (4.0) | 1.0 (1.0) | 5.0 |
| astro | 3.0 (4.0) | 1.0 (1.0) | 0 (0) | 4.0 (4.0) | 4.0 (4.0) | 1.0 (1.0) | 4.0 |
| solidstart | 4.0 (4.0) | 3.0 (3.0) | 1 (1) | 4.0 (4.5) | 4.0 (4.0) | 1.0 (1.0) | 5.0 |
| angular | 4.0 (4.0) | 2.5 (3.0) | 0 (0) | 4.0 (4.0) | 4.0 (4.0) | 1.0 (2.5) | 4.0 |

## Judge detail: editability



| Framework | removability | changeability | coupling | abstraction_design |
| --- | ---: | ---: | ---: | ---: |
| react-router | 4.0 (4.0) | 3.5 (3.5) | 4.0 (4.0) | 3.5 (4.0) |
| vanilla | 4.0 (4.0) | 4.0 (4.0) | 4.0 (4.0) | 3.0 (4.0) |
| tanstack-start | 3.5 (3.5) | 4.0 (4.0) | 4.0 (4.0) | 4.0 (4.0) |
| hono-htmx | 3.5 (3.5) | 3.5 (3.5) | 3.5 (4.0) | 3.5 (4.0) |
| next | 4.5 (4.0) | 4.0 (4.0) | 4.0 (4.0) | 3.0 (4.0) |
| sveltekit | 4.5 (4.0) | 4.0 (4.0) | 4.0 (4.5) | 4.0 (4.0) |
| nuxt | 3.5 (4.5) | 3.5 (4.0) | 4.0 (4.0) | 3.0 (4.0) |
| qwik | 4.0 (4.0) | 3.5 (4.0) | 4.0 (4.5) | 3.0 (4.0) |
| gracile | 4.5 (4.0) | 3.5 (3.5) | 4.0 (4.0) | 3.5 (4.0) |
| astro | 4.0 (5.0) | 3.0 (4.0) | 4.0 (4.0) | 3.0 (4.0) |
| solidstart | 4.0 (3.5) | 4.0 (4.0) | 4.0 (5.0) | 3.5 (4.0) |
| angular | 4.0 (4.0) | 4.0 (4.0) | 4.0 (4.0) | 4.0 (4.0) |

## Judge detail: experimental



| Framework | reach | containment | justification |
| --- | ---: | ---: | ---: |
| react-router | 1.0 (1.0) | 5.0 (5.0) | 5.0 (5.0) |
| vanilla | 1.0 (2.0) | 5.0 (5.0) | 5.0 (5.0) |
| tanstack-start | 3.0 (3.0) | 5.0 (4.5) | 5.0 (5.0) |
| hono-htmx | 1.0 (2.5) | 5.0 (5.0) | 5.0 (5.0) |
| next | 1.0 (1.0) | 5.0 (5.0) | 5.0 (5.0) |
| sveltekit | 3.0 (3.0) | 5.0 (5.0) | 5.0 (5.0) |
| nuxt | 1.0 (1.0) | 5.0 (5.0) | 5.0 (5.0) |
| qwik | 1.0 (1.0) | 5.0 (5.0) | 5.0 (5.0) |
| gracile | 3.0 (2.5) | 3.5 (4.5) | 4.5 (4.5) |
| astro | 1.0 (1.0) | 5.0 (5.0) | 5.0 (5.0) |
| solidstart | 3.0 (3.0) | 5.0 (5.0) | 5.0 (5.0) |
| angular | 2.5 (3.0) | 5.0 (4.5) | 5.0 (4.5) |

## Judge detail: forward-thinking



| Framework | latest_apis | platform | dependencies | churn_resistance |
| --- | ---: | ---: | ---: | ---: |
| react-router | 4.5 (5.0) | 4.8 (4.0) | 4.8 (4.0) | 3.8 (4.0) |
| vanilla | 4.5 (5.0) | 4.0 (4.0) | 5.0 (5.0) | 3.5 (4.0) |
| tanstack-start | 5.0 (5.0) | 4.0 (4.0) | 5.0 (5.0) | 4.0 (4.0) |
| hono-htmx | 4.5 (5.0) | 4.0 (4.0) | 4.0 (5.0) | 4.0 (3.5) |
| next | 3.5 (3.5) | 4.0 (4.5) | 5.0 (5.0) | 4.0 (4.0) |
| sveltekit | 4.5 (5.0) | 4.5 (4.5) | 5.0 (5.0) | 4.0 (4.0) |
| nuxt | 4.0 (4.5) | 4.0 (4.5) | 4.5 (5.0) | 4.0 (3.5) |
| qwik | 4.3 (5.0) | 4.3 (4.0) | 4.3 (4.0) | 3.3 (4.0) |
| gracile | 5.0 (5.0) | 4.0 (5.0) | 4.0 (4.5) | 3.5 (4.0) |
| astro | 4.5 (4.5) | 4.0 (4.5) | 5.0 (5.0) | 3.5 (4.0) |
| solidstart | 5.0 (5.0) | 4.0 (4.5) | 5.0 (5.0) | 3.5 (4.0) |
| angular | 4.5 (4.5) | 4.0 (5.0) | 4.0 (4.0) | 4.0 (4.0) |

## Judge detail: mergeability



| Framework | idiomatic | correctness_risks | global_abstractions | readability | review_cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| react-router | 3.5 (4.5) | 3.0 (3.5) | 4.0 (4.0) | 4.0 (4.0) | 3.5 (4.0) |
| vanilla | 4.0 (4.0) | 3.0 (3.5) | 4.0 (4.0) | 4.0 (4.5) | 3.5 (4.0) |
| tanstack-start | 4.5 (5.0) | 3.5 (4.0) | 3.5 (4.5) | 4.0 (4.0) | 4.0 (4.0) |
| hono-htmx | 4.0 (5.0) | 3.0 (4.0) | 3.5 (4.0) | 4.0 (4.0) | 4.0 (4.0) |
| next | 4.0 (4.0) | 3.5 (4.0) | 4.0 (4.0) | 5.0 (4.0) | 4.0 (4.0) |
| sveltekit | 5.0 (5.0) | 3.5 (4.0) | 4.0 (4.5) | 5.0 (4.5) | 4.0 (4.0) |
| nuxt | 4.0 (4.5) | 3.0 (4.0) | 3.5 (4.0) | 4.0 (4.5) | 3.5 (4.0) |
| qwik | 4.0 (4.0) | 4.0 (3.5) | 4.0 (4.0) | 4.0 (4.0) | 4.0 (4.0) |
| gracile | 4.5 (4.0) | 4.0 (4.0) | 4.0 (4.0) | 4.5 (5.0) | 4.0 (4.0) |
| astro | 4.0 (4.0) | 3.8 (3.5) | 3.8 (3.5) | 4.0 (4.0) | 4.0 (4.0) |
| solidstart | 5.0 (5.0) | 3.0 (3.0) | 4.0 (4.0) | 4.0 (4.0) | 4.0 (4.0) |
| angular | 4.0 (4.5) | 3.5 (4.0) | 4.0 (4.0) | 4.0 (5.0) | 3.5 (4.0) |

## Judge detail: tests



| Framework | coverage_of_risk | behaviour_not_implementation | regression_power | signal_to_noise |
| --- | ---: | ---: | ---: | ---: |
| react-router | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |
| vanilla | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |
| tanstack-start | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |
| hono-htmx | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |
| next | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |
| sveltekit | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |
| nuxt | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |
| qwik | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |
| gracile | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |
| astro | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |
| solidstart | 1.0 (1.0) | 1.0 (1.0) | 1.0 (1.0) | 3.0 (3.0) |
| angular | 1.0 (1.5) | 1.0 (3.5) | 1.0 (2.5) | 3.0 (4.5) |

## Judge detail: trace



| Framework | circularity | debugging | verification_quality | tool_use | planning |
| --- | ---: | ---: | ---: | ---: | ---: |
| react-router | 4.0 | 4.5 | 5.0 | 4.0 | 5.0 |
| vanilla | 4.5 | 4.5 | 5.0 | 4.0 | 5.0 |
| tanstack-start | 5.0 | 5.0 | 5.0 | 4.0 | 5.0 |
| hono-htmx | 5.0 | 5.0 | 5.0 | 4.0 | 5.0 |
| next | 4.5 | 4.5 | 5.0 | 4.0 | 5.0 |
| sveltekit | 4.0 | 5.0 | 5.0 | 4.0 | 4.5 |
| nuxt | 4.5 | 4.0 | 5.0 | 3.5 | 5.0 |
| qwik | 4.0 | 4.0 | 5.0 | 4.0 | 5.0 |
| gracile | 4.5 | 4.5 | 5.0 | 4.0 | 5.0 |
| astro | 3.3 | 4.5 | 5.0 | 3.3 | 5.0 |
| solidstart | 4.5 | 4.0 | 5.0 | 4.0 | 5.0 |
| angular | 4.0 | 5.0 | 5.0 | 4.0 | 5.0 |

## Iterations

| Iteration | Tests | Tokens (M) | Cost ($) | Turns | Significant LOC | Notes |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| angular-1 | pass | 10.02 | 2.90 | 103 | 868 |  |
| angular-2 | pass | 9.25 | 2.30 | 84 | 816 |  |
| angular-3 | pass | 10.71 | 2.42 | 101 | 937 |  |
| angular-4 | pass | 12.41 | 2.81 | 117 | 835 |  |
| angular-5 | pass | 9.86 | 2.95 | 105 | 982 |  |
| astro-1 | pass | 11.13 | 2.35 | 113 | 643 |  |
| astro-2 | pass | 4.23 | 1.84 | 62 | 669 |  |
| astro-3 | pass | 10.81 | 3.58 | 114 | 656 |  |
| astro-4 | pass | 3.39 | 1.46 | 52 | 584 |  |
| astro-5 | pass | 5.26 | 2.25 | 66 | 695 |  |
| gracile-1 | pass | 7.57 | 1.86 | 97 | 828 |  |
| gracile-2 | pass | 7.47 | 1.88 | 86 | 827 |  |
| gracile-3 | pass | 9.44 | 2.62 | 101 | 875 |  |
| gracile-4 | pass | 10.70 | 2.22 | 115 | 1048 |  |
| gracile-5 | pass | 10.76 | 2.65 | 113 | 742 |  |
| hono-htmx-1 | pass | 4.80 | 1.53 | 69 | 621 |  |
| hono-htmx-2 | pass | 4.31 | 1.70 | 60 | 588 |  |
| hono-htmx-3 | pass | 5.91 | 1.91 | 83 | 518 |  |
| hono-htmx-4 | pass | 5.69 | 1.97 | 78 | 630 |  |
| hono-htmx-5 | pass | 5.16 | 1.95 | 66 | 586 |  |
| next-1 | pass | 8.90 | 2.53 | 96 | 673 |  |
| next-2 | pass | 6.97 | 1.83 | 94 | 614 |  |
| next-3 | pass | 8.66 | 2.58 | 101 | 681 |  |
| next-4 | pass | 4.37 | 1.84 | 60 | 648 |  |
| next-5 | pass | 5.67 | 2.02 | 80 | 670 |  |
| nuxt-1 | pass | 8.21 | 2.13 | 93 | 705 |  |
| nuxt-2 | pass | 6.42 | 2.54 | 76 | 715 |  |
| nuxt-3 | pass | 9.42 | 2.26 | 103 | 675 |  |
| nuxt-4 | pass | 4.04 | 1.89 | 52 | 660 |  |
| nuxt-5 | pass | 3.60 | 1.65 | 52 | 617 |  |
| qwik-1 | pass | 6.93 | 2.04 | 83 | 951 |  |
| qwik-2 | pass | 9.89 | 2.68 | 112 | 792 |  |
| qwik-3 | pass | 5.58 | 2.23 | 70 | 1040 |  |
| qwik-4 | pass | 6.07 | 2.16 | 78 | 753 |  |
| qwik-5 | pass | 7.53 | 2.15 | 93 | 980 |  |
| react-router-1 | pass | 5.33 | 1.81 | 72 | 744 |  |
| react-router-2 | pass | 8.33 | 2.13 | 106 | 762 |  |
| react-router-3 | pass | 6.83 | 1.96 | 91 | 750 |  |
| react-router-4 | pass | 5.33 | 1.56 | 74 | 807 |  |
| react-router-5 | pass | 5.15 | 1.67 | 71 | 685 |  |
| solidstart-1 | pass | 6.07 | 1.65 | 84 | 722 |  |
| solidstart-2 | pass | 6.16 | 1.81 | 79 | 722 |  |
| solidstart-3 | pass | 12.59 | 2.46 | 126 | 776 |  |
| solidstart-4 | fail | 9.61 | 2.31 | 108 | 731 |  |
| solidstart-5 | pass | 7.56 | 2.34 | 94 | 652 |  |
| sveltekit-1 | pass | 5.55 | 1.86 | 66 | 595 |  |
| sveltekit-2 | pass | 9.74 | 1.87 | 99 | 694 |  |
| sveltekit-3 | pass | 13.70 | 2.73 | 132 | 661 |  |
| sveltekit-4 | pass | 8.11 | 2.12 | 92 | 648 |  |
| sveltekit-5 | pass | 10.43 | 2.42 | 116 | 723 |  |
| tanstack-start-1 | pass | 6.68 | 2.10 | 89 | 890 |  |
| tanstack-start-2 | pass | 6.74 | 1.86 | 84 | 796 |  |
| tanstack-start-3 | pass | 4.58 | 1.56 | 66 | 733 |  |
| tanstack-start-4 | pass | 7.92 | 2.23 | 96 | 808 |  |
| tanstack-start-5 | pass | 5.15 | 1.84 | 70 | 809 |  |
| vanilla-1 | pass | 4.42 | 1.80 | 69 | 648 |  |
| vanilla-2 | pass | 4.33 | 2.18 | 62 | 694 |  |
| vanilla-3 | pass | 4.22 | 1.86 | 65 | 632 |  |
| vanilla-4 | pass | 4.67 | 1.64 | 64 | 731 |  |
| vanilla-5 | pass | 7.22 | 2.22 | 85 | 677 |  |
