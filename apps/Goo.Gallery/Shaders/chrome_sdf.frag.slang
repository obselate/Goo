#include "goo_effect.slang"


float chromeSmoothUnion(float left, float right, float blend)
{
    float amount = clamp(0.5 + 0.5 * (right - left) / max(blend, 0.0001), 0.0, 1.0);
    return lerp(right, left, amount) - blend * amount * (1.0 - amount);
}

float chromeSphere(float3 point, float radius)
{
    return length(point) - radius;
}

float chromeTorus(float3 point, float2 radii)
{
    float2 ring = float2(length(point.xz) - radii.x, point.y);
    return length(ring) - radii.y;
}

float chromeBox(float3 point, float3 bounds)
{
    float3 q = abs(point) - bounds;
    return length(max(q, float3(0.0, 0.0, 0.0)))
        + min(max(q.x, max(q.y, q.z)), 0.0);
}

float chromeRoundedBox(float3 point, float3 bounds, float rounding)
{
    return chromeBox(point, bounds) - rounding;
}

float chromeScene(float3 point, float morph)
{
    float separation = 1.0 - morph;
    float3 spherePoint = point - float3(0.0, 0.27 * separation, 0.0);
    float3 torusPoint = point - float3(0.0, -0.25 * separation, 0.0);
    float3 boxPoint = point - float3(0.48 * separation, 0.03, 0.0);
    float sphere = chromeSphere(spherePoint, 0.74);
    float torus = chromeTorus(torusPoint, float2(0.88, 0.16));
    float box = chromeRoundedBox(boxPoint, float3(0.46, 0.46, 0.46), 0.12);
    float blend = lerp(0.035, 0.30, morph);
    return chromeSmoothUnion(chromeSmoothUnion(sphere, torus, blend), box, blend);
}

struct ChromeTrace
{
    bool hit;
    float distance;
    float3 point;
};

ChromeTrace chromeMarch(float3 origin, float3 direction, float morph)
{
    ChromeTrace result;
    result.hit = false;
    result.distance = 0.0;
    result.point = origin;
    float travel = 0.0;

    for (int iteration = 0; iteration < 64; iteration++)
    {
        float3 point = origin + direction * travel;
        float distance = chromeScene(point, morph);
        result.point = point;
        if (abs(distance) < 0.0012)
        {
            result.hit = true;
            break;
        }
        travel += max(distance * 0.78, 0.0015);
        if (travel > 8.0)
        {
            break;
        }
    }

    result.distance = travel;
    result.point = origin + direction * travel;
    return result;
}

float3 chromeNormal(float3 point, float morph)
{
    float epsilon = 0.0025;
    float3 offsetX = float3(epsilon, 0.0, 0.0);
    float3 offsetY = float3(0.0, epsilon, 0.0);
    float3 offsetZ = float3(0.0, 0.0, epsilon);
    float x = chromeScene(point + offsetX, morph) - chromeScene(point - offsetX, morph);
    float y = chromeScene(point + offsetY, morph) - chromeScene(point - offsetY, morph);
    float z = chromeScene(point + offsetZ, morph) - chromeScene(point - offsetZ, morph);
    return normalize(float3(x, y, z));
}

float3 chromeEnvironment(float3 direction, float roughness)
{
    float vertical = saturate(direction.y * 0.5 + 0.5);
    float3 skyLow = float3(0.012, 0.018, 0.030);
    float3 skyHigh = float3(0.16, 0.24, 0.34);
    float3 environment = lerp(skyLow, skyHigh, vertical);
    float3 keyDirection = normalize(float3(-0.52, 0.62, 0.58));
    float3 fillDirection = normalize(float3(0.64, 0.18, 0.72));
    float key = pow(saturate(dot(direction, keyDirection)), 14.0);
    float fill = pow(saturate(dot(direction, fillDirection)), 22.0);
    environment += float3(0.78, 0.58, 0.34) * key * 0.58;
    environment += float3(0.22, 0.42, 0.66) * fill * 0.32;
    float3 average = lerp(float3(0.028, 0.040, 0.060),
        float3(0.085, 0.115, 0.16), vertical);
    return lerp(environment, average, saturate(roughness) * 0.66);
}

