#include "goo_effect.slang"

static const uint MAP[16] = {
    0xFFFFu, 0x8001u, 0x8811u, 0x8001u,
    0xFF7Fu, 0x8001u, 0x8811u, 0x8001u,
    0xEFF7u, 0x8001u, 0x8811u, 0x8001u,
    0xFF7Fu, 0x8001u, 0x8811u, 0xFFFFu
};

static const float2 ENEMIES[6] = {
    float2(5.5, 1.5), float2(10.5, 1.5), float2(2.5, 3.5),
    float2(7.5, 4.5), float2(10.5, 7.5), float2(2.5, 10.5)
};

float2 wolfEnemyPosition(
    int index,
    float4 enemyPair0,
    float4 enemyPair1,
    float4 enemyPair2)
{
    if (index == 0)
    {
        return enemyPair0.xy;
    }
    if (index == 1)
    {
        return enemyPair0.zw;
    }
    if (index == 2)
    {
        return enemyPair1.xy;
    }
    if (index == 3)
    {
        return enemyPair1.zw;
    }
    if (index == 4)
    {
        return enemyPair2.xy;
    }
    return enemyPair2.zw;
}

float2 wolfEnemyPositionOrDefault(
    int index,
    float4 enemyPair0,
    float4 enemyPair1,
    float4 enemyPair2)
{
    float2 position = wolfEnemyPosition(index, enemyPair0, enemyPair1, enemyPair2);
    float supplied = dot(abs(enemyPair0), float4(1.0, 1.0, 1.0, 1.0))
        + dot(abs(enemyPair1), float4(1.0, 1.0, 1.0, 1.0))
        + dot(abs(enemyPair2), float4(1.0, 1.0, 1.0, 1.0));
    return supplied > 0.001 ? position : ENEMIES[index];
}

struct WolfHit
{
    bool hit;
    uint material;
    int side;
    int2 cell;
    float distance;
    float2 point;
    float2 normal;
};

struct WolfEnemyHit
{
    bool visible;
    int index;
    float depth;
    float2 local;
    float mask;
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
    result.normal = float2(0.0, 1.0);

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

    for (int iteration = 0; iteration < 56; iteration++)
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
                result.normal = float2(-float(rayStep.x), 0.0);
            }
            else
            {
                result.distance = (float(mapPosition.y) - origin.y
                    + (1.0 - float(rayStep.y)) * 0.5) / rayDirection.y;
                result.normal = float2(0.0, -float(rayStep.y));
            }
            result.distance = max(result.distance, 0.001);
            result.point = origin + rayDirection * result.distance;
            break;
        }
    }

    return result;
}

float3 wolfLampColor(int index)
{
    if (index == 0)
    {
        return float3(0.95, 0.28, 0.08);
    }
    if (index == 1)
    {
        return float3(0.08, 0.55, 0.92);
    }
    if (index == 2)
    {
        return float3(0.55, 0.16, 0.92);
    }
    return float3(0.14, 0.85, 0.46);
}

float2 wolfLampPosition(int index)
{
    if (index == 0)
    {
        return float2(2.5, 1.5);
    }
    if (index == 1)
    {
        return float2(12.5, 1.5);
    }
    if (index == 2)
    {
        return float2(2.5, 10.5);
    }
    return float2(12.5, 10.5);
}

float3 wolfLightAt(float2 point, float2 normal, float time)
{
    float3 result = float3(0.10, 0.12, 0.16);
    for (int index = 0; index < 4; index++)
    {
        float2 lightPoint = wolfLampPosition(index);
        float2 lightVector = lightPoint - point;
        float distance = length(lightVector);
        float2 lightDirection = lightVector / max(distance, 0.001);
        float facing = 0.42 + 0.58 * saturate(dot(normal, lightDirection));
        float pulse = 0.84 + 0.16 * sin(time * (1.3 + float(index) * 0.21) + float(index) * 1.7);
        float influence = (1.0 - smoothstep(0.55, 5.8, distance)) * pulse * facing;
        result += wolfLampColor(index) * influence * 0.36;
    }
    return result;
}

float3 wolfFloorColor(float2 point, float time)
{
    float2 cell = floor(point);
    float checker = frac((cell.x + cell.y) * 0.5) * 2.0;
    float2 local = frac(point);
    float seam = 1.0 - smoothstep(0.035, 0.11, min(local.x, local.y));
    float edge = 1.0 - smoothstep(0.02, 0.07, min(1.0 - local.x, 1.0 - local.y));
    float3 base = lerp(float3(0.018, 0.024, 0.035),
        float3(0.037, 0.043, 0.052), checker);
    base *= 0.76 + 0.24 * max(seam, edge);
    for (int index = 0; index < 4; index++)
    {
        float distance = length(point - wolfLampPosition(index));
        float pulse = 0.78 + 0.22 * sin(time * 1.2 + float(index) * 1.6);
        base += wolfLampColor(index) * (1.0 - smoothstep(0.4, 4.8, distance)) * pulse * 0.075;
    }
    base += float3(0.008, 0.004, 0.002) * (0.5 + 0.5 * sin(time * 0.4));
    return base;
}

float3 wolfWallColor(WolfHit hit, float2 point, float wallY, float time)
{
    float wallCoordinate = hit.side == 0 ? frac(point.y) : frac(point.x);
    float brickRow = floor(wallY * 9.0);
    float brickColumn = floor((wallCoordinate + frac(brickRow * 0.5)) * 8.0);
    float2 brickUv = float2(frac(wallCoordinate * 8.0 + brickRow * 0.5), frac(wallY * 9.0));
    float seam = 1.0 - smoothstep(0.035, 0.105, min(brickUv.x, brickUv.y));
    float panelLine = 1.0 - smoothstep(0.015, 0.045, abs(frac(wallCoordinate * 2.0) - 0.5));
    float pattern = frac((brickColumn + brickRow) * 0.5) * 2.0;
    float3 brick = lerp(float3(0.25, 0.08, 0.032),
        float3(0.44, 0.18, 0.055), pattern);
    float3 checker = lerp(float3(0.035, 0.19, 0.23),
        float3(0.065, 0.34, 0.34), frac((brickColumn + brickRow) * 0.5) * 2.0);
    float3 color = hit.material == 2u ? checker : brick;
    color *= 0.57 + 0.43 * seam;
    color += float3(0.02, 0.07, 0.07) * panelLine * (0.42 + 0.18 * sin(time * 1.4));
    color *= hit.side == 0 ? 1.0 : 0.72;
    return color;
}

float wolfRoundRect(float2 point, float2 center, float2 halfSize, float radius)
{
    float2 q = abs(point - center) - halfSize + radius;
    float distance = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
    float aa = max(fwidth(distance), 0.00035);
    return 1.0 - smoothstep(-aa, aa, distance);
}

float wolfCircle(float2 point, float2 center, float radius)
{
    float distance = length(point - center) - radius;
    float aa = max(fwidth(distance), 0.00035);
    return 1.0 - smoothstep(-aa, aa, distance);
}

float wolfScreenCircle(float2 point, float2 center, float radius, float aspect)
{
    float2 delta = (point - center) * float2(aspect, 1.0);
    float distance = length(delta) - radius;
    float aa = max(fwidth(distance), 0.00035);
    return 1.0 - smoothstep(-aa, aa, distance);
}

float wolfScreenRing(
    float2 point, float2 center, float radius, float thickness, float aspect)
{
    float2 delta = (point - center) * float2(aspect, 1.0);
    float distance = abs(length(delta) - radius) - thickness;
    float aa = max(fwidth(distance), 0.00035);
    return 1.0 - smoothstep(-aa, aa, distance);
}

