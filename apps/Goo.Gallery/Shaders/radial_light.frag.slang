#include "goo_effect.slang"

float3 mitosisContribution(
    float2 point,
    float2 center,
    float2 pointer,
    float radius,
    float pullAmount,
    float2 motion)
{
    float2 pull = pointer - center;
    float pullLength = length(pull);
    float2 axis = pullLength > 0.0001 ? pull / pullLength : float2(1.0, 0.0);
    float2 normal = float2(-axis.y, axis.x);
    float stretch =
        saturate(pullLength / max(radius * 2.2, 0.001)) * pullAmount;
    float alongRadius = radius * (1.0 + stretch * 0.64);
    float acrossRadius = radius / (1.0 + stretch * 0.22);
    float2 delta = point - center;
    float motionLength = length(motion);
    float2 motionAxis =
        motionLength > 0.0001 ? motion / motionLength : float2(1.0, 0.0);
    float2 motionNormal = float2(-motionAxis.y, motionAxis.x);
    float motionStrength = saturate(motionLength * 0.12);
    float motionWave = sin(
        dot(delta, motionNormal) / max(radius, 0.001) * 2.8
        + dot(center, float2(11.3, 7.9)));
    delta +=
        motionAxis * radius * motionStrength * motionWave * 0.035;
    float along = dot(delta, axis) / max(alongRadius, 0.001);
    float across = dot(delta, normal) / max(acrossRadius, 0.001);
    float squaredRadius = along * along + across * across;
    float safeRadius = max(squaredRadius, 0.014);
    float density = 1.0 / safeRadius;
    float2 gradient = float2(0.0, 0.0);
    if (squaredRadius > 0.014)
    {
        gradient = -2.0 * density * density
            * (axis * along / max(alongRadius, 0.001)
                + normal * across / max(acrossRadius, 0.001));
    }
    return float3(density, gradient);
}

float2 voronoiHash(float2 cell)
{
    float2 phase = float2(
        dot(cell, float2(127.1, 311.7)),
        dot(cell, float2(269.5, 183.3)));
    return frac(sin(phase) * 43758.5453);
}

float voronoiBoundary(float2 position)
{
    float2 base = floor(position);
    float2 local = frac(position);
    float nearestDistance = 8.0;
    float secondDistance = 8.0;
    for (int y = -1; y <= 1; y++)
    {
        for (int x = -1; x <= 1; x++)
        {
            float2 neighbor = float2(float(x), float(y));
            float2 delta = neighbor + voronoiHash(base + neighbor) - local;
            float distance = dot(delta, delta);
            if (distance < nearestDistance)
            {
                secondDistance = nearestDistance;
                nearestDistance = distance;
            }
            else if (distance < secondDistance)
            {
                secondDistance = distance;
            }
        }
    }
    return 1.0 - smoothstep(0.035, 0.14, secondDistance - nearestDistance);
}

float2 cellCoordinates(
    float2 point,
    float2 center,
    float2 pointer,
    float radius,
    float pullAmount,
    float2 motion,
    float2 seed)
{
    float2 local = (point - center) / max(radius, 0.001);
    float2 pull = (pointer - center) / max(radius, 0.001);
    float pullLength = length(pull);
    float pullStrength = saturate(pullLength * 0.50) * pullAmount;
    float2 axis = pullLength > 0.0001 ? pull / pullLength : float2(1.0, 0.0);
    float2 normal = float2(-axis.y, axis.x);
    float2 phase = center.yx * 19.0 + seed;
    float2 deformation = float2(
        sin(local.y * 3.1 + phase.x),
        cos(local.x * 2.7 + phase.y));
    local += deformation * (0.045 + pullStrength * 0.13);
    local += axis
        * sin(dot(local, normal) * 3.4 + phase.x)
        * pullStrength
        * 0.10;
    float motionLength = length(motion);
    float2 motionAxis =
        motionLength > 0.0001 ? motion / motionLength : float2(1.0, 0.0);
    float2 motionNormal = float2(-motionAxis.y, motionAxis.x);
    float motionStrength = saturate(motionLength * 0.12);
    local += motionAxis
        * sin(dot(local, motionNormal) * 2.5 + phase.y)
        * motionStrength
        * 0.035;
    return local * 2.6 + seed;
}

