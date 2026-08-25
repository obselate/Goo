#version 450 core
#extension GL_GOOGLE_include_directive : require

#include "goo_effect.glsl"

const float GlassPi = 3.141592653589323;
const float GlassAaPixels = 2.0;
const float GlassAberration = 5.0;
const float GlassEdgeDimension = 0.003;
const float GlassReflectionOffsetMin = 0.035;
const float GlassReflectionOffsetMagnitude = 0.005;
const vec2 GlassRimLightDirection = vec2(-0.70710678, 0.70710678);
const float GlassRimLightStrength = 0.035;

struct GlassFieldValue
{
    float distance;
    vec2 gradient;
    float radius;
};

GlassFieldValue roundedRectField(vec2 point, vec4 normalizedRect, vec2 size)
{
    vec2 extent = normalizedRect.zw * size;
    if (extent.x <= 0.0 || extent.y <= 0.0)
    {
        return GlassFieldValue(1000000.0, vec2(0.0), 0.0);
    }
    vec2 halfSize = extent * 0.5;
    float radius = min(extent.x, extent.y) * 0.5;
    vec2 relative = point - normalizedRect.xy * size - halfSize;
    vec2 w = abs(relative) - max(halfSize - vec2(radius), vec2(0.0));
    vec2 signs = vec2(relative.x < 0.0 ? -1.0 : 1.0,
        relative.y < 0.0 ? -1.0 : 1.0);
    float side = max(w.x, w.y);
    vec2 outside = max(w, vec2(0.0));
    float outsideLength = length(outside);
    float distance = side > 0.0 ? outsideLength - radius : side - radius;
    vec2 gradient = side > 0.0
        ? signs * (outsideLength > 0.00001
            ? outside / outsideLength
            : vec2(0.0, 1.0))
        : signs * (w.x > w.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0));
    return GlassFieldValue(distance, gradient, radius);
}

GlassFieldValue circleField(vec2 point, vec4 orb, vec2 size)
{
    vec2 center = orb.xy * size;
    float radius = orb.z * size.y;
    vec2 relative = point - center;
    float distanceFromCenter = length(relative);
    vec2 gradient = distanceFromCenter > 0.00001
        ? relative / distanceFromCenter
        : vec2(0.0, 1.0);
    return GlassFieldValue(distanceFromCenter - radius, gradient, radius);
}

GlassFieldValue minimumField(GlassFieldValue a, GlassFieldValue b)
{
    return a.distance < b.distance ? a : b;
}

GlassFieldValue smoothUnionField(GlassFieldValue a, GlassFieldValue b,
    float kernel)
{
    float h = clamp(0.5 + 0.5 * (b.distance - a.distance) / kernel,
        0.0, 1.0);
    return GlassFieldValue(
        mix(b.distance, a.distance, h) - kernel * h * (1.0 - h),
        mix(b.gradient, a.gradient, h),
        mix(b.radius, a.radius, h));
}

GlassFieldValue stickyUnionField(GlassFieldValue a, GlassFieldValue b,
    float edgeGap, float reach, float maximumNeck, float fadeWidth)
{
    GlassFieldValue base = minimumField(a, b);
    if (edgeGap >= reach)
    {
        return base;
    }
    float neck = maximumNeck * (1.0 - smoothstep(0.0, reach, edgeGap));
    float kernel = max(edgeGap * 2.0 + neck * 4.0, 0.5);
    GlassFieldValue pulled = smoothUnionField(a, b, kernel);
    float pull = 1.0 - smoothstep(max(reach - fadeWidth, 0.0),
        reach, edgeGap);
    return GlassFieldValue(
        mix(base.distance, pulled.distance, pull),
        mix(base.gradient, pulled.gradient, pull),
        mix(base.radius, pulled.radius, pull));
}

GlassFieldValue glassField(vec2 point, vec2 size, float edgeGap,
    float reach, float maximumNeck, float fadeWidth)
{
    GlassFieldValue controls = roundedRectField(
        point, gooParameters.values[3], size);
    controls = minimumField(controls,
        roundedRectField(point, gooParameters.values[4], size));
    controls = minimumField(controls,
        roundedRectField(point, gooParameters.values[5], size));
    controls = minimumField(controls,
        roundedRectField(point, gooParameters.values[6], size));
    GlassFieldValue orb = circleField(point, gooParameters.values[2], size);
    return stickyUnionField(orb, controls, edgeGap, reach,
        maximumNeck, fadeWidth);
}

vec3 glassNormal(vec2 gradient, float sd, float thickness)
{
    vec2 direction = gradient / max(length(gradient), 0.00001);
    float normalCosine = clamp((thickness + sd) / thickness, 0.0, 1.0);
    float normalSine = sqrt(max(1.0 - normalCosine * normalCosine, 0.0));
    return normalize(vec3(direction * normalCosine, max(normalSine, 0.035)));
}

float glassHeight(float sd, float thickness)
{
    if (sd >= 0.0)
    {
        return 0.0;
    }
    if (sd < -thickness)
    {
        return thickness;
    }
    float x = thickness + sd;
    return sqrt(max(thickness * thickness - x * x, 0.0));
}

