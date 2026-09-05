#include "goo_effect.slang"

float auroraHash(float2 value)
{
    float3 p = frac(float3(value.xyx) * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return frac((p.x + p.y) * p.z);
}

float auroraNoise(float2 value)
{
    float2 cell = floor(value);
    float2 local = frac(value);
    float2 blend = local * local * (3.0 - 2.0 * local);
    float lower = lerp(auroraHash(cell), auroraHash(cell + float2(1.0, 0.0)), blend.x);
    float upper = lerp(auroraHash(cell + float2(0.0, 1.0)), auroraHash(cell + 1.0), blend.x);
    return lerp(lower, upper, blend.y);
}

float auroraFbm(float2 value)
{
    float sum = 0.0;
    float weight = 0.5;
    for (int octave = 0; octave < 4; octave++)
    {
        sum += auroraNoise(value) * weight;
        value = float2(value.x * 1.72 - value.y * 1.18,
            value.x * 1.18 + value.y * 1.72) + 7.13;
        weight *= 0.5;
    }
    return sum;
}

float auroraCurtain(float2 uv, float time, float offset, float scale)
{
    float drift = time * (0.035 + offset * 0.004);
    float warp = auroraFbm(float2(uv.x * scale + drift, offset + time * 0.018));
    float center = 0.35 + offset * 0.055
        + sin(uv.x * (2.2 + offset * 0.25) + time * 0.11 + offset) * 0.055
        + (warp - 0.5) * 0.19;
    float core = exp2(-abs(uv.y - center) * (25.0 - offset * 2.0));
    float tail = exp2(-max(uv.y - center, 0.0) * (5.2 + offset * 0.5));
    float rays = 0.36 + 0.64 * pow(auroraNoise(float2(
        uv.x * (48.0 + offset * 9.0) - drift * 5.0,
        offset * 9.0)), 2.4);
    return core * 0.72 + tail * rays * 0.28;
}

float4 gooEffect(float2 uv, float4 source, float4 backdrop)
{
    float4 frame = gooParameter(0);
    float4 controls = gooParameter(2);
    float time = frame.x * lerp(0.35, 1.15, clamp(controls.z, 0.0, 1.0));
    float scale = lerp(0.75, 1.8, clamp(controls.x, 0.0, 1.0));
    float intensity = lerp(0.38, 1.18, clamp(controls.y, 0.0, 1.0));

    float horizon = smoothstep(0.12, 0.92, uv.y);
    float3 color = lerp(float3(0.003, 0.007, 0.020),
        float3(0.016, 0.035, 0.052), horizon);
    float star = step(0.9965, auroraHash(floor(uv * float2(360.0, 210.0))));
    float twinkle = 0.35 + 0.65 * auroraHash(
        floor(uv * float2(360.0, 210.0)) + floor(time * 0.65));
    color += star * twinkle * (1.0 - smoothstep(0.18, 0.72, uv.y))
        * float3(0.50, 0.66, 0.86);

    float first = auroraCurtain(uv, time, 0.0, 3.2 * scale);
    float second = auroraCurtain(uv, time, 1.0, 4.0 * scale);
    float third = auroraCurtain(uv, time, 2.0, 4.8 * scale);
    color += first * float3(0.08, 0.82, 0.58) * intensity;
    color += second * float3(0.13, 0.48, 0.94) * intensity * 0.76;
    color += third * float3(0.62, 0.18, 0.78) * intensity * 0.48;

    float2 centered = uv * 2.0 - 1.0;
    float vignette = smoothstep(1.45, 0.26, dot(centered, centered));
    color *= 0.72 + 0.28 * vignette;
    color = color / (1.0 + max(color - 0.82, 0.0) * 0.65);
    float alpha = clamp(source.a + backdrop.a * 0.0, 0.0, 1.0);
    float3 retained = source.rgb / max(alpha, 0.0001);
    color = lerp(color, retained, alpha * 0.30);
    return float4(clamp(color, 0.0, 1.0) * alpha, alpha);
}
