#version 450 core

layout(push_constant) uniform PushConstants {
    vec4 rect;
    vec4 transform0;
    vec4 transform1;
    vec4 radii;
    vec4 params;
    vec4 stopPositions;
    uvec4 packedColors;
    uvec4 packedColorsExtra;
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
    float spread = pc.params.x;
    float blur = pc.params.y;
    float offsetX = pc.params.z;
    float offsetY = pc.params.w;
    float expansion = blur + max(spread, 0.0);
    vec2 shapeOffset = vec2(expansion - spread);
    vec2 shapeSize = pc.rect.zw - shapeOffset * 2.0;
    vec4 shapeRadii = max(pc.radii + vec4(spread), vec4(0.0));
    vec2 point = uv * pc.rect.zw - shapeOffset;
    float shadowDistance = roundedDistance(point, shapeSize, shapeRadii);
    vec2 originalOffset = vec2(expansion - offsetX, expansion - offsetY);
    vec2 originalSize = max(pc.rect.zw - vec2(expansion * 2.0), vec2(0.0001));
    float originalDistance = roundedDistance(uv * pc.rect.zw - originalOffset, originalSize, pc.radii);
    float edge = max(fwidth(shadowDistance), 0.0001);
    float outside = smoothstep(0.0, edge, originalDistance);
    float fade = blur <= 0.0 ? (shadowDistance <= 0.0 ? 1.0 : 0.0)
        : 1.0 - smoothstep(0.0, blur, max(shadowDistance, 0.0));
    float coverage = outside * fade;
    outColor = unpackColor(pc.packedColors.x, pc.packedColors.w, 0u) * coverage;
}
