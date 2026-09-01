#include "goo_effect.slang"

static const uint MAP[16] = {
    0xFFFFu, 0x8001u, 0x8811u, 0x8001u,
    0xFF7Fu, 0x8001u, 0x8811u, 0x8001u,
    0xEFF7u, 0x8001u, 0x8811u, 0x8001u,
    0xFF7Fu, 0x8001u, 0x8811u, 0xFFFFu
};

struct WolfHit
{
    bool hit;
    uint material;
    int side;
    int2 cell;
    float distance;
    float2 point;
};

uint wolfMapValue(int2 cell)
{
    if (cell.x < 0 || cell.x >= 16 || cell.y < 0 || cell.y >= 16)
    {
        return 1u;
    }
    uint bit = 1u << uint(cell.x);
    if ((MAP[uint(cell.y)] & bit) == 0u)
    {
        return 0u;
    }
    return ((cell.x + cell.y) % 3 == 0) ? 2u : 1u;
}

WolfHit wolfTrace(float2 origin, float2 rayDirection)
{
    WolfHit result;
    result.hit = false;
    result.material = 0u;
    result.side = 0;
    result.cell = int2(0, 0);
    result.distance = 64.0;
    result.point = origin + rayDirection * result.distance;

    int2 mapPosition = int2(floor(origin));
    int2 rayStep = int2(1, 1);
    float2 deltaDistance = 1.0 / max(abs(rayDirection), float2(0.0001, 0.0001));
    float2 sideDistance = float2(0.0, 0.0);

    if (rayDirection.x < 0.0)
    {
        rayStep.x = -1;
        sideDistance.x = (origin.x - float(mapPosition.x)) * deltaDistance.x;
    }
    else
    {
        sideDistance.x = (float(mapPosition.x) + 1.0 - origin.x) * deltaDistance.x;
    }

    if (rayDirection.y < 0.0)
    {
        rayStep.y = -1;
        sideDistance.y = (origin.y - float(mapPosition.y)) * deltaDistance.y;
    }
    else
    {
        sideDistance.y = (float(mapPosition.y) + 1.0 - origin.y) * deltaDistance.y;
    }

    for (int iteration = 0; iteration < 48; iteration++)
    {
        if (sideDistance.x < sideDistance.y)
        {
            sideDistance.x += deltaDistance.x;
            mapPosition.x += rayStep.x;
            result.side = 0;
        }
        else
        {
            sideDistance.y += deltaDistance.y;
            mapPosition.y += rayStep.y;
            result.side = 1;
        }

        uint mapValue = wolfMapValue(mapPosition);
        if (mapValue != 0u)
        {
            result.hit = true;
            result.material = mapValue;
            result.cell = mapPosition;
            if (result.side == 0)
            {
                result.distance = (float(mapPosition.x) - origin.x
                    + (1.0 - float(rayStep.x)) * 0.5) / rayDirection.x;
            }
            else
            {
                result.distance = (float(mapPosition.y) - origin.y
                    + (1.0 - float(rayStep.y)) * 0.5) / rayDirection.y;
            }
            result.distance = max(result.distance, 0.001);
            result.point = origin + rayDirection * result.distance;
            break;
        }
    }

    return result;
}

float3 wolfFloorColor(float2 point, float time)
{
    float2 cell = floor(point);
    float checker = frac((cell.x + cell.y) * 0.5) * 2.0;
    float seam = smoothstep(0.08, 0.2, min(frac(point.x), frac(point.y)));
    float3 base = lerp(float3(0.022, 0.028, 0.040),
        float3(0.040, 0.044, 0.052), checker);
    base *= 0.82 + 0.18 * seam;
    base += float3(0.008, 0.004, 0.002) * (0.5 + 0.5 * sin(time * 0.4));
    return base;
}

