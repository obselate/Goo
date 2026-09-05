#include "goo_effect.slang"

struct DitherField
{
    float distance;
    int objectId;
};

struct DitherHit
{
    float distance;
    int objectId;
    bool hit;
};

float ditherBayer4(int index)
{
    switch (index)
    {
        case 0: return 0.0 / 16.0;
        case 1: return 8.0 / 16.0;
        case 2: return 2.0 / 16.0;
        case 3: return 10.0 / 16.0;
        case 4: return 12.0 / 16.0;
        case 5: return 4.0 / 16.0;
        case 6: return 14.0 / 16.0;
        case 7: return 6.0 / 16.0;
        case 8: return 3.0 / 16.0;
        case 9: return 11.0 / 16.0;
        case 10: return 1.0 / 16.0;
        case 11: return 9.0 / 16.0;
        case 12: return 15.0 / 16.0;
        case 13: return 7.0 / 16.0;
        case 14: return 13.0 / 16.0;
        default: return 5.0 / 16.0;
    }
}

float3 ditherRotate(float3 p, float2 rotation)
{
    float yawCos = cos(rotation.x);
    float yawSin = sin(rotation.x);
    float pitchCos = cos(rotation.y);
    float pitchSin = sin(rotation.y);
    float3 yawed = float3(
        yawCos * p.x - yawSin * p.z,
        p.y,
        yawSin * p.x + yawCos * p.z);
    return float3(
        yawed.x,
        pitchCos * yawed.y - pitchSin * yawed.z,
        pitchSin * yawed.y + pitchCos * yawed.z);
}

float3 ditherUnrotate(float3 p, float2 rotation)
{
    float yawCos = cos(rotation.x);
    float yawSin = sin(rotation.x);
    float pitchCos = cos(rotation.y);
    float pitchSin = sin(rotation.y);
    float3 unpitched = float3(
        p.x,
        pitchCos * p.y + pitchSin * p.z,
        -pitchSin * p.y + pitchCos * p.z);
    return float3(
        yawCos * unpitched.x + yawSin * unpitched.z,
        unpitched.y,
        -yawSin * unpitched.x + yawCos * unpitched.z);
}

void ditherAccumulateProjection(
    float3 point,
    float cameraZ,
    float lens,
    inout float2 lower,
    inout float2 upper,
    inout float2 lowerScale,
    inout float2 upperScale)
{
    float scale = lens / max(cameraZ - point.z, 0.1);
    float2 projection = point.xy * scale;
    if (projection.x < lower.x)
    {
        lower.x = projection.x;
        lowerScale.x = scale;
    }
    if (projection.y < lower.y)
    {
        lower.y = projection.y;
        lowerScale.y = scale;
    }
    if (projection.x > upper.x)
    {
        upper.x = projection.x;
        upperScale.x = scale;
    }
    if (projection.y > upper.y)
    {
        upper.y = projection.y;
        upperScale.y = scale;
    }
}

float2 ditherPyramidWorldOffset(float2 rotation, float halfHeight, float cameraZ, float lens)
{
    float base = halfHeight * 1.04;
    float3 apex = ditherUnrotate(float3(0.0, halfHeight, 0.0), rotation);
    float scale = lens / max(cameraZ - apex.z, 0.1);
    float2 lower = apex.xy * scale;
    float2 upper = lower;
    float2 lowerScale = scale;
    float2 upperScale = scale;
    ditherAccumulateProjection(
        ditherUnrotate(float3(-base, -halfHeight, -base), rotation),
        cameraZ, lens, lower, upper, lowerScale, upperScale);
    ditherAccumulateProjection(
        ditherUnrotate(float3(base, -halfHeight, -base), rotation),
        cameraZ, lens, lower, upper, lowerScale, upperScale);
    ditherAccumulateProjection(
        ditherUnrotate(float3(-base, -halfHeight, base), rotation),
        cameraZ, lens, lower, upper, lowerScale, upperScale);
    ditherAccumulateProjection(
        ditherUnrotate(float3(base, -halfHeight, base), rotation),
        cameraZ, lens, lower, upper, lowerScale, upperScale);
    return -(lower + upper) / max(lowerScale + upperScale, float2(0.001, 0.001));
}

