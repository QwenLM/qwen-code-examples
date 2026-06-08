# Public toy module for testing the WorldSLA-NPU scanner.
# It intentionally resembles common world-model/video-diffusion attention hooks
# without depending on any private project code.

class AttnOp:
    def __init__(self):
        self.local_attn = None


class WanSelfAttention:
    def __init__(self):
        self.attn_op = AttnOp()

    def forward(self, q, k, v):
        return self.attn_op.local_attn(q, k, v)


class SparseLinearAttention:
    pass


def replace_attention(module):
    module.attn_op.local_attn = SparseLinearAttention()
    return module
