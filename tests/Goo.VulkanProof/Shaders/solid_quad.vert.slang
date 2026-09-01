#include "slang_compat.slang"
struct PushConstants
{
    float4 rect;
    float4 color;
};
[[vk::push_constant]] ConstantBuffer<PushConstants> pc;
struct SolidQuadVertexOutput
{
    float4 position : SV_Position;
    [[vk::location(0)]] float4 color;
};
[shader("vertex")]
SolidQuadVertexOutput main(uint vertexIndex : SV_VulkanVertexID)
{
    static const float2 positions[6] =
    {
        float2(0.0, 0.0),
        float2(1.0, 0.0),
        float2(1.0, 1.0),
        float2(0.0, 0.0),
        float2(1.0, 1.0),
        float2(0.0, 1.0)
    };
    float2 position = pc.rect.xy + positions[vertexIndex] * pc.rect.zw;
    SolidQuadVertexOutput output;
    output.position = float4(position, 0.0, 1.0);
    output.color = pc.color;
    return output;
}
