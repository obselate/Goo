#include "goo_effect.slang"

float silkHash(float2 value)
{
    float3 p = frac(float3(value.xyx) * 0.1031);
    p += dot(p, p.yzx + 31.71);
    return frac((p.x + p.y) * p.z);
}

float silkNoise(float2 value)
{
    float2 cell = floor(value);
    float2 local = frac(value);
    float2 blend = local * local * (3.0 - 2.0 * local);
    float lower = lerp(silkHash(cell), silkHash(cell + float2(1.0, 0.0)), blend.x);
    float upper = lerp(silkHash(cell + float2(0.0, 1.0)), silkHash(cell + 1.0), blend.x);
    return lerp(lower, upper, blend.y);
}

float silkFbm(float2 value)
{
    float sum = 0.0;
    float weight = 0.55;
    for (int octave = 0; octave < 4; octave++)
    {
        sum += silkNoise(value) * weight;
        value = float2(value.x * 1.64 - value.y * 1.22,
            value.x * 1.22 + value.y * 1.64) + 5.31;
        weight *= 0.48;
    }
    return sum;
}

float3 silkPalette(float phase, float chroma)
{
    float3 mineral = float3(0.08, 0.13, 0.19);
    float3 cyan = float3(0.08, 0.72, 0.70);
    float3 violet = float3(0.48, 0.16, 0.74);
    float3 copper = float3(0.94, 0.34, 0.12);
    float cyanWeight = smoothstep(0.05, 0.34, phase) * (1.0 - smoothstep(0.42, 0.66, phase));
    float violetWeight = smoothstep(0.34, 0.58, phase) * (1.0 - smoothstep(0.72, 0.94, phase));
    float copperWeight = smoothstep(0.68, 0.88, phase);
    float3 spectrum = mineral;
    spectrum = lerp(spectrum, cyan, cyanWeight);
    spectrum = lerp(spectrum, violet, violetWeight);
    spectrum = lerp(spectrum, copper, copperWeight * 0.82);
    return lerp(mineral, spectrum, chroma);
}

float4 gooEffect(float2 uv, float4 source, float4 backdrop)
{
    float4 frame = gooParameter(0);
    float4 controls = gooParameter(2);
    float foldScale = lerp(2.4, 7.2, clamp(controls.x, 0.0, 1.0));
    float chroma = lerp(0.12, 0.92, clamp(controls.y, 0.0, 1.0));
    float motion = lerp(0.04, 0.32, clamp(controls.z, 0.0, 1.0));
    float time = frame.x * motion;
    const float aspect = 16.0 / 9.0;
    float2 p = (uv - 0.5) * float2(aspect, 1.0);
    float broad = silkFbm(p * 1.45 + float2(time * 0.17, -time * 0.11));
    float2 warp = float2(
        silkFbm(p * 2.1 + float2(4.7, time * 0.13)),
        silkFbm(p * 2.1 + float2(-time * 0.09, 9.2))) - 0.5;
    float2 q = p + warp * 0.22;
    float firstFold = sin(q.x * foldScale + q.y * 2.7 + broad * 4.3 + time);
    float secondFold = sin(q.y * (foldScale * 0.78) - q.x * 3.2 - broad * 3.1 - time * 0.74);
    float height = firstFold * 0.62 + secondFold * 0.38;
    float2 slope = float2(
        cos(q.x * foldScale + broad * 4.3 + time) * foldScale,
        cos(q.y * foldScale * 0.78 - broad * 3.1 - time * 0.74) * foldScale * 0.78);
    float3 normal = normalize(float3(-slope * 0.065, 1.0));
    float3 lightDirection = normalize(float3(-0.42, -0.56, 0.72));
    float diffuse = 0.36 + 0.64 * saturate(dot(normal, lightDirection));
    float fresnel = pow(1.0 - saturate(normal.z), 3.0);
    float specular = pow(saturate(dot(reflect(-lightDirection, normal), float3(0.0, 0.0, 1.0))), 22.0);
    float phase = frac(0.5 + height * 0.19 + broad * 0.34 + fresnel * 0.22);
    float3 color = silkPalette(phase, chroma) * (0.48 + diffuse * 0.62);
    color += specular * float3(1.0, 0.94, 0.84) * 0.38;
    color += fresnel * silkPalette(frac(phase + 0.28), chroma) * 0.24;
    float shadowFold = 1.0 - smoothstep(-0.72, 0.45, height);
    color = lerp(color, float3(0.012, 0.020, 0.036), shadowFold * 0.38);

    float2 centered = uv * 2.0 - 1.0;
    color *= 0.78 + 0.22 * (1.0 - smoothstep(0.18, 1.4, dot(centered, centered)));
    float alpha = clamp(source.a + backdrop.a * 0.0, 0.0, 1.0);
    float3 retained = source.rgb / max(alpha, 0.0001);
    color = lerp(color, retained, alpha * 0.24);
    return float4(clamp(color, 0.0, 1.0) * alpha, alpha);
}
