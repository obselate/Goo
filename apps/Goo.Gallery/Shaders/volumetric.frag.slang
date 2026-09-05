#include "goo_effect.slang"

float3 mod289(float3 value)
{
    return value - floor(value * (1.0 / 289.0)) * 289.0;
}

float4 mod289(float4 value)
{
    return value - floor(value * (1.0 / 289.0)) * 289.0;
}

float4 permute(float4 value)
{
    return mod289(((value * 34.0) + 10.0) * value);
}

float4 taylorInvSqrt(float4 value)
{
    return 1.79284291400159 - 0.85373472095314 * value;
}

float snoise(float3 value)
{
    const float2 corner = float2(1.0 / 6.0, 1.0 / 3.0);
    const float4 offset = float4(0.0, 0.5, 1.0, 2.0);
    float3 cell = floor(value + dot(value, corner.yyy));
    float3 x0 = value - cell + dot(cell, corner.xxx);
    float3 greater = step(x0.yzx, x0.xyz);
    float3 lesser = 1.0 - greater;
    float3 cell1 = min(greater.xyz, lesser.zxy);
    float3 cell2 = max(greater.xyz, lesser.zxy);
    float3 x1 = x0 - cell1 + corner.xxx;
    float3 x2 = x0 - cell2 + corner.yyy;
    float3 x3 = x0 - offset.yyy;
    cell = mod289(cell);
    float4 permutation = permute(permute(permute(
        cell.z + float4(0.0, cell1.z, cell2.z, 1.0))
        + cell.y + float4(0.0, cell1.y, cell2.y, 1.0))
        + cell.x + float4(0.0, cell1.x, cell2.x, 1.0));
    float gradientScale = 0.142857142857;
    float3 gradientSpace = gradientScale * offset.wyz - offset.xzx;
    float4 gradientIndex = permutation
        - 49.0 * floor(permutation * gradientSpace.z * gradientSpace.z);
    float4 gradientX = floor(gradientIndex * gradientSpace.z);
    float4 gradientY = floor(gradientIndex - 7.0 * gradientX);
    float4 x = gradientX * gradientSpace.x + gradientSpace.yyyy;
    float4 y = gradientY * gradientSpace.x + gradientSpace.yyyy;
    float4 height = 1.0 - abs(x) - abs(y);
    float4 b0 = float4(x.xy, y.xy);
    float4 b1 = float4(x.zw, y.zw);
    float4 sign0 = floor(b0) * 2.0 + 1.0;
    float4 sign1 = floor(b1) * 2.0 + 1.0;
    float4 signHeight = -step(height, float4(0.0));
    float4 a0 = b0.xzyw + sign0.xzyw * signHeight.xxyy;
    float4 a1 = b1.xzyw + sign1.xzyw * signHeight.zzww;
    float3 gradient0 = float3(a0.xy, height.x);
    float3 gradient1 = float3(a0.zw, height.y);
    float3 gradient2 = float3(a1.xy, height.z);
    float3 gradient3 = float3(a1.zw, height.w);
    float4 norm = taylorInvSqrt(float4(
        dot(gradient0, gradient0),
        dot(gradient1, gradient1),
        dot(gradient2, gradient2),
        dot(gradient3, gradient3)));
    gradient0 *= norm.x;
    gradient1 *= norm.y;
    gradient2 *= norm.z;
    gradient3 *= norm.w;
    float4 weight = max(0.5 - float4(
        dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    weight *= weight;
    return 105.0 * dot(weight * weight, float4(
        dot(gradient0, x0),
        dot(gradient1, x1),
        dot(gradient2, x2),
        dot(gradient3, x3)));
}

float4 gooEffect(float2 uv, float4 source, float4 backdrop)
{
    float4 frame = gooParameter(0);
    float4 controls = gooParameter(2);
    float densityAmount = clamp(controls.x, 0.0, 4.0);
    float turbulence = clamp(controls.y, 0.0, 1.0);
    float driftAmount = clamp(controls.z, -2.0, 2.0);
    float time = frame.x;
    float2 screen = (uv - 0.5) * float2(16.0 / 9.0, 1.0);
    float3 drift = float3(
        time * driftAmount * 0.18,
        time * driftAmount * -0.11,
        time * driftAmount * 0.22);
    float3 accumulated = float3(0.0, 0.0, 0.0);
    float transmittance = 1.0;
    for (int index = 0; index < 24; index++)
    {
        float sampleDepth = (float(index) + 0.5) / 24.0;
        float3 point = float3(screen, sampleDepth * 2.2);
        float baseNoise = snoise(point * 1.8 + drift);
        float detailNoise = snoise(point * 4.5 + drift * 1.7);
        float field = 0.5 + 0.5 * baseNoise;
        field = clamp(field + detailNoise * turbulence * 0.22, 0.0, 1.0);
        float shapedDensity = clamp((field - 0.34) * 2.1, 0.0, 1.0);
        float sampleDensity = shapedDensity * densityAmount;
        float sampleAlpha = 1.0 - exp(-sampleDensity * 0.12);
        float ramp = clamp(field + detailNoise * 0.12, 0.0, 1.0);
        float3 sampleColor = lerp(
            float3(0.01, 0.16, 0.18),
            float3(0.92, 0.18, 0.035),
            ramp);
        float weight = sampleAlpha * transmittance;
        accumulated += sampleColor * weight;
        transmittance *= 1.0 - sampleAlpha;
    }
    float alpha = clamp(1.0 - transmittance, 0.0, 1.0);
    float3 background = float3(0.003, 0.005, 0.008);
    float3 color = accumulated + background * alpha;
    float sourceAlpha = clamp(source.a, 0.0, 1.0);
    float3 retainedSource = source.rgb / max(sourceAlpha, 0.0001);
    float sourceMix = clamp(sourceAlpha * 0.30, 0.0, 0.30);
    color = lerp(color, clamp(retainedSource, 0.0, 1.0) * alpha, sourceMix);
    float mask = clamp(max(sourceAlpha, backdrop.a), 0.0, 1.0);
    return float4(clamp(color * mask, 0.0, 1.0), alpha * mask);
}
