#version 450 core

layout(push_constant) uniform PushConstants {
    vec4 rect;
    vec4 transform0;
    vec4 transform1;
    vec4 radii;
    vec4 params;
    vec4 stopPositions;
    uvec4 packedColors;
} pc;

layout(location = 0) in vec2 uv;
layout(location = 0) out vec4 outColor;

vec4 unpackColor(uint packed)
{
    return vec4(
        float(packed & 0xffu),
        float((packed >> 8u) & 0xffu),
        float((packed >> 16u) & 0xffu),
        float((packed >> 24u) & 0xffu)) / 255.0;
}

vec4 interpolateStops(float value, vec4 color0, vec4 color1, vec4 color2)
{
    if (value <= pc.stopPositions.x)
    {
        return color0;
    }
    if (value <= pc.stopPositions.y)
    {
        float amount = clamp((value - pc.stopPositions.x) / max(pc.stopPositions.y - pc.stopPositions.x, 0.0001), 0.0, 1.0);
        return mix(color0, color1, amount);
    }
    float amount = clamp((value - pc.stopPositions.y) / max(pc.stopPositions.z - pc.stopPositions.y, 0.0001), 0.0, 1.0);
    return mix(color1, color2, amount);
}

void main()
{
    vec2 radius = max(pc.params.zw, vec2(0.0001));
    float amount = length((uv - pc.params.xy) / radius);
    vec4 color0 = unpackColor(pc.packedColors.x);
    vec4 color1 = unpackColor(pc.packedColors.y);
    vec4 color2 = unpackColor(pc.packedColors.z);
    outColor = interpolateStops(clamp(amount, 0.0, 1.0), color0, color1, color2);
}