float wolfCapsule(
    float2 point, float2 start, float2 end, float radius, float aspect)
{
    float2 scale = float2(aspect, 1.0);
    float2 p = point * scale;
    float2 a = start * scale;
    float2 b = end * scale;
    float2 pa = p - a;
    float2 ba = b - a;
    float h = saturate(dot(pa, ba) / max(dot(ba, ba), 0.000001));
    float distance = length(pa - ba * h) - radius;
    float aa = max(fwidth(distance), 0.00035);
    return 1.0 - smoothstep(-aa, aa, distance);
}

float wolfRotatedBox(
    float2 point,
    float2 center,
    float2 halfSize,
    float angle,
    float radius,
    float aspect)
{
    float2 p = (point - center) * float2(aspect, 1.0);
    float sine = sin(angle);
    float cosine = cos(angle);
    float2 rotated = float2(cosine * p.x + sine * p.y, -sine * p.x + cosine * p.y);
    float2 q = abs(rotated) - halfSize + radius;
    float distance = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
    float aa = max(fwidth(distance), 0.00035);
    return 1.0 - smoothstep(-aa, aa, distance);
}

float wolfCross2(float2 a, float2 b)
{
    return a.x * b.y - a.y * b.x;
}

float wolfConvexQuad(
    float2 point,
    float2 a,
    float2 b,
    float2 c,
    float2 d,
    float aspect)
{
    float2 scale = float2(aspect, 1.0);
    float2 p = point * scale;
    float2 p0 = a * scale;
    float2 p1 = b * scale;
    float2 p2 = c * scale;
    float2 p3 = d * scale;
    float winding = sign(wolfCross2(p1 - p0, p2 - p1));
    float edge0 = winding * wolfCross2(p1 - p0, p - p0) / max(length(p1 - p0), 0.000001);
    float edge1 = winding * wolfCross2(p2 - p1, p - p1) / max(length(p2 - p1), 0.000001);
    float edge2 = winding * wolfCross2(p3 - p2, p - p2) / max(length(p3 - p2), 0.000001);
    float edge3 = winding * wolfCross2(p0 - p3, p - p3) / max(length(p0 - p3), 0.000001);
    float distance = min(min(edge0, edge1), min(edge2, edge3));
    float aa = max(fwidth(distance), 0.00035);
    return smoothstep(-aa, aa, distance);
}

float wolfEnemyMask(float2 point)
{
    float2 headPoint = (point - float2(0.0, 0.22)) * float2(1.0, 1.14);
    float head = 1.0 - smoothstep(0.34, 0.44, length(headPoint));
    float bodyWidth = 0.44 - max(point.y - 0.36, 0.0) * 0.08;
    float bodyDistance = max(abs(point.x) - bodyWidth, abs(point.y - 0.66) - 0.31);
    float body = 1.0 - smoothstep(-0.015, 0.04, bodyDistance);
    float legDistance = max(abs(point.x) - 0.24, abs(point.y - 0.93) - 0.12);
    float legs = 1.0 - smoothstep(-0.015, 0.035, legDistance);
    return max(head, max(body, legs));
}

float3 wolfEnemyColor(WolfEnemyHit enemy, float time, float fireHit)
{
    float2 point = enemy.local;
    float2 headPoint = (point - float2(0.0, 0.22)) * float2(1.0, 1.14);
    float head = 1.0 - smoothstep(0.29, 0.37, length(headPoint));
    float bodyWidth = 0.44 - max(point.y - 0.36, 0.0) * 0.08;
    float bodyDistance = max(abs(point.x) - bodyWidth, abs(point.y - 0.66) - 0.31);
    float body = 1.0 - smoothstep(-0.01, 0.035, bodyDistance);
    float visor = 1.0 - smoothstep(0.01, 0.055,
        max(abs(point.x) - 0.28, abs(point.y - 0.23) - 0.07));
    float eye = wolfCircle(point, float2(-0.14, 0.22), 0.027)
        + wolfCircle(point, float2(0.14, 0.22), 0.027);
    float shoulder = 1.0 - smoothstep(0.0, 0.06,
        abs(abs(point.x) - 0.39) + abs(point.y - 0.47) * 0.3);
    float pulse = 0.5 + 0.5 * sin(time * 2.0 + float(enemy.index) * 1.8);
    float3 armor = lerp(float3(0.10, 0.16, 0.20), float3(0.20, 0.32, 0.34), pulse * 0.25);
    armor += float3(0.06, 0.15, 0.16) * shoulder;
    armor = lerp(armor, float3(0.85, 0.20, 0.08), fireHit);
    float3 color = armor * body;
    color += float3(0.035, 0.045, 0.055) * head;
    color += float3(0.02, 0.72, 0.85) * visor;
    color += float3(1.0, 0.36, 0.08) * eye;
    color += float3(0.08, 0.30, 0.28) * (1.0 - body) * head;
    return color;
}

WolfEnemyHit wolfEnemyAt(
    float2 uv,
    float2 origin,
    float2 direction,
    float2 plane,
    float aspect,
    float fovScale,
    float wallDistance,
    int defeatedMask,
    float4 enemyPair0,
    float4 enemyPair1,
    float4 enemyPair2,
    float time)
{
    WolfEnemyHit result;
    result.visible = false;
    result.index = -1;
    result.depth = wallDistance;
    result.local = float2(0.0, 0.0);
    result.mask = 0.0;

    for (int index = 0; index < 6; index++)
    {
        if ((defeatedMask & (1 << index)) != 0)
        {
            continue;
        }
        float2 relative = wolfEnemyPositionOrDefault(
            index, enemyPair0, enemyPair1, enemyPair2) - origin;
        float depth = dot(relative, direction);
        if (depth <= 0.15 || depth >= result.depth - 0.035)
        {
            continue;
        }
        float lateral = dot(relative, plane);
        float scale = 0.86 / max(depth, 0.12);
        float centerX = 0.5 + lateral / max(depth * 2.0 * aspect * fovScale, 0.001);
        float bob = sin(time * 1.8 + float(index) * 1.7) * 0.018 * min(1.0, depth * 0.22);
        float top = 0.5 - scale * 0.72 + bob;
        float bottom = 0.5 + scale * 0.72 + bob;
        float2 local = float2(
            (uv.x - centerX) / max(scale * 0.48, 0.001),
            (uv.y - top) / max(bottom - top, 0.001));
        local.y = clamp(local.y, -0.1, 1.1);
        float mask = wolfEnemyMask(local);
        if (mask > 0.01)
        {
            result.visible = true;
            result.index = index;
            result.depth = depth;
            result.local = local;
            result.mask = mask;
        }
    }
    return result;
}

int wolfShotTarget(
    float2 origin,
    float2 direction,
    float2 plane,
    float wallDistance,
    int defeatedMask,
    float4 enemyPair0,
    float4 enemyPair1,
    float4 enemyPair2)
{
    int result = -1;
    float best = wallDistance;
    for (int index = 0; index < 6; index++)
    {
        if ((defeatedMask & (1 << index)) != 0)
        {
            continue;
        }
        float2 relative = wolfEnemyPositionOrDefault(
            index, enemyPair0, enemyPair1, enemyPair2) - origin;
        float depth = dot(relative, direction);
        float lateral = abs(dot(relative, plane));
        if (depth > 0.15 && depth < best && lateral < 0.22 + depth * 0.012)
        {
            result = index;
            best = depth;
        }
    }
    return result;
}

