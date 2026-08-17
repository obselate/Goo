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

float roundedDistance(vec2 point, vec2 size, vec4 cornerRadii)
{
    vec2 centered = point - size * 0.5;
    bool left = centered.x < 0.0;
    bool top = centered.y < 0.0;
    float radius = top ? (left ? cornerRadii.x : cornerRadii.y) : (left ? cornerRadii.w : cornerRadii.z);
    radius = clamp(radius, 0.0, min(size.x, size.y) * 0.5);
    vec2 q = abs(centered) - size * 0.5 + vec2(radius);
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

void main()
{
    vec2 point = uv * pc.rect.zw;
    float distance = roundedDistance(point, pc.rect.zw, pc.radii);
    float coverage = 1.0 - smoothstep(0.0, max(fwidth(distance), 0.0001), distance);
    outColor = unpackColor(pc.packedColors.x) * coverage;
}