float ditherBox(float3 p, float3 halfSize)
{
    float3 q = abs(p) - halfSize;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float ditherPyramid(float3 p, float halfHeight)
{
    float radial = max(abs(p.x), abs(p.z));
    float side = radial - (halfHeight - p.y) * 0.52;
    return max(side, max(p.y - halfHeight, -p.y - halfHeight));
}

DitherField ditherScene(float3 p, float2 rotation, int shape, float3 center)
{
    float3 objectPoint = ditherRotate(p - center, rotation);
    DitherField result;
    result.objectId = shape + 1;
    if (shape == 0)
    {
        result.distance = length(objectPoint) - 1.02;
    }
    else if (shape == 1)
    {
        result.distance = ditherBox(objectPoint, float3(0.78, 0.78, 0.78));
    }
    else
    {
        result.distance = ditherPyramid(objectPoint, 1.02);
    }
    return result;
}

DitherHit ditherTrace(
    float3 origin,
    float3 direction,
    float2 rotation,
    int shape,
    float3 center)
{
    DitherHit result;
    result.distance = 0.0;
    result.objectId = 0;
    result.hit = false;
    for (int stepIndex = 0; stepIndex < 72; stepIndex++)
    {
        float3 point = origin + direction * result.distance;
        DitherField field = ditherScene(point, rotation, shape, center);
        if (field.distance < 0.0015)
        {
            result.objectId = field.objectId;
            result.hit = true;
            break;
        }
        result.distance += max(field.distance * 0.58, 0.003);
        if (result.distance > 7.0)
        {
            break;
        }
    }
    return result;
}

float3 ditherNormal(float3 p, float2 rotation, int shape, float3 center)
{
    const float epsilon = 0.002;
    return normalize(float3(
        ditherScene(p + float3(epsilon, 0.0, 0.0), rotation, shape, center).distance
            - ditherScene(p - float3(epsilon, 0.0, 0.0), rotation, shape, center).distance,
        ditherScene(p + float3(0.0, epsilon, 0.0), rotation, shape, center).distance
            - ditherScene(p - float3(0.0, epsilon, 0.0), rotation, shape, center).distance,
        ditherScene(p + float3(0.0, 0.0, epsilon), rotation, shape, center).distance
            - ditherScene(p - float3(0.0, 0.0, epsilon), rotation, shape, center).distance));
}

float ditherQuantize(float value, float levels, float threshold)
{
    float scaled = saturate(value) * (levels - 1.0);
    float lower = floor(scaled);
    float upper = lower + step(threshold, frac(scaled));
    return saturate(upper / max(levels - 1.0, 1.0));
}

float4 gooEffect(float2 uv, float4 source, float4 backdrop)
{
    float4 frame = gooParameter(0);
    float4 pointer = gooParameter(1);
    float4 controls = gooParameter(2);
    float2 rotation = controls.xy;
    int shape = int(clamp(floor(controls.z + 0.5), 0.0, 2.0));
    float levels = clamp(floor(controls.w + 0.5), 2.0, 8.0);
    const float aspect = 16.0 / 9.0;
    const float cameraZ = 3.0;
    const float lens = 2.0;
    float2 screen = (uv * 2.0 - 1.0) * float2(aspect, -1.0);
    float3 center = float3(0.0, 0.0, 0.0);
    if (shape == 2)
    {
        center.xy = ditherPyramidWorldOffset(rotation, 1.02, cameraZ, lens);
    }
    float3 rayOrigin = float3(0.0, 0.0, cameraZ);
    float3 rayDirection = normalize(float3(screen, -lens));
    DitherHit hit = ditherTrace(rayOrigin, rayDirection, rotation, shape, center);

    float2 gridUv = abs(frac(screen * 3.0) - 0.5);
    float grid = 1.0 - smoothstep(0.46, 0.49, max(gridUv.x, gridUv.y));
    float2 vignetteUv = screen / float2(aspect, 1.0);
    float vignette = saturate(1.0 - dot(vignetteUv, vignetteUv) * 0.46);
    float3 color = lerp(float3(0.015, 0.020, 0.032), float3(0.035, 0.045, 0.064), vignette);
    color += grid * float3(0.018, 0.024, 0.036);

    if (hit.hit)
    {
        float3 point = rayOrigin + rayDirection * hit.distance;
        float3 normal = ditherNormal(point, rotation, shape, center);
        float3 lightPosition = float3(
            (pointer.x - 0.5) * 3.2,
            (0.5 - pointer.y) * 2.0 + 1.1,
            2.4);
        float3 lightDirection = normalize(lightPosition - point);
        float diffuse = saturate(dot(normal, lightDirection));
        float rim = pow(1.0 - saturate(dot(normal, -rayDirection)), 2.0);
        float shade = 0.16 + diffuse * 0.74 + rim * 0.18;
        int2 pixel = int2(floor(uv * max(frame.yz, float2(1.0, 1.0))));
        int column = pixel.x - (pixel.x / 4) * 4;
        int row = pixel.y - (pixel.y / 4) * 4;
        float threshold = ditherBayer4(column + row * 4);
        float quantized = ditherQuantize(shade, levels, threshold);
        float3 material = hit.objectId == 1
            ? float3(0.24, 0.78, 0.72)
            : (hit.objectId == 2
                ? float3(0.98, 0.43, 0.21)
                : float3(0.62, 0.48, 0.96));
        color = material * (0.10 + quantized * 0.96);
        color += float3(0.95, 0.97, 1.0) * rim * quantized * 0.16;
    }

    color = lerp(color, source.rgb, 0.0001);
    color = lerp(color, backdrop.rgb, 0.0001);
    return float4(saturate(color), 1.0);
}