float wolfSegment(float2 p, float2 a, float2 b, float r)
{
    float2 pa = p - a;
    float2 ba = b - a;
    float h = saturate(dot(pa, ba) / max(dot(ba, ba), 0.000001));
    float d = length(pa - ba * h) - r;
    float aa = max(fwidth(d), 0.00035);
    return 1.0 - smoothstep(-aa, aa, d);
}

float wolfBox(float2 p, float2 center, float2 halfSize)
{
    float2 d = abs(p - center) - halfSize;
    float dist = max(d.x, d.y);
    float aa = max(fwidth(dist), 0.00035);
    return 1.0 - smoothstep(-aa, aa, dist);
}

float wolfCharH(float2 uv, float2 c, float sz, float aspect)
{
    float hh = sz * 0.45;
    float hw = (sz * 0.32) / aspect;
    float thX = 0.0022 / aspect;
    float thY = 0.0022;
    float l = wolfBox(uv, c - float2(hw, 0.0), float2(thX, hh));
    float r = wolfBox(uv, c + float2(hw, 0.0), float2(thX, hh));
    float m = wolfBox(uv, c, float2(hw, thY));
    return max(max(l, r), m);
}

float wolfCharE(float2 uv, float2 c, float sz, float aspect)
{
    float hh = sz * 0.45;
    float hw = (sz * 0.32) / aspect;
    float thX = 0.0022 / aspect;
    float thY = 0.0022;
    float l = wolfBox(uv, c - float2(hw, 0.0), float2(thX, hh));
    float t = wolfBox(uv, c - float2(0.0, hh), float2(hw, thY));
    float m = wolfBox(uv, c - float2(0.001 / aspect, 0.0), float2(hw * 0.8, thY));
    float b = wolfBox(uv, c + float2(0.0, hh), float2(hw, thY));
    return max(max(l, t), max(m, b));
}

float wolfCharA(float2 uv, float2 c, float sz, float aspect)
{
    float hh = sz * 0.45;
    float hw = (sz * 0.32) / aspect;
    float thX = 0.0022 / aspect;
    float thY = 0.0022;
    float l = wolfBox(uv, c - float2(hw, 0.0), float2(thX, hh));
    float r = wolfBox(uv, c + float2(hw, 0.0), float2(thX, hh));
    float t = wolfBox(uv, c - float2(0.0, hh), float2(hw, thY));
    float m = wolfBox(uv, c + float2(0.0, 0.001), float2(hw, thY));
    return max(max(l, r), max(t, m));
}

float wolfCharL(float2 uv, float2 c, float sz, float aspect)
{
    float hh = sz * 0.45;
    float hw = (sz * 0.32) / aspect;
    float thX = 0.0022 / aspect;
    float thY = 0.0022;
    float l = wolfBox(uv, c - float2(hw, 0.0), float2(thX, hh));
    float b = wolfBox(uv, c + float2(0.0, hh), float2(hw, thY));
    return max(l, b);
}

float wolfCharT(float2 uv, float2 c, float sz, float aspect)
{
    float hh = sz * 0.45;
    float hw = (sz * 0.32) / aspect;
    float thX = 0.0022 / aspect;
    float thY = 0.0022;
    float m = wolfBox(uv, c, float2(thX, hh));
    float t = wolfBox(uv, c - float2(0.0, hh), float2(hw, thY));
    return max(m, t);
}

float wolfCharS(float2 uv, float2 c, float sz, float aspect)
{
    float hh = sz * 0.45;
    float hw = (sz * 0.32) / aspect;
    float thX = 0.0022 / aspect;
    float thY = 0.0022;
    float t = wolfBox(uv, c - float2(0.0, hh), float2(hw, thY));
    float tl = wolfBox(uv, c + float2(-hw, -hh * 0.5), float2(thX, hh * 0.5));
    float m = wolfBox(uv, c, float2(hw, thY));
    float br = wolfBox(uv, c + float2(hw, hh * 0.5), float2(thX, hh * 0.5));
    float b = wolfBox(uv, c + float2(0.0, hh), float2(hw, thY));
    return max(max(max(t, tl), m), max(br, b));
}

float wolfWordHEALTH(float2 uv, float2 c, float sz, float aspect)
{
    float sp = (sz * 0.85) / aspect;
    float c1 = wolfCharH(uv, c + float2(-sp * 2.5, 0.0), sz, aspect);
    float c2 = wolfCharE(uv, c + float2(-sp * 1.5, 0.0), sz, aspect);
    float c3 = wolfCharA(uv, c + float2(-sp * 0.5, 0.0), sz, aspect);
    float c4 = wolfCharL(uv, c + float2(sp * 0.5, 0.0), sz, aspect);
    float c5 = wolfCharT(uv, c + float2(sp * 1.5, 0.0), sz, aspect);
    float c6 = wolfCharH(uv, c + float2(sp * 2.5, 0.0), sz, aspect);
    return max(max(max(c1, c2), max(c3, c4)), max(c5, c6));
}

float wolfWordSHELLS(float2 uv, float2 c, float sz, float aspect)
{
    float sp = (sz * 0.85) / aspect;
    float c1 = wolfCharS(uv, c + float2(-sp * 2.5, 0.0), sz, aspect);
    float c2 = wolfCharH(uv, c + float2(-sp * 1.5, 0.0), sz, aspect);
    float c3 = wolfCharE(uv, c + float2(-sp * 0.5, 0.0), sz, aspect);
    float c4 = wolfCharL(uv, c + float2(sp * 0.5, 0.0), sz, aspect);
    float c5 = wolfCharL(uv, c + float2(sp * 1.5, 0.0), sz, aspect);
    float c6 = wolfCharS(uv, c + float2(sp * 2.5, 0.0), sz, aspect);
    return max(max(max(c1, c2), max(c3, c4)), max(c5, c6));
}