float3 wolfWallColor(WolfHit hit, float2 point, float wallY)
{
    float wallCoordinate = hit.side == 0 ? frac(point.y) : frac(point.x);
    float brickRow = floor(wallY * 8.0);
    float brickColumn = floor((wallCoordinate + frac(brickRow * 0.5)) * 8.0);
    float2 brickUv = float2(frac(wallCoordinate * 8.0 + brickRow * 0.5), frac(wallY * 8.0));
    float seam = smoothstep(0.08, 0.16, min(brickUv.x, brickUv.y));
    float pattern = frac((brickColumn + brickRow) * 0.5) * 2.0;
    float3 brick = lerp(float3(0.26, 0.105, 0.040),
        float3(0.40, 0.19, 0.065), pattern);
    float3 checker = lerp(float3(0.045, 0.20, 0.22),
        float3(0.075, 0.34, 0.32), frac((brickColumn + brickRow) * 0.5) * 2.0);
    float3 color = hit.material == 2u ? checker : brick;
    color *= 0.60 + 0.40 * seam;
    color *= hit.side == 0 ? 1.0 : 0.72;
    return color;
}

float4 gooEffect(float2 uv, float4 source, float4 backdrop)
{
    float4 frame = gooParameter(0);
    float4 camera = gooParameter(2);
    float4 tuning = gooParameter(3);
    float2 resolution = max(frame.yz, float2(1.0, 1.0));
    float aspect = resolution.x / resolution.y;
    float2 direction = camera.zw / max(length(camera.zw), 0.0001);
    float2 plane = float2(-direction.y, direction.x);
    float cameraX = (2.0 * uv.x - 1.0) * aspect;
    float fovScale = clamp(tuning.x, 0.25, 1.35);
    float2 rayDirection = normalize(direction + plane * cameraX * fovScale);
    WolfHit hit = wolfTrace(camera.xy, rayDirection);

    float lineHeight = hit.hit ? min(2.4, 0.86 / max(hit.distance, 0.05)) : 0.0;
    float wallTop = 0.5 - lineHeight * 0.5;
    float wallBottom = 0.5 + lineHeight * 0.5;
    float3 color;

    if (hit.hit && uv.y >= wallTop && uv.y <= wallBottom)
    {
        float wallY = (uv.y - wallTop) / max(lineHeight, 0.001);
        color = wolfWallColor(hit, hit.point, wallY);
    }
    else if (uv.y > 0.5)
    {
        float floorDepth = min(20.0, 1.0 / max(uv.y - 0.5, 0.035));
        float2 floorPoint = camera.xy + rayDirection * floorDepth;
        color = wolfFloorColor(floorPoint, frame.x);
        float floorGradient = saturate((uv.y - 0.5) * 2.0);
        color *= lerp(0.58, 1.0, floorGradient);
    }
    else
    {
        float ceilingDepth = min(20.0, 1.0 / max(0.5 - uv.y, 0.035));
        float2 ceilingPoint = camera.xy + rayDirection * ceilingDepth;
        float ceilingPattern = 0.5 + 0.5 * sin(ceilingPoint.x * 2.0 + ceilingPoint.y * 1.5);
        color = lerp(float3(0.010, 0.014, 0.024),
            float3(0.024, 0.028, 0.043), ceilingPattern);
        float ceilingGradient = saturate((0.5 - uv.y) * 2.0);
        color *= lerp(0.92, 0.42, ceilingGradient);
    }

    float fogDensity = clamp(tuning.z, 0.0, 1.0);
    float distanceFog = exp(-max(hit.distance, 0.0) * lerp(0.06, 0.42, fogDensity));
    if (!hit.hit)
    {
        distanceFog = 0.0;
    }
    color = lerp(float3(0.002, 0.003, 0.006), color, distanceFog);
    float contrast = clamp(tuning.y, 0.5, 1.8);
    color = (color - 0.5) * contrast + 0.5;
    float sourceAlpha = clamp(source.a, 0.0, 1.0);
    float3 retainedSource = source.rgb / max(sourceAlpha, 0.0001);
    float sourceMix = clamp(sourceAlpha * 0.30, 0.0, 0.30);
    color = lerp(color, clamp(retainedSource, 0.0, 1.0), sourceMix);
    color = max(color, float3(0.0, 0.0, 0.0));
    float alpha = saturate(sourceAlpha + backdrop.a * 0.0);
    return float4(color * alpha, alpha);
}
