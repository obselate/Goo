#version 450 core

layout(push_constant) uniform PushConstants {
    vec4 rect;
    vec4 transform0;
    vec4 transform1;
    vec4 widths;
    vec4 params;
    vec4 radii;
    uvec4 packedColors;
    uvec4 packedColorsExtra;
} pc;

layout(location = 0) in vec2 uv;
layout(location = 0) out vec4 outColor;

vec4 unpackColor(uint packedRgb, uint packedAlpha, uint alphaIndex)
{
    float red = float(packedRgb & 2047u) / 2047.0;
    float green = float((packedRgb >> 11u) & 2047u) / 2047.0;
    float blue = float((packedRgb >> 22u) & 1023u) / 1023.0;
    float alpha = float((packedAlpha >> (alphaIndex * 10u)) & 1023u) / 1023.0;
    return vec4(red, green, blue, alpha);
}

vec4 edgeColor(uint edge)
{
    if (edge == 0u)
    {
        return unpackColor(pc.packedColors.x, pc.packedColors.w, 0u);
    }
    if (edge == 1u)
    {
        return unpackColor(pc.packedColors.y, pc.packedColors.w, 1u);
    }
    if (edge == 2u)
    {
        return unpackColor(pc.packedColors.z, pc.packedColors.w, 2u);
    }
    return unpackColor(pc.packedColorsExtra.x, pc.packedColorsExtra.y, 0u);
}

float edgeWidth(uint edge, vec2 size)
{
    float top = min(max(pc.widths.x, 0.0), size.y);
    float right = min(max(pc.widths.y, 0.0), size.x);
    float bottom = min(max(pc.widths.z, 0.0), max(size.y - top, 0.0));
    float left = min(max(pc.widths.w, 0.0), max(size.x - right, 0.0));
    if (edge == 0u)
    {
        return top;
    }
    if (edge == 1u)
    {
        return right;
    }
    if (edge == 2u)
    {
        return bottom;
    }
    return left;
}

uint selectedEdge(vec2 point, vec2 size)
{
    float top = min(max(pc.widths.x, 0.0), size.y);
    float right = min(max(pc.widths.y, 0.0), size.x);
    float bottom = min(max(pc.widths.z, 0.0), max(size.y - top, 0.0));
    float left = min(max(pc.widths.w, 0.0), max(size.x - right, 0.0));
    if (top > 0.0 && point.y < top)
    {
        return 0u;
    }
    if (bottom > 0.0 && point.y >= size.y - bottom)
    {
        return 2u;
    }
    if (right > 0.0 && point.x >= size.x - right)
    {
        return 1u;
    }
    if (left > 0.0 && point.x < left)
    {
        return 3u;
    }
    return 4u;
}

float edgeAlong(uint edge, vec2 point, vec2 size)
{
    if (edge == 0u)
    {
        return point.x;
    }
    if (edge == 1u)
    {
        return point.y;
    }
    if (edge == 2u)
    {
        return size.x - point.x;
    }
    return size.y - point.y;
}

float edgeAcross(uint edge, vec2 point, vec2 size)
{
    if (edge == 0u)
    {
        return point.y;
    }
    if (edge == 1u)
    {
        return size.x - point.x;
    }
    if (edge == 2u)
    {
        return size.y - point.y;
    }
    return point.x;
}

float edgePhase(uint edge)
{
    if (edge == 1u)
    {
        return pc.params.y;
    }
    if (edge == 2u)
    {
        return pc.params.z;
    }
    if (edge == 3u)
    {
        return pc.params.w;
    }
    return 0.0;
}

void renderRectangular(vec2 point, vec2 size)
{
    uint edge = selectedEdge(point, size);
    if (edge == 4u)
    {
        outColor = vec4(0.0);
        return;
    }

    float width = edgeWidth(edge, size);
    float patternWidth = max(width, 0.0001);
    float period = pc.packedColorsExtra.w == 1u
        ? patternWidth * 6.0
        : patternWidth * 3.0;
    float onLength = pc.packedColorsExtra.w == 1u
        ? patternWidth * 3.0
        : patternWidth;
    float along = edgeAlong(edge, point, size);
    float across = edgeAcross(edge, point, size);
    float phase = edgePhase(edge);
    float edgeAa = max(fwidth(across), 0.0001);
    float edgeCoverage = 1.0 - smoothstep(width - edgeAa, width + edgeAa, across);
    float patternCoverage = 1.0;
    if (pc.packedColorsExtra.w == 1u)
    {
        float patternCoordinate = mod(along + phase, period);
        float patternAa = max(fwidth(along), 0.0001);
        float dash = 1.0 - smoothstep(onLength - patternAa, onLength + patternAa, patternCoordinate);
        float wrap = smoothstep(period - patternAa, period, patternCoordinate);
        patternCoverage = max(dash, wrap);
    }
    else if (pc.packedColorsExtra.w == 2u)
    {
        float patternCoordinate = mod(along + phase, period);
        float dotDiameter = width;
        float dotRadius = max(dotDiameter * 0.5, 0.0001);
        float axial = abs(patternCoordinate - dotRadius);
        axial = min(axial, period - axial);
        float transverse = abs(across - width * 0.5);
        float dotDistance = length(vec2(axial, transverse));
        float dotAa = max(max(fwidth(axial), fwidth(transverse)), 0.0001);
        patternCoverage = 1.0 - smoothstep(dotRadius - dotAa, dotRadius + dotAa, dotDistance);
    }
    outColor = edgeColor(edge) * edgeCoverage * patternCoverage;
}

