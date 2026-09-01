#include "primitive_record.slang"
struct AnalyticVertexOutput
{
    float4 position : SV_Position;
    [[vk::location(0)]] float2 uv;
    [[vk::location(2)]] nointerpolation uint clipDrawOrdinal;
    [[vk::location(3)]] nointerpolation uint primitiveRecordOrdinal;
};
[shader("vertex")]
AnalyticVertexOutput main(
    uint vertexIndex : SV_VulkanVertexID,
    uint instanceIndex : SV_VulkanInstanceID)
{
    static const float2 positions[4] =
    {
        float2(0.0, 0.0),
        float2(1.0, 0.0),
        float2(0.0, 1.0),
        float2(1.0, 1.0)
    };
    uint primitiveRecordOrdinal = vertexIndex >> 2u;
    GooPrimitiveRecord primitive = gooPrimitiveBuffer[primitiveRecordOrdinal];
    uint quadVertex = vertexIndex & 3u;
    float2 local = primitive.rect.xy + positions[quadVertex] * primitive.rect.zw;
    float3 homogeneous = float3(local, 1.0);
    float2 position = float2(
        dot(primitive.transform0.xyz, homogeneous),
        dot(primitive.transform1.xyz, homogeneous));
    AnalyticVertexOutput output;
    output.position = float4(position, 0.0, 1.0);
    output.uv = positions[quadVertex];
    output.clipDrawOrdinal = instanceIndex;
    output.primitiveRecordOrdinal = primitiveRecordOrdinal;
    return output;
}
