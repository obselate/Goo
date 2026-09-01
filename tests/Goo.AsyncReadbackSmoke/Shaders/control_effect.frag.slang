#include "goo_effect.slang"

float4 gooEffect(float2 uv, float4 source, float4 backdrop)
{
    float4 control = gooParameter(0);
    GooPrimitiveRecord primitive = gooPrimitive();
    float2 sourceUv = primitive.params.xy + uv * primitive.params.zw;
    uint textureWidth;
    uint textureHeight;
    gooBackdropTexture.GetDimensions(textureWidth, textureHeight);
    float2 texel = 1.0 / float2(textureWidth, textureHeight);
    float2 offsetUv = gooParameter(1).xy * texel;
    float dataScale = gooDataByteLength(0) >= 4 ? asfloat(gooDataWord(0, 0)) : 1.0;
    float3 tinted = source.rgb * control.rgb * dataScale;
    float3 refracted = gooBackdropTexture.Sample(sourceUv + offsetUv).rgb * source.a;
    return float4(lerp(tinted, refracted, clamp(control.w, 0.0, 1.0)), source.a);
}