vec4 gooEffect(vec2 uv, vec4 source, vec4 backdrop)
{
    GooPrimitiveRecord primitive = gooPrimitiveBuffer.records[gooPrimitiveRecordOrdinal];
    vec2 size = max(primitive.rect.zw, vec2(1.0));
    vec2 point = uv * size;
    float edgeGap = max(gooParameters.values[7].x * size.y, 0.0);
    float stickyReach = max(gooParameters.values[7].y * size.y, 0.5);
    float maximumNeck = max(gooParameters.values[7].z * size.y, 0.5);
    float fadeWidth = max(gooParameters.values[7].w * size.y, 0.5);
    GlassFieldValue field = glassField(point, size, edgeGap,
        stickyReach, maximumNeck, fadeWidth);
    float sd = field.distance;
    float thickness = max(gooParameters.values[1].z * size.y, 0.5);
    float opticalThickness = max(min(thickness * 2.2, field.radius * 0.46), 0.5);
    vec3 normal = glassNormal(field.gradient, sd, opticalThickness);
    if (sd >= GlassAaPixels)
    {
        return vec4(backdrop.rgb, 1.0);
    }
    float centerIor = max(gooParameters.values[0].y, 1.0001);
    vec3 configuredIor = centerIor + vec3(-0.01, 0.0, 0.01);
    vec3 refractiveIndex = mix(vec3(centerIor), configuredIor,
        GlassAberration);
    float baseHeight = thickness * 8.0 * gooParameters.values[0].x;
    vec3 incident = vec3(0.0, 0.0, -1.0);
    vec3 refractedRed = refract(incident, normal, 1.0 / refractiveIndex.r);
    vec3 refractedGreen = refract(incident, normal, 1.0 / refractiveIndex.g);
    vec3 refractedBlue = refract(incident, normal, 1.0 / refractiveIndex.b);
    float height = glassHeight(sd, opticalThickness);
    vec2 textureExtent = vec2(textureSize(gooBackdropTexture, 0));
    vec2 texel = 1.0 / textureExtent;
    vec2 sourceUv = primitive.params.xy + uv * primitive.params.zw;
    float gradientMagnitude = clamp(length(field.gradient), 0.0, 1.0);
    float rayDepthRed = (height + baseHeight) / max(-refractedRed.z, 0.05);
    float rayDepthGreen = (height + baseHeight) / max(-refractedGreen.z, 0.05);
    float rayDepthBlue = (height + baseHeight) / max(-refractedBlue.z, 0.05);
    vec2 minimumUv = texel * 0.5;
    vec2 maximumUv = vec2(1.0) - minimumUv;
    vec2 refractedUvRed = clamp(sourceUv
        + refractedRed.xy * rayDepthRed * texel * gradientMagnitude,
        minimumUv, maximumUv);
    vec2 refractedUvGreen = clamp(sourceUv
        + refractedGreen.xy * rayDepthGreen * texel * gradientMagnitude,
        minimumUv, maximumUv);
    vec2 refractedUvBlue = clamp(sourceUv
        + refractedBlue.xy * rayDepthBlue * texel * gradientMagnitude,
        minimumUv, maximumUv);
    vec4 refractedRedSample = texture(gooBackdropTexture, refractedUvRed);
    vec4 refractedGreenSample = texture(gooBackdropTexture, refractedUvGreen);
    vec4 refractedBlueSample = texture(gooBackdropTexture, refractedUvBlue);
    vec3 glass = vec3(
        mix(backdrop.r, refractedRedSample.r, refractedRedSample.a),
        mix(backdrop.g, refractedGreenSample.g, refractedGreenSample.a),
        mix(backdrop.b, refractedBlueSample.b, refractedBlueSample.a));
    float edgeDimension = max(GlassEdgeDimension * size.y, 0.5);
    float edge = clamp((sd + edgeDimension) / edgeDimension, 0.0, 1.0);
    float curvedEdge = 1.0 - cos(edge * GlassPi * 0.5);
    vec2 reflectionDirection = field.gradient;
    float reflectionDistance = GlassReflectionOffsetMin
        + GlassReflectionOffsetMagnitude * curvedEdge;
    vec2 reflectionUv = clamp(sourceUv
        + reflectionDirection * reflectionDistance * primitive.params.zw,
        minimumUv, maximumUv);
    vec4 reflectionSample = texture(gooBackdropTexture, reflectionUv);
    float rimLightIntensity = max(dot(
        field.gradient / max(length(field.gradient), 0.00001),
        GlassRimLightDirection), 0.0);
    vec3 rimLight = vec3(GlassRimLightStrength * rimLightIntensity);
    vec3 reflectionColor = reflectionSample.rgb * reflectionSample.a;
    vec3 reflectedGlass = max(glass, reflectionColor);
    vec3 edgeColor = vec3(1.0)
        - (vec3(1.0) - reflectedGlass) * (vec3(1.0) - rimLight);
    glass = mix(glass, edgeColor,
        curvedEdge * gooParameters.values[1].x);
    float tintMix = clamp(gooParameters.values[0].z, 0.0, 1.0)
        * (1.0 - smoothstep(-opticalThickness, 0.0, sd));
    glass = mix(glass, vec3(1.0), tintMix);
    float luminance = dot(glass, vec3(0.2126, 0.7152, 0.0722));
    glass = mix(vec3(luminance), glass, max(gooParameters.values[0].w, 0.0));
    glass = source.rgb + glass * (1.0 - clamp(source.a, 0.0, 1.0));
    float coverage = 1.0 - smoothstep(0.0, GlassAaPixels, sd);
    glass = mix(backdrop.rgb, clamp(glass, 0.0, 1.0), coverage);
    return vec4(clamp(glass, 0.0, 1.0), 1.0);
}
