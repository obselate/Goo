#include "primitive_record.glsl"
#include "clip_chain.glsl"

layout(location = 0) in vec2 uv;
layout(location = 3) flat in uint gooPrimitiveRecordOrdinal;
layout(location = 0) out vec4 outColor;

#define pc gooPrimitiveBuffer.records[gooPrimitiveRecordOrdinal]

const vec3 FieldInk = vec3(0.0097, 0.0091, 0.0086);
const vec3 FieldEmber = vec3(0.0176, 0.0052, 0.0033);
const float Tau = 6.28318530718;
const int BallCount = 16;
const int MaxSteps = 64;

float hash21(vec2 point)
{
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
}

float smoothUnion(float left, float right, float blend)
{
    float amount = clamp(0.5 + 0.5 * (right - left) / blend, 0.0, 1.0);
    return mix(right, left, amount) - blend * amount * (1.0 - amount);
}

vec3 ballPosition(int index, float time, float flow, float form,
    float seed)
{
    float value = float(index);
    float random = hash21(vec2(value + 3.7, seed + 11.0));
    float phase = random * Tau + value * 1.618;
    float speed = (0.34 + random * 0.82) * flow;
    vec3 position = vec3(
        sin(phase + time * speed) * (0.34 + random * 0.24),
        cos(phase * 1.37 + time * speed * 0.73) * (0.26 + random * 0.17),
        sin(phase * 0.71 + time * speed * 1.11) * (0.28 + random * 0.2));
    position.z += cos(phase * 1.91 + time * speed * 0.43) * 0.1;
    position += vec3(
        sin(time * 0.33) * 0.05,
        cos(time * 0.27) * 0.04,
        sin(time * 0.21) * 0.035);
    return position * (0.78 + form * 0.12);
}

float ballRadius(int index, float form, float seed)
{
    float value = float(index);
    float random = hash21(vec2(value + 19.0, seed + 7.0));
    return (0.145 + random * 0.065) * (0.92 + form * 0.2);
}

float sceneDistance(vec3 point, in vec4 balls[BallCount], float blend)
{
    float distance = 10.0;
    for (int index = 0; index < BallCount; index++)
    {
        float sphere = length(point - balls[index].xyz) - balls[index].w;
        distance = smoothUnion(distance, sphere, blend);
    }
    return distance;
}

vec3 sceneNormal(vec3 point, in vec4 balls[BallCount], float blend)
{
    const float epsilon = 0.0015;
    vec3 offsetX = vec3(epsilon, 0.0, 0.0);
    vec3 offsetY = vec3(0.0, epsilon, 0.0);
    vec3 offsetZ = vec3(0.0, 0.0, epsilon);
    float center = sceneDistance(point, balls, blend);
    return normalize(vec3(
        sceneDistance(point + offsetX, balls, blend) - center,
        sceneDistance(point + offsetY, balls, blend) - center,
        sceneDistance(point + offsetZ, balls, blend) - center));
}

mat3 rotateX(float angle)
{
    float sine = sin(angle);
    float cosine = cos(angle);
    return mat3(
        1.0, 0.0, 0.0,
        0.0, cosine, -sine,
        0.0, sine, cosine);
}

mat3 rotateY(float angle)
{
    float sine = sin(angle);
    float cosine = cos(angle);
    return mat3(
        cosine, 0.0, sine,
        0.0, 1.0, 0.0,
        -sine, 0.0, cosine);
}

vec3 selectedHue(float hue)
{
    vec3 primary = clamp(abs(mod(hue * 6.0 + vec3(0.0, 4.0, 2.0), 6.0)
        - 3.0) - 1.0, 0.0, 1.0);
    return mix(vec3(1.0), primary, 0.88) * 0.94;
}

vec3 hueColor(float hue, float time, float rainbow)
{
    vec3 phase = vec3(0.0, 0.3333333, 0.6666667);
    vec3 spectrum = 0.5 + 0.5 * cos(Tau * (hue + time * 0.055 + phase));
    vec3 selected = selectedHue(hue);
    return mix(selected, spectrum, rainbow);
}

