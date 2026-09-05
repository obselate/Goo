#include "goo_effect.slang"

// Smooth, infinitely differentiable Cauchy fluid potential with analytical gradient
struct FluidBlob
{
    float potential;
    float2 gradient;
};

FluidBlob evaluateFluidPotential(
    float2 p,
    float2 center,
    float radius,
    float2 velocity,
    float time)
{
    float speed = length(velocity);
    float motionFactor = smoothstep(0.015, 0.08, speed);
    float2 velDir = velocity / max(speed, 0.001);

    // Fluid mass lag: the body of the fluid dynamically lags behind velocity
    float2 fluidCenter = center - velDir * (saturate(speed * 0.38) * 0.20 * radius * motionFactor);
    float2 delta = p - fluidCenter;

    float r = length(delta);
    float rTarget = radius;

    if (motionFactor > 0.0)
    {
        float cosAlpha = dot(delta / max(r, 0.0001), velDir);
        float sinAlpha = dot(delta / max(r, 0.0001), float2(-velDir.y, velDir.x));
        float angle = atan2(sinAlpha, cosAlpha);

        // Organic gelatin surface ripples
        float fluidDistortion = (cos(2.0 * angle - time * 7.5) * 0.50 +
                                 sin(3.0 * angle + time * 10.0) * 0.35 +
                                 cos(4.0 * angle - time * 13.0) * 0.15)
                              * motionFactor * saturate(speed * 0.35) * 0.09;

        rTarget = radius * (1.0 + fluidDistortion);
    }

    float u = r / max(rTarget, 0.001);
    float u2 = u * u;
    float u4 = u2 * u2;
    float denom = 1.0 + u4;

    FluidBlob result;
    // Cauchy potential: exactly 0.5 at boundary r = rTarget; 1.0 at center
    result.potential = 1.0 / denom;

    // Analytical gradient: vanishes smoothly to (0, 0) at center -> silky smooth dome, zero tips
    result.gradient = (-4.0 * u2 / (rTarget * rTarget * denom * denom)) * delta;
    return result;
}

float radialCircle(float2 p, float2 center, float radius)
{
    return length(p - center) - radius;
}

float radialRoundedBox(float2 p, float2 center, float2 halfSize, float radius)
{
    float2 q = abs(p - center) - halfSize + radius;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
}

float radialScene(float2 p)
{
    float result = radialCircle(p, float2(-0.48, -0.10), 0.115);
    result = min(result, radialRoundedBox(p, float2(-0.02, 0.18), float2(0.16, 0.075), 0.025));
    result = min(result, radialRoundedBox(p, float2(0.34, -0.16), float2(0.09, 0.17), 0.035));
    result = min(result, radialCircle(p, float2(0.58, 0.18), 0.085));
    return result;
}

float radialShadow(float2 p, float2 light)
{
    float2 ray = light - p;
    float rayLength = length(ray);
    float2 direction = ray / max(rayLength, 0.0001);
    float travel = 0.008;
    float clearance = 1.0;
    for (int stepIndex = 0; stepIndex < 36; stepIndex++)
    {
        if (travel >= rayLength)
        {
            break;
        }
        float distance = radialScene(p + direction * travel);
        if (distance < 0.001)
        {
            return 0.0;
        }
        clearance = min(clearance, distance);
        travel += clamp(distance, 0.004, 0.045);
    }
    return smoothstep(0.001, 0.018, clearance);
}

float3 radialLight(
    float2 p,
    float obstacleDistance,
    float2 lightPosition,
    float3 lightColor,
    float range,
    float intensity)
{
    if (obstacleDistance <= 0.001)
    {
        return float3(0.0, 0.0, 0.0);
    }
    float distance = length(p - lightPosition);
    float attenuation = saturate(1.0 - distance / range);
    attenuation = attenuation * attenuation * (3.0 - 2.0 * attenuation);
    float visibility = radialShadow(p, lightPosition);
    return lightColor * attenuation * visibility * intensity;
}

float3 radialObjectColor(float2 p)
{
    float circleA = radialCircle(p, float2(-0.48, -0.10), 0.115);
    float boxA = radialRoundedBox(p, float2(-0.02, 0.18), float2(0.16, 0.075), 0.025);
    float boxB = radialRoundedBox(p, float2(0.34, -0.16), float2(0.09, 0.17), 0.035);
    float circleB = radialCircle(p, float2(0.58, 0.18), 0.085);
    float result = circleA;
    float3 color = float3(0.18, 0.48, 0.48);
    if (boxA < result)
    {
        result = boxA;
        color = float3(0.46, 0.25, 0.16);
    }
    if (boxB < result)
    {
        result = boxB;
        color = float3(0.20, 0.34, 0.48);
    }
    if (circleB < result)
    {
        color = float3(0.38, 0.31, 0.52);
    }
    return color;
}