float wolfWeaponMask(float2 uv, float time, float firing, float aspect)
{
    float sway = sin(time * 2.3) * 0.005;
    float recoil = firing * 0.022;
    float2 shifted = uv - float2(sway, recoil);
    float2 p = float2((shifted.x - 0.5) * aspect, shifted.y);
    float lx = abs(p.x);
    float aa = 0.002;

    float muzzleY = 0.655;
    float breechY = 0.820;

    // 1. Barrels (perspective taper receding away from player toward muzzle)
    float bt = saturate((p.y - muzzleY) / (breechY - muzzleY));
    float bx = 0.040 + bt * 0.016;
    float outerR = 0.036 + bt * 0.014;
    float dxNear = p.x < 0.0 ? (p.x + bx) : (p.x - bx);
    float dBarrelSides = abs(dxNear) - outerR;
    float inBarrelSpan = (1.0 - smoothstep(-aa, aa, dBarrelSides))
        * (1.0 - smoothstep(-aa, aa, muzzleY - p.y))
        * (1.0 - smoothstep(-aa, aa, p.y - breechY));

    // Far muzzle terminates as rounded caps pointing forward
    float distCapL = length(float2(p.x + 0.040, (p.y - muzzleY) * 2.2));
    float distCapR = length(float2(p.x - 0.040, (p.y - muzzleY) * 2.2));
    float distCap = min(distCapL, distCapR);
    float muzzleCap = 1.0 - smoothstep(0.036 - aa, 0.036 + aa, distCap);
    float barrelMask = max(inBarrelSpan, muzzleCap * step(p.y, muzzleY + 0.008));

    // Bead sight pin
    float beadPin = wolfSegment(p, float2(0.0, muzzleY - 0.003), float2(0.0, muzzleY - 0.012), 0.002);
    float beadBall = 1.0 - smoothstep(0.0045 - aa, 0.0045 + aa, length(p - float2(0.0, muzzleY - 0.011)));
    float beadMask = max(beadPin, beadBall);

    // 2. Wood Forend (hugs the sides of the barrels)
    float woodTop = 0.705;
    float woodW = 0.076 + (p.y - woodTop) * 0.32;
    float woodMask = (1.0 - smoothstep(-aa, aa, lx - woodW))
        * (1.0 - smoothstep(-aa, aa, woodTop - p.y));

    // 3. Steel Receiver Breech Block
    float recTop = breechY;
    float recBot = breechY + 0.075;
    float recW = 0.090 + (p.y - recTop) * 0.22;
    float recMask = (1.0 - smoothstep(-aa, aa, lx - recW))
        * (1.0 - smoothstep(-aa, aa, recTop - p.y))
        * (1.0 - smoothstep(-aa, aa, p.y - recBot));

    float crestL = 1.0 - smoothstep(0.038 - aa, 0.038 + aa, length(p - float2(-0.054, recTop + 0.018)));
    float crestR = 1.0 - smoothstep(0.038 - aa, 0.038 + aa, length(p - float2(0.054, recTop + 0.018)));
    recMask = max(recMask, max(crestL, crestR) * step(p.y, recBot));

    // 4. Natural Combat-Gloved Hands
    float armL = wolfSegment(p, float2(-0.38, 1.08), float2(-0.18, 0.94), 0.065);
    float armR = wolfSegment(p, float2(0.38, 1.08), float2(0.18, 0.95), 0.065);

    float palmL = wolfSegment(p, float2(-0.20, 0.96), float2(-0.13, 0.88), 0.052);
    float palmR = wolfSegment(p, float2(0.20, 0.97), float2(0.13, 0.89), 0.052);

    float thumbL = wolfSegment(p, float2(-0.15, 0.87), float2(-0.085, 0.825), 0.018);
    float f1 = wolfSegment(p, float2(-0.16, 0.895), float2(-0.090, 0.865), 0.015);
    float f2 = wolfSegment(p, float2(-0.17, 0.925), float2(-0.100, 0.895), 0.015);
    float f3 = wolfSegment(p, float2(-0.18, 0.955), float2(-0.110, 0.925), 0.015);
    float f4 = wolfSegment(p, float2(-0.19, 0.985), float2(-0.120, 0.955), 0.015);
    float handLMask = max(max(armL, palmL), max(thumbL, max(max(f1, f2), max(f3, f4))));

    float thumbR = wolfSegment(p, float2(0.15, 0.88), float2(0.085, 0.840), 0.018);
    float rf1 = wolfSegment(p, float2(0.16, 0.900), float2(0.095, 0.880), 0.015);
    float rf2 = wolfSegment(p, float2(0.17, 0.930), float2(0.105, 0.910), 0.015);
    float rf3 = wolfSegment(p, float2(0.18, 0.960), float2(0.115, 0.940), 0.015);
    float handRMask = max(max(armR, palmR), max(thumbR, max(max(rf1, rf2), rf3)));
    float handsMask = max(handLMask, handRMask);

    float totalMask = max(max(woodMask, barrelMask), max(max(recMask, beadMask), handsMask));

    if (firing > 0.01)
    {
        for (int i = -1; i <= 1; i += 2)
        {
            float side = float(i) * 0.040;
            float2 fp = float2(p.x - side, p.y - (muzzleY - 0.040));
            float angle = atan2(fp.y, fp.x);
            float spikes = 1.0 + 0.35 * sin(angle * 7.0 + 1.2) + 0.20 * sin(angle * 13.0);
            float distFlame = length(float2(fp.x, fp.y * 1.3)) / max(spikes, 0.1);
            float flameOuter = 1.0 - smoothstep(0.04, 0.12, distFlame);
            totalMask = max(totalMask, flameOuter * firing);
        }
    }

    return totalMask;
}

