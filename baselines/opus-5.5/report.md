# Opus 5.5 baseline (Nolan Lawson, 2026-10-26)

Values are medians across iterations.



## Code size: significant code vs. lines

`LOC` is upstream's count. `Significant` drops CSS, config/entry boilerplate, imports, type declarations, comments and bare punctuation/closing tags. `Concepts` counts distinct framework vocabulary (package imports, ambient APIs like runes or auto-imports, template directives, file conventions).

| Framework | LOC | Significant | Script | Template | CSS | Tokens (k) | Functions | Complexity | Concepts | Deps | Test cases |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| astro | 1461 | 592 | 557 | 373 | 462 | 9.3 | 93 | 138 | 4 | 2 | 0 |
| nuxt | 1415 | 613 | 610 | 315 | 439 | 9.7 | 127 | 118 | 44 | 3 | 0 |
| hono-htmx | 1370 | 631 | 511 | 405 | 452 | 9.2 | 125 | 128 | 51 | 5 | 0 |
| sveltekit | 1611 | 643 | 679 | 340 | 479 | 9.7 | 102 | 101 | 19 | 8 | 0 |
| vanilla | 1492 | 665 | 975 | 26 | 462 | 10.0 | 138 | 166 | 6 | 2 | 0 |
| next | 1539 | 673 | 721 | 388 | 442 | 10.0 | 136 | 145 | 47 | 8 | 0 |
| react-router | 1564 | 694 | 708 | 391 | 450 | 9.6 | 148 | 128 | 56 | 12 | 0 |
| solidstart | 1630 | 720 | 721 | 426 | 443 | 10.5 | 171 | 129 | 52 | 7 | 0 |
| tanstack-start | 1697 | 725 | 852 | 384 | 443 | 10.0 | 177 | 159 | 53 | 11 | 0 |
| qwik | 1744 | 733 | 706 | 404 | 445 | 9.7 | 140 | 154 | 57 | 11 | 0 |
| gracile | 1717 | 743 | 898 | 300 | 479 | 9.0 | 160 | 167 | 13 | 7 | 0 |
| angular | 1944 | 885 | 1353 | 184 | 467 | 11.2 | 163 | 141 | 50 | 18 | 3 |



## Judge scores (1–5)

Median of samples, then of iterations. Experimentalness is descriptive, not better-is-higher: it is the `reach` criterion (5 = central features rest on experimental APIs, 1 = only long-stable APIs), and `n exp.` is the count of distinct experimental APIs.

| Framework | editability | experimental | n exp. | forward-thinking | mergeability | tests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| astro | 4.0 | 1.0 | 0 | 4.0 | 4.0 | 1.0 |
| nuxt | 4.0 | 1.0 | 0 | 4.0 | 4.0 | 1.0 |
| hono-htmx | 4.0 | 2.5 | 0 | 4.0 | 4.0 | 1.0 |
| sveltekit | 4.0 | 3.0 | 0 | 5.0 | 4.0 | 1.0 |
| vanilla | 4.0 | 2.0 | 0 | 4.0 | 4.0 | 1.0 |
| next | 4.0 | 1.0 | 0 | 4.0 | 4.0 | 1.0 |
| react-router | 4.0 | 1.0 | 0 | 4.0 | 4.0 | 1.0 |
| solidstart | 4.0 | 3.0 | 1 | 4.5 | 4.0 | 1.0 |
| tanstack-start | 4.0 | 3.0 | 0 | 4.0 | 4.0 | 1.0 |
| qwik | 4.0 | 1.0 | 0 | 4.0 | 4.0 | 1.0 |
| gracile | 4.0 | 2.5 | 2 | 4.5 | 4.0 | 1.0 |
| angular | 4.0 | 3.0 | 0 | 4.0 | 4.0 | 2.5 |

## Judge detail: editability



