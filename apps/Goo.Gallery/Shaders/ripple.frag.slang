#include "goo_effect.slang"

float2 ringDisplacement(float2 uv, float4 ring, float frequency, float decay)
{
    float2 ringPosition = clamp(ring.xy, 0.0, 1.0);
    float age = max(ring.z, 0.0);
    float amplitude = clamp(ring.w, -1.0, 1.0);
    float2 delta = uv - ringPosition;
    float distance = length(delta);
    float phase = distance - age * (0.45 + frequency * 0.04);
    float wave = amplitude * exp(-decay * age * 0.32) * exp(-2.0 * distance)
        * sin(phase * (24.0 + frequency * 2.0));
    float2 direction = delta / max(distance, 0.001);
    return direction * wave * 0.035;
}

float4 gooEffect(float2 uv, float4 source, float4 backdrop)
{
    float4 rippleControls = gooParameter(5);
    float frequency = clamp(rippleControls.x, 1.0, 12.0);
    float decay = clamp(rippleControls.y, 0.5, 6.0);
    float2 displacement = ringDisplacement(uv, gooParameter(2), frequency, decay);
    displacement += ringDisplacement(uv, gooParameter(3), frequency, decay);
    displacement += ringDisplacement(uv, gooParameter(4), frequency, decay);
    float2 edgeDistance = min(uv, 1.0 - uv);
    float edgeFade = smoothstep(0.0, 0.12, min(edgeDistance.x, edgeDistance.y));
    float2 displacedUv = clamp(uv + displacement * edgeFade, 0.0, 1.0);
    GooPrimitiveRecord primitive = gooPrimitive();
    float2 sourceUv = primitive.params.xy + displacedUv * primitive.params.zw;
    float4 sampled = gooSourceTexture.Sample(clamp(sourceUv, 0.0, 1.0));
    float sampleAlpha = clamp(sampled.a, 0.0, 1.0);
    return lerp(backdrop, sampled, sampleAlpha);
}
