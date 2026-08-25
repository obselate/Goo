#include "primitive_record.glsl"

layout(set = 0, binding = 0) uniform sampler2D sourceTexture;
layout(set = 1, binding = 0) uniform sampler2D backdropTexture;

layout(location = 0) in vec2 uv;
layout(location = 2) flat in uint gooClipDrawOrdinal;
layout(location = 3) flat in uint gooPrimitiveRecordOrdinal;
layout(location = 0) out vec4 outColor;

#include "clip_chain_blend.glsl"

#define pc gooPrimitiveBuffer.records[gooPrimitiveRecordOrdinal]

float channelMin(vec3 value)
{
    return min(value.r, min(value.g, value.b));
}

float channelMax(vec3 value)
{
    return max(value.r, max(value.g, value.b));
}

float luminance(vec3 value)
{
    return dot(value, vec3(0.3, 0.59, 0.11));
}

vec3 clipColor(vec3 value)
{
    float low = channelMin(value);
    float high = channelMax(value);
    float lum = luminance(value);
    if (low < 0.0)
    {
        value = lum + (value - lum) * lum / (lum - low);
    }
    high = channelMax(value);
    if (high > 1.0)
    {
        value = lum + (value - lum) * (1.0 - lum) / (high - lum);
    }
    return value;
}

vec3 setLuminance(vec3 value, float lum)
{
    return clipColor(value + (lum - luminance(value)));
}

vec3 setSaturation(vec3 value, float saturation)
{
    float low = channelMin(value);
    float high = channelMax(value);
    float delta = high - low;
    if (delta <= 0.0)
    {
        return vec3(0.0);
    }
    vec3 result = vec3(0.0);
    if (value.r == high)
    {
        result.r = saturation;
        result.g = (value.g - low) * saturation / delta;
        result.b = (value.b - low) * saturation / delta;
    }
    else if (value.g == high)
    {
        result.g = saturation;
        result.r = (value.r - low) * saturation / delta;
        result.b = (value.b - low) * saturation / delta;
    }
    else
    {
        result.b = saturation;
        result.r = (value.r - low) * saturation / delta;
        result.g = (value.g - low) * saturation / delta;
    }
    return result;
}

vec3 blendColor(vec3 backdrop, vec3 source, uint mode)
{
    if (mode == 1u)
    {
        return backdrop * source;
    }
    if (mode == 2u)
    {
        return backdrop + source - backdrop * source;
    }
    if (mode == 3u)
    {
        return mix(2.0 * backdrop * source,
            1.0 - 2.0 * (1.0 - backdrop) * (1.0 - source),
            step(vec3(0.5), backdrop));
    }
    if (mode == 4u)
    {
        return min(backdrop, source);
    }
    if (mode == 5u)
    {
        return max(backdrop, source);
    }
    if (mode == 6u)
    {
        return mix(min(vec3(1.0), backdrop / max(vec3(1e-6), 1.0 - source)),
            vec3(1.0), step(vec3(1.0), source));
    }
    if (mode == 7u)
    {
        return mix(vec3(0.0), 1.0 - min(vec3(1.0), (1.0 - backdrop) / max(vec3(1e-6), source)),
            step(vec3(1e-6), source));
    }
    if (mode == 8u)
    {
        return mix(2.0 * backdrop * source,
            1.0 - 2.0 * (1.0 - backdrop) * (1.0 - source),
            step(vec3(0.5), source));
    }
    if (mode == 9u)
    {
        vec3 low = backdrop - (1.0 - 2.0 * source) * backdrop * (1.0 - backdrop);
        vec3 d = mix(vec3(0.0),
            mix(((16.0 * backdrop - 12.0) * backdrop + 4.0) * backdrop, sqrt(backdrop),
                step(vec3(0.25), backdrop)),
            step(vec3(0.5), source));
        return mix(low, (2.0 * source - 1.0) * (d - backdrop) + backdrop,
            step(vec3(0.5), source));
    }
    if (mode == 10u)
    {
        return abs(backdrop - source);
    }
    if (mode == 11u)
    {
        return backdrop + source - 2.0 * backdrop * source;
    }
    if (mode == 12u)
    {
        return setLuminance(setSaturation(source, channelMax(backdrop) - channelMin(backdrop)),
            luminance(backdrop));
    }
    if (mode == 13u)
    {
        return setLuminance(setSaturation(backdrop, channelMax(source) - channelMin(source)),
            luminance(backdrop));
    }
    if (mode == 14u)
    {
        return setLuminance(source, luminance(backdrop));
    }
    return setLuminance(backdrop, luminance(source));
}

void main()
{
    vec2 sourceUv = pc.params.xy + uv * pc.params.zw;
    vec4 source = texture(sourceTexture, sourceUv);
    vec4 backdrop = texture(backdropTexture, sourceUv);
    float sourceAlpha = clamp(source.a * clamp(pc.radii.x, 0.0, 1.0), 0.0, 1.0);
    float backdropAlpha = clamp(backdrop.a, 0.0, 1.0);
    vec3 sourceColor = sourceAlpha > 1e-6 ? source.rgb / max(source.a, 1e-6) : vec3(0.0);
    vec3 backdropColor = backdropAlpha > 1e-6 ? backdrop.rgb / backdropAlpha : vec3(0.0);
    vec3 blended = blendColor(clamp(backdropColor, 0.0, 1.0),
        clamp(sourceColor, 0.0, 1.0), pc.packedColorsExtra.w);
    vec3 contribution = (1.0 - backdropAlpha) * source.rgb * clamp(pc.radii.x, 0.0, 1.0)
        + sourceAlpha * backdropAlpha * blended;
    float coverage = gooClipCoverage();
    outColor = vec4(contribution * coverage, sourceAlpha * coverage);
}