| Framework | removability | changeability | coupling | abstraction_design |
| --- | ---: | ---: | ---: | ---: |
| astro | 5.0 | 4.0 | 4.0 | 4.0 |
| nuxt | 4.5 | 4.0 | 4.0 | 4.0 |
| hono-htmx | 3.5 | 3.5 | 4.0 | 4.0 |
| sveltekit | 4.0 | 4.0 | 4.5 | 4.0 |
| vanilla | 4.0 | 4.0 | 4.0 | 4.0 |
| next | 4.0 | 4.0 | 4.0 | 4.0 |
| react-router | 4.0 | 3.5 | 4.0 | 4.0 |
| solidstart | 3.5 | 4.0 | 5.0 | 4.0 |
| tanstack-start | 3.5 | 4.0 | 4.0 | 4.0 |
| qwik | 4.0 | 4.0 | 4.5 | 4.0 |
| gracile | 4.0 | 3.5 | 4.0 | 4.0 |
| angular | 4.0 | 4.0 | 4.0 | 4.0 |

## Judge detail: experimental



| Framework | reach | containment | justification |
| --- | ---: | ---: | ---: |
| astro | 1.0 | 5.0 | 5.0 |
| nuxt | 1.0 | 5.0 | 5.0 |
| hono-htmx | 2.5 | 5.0 | 5.0 |
| sveltekit | 3.0 | 5.0 | 5.0 |
| vanilla | 2.0 | 5.0 | 5.0 |
| next | 1.0 | 5.0 | 5.0 |
| react-router | 1.0 | 5.0 | 5.0 |
| solidstart | 3.0 | 5.0 | 5.0 |
| tanstack-start | 3.0 | 4.5 | 5.0 |
| qwik | 1.0 | 5.0 | 5.0 |
| gracile | 2.5 | 4.5 | 4.5 |
| angular | 3.0 | 4.5 | 4.5 |

## Judge detail: forward-thinking



| Framework | latest_apis | platform | dependencies | churn_resistance |
| --- | ---: | ---: | ---: | ---: |
| astro | 4.5 | 4.5 | 5.0 | 4.0 |
| nuxt | 4.5 | 4.5 | 5.0 | 3.5 |
| hono-htmx | 5.0 | 4.0 | 5.0 | 3.5 |
| sveltekit | 5.0 | 4.5 | 5.0 | 4.0 |
| vanilla | 5.0 | 4.0 | 5.0 | 4.0 |
| next | 3.5 | 4.5 | 5.0 | 4.0 |
| react-router | 5.0 | 4.0 | 4.0 | 4.0 |
| solidstart | 5.0 | 4.5 | 5.0 | 4.0 |
| tanstack-start | 5.0 | 4.0 | 5.0 | 4.0 |
| qwik | 5.0 | 4.0 | 4.0 | 4.0 |
| gracile | 5.0 | 5.0 | 4.5 | 4.0 |
| angular | 4.5 | 5.0 | 4.0 | 4.0 |

## Judge detail: mergeability



| Framework | idiomatic | correctness_risks | global_abstractions | readability | review_cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| astro | 4.0 | 3.5 | 3.5 | 4.0 | 4.0 |
| nuxt | 4.5 | 4.0 | 4.0 | 4.5 | 4.0 |
| hono-htmx | 5.0 | 4.0 | 4.0 | 4.0 | 4.0 |
| sveltekit | 5.0 | 4.0 | 4.5 | 4.5 | 4.0 |
| vanilla | 4.0 | 3.5 | 4.0 | 4.5 | 4.0 |
| next | 4.0 | 4.0 | 4.0 | 4.0 | 4.0 |
| react-router | 4.5 | 3.5 | 4.0 | 4.0 | 4.0 |
| solidstart | 5.0 | 3.0 | 4.0 | 4.0 | 4.0 |
| tanstack-start | 5.0 | 4.0 | 4.5 | 4.0 | 4.0 |
| qwik | 4.0 | 3.5 | 4.0 | 4.0 | 4.0 |
| gracile | 4.0 | 4.0 | 4.0 | 5.0 | 4.0 |
| angular | 4.5 | 4.0 | 4.0 | 5.0 | 4.0 |

## Judge detail: tests



