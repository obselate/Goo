#include "goo_effect.slang"

static const float CorridorPeriod = 3.6;
static const float CorridorTau = 6.28318530718;

float corridorBox(float3 point, float3 bounds)
{
    float3 q = abs(point) - bounds;
    return length(max(q, float3(0.0, 0.0, 0.0)))
        + min(max(q.x, max(q.y, q.z)), 0.0);
}

float corridorCylinderZ(float3 point, float radius, float depth)
{
    float2 q = float2(length(point.xy) - radius, abs(point.z) - depth);
    return min(max(q.x, q.y), 0.0) + length(max(q, float2(0.0, 0.0)));
}

float corridorArch(float3 point)
{
    float repeatZ = frac(point.z / CorridorPeriod + 0.5) - 0.5;
    float3 framePoint = float3(point.x, point.y - 1.52, repeatZ * CorridorPeriod);
    float outer = corridorBox(framePoint, float3(2.22, 1.52, 0.18));
    float opening = corridorCylinderZ(
        float3(point.x, point.y - 1.13, repeatZ * CorridorPeriod), 1.08, 0.23);
    return max(outer, -opening);
}

float corridorScene(float3 point)
{
    float floor = point.y + 0.02;
    return min(corridorArch(point), floor);
}

struct CorridorTrace
{
    bool hit;
    float distance;
    float3 point;
};

CorridorTrace corridorMarch(float3 origin, float3 direction)
{
    CorridorTrace result;
    result.hit = false;
    result.distance = 0.0;
    result.point = origin;
    float travel = 0.0;

    for (int iteration = 0; iteration < 56; iteration++)
    {
        float3 point = origin + direction * travel;
        float distance = corridorScene(point);
        result.point = point;
        if (abs(distance) < 0.0014)
        {
            result.hit = true;
            break;
        }
        travel += max(distance * 0.72, 0.0018);
        if (travel > 64.0)
        {
            break;
        }
    }

    result.distance = travel;
    result.point = origin + direction * travel;
    return result;
}

float corridorSeam(float value, float width)
{
    float distance = abs(frac(value) - 0.5);
    return 1.0 - smoothstep(0.5 - width, 0.5, distance);
}

float3 corridorFloor(float3 point, float glow)
{
    float panelX = corridorSeam(point.x * 0.72, 0.026);
    float panelZ = corridorSeam(point.z * 0.28, 0.034);
    float seam = max(panelX, panelZ);
    float checker = frac((floor(point.x * 0.72) + floor(point.z * 0.28)) * 0.5) * 2.0;
    float3 base = lerp(float3(0.020, 0.027, 0.036),
        float3(0.034, 0.044, 0.052), checker);
    base += float3(0.12, 0.34, 0.36) * seam * (0.24 + glow * 0.88);
    base += float3(0.035, 0.074, 0.078) * exp(-abs(point.x) * 0.6);
    return base;
}

float3 corridorArchColor(float3 point, float glow, float time)
{
    float repeatZ = frac(point.z / CorridorPeriod + 0.5) - 0.5;
    float archBand = abs(repeatZ * CorridorPeriod);
    float rib = smoothstep(0.18, 0.01, abs(archBand - 0.17));
    float vertical = saturate((point.y - 0.05) * 0.38);
    float shimmer = 0.5 + 0.5 * sin(time * 0.7 + point.y * 2.1 + point.x * 1.4);
    float3 base = lerp(float3(0.055, 0.060, 0.078),
        float3(0.13, 0.085, 0.060), vertical);
    base += float3(0.045, 0.14, 0.17) * rib;
    base += float3(0.16, 0.07, 0.03) * shimmer * 0.24;
    base += float3(0.10, 0.30, 0.31) * glow * 0.20;
    return base;
}

float4 gooEffect(float2 uv, float4 source, float4 backdrop)
{
    float4 frame = gooParameter(0);
    float4 controls = gooParameter(2);
    const float aspect = 16.0 / 9.0;
    float speed = clamp(controls.x, 0.0, 2.0);
    float depth = clamp(controls.y, 0.0, 1.0);
    float glow = clamp(controls.z, 0.0, 2.0);
    float play = saturate(frame.w);
    float motion = frame.x * speed;
    float sway = sin(frame.x * 0.72) * 0.045 * play;
    float swayHeight = cos(frame.x * 0.51) * 0.022 * play;
    float2 screen = float2((uv.x * 2.0 - 1.0) * aspect, 1.0 - uv.y * 2.0);
    float3 origin = float3(sway, 1.08 + swayHeight, motion - 0.55);
    float3 direction = normalize(float3(screen.x * 0.72, screen.y * 0.52, 1.0));
    CorridorTrace trace = corridorMarch(origin, direction);
    float3 background = lerp(float3(0.004, 0.006, 0.012),
        float3(0.025, 0.040, 0.060), saturate(0.5 + screen.y * 0.5));
    float3 color = background;

    if (trace.hit)
    {
        if (trace.point.y < 0.075)
        {
            color = corridorFloor(trace.point, glow);
        }
        else
        {
            color = corridorArchColor(trace.point, glow, frame.x);
        }
        float depthFog = exp(-trace.distance * lerp(0.012, 0.16, depth));
        color = lerp(float3(0.003, 0.005, 0.010), color, depthFog);
    }

    float vignette = 1.0 - smoothstep(0.64, 1.35, length(screen * float2(0.76, 0.92))) * 0.3;
    color *= vignette;
    float sourceAlpha = clamp(source.a, 0.0, 1.0);
    float3 retainedSource = source.rgb / max(sourceAlpha, 0.0001);
    float sourceMix = clamp(sourceAlpha * 0.30, 0.0, 0.30);
    color = lerp(color, clamp(retainedSource, 0.0, 1.0), sourceMix);
    color = max(color, float3(0.0, 0.0, 0.0));
    float alpha = saturate(sourceAlpha + backdrop.a * 0.0);
    return float4(color * alpha, alpha);
}