float3 wolfWeapon(float2 uv, float time, float firing, float aspect)
{
    float sway = sin(time * 2.3) * 0.005;
    float recoil = firing * 0.022;
    float2 shifted = uv - float2(sway, recoil);
    float2 p = float2((shifted.x - 0.5) * aspect, shifted.y);
    float lx = abs(p.x);
    float aa = 0.002;

    float muzzleY = 0.655;
    float breechY = 0.820;

    // 1. Barrels
    float bt = saturate((p.y - muzzleY) / (breechY - muzzleY));
    float bx = 0.040 + bt * 0.016;
    float outerR = 0.036 + bt * 0.014;

    float dxNear = p.x < 0.0 ? (p.x + bx) : (p.x - bx);
    float dBarrelSides = abs(dxNear) - outerR;
    float inBarrelSpan = (1.0 - smoothstep(-aa, aa, dBarrelSides))
        * (1.0 - smoothstep(-aa, aa, muzzleY - p.y))
        * (1.0 - smoothstep(-aa, aa, p.y - breechY));

    float distCapL = length(float2(p.x + 0.040, (p.y - muzzleY) * 2.2));
    float distCapR = length(float2(p.x - 0.040, (p.y - muzzleY) * 2.2));
    float distCap = min(distCapL, distCapR);
    float muzzleCap = 1.0 - smoothstep(0.036 - aa, 0.036 + aa, distCap);
    float barrelMask = max(inBarrelSpan, muzzleCap * step(p.y, muzzleY + 0.008));

    // Cylindrical Normal & Lighting
    float nx = clamp(dxNear / max(outerR, 0.0001), -1.0, 1.0);
    float nz = sqrt(max(0.0, 1.0 - nx * nx));
    float diffuse = saturate(0.16 + 0.84 * (nx * -0.38 + nz * 0.90));
    float spec = pow(saturate(nx * -0.28 + nz * 0.96), 18.0);

    float3 barrelCol = lerp(float3(0.04, 0.045, 0.055), float3(0.24, 0.27, 0.32), diffuse);
    barrelCol += float3(0.55, 0.62, 0.75) * spec;

    float crevice = 1.0 - smoothstep(0.0, 0.018, lx);
    barrelCol = lerp(barrelCol, float3(0.015, 0.018, 0.022), crevice * 0.96);

    // Anti-glare checkered center rib
    float ribW = 0.008 + bt * 0.004;
    float ribMask = (1.0 - smoothstep(ribW - aa, ribW + aa, lx))
        * step(muzzleY - 0.006, p.y) * step(p.y, breechY);
    float serration = 0.5 + 0.5 * sin(p.y * 350.0);
    float3 ribCol = float3(0.12, 0.13, 0.15) * (0.80 + 0.20 * serration)
        + float3(0.22, 0.24, 0.28) * (1.0 - smoothstep(0.0, ribW, lx));
    barrelCol = lerp(barrelCol, ribCol, ribMask);

    // Muzzle lip highlight
    float muzzleLip = (1.0 - smoothstep(0.0, 0.004, abs(distCap - 0.036))) * step(p.y, muzzleY + 0.006);
    barrelCol += float3(0.48, 0.54, 0.65) * muzzleLip;

    // Brass bead sight
    float beadPin = wolfSegment(p, float2(0.0, muzzleY - 0.003), float2(0.0, muzzleY - 0.012), 0.002);
    float beadBall = 1.0 - smoothstep(0.0045 - aa, 0.0045 + aa, length(p - float2(0.0, muzzleY - 0.011)));
    float beadMask = max(beadPin, beadBall);
    float3 beadCol = float3(0.96, 0.82, 0.24);

    // 2. Walnut Forend
    float woodTop = 0.705;
    float woodW = 0.076 + (p.y - woodTop) * 0.32;
    float woodMask = (1.0 - smoothstep(-aa, aa, lx - woodW))
        * (1.0 - smoothstep(-aa, aa, woodTop - p.y));

    float woodNorm = lx / max(woodW, 0.0001);
    float woodCurve = saturate(1.0 - woodNorm * woodNorm);
    float grain1 = sin(p.y * 70.0 + p.x * 18.0) * 0.06;
    float grain2 = sin(p.y * 140.0 - p.x * 14.0) * 0.04;
    float woodDiff = saturate(0.35 + 0.65 * woodCurve + grain1 + grain2);
    float woodSpec = pow(saturate(woodCurve * 0.85 + 0.15), 5.0) * 0.22;

    float3 woodShadow = float3(0.10, 0.045, 0.018);
    float3 woodBase   = float3(0.25, 0.11, 0.045);
    float3 woodAmber  = float3(0.40, 0.20, 0.08);
    float3 woodCol = lerp(woodShadow, woodBase, woodDiff);
    woodCol = lerp(woodCol, woodAmber, saturate(woodDiff * 1.4 - 0.4));
    woodCol += float3(0.34, 0.19, 0.08) * woodSpec;

    float barrelShadow = (1.0 - smoothstep(0.0, 0.035, p.y - woodTop)) * step(lx, outerR * 1.8);
    woodCol = lerp(woodCol, float3(0.035, 0.015, 0.007), barrelShadow * 0.88);

    if (p.y >= 0.78 && p.y <= 0.94 && woodNorm >= 0.55 && woodNorm <= 0.92)
    {
        float g1 = sin((p.x * 2.2 + p.y * 2.0) * 130.0);
        float g2 = sin((p.x * 2.2 - p.y * 2.0) * 130.0);
        float diamond = saturate(g1 * g2 * 2.0 + 0.5);
        woodCol *= 0.70 + 0.35 * diamond;
    }

    // 3. Steel Receiver Breech Block
    float recTop = breechY;
    float recBot = breechY + 0.075;
    float recW = 0.090 + (p.y - recTop) * 0.22;
    float recMask = (1.0 - smoothstep(-aa, aa, lx - recW))
        * (1.0 - smoothstep(-aa, aa, recTop - p.y))
        * (1.0 - smoothstep(-aa, aa, p.y - recBot));

    float crestL = 1.0 - smoothstep(0.038 - aa, 0.038 + aa, length(p - float2(-0.054, recTop + 0.018)));
    float crestR = 1.0 - smoothstep(0.038 - aa, 0.038 + aa, length(p - float2(0.054, recTop + 0.018)));
    recMask = max(recMask, max(crestL, crestR) * step(p.y, recBot));

    float recDiff = saturate(0.25 + 0.75 * (1.0 - (lx / max(recW, 0.0001)) * (lx / max(recW, 0.0001))));
    float recBevel = (1.0 - smoothstep(0.0, 0.006, abs(lx - recW))) * 0.65
        + (1.0 - smoothstep(0.0, 0.005, abs(p.y - recTop))) * 0.85;
    float3 recCol = lerp(float3(0.08, 0.09, 0.11), float3(0.24, 0.27, 0.32), recDiff)
        + float3(0.48, 0.54, 0.62) * recBevel;

    // Break lever and latch
    float latchRect = (1.0 - smoothstep(0.004 - aa, 0.004 + aa, lx)) * step(recTop + 0.018, p.y) * step(p.y, recTop + 0.042);
    float latchRidges = latchRect * (0.5 + 0.5 * sin(p.y * 300.0));
    recCol = lerp(recCol, float3(0.42, 0.46, 0.52), latchRect);
    recCol = lerp(recCol, float3(0.15, 0.16, 0.18), latchRidges * 0.7);

    // Side hinge pins
    float pinL = 1.0 - smoothstep(0.008 - aa, 0.008 + aa, length(p - float2(-0.072, recTop + 0.038)));
    float pinR = 1.0 - smoothstep(0.008 - aa, 0.008 + aa, length(p - float2(0.072, recTop + 0.038)));
    float pins = max(pinL, pinR);
    recCol = lerp(recCol, float3(0.38, 0.42, 0.48), pins);

    // 4. Natural Combat-Gloved Hands (Doomguy)
    float armL = wolfSegment(p, float2(-0.38, 1.08), float2(-0.18, 0.94), 0.065);
    float armR = wolfSegment(p, float2(0.38, 1.08), float2(0.18, 0.95), 0.065);

    float palmL = wolfSegment(p, float2(-0.20, 0.96), float2(-0.13, 0.88), 0.052);
    float palmR = wolfSegment(p, float2(0.20, 0.97), float2(0.13, 0.89), 0.052);

    float thumbL = wolfSegment(p, float2(-0.15, 0.87), float2(-0.085, 0.825), 0.018);
    float f1 = wolfSegment(p, float2(-0.16, 0.895), float2(-0.090, 0.865), 0.015);
    float f2 = wolfSegment(p, float2(-0.17, 0.925), float2(-0.100, 0.895), 0.015);
    float f3 = wolfSegment(p, float2(-0.18, 0.955), float2(-0.110, 0.925), 0.015);
    float f4 = wolfSegment(p, float2(-0.19, 0.985), float2(-0.120, 0.955), 0.015);
    float handLMask = max(max(armL, palmL), max(thumbL, max(max(f1, f2), max(f3, f4))));

    float thumbR = wolfSegment(p, float2(0.15, 0.88), float2(0.085, 0.840), 0.018);
    float rf1 = wolfSegment(p, float2(0.16, 0.900), float2(0.095, 0.880), 0.015);
    float rf2 = wolfSegment(p, float2(0.17, 0.930), float2(0.105, 0.910), 0.015);
    float rf3 = wolfSegment(p, float2(0.18, 0.960), float2(0.115, 0.940), 0.015);
    float handRMask = max(max(armR, palmR), max(thumbR, max(max(rf1, rf2), rf3)));

    float3 gloveBase  = float3(0.48, 0.30, 0.18);
    float3 gloveLight = float3(0.68, 0.46, 0.28);
    float3 gloveDark  = float3(0.22, 0.13, 0.07);

    // Left hand shading
    float handDiffL = saturate(0.35 + 0.65 * (-(p.x + 0.16) * 3.5 + -(p.y - 0.90) * 2.5));
    float3 handColL = lerp(gloveDark, gloveBase, handDiffL);
    handColL = lerp(handColL, gloveLight, saturate(handDiffL * 1.4 - 0.4));

    float creaseL1 = (1.0 - smoothstep(0.0, 0.003, abs((p.x + 0.125)*0.39 + (p.y - 0.880)*0.92))) * step(-0.17, p.x) * step(p.x, -0.08);
    float creaseL2 = (1.0 - smoothstep(0.0, 0.003, abs((p.x + 0.135)*0.39 + (p.y - 0.910)*0.92))) * step(-0.18, p.x) * step(p.x, -0.09);
    float creaseL3 = (1.0 - smoothstep(0.0, 0.003, abs((p.x + 0.145)*0.39 + (p.y - 0.940)*0.92))) * step(-0.19, p.x) * step(p.x, -0.10);
    handColL = lerp(handColL, float3(0.08, 0.04, 0.02), max(max(creaseL1, creaseL2), creaseL3) * 0.85);

    float sleeveL = armL * step(0.97, p.y) * step(p.x, -0.20);
    handColL = lerp(handColL, float3(0.18, 0.24, 0.14), sleeveL);

    // Right hand shading
    float handDiffR = saturate(0.35 + 0.65 * ((p.x - 0.16) * 3.5 + -(p.y - 0.90) * 2.5));
    float3 handColR = lerp(gloveDark, gloveBase, handDiffR);
    handColR = lerp(handColR, gloveLight, saturate(handDiffR * 1.4 - 0.4));

    float creaseR1 = (1.0 - smoothstep(0.0, 0.003, abs(-(p.x - 0.130)*0.39 + (p.y - 0.895)*0.92))) * step(0.085, p.x) * step(p.x, 0.17);
    float creaseR2 = (1.0 - smoothstep(0.0, 0.003, abs(-(p.x - 0.140)*0.39 + (p.y - 0.925)*0.92))) * step(0.095, p.x) * step(p.x, 0.18);
    handColR = lerp(handColR, float3(0.08, 0.04, 0.02), max(creaseR1, creaseR2) * 0.85);

    float sleeveR = armR * step(0.97, p.y) * step(0.20, p.x);
    handColR = lerp(handColR, float3(0.18, 0.24, 0.14), sleeveR);

    // Composite solid weapon parts:
    float3 gunCol = woodCol;
    gunCol = lerp(gunCol, barrelCol, barrelMask);
    gunCol = lerp(gunCol, recCol, recMask);
    gunCol = lerp(gunCol, beadCol, beadMask);
    gunCol = lerp(gunCol, handColL, handLMask);
    gunCol = lerp(gunCol, handColR, handRMask);

    // Ambient flash illumination on metal and wood
    if (firing > 0.01)
    {
        float flashLight = firing * (1.0 - smoothstep(muzzleY - 0.05, 1.0, p.y));
        gunCol += float3(0.40, 0.25, 0.08) * flashLight;
    }

    // Flash is computed BEHIND / BELOW the solid gun:
    float3 flameColTotal = float3(0.0, 0.0, 0.0);
    if (firing > 0.01)
    {
        for (int i = -1; i <= 1; i += 2)
        {
            float side = float(i) * 0.040;
            float2 fp = float2(p.x - side, p.y - (muzzleY - 0.040));
            float angle = atan2(fp.y, fp.x);
            float spikes = 1.0 + 0.35 * sin(angle * 7.0 + 1.2) + 0.20 * sin(angle * 13.0);
            float distFlame = length(float2(fp.x, fp.y * 1.3)) / max(spikes, 0.1);

            float flameOuter = 1.0 - smoothstep(0.04, 0.12, distFlame);
            float flameMid   = 1.0 - smoothstep(0.02, 0.070, distFlame);
            float flameCore  = 1.0 - smoothstep(0.005, 0.030, distFlame);

            float3 flameCol = float3(0.92, 0.20, 0.03) * flameOuter;
            flameCol = lerp(flameCol, float3(1.00, 0.68, 0.12), flameMid);
            flameCol = lerp(flameCol, float3(1.00, 0.98, 0.88), flameCore);

            flameColTotal = max(flameColTotal, flameCol * firing);
        }
    }

    float solidMask = max(max(woodMask, barrelMask), max(recMask, max(beadMask, max(handLMask, handRMask))));

    // PAINT ORDER: Muzzle flash below/behind, solid gun barrels and receiver in front!
    float3 weapCol = flameColTotal;
    weapCol = lerp(weapCol, gunCol, solidMask);

    return weapCol;
}

