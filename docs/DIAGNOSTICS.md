# Diagnosis rules

| Rule | Default threshold | Minimum evidence |
| --- | --- | --- |
| Input volume | More than 8,000 input tokens | One measured request |
| Output budget | More than 2,000 output tokens | One measured response |
| Cache reuse | Less than 30% cached input | Three positive-input requests with the same provider, model, application and fingerprint |
| Cost | More than USD 0.06 estimated per classification request | One request classified as `classification` and a matching price |
| Inference latency | More than 3,500 ms | One reported latency measurement |

Thresholds are editable in Settings. Input and latency findings use high severity. Output, cost and cache findings use medium severity. Cache reuse is the sum of cached tokens divided by the sum of input tokens in the group. Threshold equality does not trigger a finding.

A finding records the evaluation time, threshold, explanation, recommended change and affected requests. It identifies a review opportunity. Validate changes on representative workloads and measure quality, spend and latency before claiming an improvement. Recommendation completion tracks implementation status only.
