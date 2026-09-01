#include "primitive_record.slang"
static float2 uv;
static uint gooClipDrawOrdinal;
static uint gooPrimitiveRecordOrdinal;
static float4 gooFragmentPosition;
static float4 outColor;
#include "clip_chain.slang"

#define pc gooPrimitiveBuffer[gooPrimitiveRecordOrdinal]

static const float3 FieldInk = float3(0.0097, 0.0091, 0.0086);
static const float3 FieldEmber = float3(0.0176, 0.0052, 0.0033);
static const float Tau = 6.28318530718;
static const int BallCount = 16;
static const int MaxSteps = 64;

float hash21(float2 point)
{
    point = frac(point * float2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return frac(point.x * point.y);
}

float smoothUnion(float left, float right, float blend)
{
    float amount = clamp(0.5 + 0.5 * (right - left) / blend, 0.0, 1.0);
    return lerp(right, left, amount) - blend * amount * (1.0 - amount);
}

float3 ballPosition(int index, float time, float flow, float form,
    float seed)
{
    float value = float(index);
    float random = hash21(float2(value + 3.7, seed + 11.0));
    float phase = random * Tau + value * 1.618;
    float speed = (0.34 + random * 0.82) * flow;
    float3 position = float3(
        sin(phase + time * speed) * (0.34 + random * 0.24),
        cos(phase * 1.37 + time * speed * 0.73) * (0.26 + random * 0.17),
        sin(phase * 0.71 + time * speed * 1.11) * (0.28 + random * 0.2));
    position.z += cos(phase * 1.91 + time * speed * 0.43) * 0.1;
    position += float3(
        sin(time * 0.33) * 0.05,
        cos(time * 0.27) * 0.04,
        sin(time * 0.21) * 0.035);
    return position * (0.78 + form * 0.12);
}

float ballRadius(int index, float form, float seed)
{
    float value = float(index);
    float random = hash21(float2(value + 19.0, seed + 7.0));
    return (0.145 + random * 0.065) * (0.92 + form * 0.2);
}

float sceneDistance(float3 point, in float4 balls[BallCount], float blend)
{
    float distance = 10.0;
    for (int index = 0; index < BallCount; index++)
    {
        float sphere = length(point - balls[index].xyz) - balls[index].w;
        distance = smoothUnion(distance, sphere, blend);
    }
    return distance;
}

float3 sceneNormal(float3 point, in float4 balls[BallCount], float blend)
{
    const float epsilon = 0.0015;
    float3 offsetX = float3(epsilon, 0.0, 0.0);
    float3 offsetY = float3(0.0, epsilon, 0.0);
    float3 offsetZ = float3(0.0, 0.0, epsilon);
    float center = sceneDistance(point, balls, blend);
    return normalize(float3(
        sceneDistance(point + offsetX, balls, blend) - center,
        sceneDistance(point + offsetY, balls, blend) - center,
        sceneDistance(point + offsetZ, balls, blend) - center));
}

float3x3 rotateX(float angle)
{
    float sine = sin(angle);
    float cosine = cos(angle);
    return float3x3(
        1.0, 0.0, 0.0,
        0.0, cosine, -sine,
        0.0, sine, cosine);
}

float3x3 rotateY(float angle)
{
    float sine = sin(angle);
    float cosine = cos(angle);
    return float3x3(
        cosine, 0.0, sine,
        0.0, 1.0, 0.0,
        -sine, 0.0, cosine);
}

float3 selectedHue(float hue)
{
    float3 primary = clamp(abs(fmod(hue * 6.0 + float3(0.0, 4.0, 2.0), 6.0)
        - 3.0) - 1.0, 0.0, 1.0);
    return lerp(float3(1.0), primary, 0.88) * 0.94;
}

float3 hueColor(float hue, float time, float rainbow)
{
    float3 phase = float3(0.0, 0.3333333, 0.6666667);
    float3 spectrum = 0.5 + 0.5 * cos(Tau * (hue + time * 0.055 + phase));
    float3 selected = selectedHue(hue);
    return lerp(selected, spectrum, rainbow);
}

void shade()
{
    float time = pc.params.x;
    float light = clamp(pc.params.y, 0.2, 2.0);
    float hue = frac(pc.params.z);
    float rainbow = clamp(pc.params.w, 0.0, 1.0);
    float flow = clamp(pc.radii.x, 0.15, 2.4);
    float form = clamp(pc.radii.y, 0.25, 2.0);
    float blend = lerp(0.04, 0.125, clamp(pc.radii.z, 0.0, 1.0));
    float aspect = clamp(pc.radii.w, 0.5, 2.5);
    float seed = float(pc.packedColorsExtra.x & 4095u);
    float2 screen = (uv - float2(0.5)) * float2(aspect, 1.0);
    float3 rayOrigin = float3(screen, 3.15);
    float3 rayDirection = normalize(float3(screen * 0.045, -1.0));
    float3 color = FieldInk + FieldEmber * (0.6 + 0.4 * screen.y);
    float backgroundGlow = exp(-length(screen) * 1.8);
    float3 atmosphereAzure = hueColor(frac(hue + 0.035), time, rainbow);
    float3 atmosphereViolet = hueColor(frac(hue - 0.075), time, rainbow);
    color += lerp(atmosphereViolet, atmosphereAzure,
        smoothstep(-0.7, 0.7, screen.y)) * backgroundGlow * 0.032;

    float4 balls[BallCount];
    float yaw = pc.stopPositions.x;
    float pitch = pc.stopPositions.y;
    float3x3 groupRotation = mul(rotateY(yaw), rotateX(pitch));
    for (int index = 0; index < BallCount; index++)
    {
        balls[index] = float4(
            mul(groupRotation, ballPosition(index, time, flow, form, seed)),
            ballRadius(index, form, seed));
    }
    float projectedDistance = sceneDistance(float3(screen, 0.0), balls,
        blend);
    float fieldAura = exp(-max(projectedDistance, 0.0) * 7.0);
    color += atmosphereAzure * fieldAura * 0.038;

    float travel = 0.0;
    float3 hitPoint = rayOrigin;
    bool hit = false;
    for (int step = 0; step < MaxSteps; step++)
    {
        hitPoint = rayOrigin + rayDirection * travel;
        float distance = sceneDistance(hitPoint, balls, blend);
        if (distance < 0.0012)
        {
            hit = true;
            break;
        }
        travel += max(distance * 0.72, 0.0025);
        if (travel > 6.0)
        {
            break;
        }
    }

    if (hit)
    {
        float3 normal = sceneNormal(hitPoint, balls, blend);
        float3 lightDirection = normalize(float3(-0.75, 1.1, 2.8));
        float3 viewDirection = normalize(rayOrigin - hitPoint);
        float viewFacing = max(dot(normal, viewDirection), 0.0);
        float diffuse = max(dot(normal, lightDirection), 0.0);
        float backLight = max(dot(normal, -lightDirection), 0.0);
        float3 reflected = reflect(-lightDirection, normal);
        float specular = pow(max(dot(reflected, viewDirection), 0.0), 72.0)
            * smoothstep(0.1, 0.85, diffuse);
        float rim = pow(1.0 - viewFacing, 3.2);
        float depth = exp(-travel * 0.28);
        float depthGradient = clamp(0.5 + hitPoint.z * 0.48
            + hitPoint.y * 0.2, 0.0, 1.0);
        float3 azure = hueColor(frac(hue + 0.035), time, rainbow);
        float3 violet = hueColor(frac(hue - 0.075), time, rainbow);
        float3 glass = lerp(violet, azure, depthGradient);
        float caustic = 0.68 + 0.32 * (0.5 + 0.5 * sin(
            hitPoint.x * 6.0 + hitPoint.y * 4.0 + hitPoint.z * 3.0));
        float innerDepth = clamp(-sceneDistance(
            hitPoint + rayDirection * 0.18, balls, blend)
            / 0.16, 0.0, 1.0);
        float core = pow(viewFacing, 1.4) * pow(innerDepth, 0.7)
            * caustic;
        float subsurface = pow(backLight, 1.35) * (0.12 + 0.26 * depth);
        color = glass * (0.055 + diffuse * 0.15 + backLight * 0.07);
        color += lerp(violet, azure, caustic) * core * (0.42 + light * 0.28);
        color += glass * rim * (0.08 + light * 0.12);
        color += violet * subsurface * light;
        color += lerp(glass, float3(0.82, 0.9, 1.0), 0.42)
            * specular * light * 1.05;
    }

    color *= light * 0.72 + 0.28;
    color *= gooClipCoverage();
    outColor = float4(max(color, float3(0.0)), 1.0);
}

#include "analytic_fragment_entry.slang"
