#include "goo_effect.slang"

float4 gooEffect(float2 uv, float4 source, float4 backdrop)
{
    float4 controls = gooParameter(2);
    GooPrimitiveRecord primitive = gooPrimitive();
    float2 sourceUv = primitive.params.xy + uv * primitive.params.zw;
    uint textureWidth;
    uint textureHeight;
    gooBackdropTexture.GetDimensions(textureWidth, textureHeight);
    uint safeWidth = max(textureWidth, 1u);
    uint safeHeight = max(textureHeight, 1u);
    float2 texel = 1.0 / float2(safeWidth, safeHeight);
    float2 centered = uv - 0.5;
    float radius = clamp(length(centered), 0.0, 1.0);
    float2 lens = centered * (1.5 - radius);
    float refraction = clamp(controls.x, -1.0, 1.0);
    float2 bend = lens * refraction * texel * 4.0;
    float blur = clamp(controls.y, 0.0, 2.0);
    float2 tap = texel * blur;
    float2 sampleUv = clamp(sourceUv + bend, 0.0, 1.0);
    float4 sample00 = gooBackdropTexture.Sample(clamp(sampleUv + float2(-tap.x, -tap.y), 0.0, 1.0));
    float4 sample10 = gooBackdropTexture.Sample(clamp(sampleUv + float2(0.0, -tap.y), 0.0, 1.0));
    float4 sample20 = gooBackdropTexture.Sample(clamp(sampleUv + float2(tap.x, -tap.y), 0.0, 1.0));
    float4 sample01 = gooBackdropTexture.Sample(clamp(sampleUv + float2(-tap.x, 0.0), 0.0, 1.0));
    float4 sample11 = gooBackdropTexture.Sample(clamp(sampleUv, 0.0, 1.0));
    float4 sample21 = gooBackdropTexture.Sample(clamp(sampleUv + float2(tap.x, 0.0), 0.0, 1.0));
    float4 sample02 = gooBackdropTexture.Sample(clamp(sampleUv + float2(-tap.x, tap.y), 0.0, 1.0));
    float4 sample12 = gooBackdropTexture.Sample(clamp(sampleUv + float2(0.0, tap.y), 0.0, 1.0));
    float4 sample22 = gooBackdropTexture.Sample(clamp(sampleUv + float2(tap.x, tap.y), 0.0, 1.0));
    float4 blurred = (sample00 + sample20 + sample02 + sample22)
        + 2.0 * (sample10 + sample01 + sample21 + sample12)
        + 4.0 * sample11;
    blurred *= 0.0625;
    float alpha = clamp(source.a, 0.0, 1.0);
    float backdropAlpha = clamp(backdrop.a, 0.0, 1.0);
    float blurredAlpha = clamp(blurred.a, 0.0, 1.0);
    float3 backdropColor = backdrop.rgb / max(backdropAlpha, 0.0001);
    float3 blurredColor = blurred.rgb / max(blurredAlpha, 0.0001);
    float3 sourceColor = source.rgb / max(alpha, 0.0001);
    float3 refracted = lerp(backdropColor, blurredColor, 0.82);
    float tintStrength = clamp(controls.z, 0.0, 1.0) * 0.35;
    refracted = lerp(refracted, refracted * float3(0.82, 0.93, 1.0), tintStrength);
    refracted = lerp(refracted, sourceColor, 0.12);
    return float4(clamp(refracted, 0.0, 1.0) * alpha, alpha);
}