float3 radialMarker(float2 p, float2 position, float3 color)
{
    float distance = length(p - position);
    float core = 1.0 - smoothstep(0.010, 0.020, distance);
    float ring = 1.0 - smoothstep(0.003, 0.007, abs(distance - 0.030));
    return color * core * 1.45 + lerp(color, float3(1.0, 1.0, 1.0), 0.42) * ring * 0.72;
}

float4 gooEffect(float2 uv, float4 source, float4 backdrop)
{
    float4 frame = gooParameter(0);
    float4 pointerState = gooParameter(1);
    float4 firstAnchor = gooParameter(2);

    // Mode 1: Radial Light exhibit (Shader Lab)
    if (firstAnchor.w < 0.5)
    {
        const float aspect = 16.0 / 9.0;
        float2 p = (uv - 0.5) * float2(aspect, 1.0);
        float2 lightPosition = (clamp(pointerState.xy, 0.0, 1.0) - 0.5) * float2(aspect, 1.0);
        float pulse = 0.96 + 0.04 * sin(frame.x * 2.4);
        float pressed = step(0.5, pointerState.w);
        float obstacleDistance = radialScene(p);
        float2 cyanPosition = float2(-0.70, 0.31);
        float2 magentaPosition = float2(0.72, -0.31);
        float2 bluePosition = float2(0.02, -0.36);
        float3 pointerColor = float3(1.0, 0.56, 0.22);
        float3 cyanColor = float3(0.16, 0.72, 1.0);
        float3 magentaColor = float3(1.0, 0.20, 0.58);
        float3 blueColor = float3(0.38, 0.32, 1.0);

        float2 grid = abs(frac((p + 4.0) * 10.0) - 0.5);
        float gridLine = 1.0 - smoothstep(0.455, 0.49, max(grid.x, grid.y));
        float3 floorColor = lerp(float3(0.025, 0.034, 0.052), float3(0.034, 0.048, 0.069), gridLine * 0.45);
        float3 lighting = radialLight(
            p,
            obstacleDistance,
            lightPosition,
            pointerColor,
            lerp(0.48, 0.62, pressed),
            0.78 * pulse);
        lighting += radialLight(p, obstacleDistance, cyanPosition, cyanColor, 0.58, 0.42);
        lighting += radialLight(p, obstacleDistance, magentaPosition, magentaColor, 0.54, 0.38);
        lighting += radialLight(p, obstacleDistance, bluePosition, blueColor, 0.48, 0.34);
        float contact = 1.0 - smoothstep(0.0, 0.022, max(obstacleDistance, 0.0));
        float3 floor = floorColor * (0.34 - contact * 0.13) + lighting;

        float3 objectColor = radialObjectColor(p);
        float topCore = 1.0 - smoothstep(-0.040, -0.006, obstacleDistance);
        float3 smoothTop = lerp(objectColor * 0.54, objectColor * 0.82, topCore);
        smoothTop += float3(0.055, 0.065, 0.080) * topCore;
        float inside = 1.0 - smoothstep(-0.002, 0.002, obstacleDistance);
        float3 color = lerp(floor, smoothTop, inside);

        color += radialMarker(p, lightPosition, pointerColor);
        color += radialMarker(p, cyanPosition, cyanColor);
        color += radialMarker(p, magentaPosition, magentaColor);
        color += radialMarker(p, bluePosition, blueColor);
        color = lerp(color, backdrop.rgb, 0.0001);
        return float4(saturate(color), 1.0);
    }

    // Mode 2: Hero Living Goo with Fluid Mass Lag & Natural Sticky Bridges
    float4 secondAnchor = gooParameter(3);
    float4 thirdAnchor = gooParameter(4);
    float4 firstSecondVelocity = gooParameter(6);
    float4 thirdVelocity = gooParameter(7);

    float time = frame.x;
    const float aspect = 16.0 / 9.0;
    float2 metric = float2(aspect, 1.0);
    float2 p = uv * metric;

    float2 firstCenter = firstAnchor.xy * metric;
    float2 secondCenter = secondAnchor.xy * metric;
    float2 thirdCenter = thirdAnchor.xy * metric;

    float radius = max(firstAnchor.z, 0.001) * 1.25;

    float2 firstVel = firstSecondVelocity.xy * metric;
    float2 secondVel = firstSecondVelocity.zw * metric;
    float2 thirdVel = thirdVelocity.xy * metric;

    // Evaluate each drop with pure fluid mass lag and analytical gradients
    FluidBlob blobG  = evaluateFluidPotential(p, firstCenter,  radius, firstVel,  time);
    FluidBlob blobO1 = evaluateFluidPotential(p, secondCenter, radius, secondVel, time);
    FluidBlob blobO2 = evaluateFluidPotential(p, thirdCenter,  radius, thirdVel,  time);

    // Sum of potentials: C-infinity smooth everywhere, zero seams, zero pipe ridges
    float totalPotential = blobG.potential + blobO1.potential + blobO2.potential;
    float2 totalGradient = blobG.gradient + blobO1.gradient + blobO2.gradient;

    // Fluid boundary threshold: exactly 0.50 for an isolated circle
    const float threshold = 0.50;
    // Crisp edge with tight subpixel anti-aliasing
    float gradLen = length(totalGradient);
    float edgeWidth = clamp(gradLen * 0.0016, 0.0035, 0.0075);
    float body = smoothstep(threshold - edgeWidth, threshold + edgeWidth, totalPotential);

    // Authentic Goo Brand Colors
    // G  = Goo Blue:   #4789D0
    // O1 = Goo Green:  #6CBC5F
    // O2 = Goo Coral:  #ED694C -> Orange: #F9A338
    float3 blue = float3(0.278431, 0.537255, 0.815686);
    float3 green = float3(0.423529, 0.737255, 0.372549);
    float3 coral = float3(0.929412, 0.411765, 0.298039);
    float3 orange = float3(0.976471, 0.639216, 0.219608);
    float3 secondOColor = lerp(coral, orange, smoothstep(0.25, 0.78, uv.y));

    // Smooth fluid dye diffusion across the liquid mass
    float totalW = max(totalPotential, 0.0001);
    float3 fluidColor = (
        blue * blobG.potential +
        green * blobO1.potential +
        secondOColor * blobO2.potential) / totalW;

    // Spherical dome elevation: 1.0 at center, 0.0 at edge
    float elevation = saturate((totalPotential - threshold) / (1.0 - threshold));
    float domeHeight = sqrt(elevation);

    // Smooth analytical normal: vanishes to (0, 0, 1) at each apex (zero hard tips!)
    float3 normal = normalize(float3(-totalGradient * radius * 0.70, domeHeight * 1.3 + 0.30));

    // Studio Lighting (soft tactile diffuse + subtle satin sheen + internal depth)
    float3 keyLight = normalize(float3(-0.35, 0.55, 0.75));
    float3 viewDir = float3(0.0, 0.0, 1.0);
    float3 halfKey = normalize(keyLight + viewDir);

    // Rich directional wrap diffuse to sculpt 3D form without harsh shininess
    float diff = saturate((dot(normal, keyLight) + 0.40) / 1.40);

    // Very gentle satin highlight (soft, low-intensity, color-tinted instead of harsh white glare)
    float satinSheen = pow(saturate(dot(normal, halfKey)), 14.0) * 0.14;
    float3 sheenColor = lerp(fluidColor * 1.35, float3(1.0, 1.0, 1.0), 0.30);

    // Silhouette rim lighting to cleanly define dome curvature
    float rim = pow(1.0 - saturate(normal.z), 2.2) * 0.20;

    // Subsurface translucency (internal volume warmth)
    float sss = saturate(dot(normal, -keyLight) * 0.5 + 0.5) * elevation * 0.16;

    // Base ambient occlusion: deepens at bottom plate to sculpt round thickness
    float bottomAO = lerp(0.68, 1.0, smoothstep(0.0, 0.38, elevation));

    // Shaded Goo Body: rich matte-satin depth, zero plastic/chrome glare
    float3 shadedGoo = fluidColor * ((0.50 + diff * 0.50) * bottomAO + sss);
    shadedGoo += sheenColor * satinSheen;
    shadedGoo += fluidColor * rim * 0.35;

    // Directional shadow: light comes from top-left, casting down-right
    float2 shadowP = p - float2(0.010, 0.020);
    FluidBlob shadowBlobG  = evaluateFluidPotential(shadowP, firstCenter,  radius, firstVel,  time);
    FluidBlob shadowBlobO1 = evaluateFluidPotential(shadowP, secondCenter, radius, secondVel, time);
    FluidBlob shadowBlobO2 = evaluateFluidPotential(shadowP, thirdCenter,  radius, thirdVel,  time);
    float shadowPotential = shadowBlobG.potential + shadowBlobO1.potential + shadowBlobO2.potential;

    // 1. Tight contact ambient occlusion directly hugging the crisp perimeter
    float contactRatio = saturate(totalPotential / threshold);
    float contactShadow = pow(contactRatio, 5.0) * 0.65;

    // 2. Soft directional cast shadow penumbra
    float castRatio = saturate(shadowPotential / threshold);
    float castShadow = smoothstep(0.12, 0.95, castRatio) * 0.50;

    // Combined rich ground shadow
    float groundShadow = saturate(contactShadow + castShadow * (1.0 - contactShadow * 0.6)) * (1.0 - body);
    float3 bg = float3(0.035, 0.043, 0.063);
    float3 ground = bg * (1.0 - groundShadow * 0.90);

    // Composite goo over background
    float3 compositedGoo = lerp(ground, shadedGoo, body);

    // Source typography composite (crisp, prominent white G, o, o lettering)
    float alpha = clamp(source.a, 0.0, 1.0);
    float3 retained = source.rgb / max(alpha, 0.0001);
    float textMask = smoothstep(0.18, 0.55, max(retained.r, max(retained.g, retained.b)));

    float3 finalColor = lerp(compositedGoo, float3(0.98, 0.98, 0.99), textMask);

    return float4(clamp(finalColor, 0.0, 1.0) * alpha, alpha);
}