float4 gooEffect(float2 uv, float4 source, float4 backdrop)
{
    float4 frame = gooParameter(0);
    float4 pointer = gooParameter(1);
    float4 camera = gooParameter(2);
    float4 tuning = gooParameter(3);
    float4 state = gooParameter(4);
    float4 enemyPair0 = gooParameter(5);
    float4 enemyPair1 = gooParameter(6);
    float4 enemyPair2 = gooParameter(7);
    const float aspect = 16.0 / 9.0;
    float time = frame.x;
    float2 origin = camera.xy;
    float2 direction = camera.zw / max(length(camera.zw), 0.0001);
    float2 plane = float2(-direction.y, direction.x);
    float fovScale = clamp(tuning.x, 0.25, 1.35);
    int defeatedMask = int(clamp(round(tuning.w), 0.0, 63.0));
    float health = saturate(state.x);
    float ammo = clamp(state.y, 0.0, 6.0);
    float reserveAmmo = clamp(state.z, 0.0, 24.0);
    int stateFlags = int(floor(max(state.w, 0.0)));
    float reloadProgress = saturate(frac(max(state.w, 0.0)));
    float cameraX = (2.0 * uv.x - 1.0) * aspect;
    float2 rayDirection = normalize(direction + plane * cameraX * fovScale);
    WolfHit hit = wolfTrace(origin, rayDirection);
    float wallDistance = hit.distance * max(dot(rayDirection, direction), 0.14);
    float lineHeight = hit.hit ? min(2.65, 0.86 / max(wallDistance, 0.05)) : 0.0;
    float wallTop = 0.5 - lineHeight * 0.5;
    float wallBottom = 0.5 + lineHeight * 0.5;
    float3 color;

    if (hit.hit && uv.y >= wallTop && uv.y <= wallBottom)
    {
        float wallY = (uv.y - wallTop) / max(lineHeight, 0.001);
        float3 wallLight = wolfLightAt(hit.point, hit.normal, time);
        color = wolfWallColor(hit, hit.point, wallY, time) * wallLight;
        float hitEdge = 1.0 - smoothstep(0.0, 0.018, min(wallY, 1.0 - wallY));
        color += float3(0.16, 0.08, 0.03) * hitEdge;
    }
    else if (uv.y > 0.5)
    {
        float floorDepth = min(28.0, 0.78 / max(uv.y - 0.5, 0.025));
        float2 floorPoint = origin + rayDirection * floorDepth;
        color = wolfFloorColor(floorPoint, time);
        float floorGradient = saturate((uv.y - 0.5) * 2.0);
        color *= lerp(0.48, 1.0, floorGradient);
        float lane = 1.0 - smoothstep(0.0, 0.032,
            abs(frac(floorPoint.x * 0.5) - 0.5));
        color += float3(0.03, 0.11, 0.12) * lane * floorGradient;
    }
    else
    {
        float ceilingDepth = min(28.0, 1.0 / max(0.5 - uv.y, 0.025));
        float2 ceilingPoint = origin + rayDirection * ceilingDepth;
        float panelX = 1.0 - smoothstep(0.44, 0.49, abs(frac(ceilingPoint.x * 0.5) - 0.5));
        float panelY = 1.0 - smoothstep(0.44, 0.49, abs(frac(ceilingPoint.y * 0.5) - 0.5));
        float ceilingPattern = 0.5 + 0.5 * sin(ceilingPoint.x * 1.6 + ceilingPoint.y * 1.2);
        color = lerp(float3(0.008, 0.011, 0.020),
            float3(0.025, 0.032, 0.050), ceilingPattern);
        color += float3(0.025, 0.075, 0.08) * min(panelX, panelY);
        float ceilingGradient = saturate((0.5 - uv.y) * 2.0);
        color *= lerp(0.94, 0.34, ceilingGradient);
    }

    WolfEnemyHit enemy = wolfEnemyAt(
        uv, origin, direction, plane, aspect, fovScale, wallDistance, defeatedMask,
        enemyPair0, enemyPair1, enemyPair2, time);
    int shotTarget = wolfShotTarget(
        origin, direction, plane, wallDistance, defeatedMask,
        enemyPair0, enemyPair1, enemyPair2);
    float firing = max(saturate(pointer.w), (stateFlags & 32) != 0 ? 1.0 : 0.0);
    float hitFlash = firing * (enemy.index == shotTarget ? 1.0 : 0.0);
    if (enemy.visible)
    {
        float3 enemyColor = wolfEnemyColor(enemy, time, hitFlash);
        float enemyFog = exp(-enemy.depth * lerp(0.035, 0.32, clamp(tuning.z, 0.0, 1.0)));
        enemyColor = lerp(float3(0.005, 0.008, 0.014), enemyColor, enemyFog);
        color = lerp(color, enemyColor, enemy.mask);
    }

    float fogDensity = clamp(tuning.z, 0.0, 1.0);
    float distanceFog = exp(-max(wallDistance, 0.0) * lerp(0.045, 0.40, fogDensity));
    if (!hit.hit)
    {
        distanceFog = 0.0;
    }
    color = lerp(float3(0.002, 0.003, 0.006), color, distanceFog);

    // --- SQUARE TACTICAL MINIMAP (Actual Level Map) ---
    float2 mapCenter = float2(0.095, 0.145);
    float mapHw = 0.082;
    float2 mapHalf = float2(mapHw / aspect, mapHw);
    float2 mapOrigin = mapCenter - mapHalf;
    float2 mapSize = mapHalf * 2.0;
    float mapOuter = wolfRoundRect(uv, mapCenter, mapHalf + float2(0.005 / aspect, 0.005), 0.006);
    float mapInner = wolfRoundRect(uv, mapCenter, mapHalf, 0.002);
    float mapBezel = mapOuter - mapInner;
    color = lerp(color, float3(0.03, 0.035, 0.04), mapOuter * 0.95);
    color = lerp(color, float3(0.42, 0.46, 0.50), mapBezel);

    if (mapInner > 0.0)
    {
        float2 mapUv = saturate((uv - mapOrigin) / mapSize);
        int2 cell = int2(floor(mapUv * 16.0));
        uint mapValue = wolfMapValue(cell);
        float tileGrid = 1.0 - smoothstep(0.0, 0.06,
            min(frac(mapUv.x * 16.0), frac(mapUv.y * 16.0)));
        float3 mapColor = mapValue == 0u
            ? float3(0.015, 0.035, 0.045)
            : float3(0.12, 0.25, 0.28);
        mapColor += float3(0.015, 0.035, 0.04) * tileGrid;

        // Player dot & directional arrow
        float2 playerUv = origin / 16.0;
        float playerDot = wolfCircle(mapUv, playerUv, 0.028);
        float2 headingEnd = playerUv + direction * 0.040;
        float playerLine = wolfSegment(mapUv, playerUv, headingEnd, 0.006);
        mapColor = lerp(mapColor, float3(0.98, 0.72, 0.16), max(playerDot, playerLine));

        // Enemy dots
        for (int index = 0; index < 6; index++)
        {
            if ((defeatedMask & (1 << index)) != 0)
            {
                continue;
            }
            float2 enemyUv = wolfEnemyPositionOrDefault(
                index, enemyPair0, enemyPair1, enemyPair2) / 16.0;
            float enemyDot = wolfCircle(mapUv, enemyUv, 0.022);
            mapColor = lerp(mapColor, float3(0.98, 0.20, 0.12), enemyDot);
        }
        color = lerp(color, mapColor, mapInner);
    }

    // North 'N' tick mark above square minimap
    float nNotch = wolfBox(uv, float2(mapCenter.x, mapCenter.y - mapHalf.y - 0.005), float2(0.003 / aspect, 0.004));
    color = lerp(color, float3(0.95, 0.75, 0.20), nNotch);

    // --- A. BOTTOM-LEFT HEALTH & ARMOR PANEL (DOOM STBAR Style) ---
    float2 hCenter = float2(0.150, 0.905);
    float2 hHalf = float2(0.118, 0.056);
    float hPanel = wolfRoundRect(uv, hCenter, hHalf, 0.008);
    float hInner = wolfRoundRect(uv, hCenter, hHalf - float2(0.005, 0.005), 0.006);
    float hBorder = hPanel - hInner;
    color = lerp(color, float3(0.03, 0.035, 0.04), hPanel * 0.95);
    color = lerp(color, float3(0.42, 0.46, 0.50), hBorder);

    // Unsquished, properly spaced "HEALTH" label
    float txtHealth = wolfWordHEALTH(uv, float2(hCenter.x, 0.868), 0.020, aspect);
    color = lerp(color, float3(0.90, 0.92, 0.96), txtHealth);

    // Medical cross "+" badge
    float2 crossC = float2(0.065, 0.895);
    float crossBadge = wolfRoundRect(uv, crossC, float2(0.016, 0.016), 0.004);
    float crossBadgeInner = wolfRoundRect(uv, crossC, float2(0.014, 0.014), 0.003);
    color = lerp(color, float3(0.06, 0.07, 0.08), crossBadge);
    color = lerp(color, float3(0.38, 0.42, 0.46), crossBadge - crossBadgeInner);
    float crossIcon = max(
        wolfBox(uv, crossC, float2(0.010, 0.0035)),
        wolfBox(uv, crossC, float2(0.0035, 0.010)));
    color = lerp(color, float3(0.92, 0.15, 0.08), crossIcon);

    // 10 Segmented Health blocks
    for (int i = 0; i < 10; i++)
    {
        float bxPos = 0.095 + float(i) * 0.0125;
        float bCell = wolfBox(uv, float2(bxPos, 0.895), float2(0.005, 0.010));
        float active = health >= (float(i) + 0.5) / 10.0 ? 1.0 : 0.0;
        float3 bCol = float3(0.07, 0.08, 0.09);
        if (active > 0.5)
        {
            if (health < 0.3)
            {
                bCol = float3(0.95, 0.18, 0.08) * (0.65 + 0.35 * sin(time * 8.0));
            }
            else if (health < 0.6)
            {
                bCol = float3(0.96, 0.55, 0.12);
            }
            else
            {
                bCol = float3(0.22, 0.88, 0.32);
            }
        }
        color = lerp(color, bCol, bCell);
    }

    // Green Diamond Armor Shield Icon
    float2 shieldC = float2(0.065, 0.932);
    float shieldDiamond = wolfRotatedBox(uv, shieldC, float2(0.008, 0.008), 0.7854, 0.002, aspect);
    color = lerp(color, float3(0.20, 0.80, 0.32), shieldDiamond);

    // Armor 10 sub-blocks
    float armorVal = 0.70;
    for (int i = 0; i < 10; i++)
    {
        float abxPos = 0.095 + float(i) * 0.0125;
        float abCell = wolfBox(uv, float2(abxPos, 0.932), float2(0.005, 0.004));
        float active = armorVal >= (float(i) + 0.5) / 10.0 ? 1.0 : 0.0;
        float3 abCol = active > 0.5 ? float3(0.18, 0.78, 0.30) : float3(0.06, 0.07, 0.07);
        color = lerp(color, abCol, abCell);
    }

    // --- B. BOTTOM-RIGHT AMMO & SHELLS PANEL (DOOM STBAR Style) ---
    float2 aCenter = float2(0.850, 0.905);
    float2 aHalf = float2(0.118, 0.056);
    float aPanel = wolfRoundRect(uv, aCenter, aHalf, 0.008);
    float aInner = wolfRoundRect(uv, aCenter, aHalf - float2(0.005, 0.005), 0.006);
    float aBorder = aPanel - aInner;
    color = lerp(color, float3(0.03, 0.035, 0.04), aPanel * 0.95);
    color = lerp(color, float3(0.42, 0.46, 0.50), aBorder);

    // Unsquished, properly spaced "SHELLS" label
    float txtShells = wolfWordSHELLS(uv, float2(aCenter.x, 0.868), 0.020, aspect);
    color = lerp(color, float3(0.90, 0.92, 0.96), txtShells);

    // 6 Authentic 12-Gauge Shotgun Shells
    for (int i = 0; i < 6; i++)
    {
        float sx = 0.762 + float(i) * 0.020;
        float brass = wolfBox(uv, float2(sx, 0.905), float2(0.007, 0.005));
        float hull  = wolfBox(uv, float2(sx, 0.892), float2(0.007, 0.008));
        float primer = wolfScreenCircle(uv, float2(sx, 0.908), 0.002, aspect);
        float loaded = ammo > float(i) ? 1.0 : 0.0;

        float3 hullCol = loaded > 0.5 ? float3(0.85, 0.16, 0.10) : float3(0.06, 0.07, 0.08);
        float3 brassCol = loaded > 0.5 ? float3(0.95, 0.76, 0.22) : float3(0.15, 0.14, 0.10);
        float3 primerCol = loaded > 0.5 ? float3(0.72, 0.72, 0.75) : float3(0.04, 0.04, 0.05);

        color = lerp(color, hullCol, hull);
        color = lerp(color, brassCol, brass);
        color = lerp(color, primerCol, primer);
    }

    // Reserve ammo capacity track & fill
    float2 resCenter = float2(0.840, 0.932);
    float resTrack = wolfBox(uv, resCenter, float2(0.078, 0.004));
    color = lerp(color, float3(0.06, 0.08, 0.09), resTrack);
    float resW = 0.078 * saturate(reserveAmmo / 24.0);
    float resFill = wolfBox(uv, float2(0.840 - 0.078 + resW, 0.932), float2(resW, 0.003));
    color = lerp(color, float3(0.95, 0.72, 0.18), resFill);

    // Shell circular badge icon on the right
    float2 badgeC = float2(0.936, 0.892);
    float badgeAmmo = wolfScreenCircle(uv, badgeC, 0.016, aspect);
    color = lerp(color, float3(0.08, 0.10, 0.12), badgeAmmo);
    float shellIcon1 = wolfCapsule(uv, float2(0.932, 0.900), float2(0.932, 0.884), 0.003, aspect);
    float shellIcon2 = wolfCapsule(uv, float2(0.940, 0.900), float2(0.940, 0.884), 0.003, aspect);
    color = lerp(color, float3(0.95, 0.72, 0.18), max(shellIcon1, shellIcon2));

    // --- D. HOSTILES TRACKER (Top Right) ---
    float2 thCenter = float2(0.885, 0.075);
    float2 thHalf = float2(0.085, 0.024);
    float thPanel = wolfRoundRect(uv, thCenter, thHalf, 0.005);
    float thInner = wolfRoundRect(uv, thCenter, thHalf - float2(0.003, 0.003), 0.004);
    color = lerp(color, float3(0.03, 0.035, 0.04), thPanel * 0.94);
    color = lerp(color, float3(0.42, 0.46, 0.50), thPanel - thInner);

    for (int index = 0; index < 6; index++)
    {
        float pipX = 0.825 + float(index) * 0.024;
        float active = (defeatedMask & (1 << index)) == 0 ? 1.0 : 0.0;
        float head = wolfScreenCircle(uv, float2(pipX, thCenter.y - 0.002), 0.006, aspect);
        float jaw = wolfBox(uv, float2(pipX, thCenter.y + 0.005), float2(0.0035, 0.003));
        float skull = max(head, jaw);
        float3 skullCol = active > 0.5 ? float3(0.95, 0.20, 0.08) * (0.80 + 0.20 * sin(time * 3.0 + float(index))) : float3(0.08, 0.09, 0.10);
        color = lerp(color, skullCol, skull);
    }

    // --- E. RELOAD INDICATOR (Top Center) ---
    if ((stateFlags & 4) != 0)
    {
        float2 reloadStart = float2(0.405, 0.14);
        float2 reloadEnd = float2(0.595, 0.14);
        float reloadTrack = wolfCapsule(uv, reloadStart, reloadEnd, 0.008, aspect);
        float reloadFill = wolfCapsule(uv, reloadStart,
            lerp(reloadStart, reloadEnd, max(reloadProgress, 0.012)), 0.0045, aspect);
        float reloadLeft = wolfRotatedBox(
            uv, reloadStart, float2(0.011, 0.011), 0.7854, 0.002, aspect);
        float reloadRight = wolfRotatedBox(
            uv, reloadEnd, float2(0.011, 0.011), 0.7854, 0.002, aspect);
        color = lerp(color, float3(0.04, 0.045, 0.05), reloadTrack);
        color = lerp(color, float3(0.95, 0.60, 0.14), reloadFill);
        color = lerp(color, float3(0.40, 0.44, 0.48), max(reloadLeft, reloadRight));
    }

    // --- F. SIMPLE SMALL CROSSHAIR RETICLE ---
    float crossLen = 0.006;
    float crossTh = 0.0009;
    float crossH = wolfBox(uv, float2(0.5, 0.5), float2(crossLen / aspect, crossTh));
    float crossV = wolfBox(uv, float2(0.5, 0.5), float2(crossTh / aspect, crossLen));
    float simpleCross = max(crossH, crossV);

    float hitState = (stateFlags & 8) != 0 ? 1.0 : 0.0;
    float dryState = (stateFlags & 16) != 0 ? 1.0 : 0.0;
    float3 crossCol = float3(0.95, 0.95, 0.98);
    crossCol = lerp(crossCol, float3(1.0, 0.18, 0.08), hitState);
    crossCol = lerp(crossCol, float3(0.94, 0.12, 0.08), dryState);
    color = lerp(color, crossCol, simpleCross);

    // --- G. FIRST-PERSON WEAPON ---
    if (uv.y > 0.50)
    {
        float weaponMask = wolfWeaponMask(uv, time, firing, aspect);
        float3 weaponColor = wolfWeapon(uv, time, firing, aspect);
        color = lerp(color, weaponColor, weaponMask);
    }

    float deadState = (stateFlags & 1) != 0 ? 1.0 : 0.0;
    float wonState = (stateFlags & 2) != 0 ? 1.0 : 0.0;
    float damageState = (stateFlags & 64) != 0 ? 1.0 : 0.0;
    float damageEdge = smoothstep(0.16, 0.86,
        length((uv - float2(0.5, 0.5)) * float2(1.05, 0.90)));
    color += float3(0.72, 0.025, 0.012) * damageState * damageEdge * 0.50;
    if (deadState > 0.0 || wonState > 0.0)
    {
        float3 terminalTint = lerp(float3(0.70, 0.035, 0.025),
            float3(0.045, 0.78, 0.40), wonState);
        float terminalFade = lerp(0.60, 0.35, wonState);
        color = lerp(color, terminalTint * 0.18, terminalFade);
    }

    float vignette = 1.0 - smoothstep(0.65, 1.38, length((uv - 0.5) * float2(1.05, 0.9))) * 0.38;
    color *= vignette;
    float scanline = 0.975 + 0.025 * sin(uv.y * max(frame.z, 1.0) * 3.14159);
    color *= scanline;
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