| Framework | coverage_of_risk | behaviour_not_implementation | regression_power | signal_to_noise |
| --- | ---: | ---: | ---: | ---: |
| astro | 1.0 | 1.0 | 1.0 | 3.0 |
| nuxt | 1.0 | 1.0 | 1.0 | 3.0 |
| hono-htmx | 1.0 | 1.0 | 1.0 | 3.0 |
| sveltekit | 1.0 | 1.0 | 1.0 | 3.0 |
| vanilla | 1.0 | 1.0 | 1.0 | 3.0 |
| next | 1.0 | 1.0 | 1.0 | 3.0 |
| react-router | 1.0 | 1.0 | 1.0 | 3.0 |
| solidstart | 1.0 | 1.0 | 1.0 | 3.0 |
| tanstack-start | 1.0 | 1.0 | 1.0 | 3.0 |
| qwik | 1.0 | 1.0 | 1.0 | 3.0 |
| gracile | 1.0 | 1.0 | 1.0 | 3.0 |
| angular | 1.5 | 3.5 | 2.5 | 4.5 |

## Iterations

| Iteration | Tests | Tokens (M) | Cost ($) | Turns | Significant LOC | Notes |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| angular-1 | pass | — | — | — | 885 |  |
| angular-2 | pass | — | — | — | 876 |  |
| angular-5 | pass | — | — | — | 921 |  |
| astro-1 | pass | — | — | — | 579 |  |
| astro-2 | pass | — | — | — | 592 |  |
| astro-3 | pass | — | — | — | 650 |  |
| astro-4 | pass | — | — | — | 599 |  |
| astro-5 | pass | — | — | — | 592 |  |
| gracile-1 | pass | — | — | — | 718 |  |
| gracile-2 | pass | — | — | — | 817 |  |
| gracile-3 | pass | — | — | — | 744 |  |
| gracile-4 | pass | — | — | — | 743 |  |
| gracile-5 | pass | — | — | — | 672 |  |
| hono-htmx-1 | pass | — | — | — | 598 |  |
| hono-htmx-2 | pass | — | — | — | 668 |  |
| hono-htmx-3 | pass | — | — | — | 650 |  |
| hono-htmx-4 | pass | — | — | — | 631 |  |
| hono-htmx-5 | pass | — | — | — | 569 |  |
| next-1 | pass | — | — | — | 660 |  |
| next-2 | pass | — | — | — | 691 |  |
| next-3 | pass | — | — | — | 673 |  |
| next-4 | pass | — | — | — | 598 |  |
| next-5 | pass | — | — | — | 673 |  |
| nuxt-1 | pass | — | — | — | 597 |  |
| nuxt-2 | pass | — | — | — | 613 |  |
| nuxt-3 | pass | — | — | — | 628 |  |
| nuxt-4 | pass | — | — | — | 601 |  |
| nuxt-5 | pass | — | — | — | 634 |  |
| qwik-1 | pass | — | — | — | 723 |  |
| qwik-2 | pass | — | — | — | 736 |  |
| qwik-3 | pass | — | — | — | 733 |  |
| qwik-4 | pass | — | — | — | 743 |  |
| qwik-5 | pass | — | — | — | 692 |  |
| react-router-1 | pass | — | — | — | 719 |  |
| react-router-2 | pass | — | — | — | 675 |  |
| react-router-3 | pass | — | — | — | 648 |  |
| react-router-4 | pass | — | — | — | 694 |  |
| react-router-5 | pass | — | — | — | 722 |  |
| solidstart-1 | pass | — | — | — | 728 |  |
| solidstart-2 | pass | — | — | — | 720 |  |
| solidstart-3 | pass | — | — | — | 665 |  |
| solidstart-4 | pass | — | — | — | 675 |  |
| solidstart-5 | pass | — | — | — | 777 |  |
| sveltekit-1 | pass | — | — | — | 645 |  |
| sveltekit-2 | pass | — | — | — | 627 |  |
| sveltekit-3 | pass | — | — | — | 720 |  |
| sveltekit-4 | pass | — | — | — | 643 |  |
| sveltekit-5 | pass | — | — | — | 641 |  |
| tanstack-start-1 | pass | — | — | — | 810 |  |
| tanstack-start-2 | pass | — | — | — | 687 |  |
| tanstack-start-3 | pass | — | — | — | 725 |  |
| tanstack-start-4 | pass | — | — | — | 773 |  |
| tanstack-start-5 | pass | — | — | — | 693 |  |
| vanilla-1 | pass | — | — | — | 655 |  |
| vanilla-2 | pass | — | — | — | 615 |  |
| vanilla-3 | pass | — | — | — | 828 |  |
| vanilla-4 | pass | — | — | — | 665 |  |
| vanilla-5 | pass | — | — | — | 674 |  |