vec4 normalizeRadii(vec2 size, vec4 source)
{
    vec4 result = max(source, vec4(0.0));
    float scale = 1.0;
    float sum = result.x + result.y;
    if (sum > size.x && sum > 0.0)
    {
        scale = min(scale, size.x / sum);
    }
    sum = result.w + result.z;
    if (sum > size.x && sum > 0.0)
    {
        scale = min(scale, size.x / sum);
    }
    sum = result.x + result.w;
    if (sum > size.y && sum > 0.0)
    {
        scale = min(scale, size.y / sum);
    }
    sum = result.y + result.z;
    if (sum > size.y && sum > 0.0)
    {
        scale = min(scale, size.y / sum);
    }
    return result * scale;
}

float roundedRectDistance(vec2 point, vec2 size, vec4 cornerRadii)
{
    if (size.x <= 0.0 || size.y <= 0.0)
    {
        return 1000000.0;
    }
    vec2 centered = point - size * 0.5;
    float radius;
    if (centered.x < 0.0)
    {
        radius = centered.y < 0.0 ? cornerRadii.x : cornerRadii.w;
    }
    else
    {
        radius = centered.y < 0.0 ? cornerRadii.y : cornerRadii.z;
    }
    vec2 q = abs(centered) - size * 0.5 + vec2(radius);
    return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - radius;
}

uint roundedEdge(vec2 point, vec2 size)
{
    float top = min(max(pc.widths.x, 0.0), size.y);
    float right = min(max(pc.widths.y, 0.0), size.x);
    float bottom = min(max(pc.widths.z, 0.0), max(size.y - top, 0.0));
    float left = min(max(pc.widths.w, 0.0), max(size.x - right, 0.0));
    float best = 1000000.0;
    uint edge = 4u;
    float distance = point.y;
    if (top > 0.0 && distance < best)
    {
        best = distance;
        edge = 0u;
    }
    distance = size.x - point.x;
    if (right > 0.0 && distance < best)
    {
        best = distance;
        edge = 1u;
    }
    distance = size.y - point.y;
    if (bottom > 0.0 && distance < best)
    {
        best = distance;
        edge = 2u;
    }
    distance = point.x;
    if (left > 0.0 && distance < best)
    {
        edge = 3u;
    }
    return edge;
}

void main()
{
    vec2 size = pc.rect.zw;
    vec2 point = uv * size;
    if (max(max(pc.radii.x, pc.radii.y), max(pc.radii.z, pc.radii.w)) <= 0.0)
    {
        renderRectangular(point, size);
        return;
    }

    vec4 outerRadii = normalizeRadii(size, pc.radii);
    float top = min(max(pc.widths.x, 0.0), size.y);
    float right = min(max(pc.widths.y, 0.0), size.x);
    float bottom = min(max(pc.widths.z, 0.0), max(size.y - top, 0.0));
    float left = min(max(pc.widths.w, 0.0), max(size.x - right, 0.0));
    float outerDistance = roundedRectDistance(point, size, outerRadii);
    float outerAa = max(fwidth(outerDistance), 0.0001);
    float outerCoverage = 1.0 - smoothstep(0.0, outerAa, outerDistance);
    vec2 innerSize = max(size - vec2(left + right, top + bottom), vec2(0.0));
    float innerCoverage = 1.0;
    float borderWidth = max(edgeWidth(roundedEdge(point, size), size), 0.0001);
    if (innerSize.x > 0.0 && innerSize.y > 0.0)
    {
        vec4 innerRadii = max(outerRadii - vec4(max(top, left), max(top, right),
            max(bottom, right), max(bottom, left)), vec4(0.0));
        innerRadii = normalizeRadii(innerSize, innerRadii);
        float innerDistance = roundedRectDistance(point - vec2(left, top), innerSize, innerRadii);
        float innerAa = max(fwidth(innerDistance), 0.0001);
        innerCoverage = smoothstep(0.0, innerAa, innerDistance);
    }
    float coverage = outerCoverage * innerCoverage;
    uint edge = roundedEdge(point, size);
    if (edge == 4u)
    {
        outColor = vec4(0.0);
        return;
    }
    float patternCoverage = 1.0;
    if (pc.packedColorsExtra.w == 1u)
    {
        float patternWidth = max(borderWidth, 0.0001);
        float period = patternWidth * 6.0;
        float along = edgeAlong(edge, point, size);
        float patternCoordinate = mod(along + edgePhase(edge), period);
        float patternAa = max(fwidth(along), 0.0001);
        float dash = 1.0 - smoothstep(patternWidth * 3.0 - patternAa,
            patternWidth * 3.0 + patternAa, patternCoordinate);
        float wrap = smoothstep(period - patternAa, period, patternCoordinate);
        patternCoverage = max(dash, wrap);
    }
    else if (pc.packedColorsExtra.w == 2u)
    {
        float patternWidth = max(borderWidth, 0.0001);
        float period = patternWidth * 3.0;
        float along = edgeAlong(edge, point, size);
        float patternCoordinate = mod(along + edgePhase(edge), period);
        float dotRadius = patternWidth * 0.5;
        float axial = abs(patternCoordinate - dotRadius);
        axial = min(axial, period - axial);
        float transverse = abs(outerDistance + patternWidth * 0.5);
        float dotDistance = length(vec2(axial, transverse));
        float dotAa = max(max(fwidth(axial), fwidth(transverse)), 0.0001);
        patternCoverage = 1.0 - smoothstep(dotRadius - dotAa, dotRadius + dotAa, dotDistance);
    }
    outColor = edgeColor(edge) * coverage * patternCoverage;
}
