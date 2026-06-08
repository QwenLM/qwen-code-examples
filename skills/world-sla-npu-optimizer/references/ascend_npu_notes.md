# Ascend NPU Notes

## Preflight checklist

- Python version and virtual environment.
- CANN and driver availability.
- `torch` and `torch_npu` import status.
- `torch.npu.is_available()` and `torch.npu.device_count()`.
- Small bf16 matmul smoke on `npu:0`.
- HCCL/all_reduce smoke before distributed claims.

## Measurement checklist

Always record:

- hardware model and NPU count;
- CANN, torch, and torch_npu versions;
- q/k/v shape, dtype, sequence length, head count, head dimension;
- SLA backend, block size, top-k, and routing mode;
- relative error, cosine similarity, latency, and peak memory;
- exact command and log path.