float3 chromeGround(float3 point)
{
    float radial = exp(-length(point.xz) * 1.45);
    float3 ground = lerp(float3(0.009, 0.011, 0.016),
        float3(0.048, 0.055, 0.066), radial * 0.8);
    float gridX = smoothstep(0.94, 0.99, abs(sin(point.x * 3.14159)));
    float gridZ = smoothstep(0.94, 0.99, abs(sin(point.z * 3.14159)));
    ground += float3(0.018, 0.021, 0.028) * max(gridX, gridZ) * 0.24;
    ground *= 0.72 + radial * 0.28;
    return ground;
}

float4 gooEffect(float2 uv, float4 source, float4 backdrop)
{
    float4 frame = gooParameter(0);
    float4 pointer = gooParameter(1);
    float4 controls = gooParameter(2);
    const float aspect = 16.0 / 9.0;
    float yaw = controls.x + (pointer.x - 0.5) * 0.3;
    float pitch = clamp(controls.y + (pointer.y - 0.5) * 0.16, -1.05, 1.05);
    float roughness = clamp(controls.z, 0.0, 1.0);
    float morph = clamp(controls.w, 0.0, 1.0);
    float3 target = float3(0.0, -0.08, 0.0);
    float3 orbit = float3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch));
    float3 origin = target + orbit * 3.35;
    float3 forward = normalize(target - origin);
    float3 right = normalize(cross(forward, float3(0.0, 1.0, 0.0)));
    float3 up = normalize(cross(right, forward));
    float2 screen = float2((uv.x * 2.0 - 1.0) * aspect, 1.0 - uv.y * 2.0);
    float3 direction = normalize(forward + right * screen.x * 0.82 + up * screen.y * 0.82);
    ChromeTrace trace = chromeMarch(origin, direction, morph);
    float3 color = chromeEnvironment(direction, roughness) * 0.62;

    float planeDistance = (-1.0 - origin.y) / direction.y;
    bool groundHit = planeDistance > 0.0;
    if (groundHit && (!trace.hit || planeDistance < trace.distance))
    {
        float3 groundPoint = origin + direction * planeDistance;
        color = chromeGround(groundPoint);
    }
    else if (trace.hit)
    {
        float3 normal = chromeNormal(trace.point, morph);
        float3 viewDirection = normalize(origin - trace.point);
        float3 reflection = reflect(-viewDirection, normal);
        float3 environment = chromeEnvironment(reflection, roughness);
        float3 lightDirection = normalize(float3(-0.52, 0.62, 0.58));
        float diffuse = saturate(dot(normal, lightDirection));
        float fresnel = pow(1.0 - saturate(dot(normal, viewDirection)), 5.0);
        float specular = pow(saturate(dot(reflection, lightDirection)), lerp(42.0, 10.0, roughness));
        float3 metal = lerp(float3(0.10, 0.26, 0.31),
            float3(0.38, 0.18, 0.08), saturate(morph * 0.8 + 0.1));
        color = environment * (0.42 + fresnel * 0.72);
        color += metal * (0.16 + diffuse * 0.42);
        color += float3(0.86, 0.68, 0.38) * specular * (1.0 - roughness * 0.62) * 0.48;
        color += float3(0.12, 0.26, 0.34) * pow(1.0 - saturate(dot(normal, viewDirection)), 2.0) * 0.20;
        float edge = exp(-trace.distance * 0.16);
        color *= 0.78 + edge * 0.22;
    }

    float vignette = 1.0 - smoothstep(0.58, 1.34, length(screen * float2(0.74, 0.92))) * 0.34;
    color *= vignette;
    float sourceAlpha = clamp(source.a, 0.0, 1.0);
    float3 retainedSource = source.rgb / max(sourceAlpha, 0.0001);
    float sourceMix = clamp(sourceAlpha * 0.30, 0.0, 0.30);
    color = lerp(color, clamp(retainedSource, 0.0, 1.0), sourceMix);
    color = max(color, float3(0.0, 0.0, 0.0));
    float alpha = saturate(sourceAlpha + backdrop.a * 0.0);
    return float4(color * alpha, alpha);
}
