# agent-framework-benchmark-pi results

Results from [pngwn/agent-framework-benchmark-pi](https://github.com/pngwn/agent-framework-benchmark-pi):
Nolan Lawson's [agent framework benchmark](https://github.com/nolanlawson/agent-framework-benchmark)
([blog post](https://nolanlawson.com/2026/10/28/the-ai-cost-of-javascript-frameworks/)) run with the
[Pi](https://pi.dev) coding agent and `deepseek-ai/DeepSeek-V4.1-Flash-1017` on Hugging Face
Inference Providers, with extra analyses of the code and the agents' traces.

Full agent traces (every thinking block, tool call and result), judge sessions and Lighthouse
reports are in the Hugging Face dataset
[pngwn/agent-framework-benchmark-pi-traces](https://huggingface.co/datasets/pngwn/agent-framework-benchmark-pi-traces).

> Results are being finalised: the agent runs are done, Lighthouse measurement and LLM judging
> are in progress. This README gets the headline tables once they finish.

## Layout

| Path | |
| --- | --- |
| `runs/<run>/report.md`, `summary.json` | Per-framework medians and every iteration's metrics |
| `runs/<run>/config.json` | Harness settings, model, versions, image IDs |
| `runs/<run>/<framework>-<n>/app/` | The app the agent wrote (dependencies and build output removed) |
| `runs/<run>/<framework>-<n>/agent/` | Run info, tooling and MCP versions, final acceptance test log |
| `runs/<run>/<framework>-<n>/analysis/` | `code.json` (significant-code stats), `trace.json` (trace metrics) |
| `runs/<run>/<framework>-<n>/measure/results.json` | Lighthouse medians (mobile) and upstream's LOC |
| `runs/<run>/<framework>-<n>/judge/<dimension>/<n>/verdict.json` | LLM judge verdicts with file:line evidence |
| `baselines/opus-5.5/` | The same code analyses and judges applied to Nolan's published Opus 5.5 apps |

## Redaction

Exported with `scripts/export-results.mjs` from the harness repo: API key values and
token-shaped strings are replaced with `[REDACTED]`, local paths and the account email are
removed, and the export is re-scanned before publishing. The keys were only environment
variables inside the agent containers, and no key value appeared in any trace even before
redaction.

## License

Apache-2.0, like the benchmark it builds on. The apps were written by DeepSeek V4.1 Flash
(MIT-licensed model) through the harness.
