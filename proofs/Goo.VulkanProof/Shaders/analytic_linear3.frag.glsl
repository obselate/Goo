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

vec4 unpackColor(uint packedRgb, uint packedAlpha, uint alphaIndex)
{
    return vec4(
        float(packedRgb & 0x7ffu) / 2047.0,
        float((packedRgb >> 11u) & 0x7ffu) / 2047.0,
        float((packedRgb >> 22u) & 0x3ffu) / 1023.0,
        float((packedAlpha >> (alphaIndex * 10u)) & 0x3ffu) / 1023.0);
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
    vec2 direction = pc.params.zw - pc.params.xy;
    float amount = dot(uv - pc.params.xy, direction) / max(dot(direction, direction), 0.0001);
    vec4 color0 = unpackColor(pc.packedColors.x, pc.packedColors.w, 0u);
    vec4 color1 = unpackColor(pc.packedColors.y, pc.packedColors.w, 1u);
    vec4 color2 = unpackColor(pc.packedColors.z, pc.packedColors.w, 2u);
    outColor = interpolateStops(clamp(amount, 0.0, 1.0), color0, color1, color2);
}