void main()
{
    float time = pc.params.x;
    float light = clamp(pc.params.y, 0.2, 2.0);
    float hue = fract(pc.params.z);
    float rainbow = clamp(pc.params.w, 0.0, 1.0);
    float flow = clamp(pc.radii.x, 0.15, 2.4);
    float form = clamp(pc.radii.y, 0.25, 2.0);
    float blend = mix(0.04, 0.125, clamp(pc.radii.z, 0.0, 1.0));
    float aspect = clamp(pc.radii.w, 0.5, 2.5);
    float seed = float(pc.packedColorsExtra.x & 4095u);
    vec2 screen = (uv - vec2(0.5)) * vec2(aspect, 1.0);
    vec3 rayOrigin = vec3(screen, 3.15);
    vec3 rayDirection = normalize(vec3(screen * 0.045, -1.0));
    vec3 color = FieldInk + FieldEmber * (0.6 + 0.4 * screen.y);
    float backgroundGlow = exp(-length(screen) * 1.8);
    vec3 atmosphereAzure = hueColor(fract(hue + 0.035), time, rainbow);
    vec3 atmosphereViolet = hueColor(fract(hue - 0.075), time, rainbow);
    color += mix(atmosphereViolet, atmosphereAzure,
        smoothstep(-0.7, 0.7, screen.y)) * backgroundGlow * 0.032;

    vec4 balls[BallCount];
    float yaw = pc.stopPositions.x;
    float pitch = pc.stopPositions.y;
    mat3 groupRotation = rotateY(yaw) * rotateX(pitch);
    for (int index = 0; index < BallCount; index++)
    {
        balls[index] = vec4(
            groupRotation * ballPosition(index, time, flow, form, seed),
            ballRadius(index, form, seed));
    }
    float projectedDistance = sceneDistance(vec3(screen, 0.0), balls,
        blend);
    float fieldAura = exp(-max(projectedDistance, 0.0) * 7.0);
    color += atmosphereAzure * fieldAura * 0.038;

    float travel = 0.0;
    vec3 hitPoint = rayOrigin;
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
        vec3 normal = sceneNormal(hitPoint, balls, blend);
        vec3 lightDirection = normalize(vec3(-0.75, 1.1, 2.8));
        vec3 viewDirection = normalize(rayOrigin - hitPoint);
        float viewFacing = max(dot(normal, viewDirection), 0.0);
        float diffuse = max(dot(normal, lightDirection), 0.0);
        float backLight = max(dot(normal, -lightDirection), 0.0);
        vec3 reflected = reflect(-lightDirection, normal);
        float specular = pow(max(dot(reflected, viewDirection), 0.0), 72.0)
            * smoothstep(0.1, 0.85, diffuse);
        float rim = pow(1.0 - viewFacing, 3.2);
        float depth = exp(-travel * 0.28);
        float depthGradient = clamp(0.5 + hitPoint.z * 0.48
            + hitPoint.y * 0.2, 0.0, 1.0);
        vec3 azure = hueColor(fract(hue + 0.035), time, rainbow);
        vec3 violet = hueColor(fract(hue - 0.075), time, rainbow);
        vec3 glass = mix(violet, azure, depthGradient);
        float caustic = 0.68 + 0.32 * (0.5 + 0.5 * sin(
            hitPoint.x * 6.0 + hitPoint.y * 4.0 + hitPoint.z * 3.0));
        float innerDepth = clamp(-sceneDistance(
            hitPoint + rayDirection * 0.18, balls, blend)
            / 0.16, 0.0, 1.0);
        float core = pow(viewFacing, 1.4) * pow(innerDepth, 0.7)
            * caustic;
        float subsurface = pow(backLight, 1.35) * (0.12 + 0.26 * depth);
        color = glass * (0.055 + diffuse * 0.15 + backLight * 0.07);
        color += mix(violet, azure, caustic) * core * (0.42 + light * 0.28);
        color += glass * rim * (0.08 + light * 0.12);
        color += violet * subsurface * light;
        color += mix(glass, vec3(0.82, 0.9, 1.0), 0.42)
            * specular * light * 1.05;
    }

    color *= light * 0.72 + 0.28;
    color *= gooClipCoverage();
    outColor = vec4(max(color, vec3(0.0)), 1.0);
}