float4 gooEffect(float2 uv, float4 source, float4 backdrop)
{
    float4 frame = gooParameter(0);
    float4 pointerState = gooParameter(1);
    float4 firstAnchor = gooParameter(2);

    if (firstAnchor.w < 0.5)
    {
        float2 pointer = clamp(pointerState.xy, 0.0, 1.0);
        float radius = max(firstAnchor.x, 0.001);
        float intensity = clamp(firstAnchor.y, 0.0, 2.0);
        float falloff = max(firstAnchor.z, 0.001);
        float2 delta = uv - pointer;
        float distance = length(delta) / radius;
        float inverse = 1.0 / (1.0 + falloff * distance * distance);
        float light = inverse * inverse * (3.0 - 2.0 * inverse);
        float alpha = clamp(source.a, 0.0, 1.0);
        float3 retained = lerp(backdrop.rgb, source.rgb, alpha) / max(alpha, 0.0001);
        float luminance = dot(retained, float3(0.2126, 0.7152, 0.0722));
        float lift = clamp(intensity * light, 0.0, 1.25);
        float baseScale = 0.76 + 0.24 * light;
        float warmShift = clamp(0.08 * lift + 0.03 * light * luminance, 0.0, 0.16);
        float3 warm = float3(1.0, 0.29, 0.08);
        float3 color = clamp(retained * baseScale + warm * warmShift, 0.0, 1.0) * alpha;
        return float4(color, alpha);
    }

    float4 secondAnchor = gooParameter(3);
    float4 thirdAnchor = gooParameter(4);
    float4 state = gooParameter(5);
    float4 firstSecondVelocity = gooParameter(6);
    float4 thirdVelocity = gooParameter(7);
    float aspect = max(frame.y / max(frame.z, 1.0), 0.001);
    float2 metric = float2(aspect, 1.0);
    float2 point = uv * metric;
    float2 pointer = clamp(pointerState.xy, 0.0, 1.0) * metric;
    float2 first = firstAnchor.xy * metric;
    float2 second = secondAnchor.xy * metric;
    float2 third = thirdAnchor.xy * metric;
    float pressure = clamp(pointerState.z, 0.0, 1.0);
    float down = step(0.5, pointerState.w);
    float pullPressure = 0.64 + pressure * 0.24;
    float firstPull =
        down * (1.0 - step(0.5, abs(state.z))) * pullPressure;
    float secondPull =
        down * (1.0 - step(0.5, abs(state.z - 1.0))) * pullPressure;
    float thirdPull =
        down * (1.0 - step(0.5, abs(state.z - 2.0))) * pullPressure;

    float radius = max(firstAnchor.z, 0.001);
    float2 firstVelocity = firstSecondVelocity.xy * metric;
    float2 secondVelocity = firstSecondVelocity.zw * metric;
    float2 thirdVelocityVector = thirdVelocity.xy * metric;
    float joinStart = radius * 2.45;
    float joinEnd = radius * 3.15;
    float firstSecondJoin =
        1.0 - smoothstep(joinStart, joinEnd, length(first - second));
    float secondThirdJoin =
        1.0 - smoothstep(joinStart, joinEnd, length(second - third));
    float thirdFirstJoin =
        1.0 - smoothstep(joinStart, joinEnd, length(third - first));
    float2 firstMotion = firstVelocity + (
        secondVelocity * firstSecondJoin
        + thirdVelocityVector * thirdFirstJoin) * 0.22;
    float2 secondMotion = secondVelocity + (
        firstVelocity * firstSecondJoin
        + thirdVelocityVector * secondThirdJoin) * 0.22;
    float2 thirdMotion = thirdVelocityVector + (
        firstVelocity * thirdFirstJoin
        + secondVelocity * secondThirdJoin) * 0.22;
    float3 firstField =
        mitosisContribution(point, first, pointer, radius, firstPull, firstMotion);
    float3 secondField =
        mitosisContribution(point, second, pointer, radius, secondPull, secondMotion);
    float3 thirdField =
        mitosisContribution(point, third, pointer, radius, thirdPull, thirdMotion);
    float density = firstField.x + secondField.x + thirdField.x;
    float2 densityGradient =
        firstField.yz + secondField.yz + thirdField.yz;
    float distanceField =
        (1.0 - density) / max(length(densityGradient), 0.7);

    float body = 1.0 - smoothstep(-0.001, 0.003, distanceField);
    float membrane = smoothstep(-0.009, -0.004, distanceField)
        * (1.0 - smoothstep(0.001, 0.004, distanceField));
    float firstWeight = min(firstField.x, 32.0);
    float secondWeight = min(secondField.x, 32.0);
    float thirdWeight = min(thirdField.x, 32.0);
    float weight = max(firstWeight + secondWeight + thirdWeight, 0.001);

    float3 blue = float3(0.278431, 0.537255, 0.815686);
    float3 green = float3(0.423529, 0.737255, 0.372549);
    float3 coral = float3(0.929412, 0.411765, 0.298039);
    float3 orange = float3(0.976471, 0.639216, 0.219608);
    float3 white = float3(0.921569, 0.925490, 0.925490);
    float3 thirdColor =
        lerp(coral, orange, smoothstep(0.25, 0.78, uv.y));
    float3 material = (
        blue * firstWeight
        + green * secondWeight
        + thirdColor * thirdWeight) / weight;
    float2 fluidCenter = (
        first * firstWeight
        + second * secondWeight
        + third * thirdWeight) / weight;
    float2 fluidOffset = point - fluidCenter;
    float depth = saturate(-distanceField / (radius * 0.78));
    float innerRim =
        (1.0 - smoothstep(0.006, 0.034, -distanceField)) * body;
    float2 highlightOffset =
        fluidOffset + float2(radius * 0.26, radius * 0.31);
    float highlight = exp(
        -dot(highlightOffset, highlightOffset)
        / (radius * radius * 0.12)) * body;
    material *=
        0.76 + depth * 0.24 + (1.0 - uv.y) * 0.08 - innerRim * 0.10;
    material += white * highlight * 0.24;

    float firstCells = voronoiBoundary(cellCoordinates(
        point, first, pointer, radius, firstPull, firstMotion, float2(1.3, 4.7)));
    float secondCells = voronoiBoundary(cellCoordinates(
        point, second, pointer, radius, secondPull, secondMotion, float2(6.1, 2.4)));
    float thirdCells = voronoiBoundary(cellCoordinates(
        point, third, pointer, radius, thirdPull, thirdMotion, float2(3.8, 7.2)));
    float cellular = (
        firstCells * firstWeight
        + secondCells * secondWeight
        + thirdCells * thirdWeight) / weight;
    float cellularInk = cellular * body * (1.0 - membrane);
    material *= 1.0 - cellularInk * 0.30;
    material += white * cellularInk * 0.045;

    float alpha = clamp(source.a, 0.0, 1.0);
    float3 retained = source.rgb / max(alpha, 0.0001);
    float retainedDetail =
        smoothstep(0.22, 0.78, max(retained.r, max(retained.g, retained.b)));
    float individualDensity =
        max(firstField.x, max(secondField.x, thirdField.x));
    float letterInterior =
        smoothstep(1.12, 1.38, individualDensity)
        * body
        * (1.0 - membrane);
    float3 fieldColor = float3(0.035294, 0.043137, 0.062745);
    float3 color = lerp(retained, fieldColor, retainedDetail) * 0.82;
    color = lerp(color, material, body * 0.98);
    color = lerp(color, white, membrane * 0.96);
    color = lerp(color, retained, retainedDetail * letterInterior * 0.94);
    return float4(clamp(color, 0.0, 1.0) * alpha, alpha);
}
