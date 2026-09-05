#!/usr/bin/env bash
set -o pipefail
cd /home/xaz/Projects/goo-gsharp
GOO_VK_DIAGNOSTICS=1 GOO_VK_IMAGE_READBACK=1 VK_INSTANCE_LAYERS=VK_LAYER_KHRONOS_validation \
  dotnet tests/Goo.VulkanProof/bin/Release/net10.0/Goo.VulkanProof.dll \
  2>&1 | tee /tmp/goo-post-checkpoint/shader-alpha-proof/native-failure.log
exit ${PIPESTATUS[0]}
