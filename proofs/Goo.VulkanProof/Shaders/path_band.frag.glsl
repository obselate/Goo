layout(set = 0, binding = 0, std430) readonly buffer PathBandBuffer {
    uint words[];
} pathBandBuffer;

#ifdef GOO_CLIP_MASK
layout(push_constant) uniform ClipMaskPushConstants {
    vec4 transform0;
    vec4 transform1;
    vec4 sampleStep;
    vec4 borderRect;
    vec4 borderTransform0;
    vec4 borderTransform1;
    uvec4 params;
} pc;
#else
layout(push_constant) uniform PathBandPushConstants {
    vec4 transform0;
    vec4 transform1;
    vec4 sampleStep;
    vec4 color;
    uvec4 params;
} pc;
#endif

layout(location = 0) in vec2 pathPosition;
layout(location = 0) out vec4 outColor;

#ifndef GOO_CLIP_MASK
#include "clip_chain.glsl"
#endif

const uint HeaderWordCount = 12u;
const uint BandWordCount = 8u;
const uint CurveWordCount = 8u;
const uint FormatVersion = 1u;
const float CoordinateMinimumTolerance = 0.0000001;
const float CoordinateRelativeTolerance = 0.000001;
const float MinimumPixelsPerPath = 0.0000152587890625;
const float EndpointParameterStep = 0.0001;

struct AnalyticBand {
    float minimum;
    float maximum;
    float split;
    uint forwardStart;
    uint forwardCount;
    uint reverseStart;
    uint reverseCount;
    uint flags;
};

struct QuadraticCurve {
    vec2 start;
    vec2 control;
    vec2 finish;
};

struct AxisRoots {
    float first;
    float second;
    uint code;
};

uint pathWord(uint relativeWord)
{
    return pathBandBuffer.words[pc.params.x + relativeWord];
}

float wordFloat(uint index)
{
    return uintBitsToFloat(pathWord(index));
}

uint horizontalBandCount()
{
    return pathWord(2u);
}

uint verticalBandCount()
{
    return pathWord(3u);
}

uint horizontalIndexCount()
{
    return pathWord(4u);
}

uint verticalIndexCount()
{
    return pathWord(5u);
}

uint curveCount()
{
    return pathWord(6u);
}

uint horizontalBandBase()
{
    return HeaderWordCount;
}

uint verticalBandBase()
{
    return horizontalBandBase() + horizontalBandCount() * BandWordCount;
}

uint horizontalIndexBase()
{
    return verticalBandBase() + verticalBandCount() * BandWordCount;
}

uint verticalIndexBase()
{
    return horizontalIndexBase() + horizontalIndexCount();
}

uint curveBase()
{
    return verticalIndexBase() + verticalIndexCount();
}

AnalyticBand readBand(uint base)
{
    AnalyticBand result;
    result.minimum = wordFloat(base);
    result.maximum = wordFloat(base + 1u);
    result.split = wordFloat(base + 2u);
    result.forwardStart = pathWord(base + 3u);
    result.forwardCount = pathWord(base + 4u);
    result.reverseStart = pathWord(base + 5u);
    result.reverseCount = pathWord(base + 6u);
    result.flags = pathWord(base + 7u);
    return result;
}

QuadraticCurve curveAt(uint index)
{
    uint base = curveBase() + index * CurveWordCount;
    QuadraticCurve result;
    result.start = vec2(wordFloat(base), wordFloat(base + 1u));
    result.control = vec2(wordFloat(base + 2u), wordFloat(base + 3u));
    result.finish = vec2(wordFloat(base + 4u), wordFloat(base + 5u));
    return result;
}

float curveX(QuadraticCurve curve, float t)
{
    float inverseT = 1.0 - t;
    return inverseT * inverseT * curve.start.x
        + 2.0 * inverseT * t * curve.control.x
        + t * t * curve.finish.x;
}

float curveY(QuadraticCurve curve, float t)
{
    float inverseT = 1.0 - t;
    return inverseT * inverseT * curve.start.y
        + 2.0 * inverseT * t * curve.control.y
        + t * t * curve.finish.y;
}

float curveXDerivative(QuadraticCurve curve, float t)
{
    return 2.0 * ((1.0 - t) * (curve.control.x - curve.start.x)
        + t * (curve.finish.x - curve.control.x));
}

float curveYDerivative(QuadraticCurve curve, float t)
{
    return 2.0 * ((1.0 - t) * (curve.control.y - curve.start.y)
        + t * (curve.finish.y - curve.control.y));
}

float coefficientTolerance(float first, float second, float quadratic)
{
    float scale = max(max(abs(first), abs(2.0 * second)), abs(quadratic));
    return max(CoordinateMinimumTolerance, scale * CoordinateRelativeTolerance);
}

float directionTolerance(QuadraticCurve curve, bool vertical)
{
    float first = vertical ? abs(curve.control.x - curve.start.x)
        : abs(curve.control.y - curve.start.y);
    float second = vertical ? abs(curve.finish.x - curve.control.x)
        : abs(curve.finish.y - curve.control.y);
    return max(CoordinateMinimumTolerance,
        max(first, second) * CoordinateRelativeTolerance);
}

uint rootCode(float first, float second, float third)
{
    uint firstSign = floatBitsToUint(first) >> 31u;
    uint secondSign = floatBitsToUint(second) >> 30u;
    uint thirdSign = floatBitsToUint(third) >> 29u;
    uint shift = (secondSign & 2u) | (firstSign & ~2u);
    shift = (thirdSign & 4u) | (shift & ~4u);
    return (0x2e74u >> shift) & 0x0101u;
}

AxisRoots solveHorizontalRoots(QuadraticCurve curve, vec2 point)
{
    vec2 first = curve.start - point;
    vec2 second = curve.control - point;
    vec2 third = curve.finish - point;
    AxisRoots result;
    result.code = rootCode(first.y, second.y, third.y);
    result.first = result.second = -1.0;
    if (result.code == 0u)
    {
        return result;
    }
    vec2 a = first - second * 2.0 + third;
    vec2 b = first - second;
    float tolerance = coefficientTolerance(first.y, b.y, a.y);
    if (abs(a.y) > tolerance)
    {
        float discriminant = max(b.y * b.y - a.y * first.y, 0.0);
        float root = sqrt(discriminant);
        result.first = (b.y - root) / a.y;
        result.second = (b.y + root) / a.y;
    }
    else if (abs(b.y) > tolerance)
    {
        result.first = result.second = 0.5 * first.y / b.y;
    }
    else
    {
        result.first = result.second = -1.0;
    }
    return result;
}

AxisRoots solveVerticalRoots(QuadraticCurve curve, vec2 point)
{
    vec2 first = curve.start - point;
    vec2 second = curve.control - point;
    vec2 third = curve.finish - point;
    AxisRoots result;
    result.code = rootCode(first.x, second.x, third.x);
    result.first = result.second = -1.0;
    if (result.code == 0u)
    {
        return result;
    }
    vec2 a = first - second * 2.0 + third;
    vec2 b = first - second;
    float tolerance = coefficientTolerance(first.x, b.x, a.x);
    if (abs(a.x) > tolerance)
    {
        float discriminant = max(b.x * b.x - a.x * first.x, 0.0);
        float root = sqrt(discriminant);
        result.first = (b.x - root) / a.x;
        result.second = (b.x + root) / a.x;
    }
    else if (abs(b.x) > tolerance)
    {
        result.first = result.second = 0.5 * first.x / b.x;
    }
    else
    {
        result.first = result.second = -1.0;
    }
    return result;
}

bool rootInRange(float root)
{
    return root > 0.0 && root <= 1.0;
}

float endpointDirection(QuadraticCurve curve, float root, bool vertical)
{
    float parameter = clamp(root, 0.0, 1.0);
    float direction = vertical ? curveXDerivative(curve, parameter)
        : curveYDerivative(curve, parameter);
    float tolerance = directionTolerance(curve, vertical);
    if (abs(direction) <= tolerance && parameter >= 1.0)
    {
        float previous = max(0.0, 1.0 - EndpointParameterStep);
        float currentValue = vertical ? curveX(curve, 1.0) : curveY(curve, 1.0);
        float previousValue = vertical ? curveX(curve, previous) : curveY(curve, previous);
        direction = currentValue - previousValue;
    }
    return direction;
}

float horizontalDistance(QuadraticCurve curve, vec2 point, float root, bool rightRay)
{
    float value = curveX(curve, clamp(root, 0.0, 1.0));
    return rightRay ? value - point.x : point.x - value;
}

float verticalDistance(QuadraticCurve curve, vec2 point, float root, bool downRay)
{
    float value = curveY(curve, clamp(root, 0.0, 1.0));
    return downRay ? value - point.y : point.y - value;
}

bool horizontalRootAt(AxisRoots roots, uint slot, out float root)
{
    if (roots.code == 0u)
    {
        return false;
    }
    if (slot == 0u)
    {
        if ((roots.code & 1u) == 0u)
        {
            return false;
        }
        root = roots.first;
        return true;
    }
    if (roots.code <= 1u)
    {
        return false;
    }
    root = roots.second;
    return true;
}

bool verticalRootAt(AxisRoots roots, uint slot, out float root)
{
    if (roots.code == 0u)
    {
        return false;
    }
    if (slot == 0u)
    {
        if ((roots.code & 1u) == 0u)
        {
            return false;
        }
        root = roots.first;
        return true;
    }
    if (roots.code <= 1u)
    {
        return false;
    }
    root = roots.second;
    return true;
}

bool horizontalRootHit(
    vec2 point,
    QuadraticCurve curve,
    float root,
    bool rightRay,
    vec2 pixelsPerPath,
    out float distancePixels,
    out float direction)
{
    if (!rootInRange(root))
    {
        return false;
    }
    direction = endpointDirection(curve, root, false);
    if (abs(direction) <= directionTolerance(curve, false))
    {
        return false;
    }
    distancePixels = horizontalDistance(curve, point, root, rightRay) * pixelsPerPath.x;
    if (distancePixels < -0.5 || isnan(distancePixels) || isinf(distancePixels))
    {
        return false;
    }
    return true;
}

bool verticalRootHit(
    vec2 point,
    QuadraticCurve curve,
    float root,
    bool downRay,
    vec2 pixelsPerPath,
    out float distancePixels,
    out float direction)
{
    if (!rootInRange(root))
    {
        return false;
    }
    direction = endpointDirection(curve, root, true);
    if (abs(direction) <= directionTolerance(curve, true))
    {
        return false;
    }
    distancePixels = verticalDistance(curve, point, root, downRay) * pixelsPerPath.y;
    if (distancePixels < -0.5 || isnan(distancePixels) || isinf(distancePixels))
    {
        return false;
    }
    return true;
}

void accumulateHorizontalRoot(
    vec2 point,
    QuadraticCurve curve,
    float root,
    bool rightRay,
    vec2 pixelsPerPath,
    inout float value,
    inout float weight)
{
    float distancePixels;
    float direction;
    if (!horizontalRootHit(point, curve, root, rightRay, pixelsPerPath,
        distancePixels, direction))
    {
        return;
    }
    float amount = clamp(distancePixels + 0.5, 0.0, 1.0);
    float rootSign = direction > 0.0 ? 1.0 : -1.0;
    value += rootSign * amount;
    weight = max(weight, clamp(1.0 - abs(distancePixels) * 2.0, 0.0, 1.0));
}

void accumulateVerticalRoot(
    vec2 point,
    QuadraticCurve curve,
    float root,
    bool downRay,
    vec2 pixelsPerPath,
    inout float value,
    inout float weight)
{
    float distancePixels;
    float direction;
    if (!verticalRootHit(point, curve, root, downRay, pixelsPerPath,
        distancePixels, direction))
    {
        return;
    }
    float amount = clamp(distancePixels + 0.5, 0.0, 1.0);
    float rootSign = direction < 0.0 ? 1.0 : -1.0;
    value += rootSign * amount;
    weight = max(weight, clamp(1.0 - abs(distancePixels) * 2.0, 0.0, 1.0));
}

AnalyticBand horizontalBandAt(float y)
{
    uint count = horizontalBandCount();
    uint base = horizontalBandBase();
    if (count == 0u)
    {
        return readBand(base);
    }
    uint low = 0u;
    uint high = count;
    while (low < high)
    {
        uint middle = low + (high - low) / 2u;
        AnalyticBand candidate = readBand(base + middle * BandWordCount);
        if (candidate.maximum >= y)
        {
            high = middle;
        }
        else
        {
            low = middle + 1u;
        }
    }
    uint index = low < count ? low : count - 1u;
    return readBand(base + index * BandWordCount);
}

AnalyticBand verticalBandAt(float x)
{
    uint count = verticalBandCount();
    uint base = verticalBandBase();
    if (count == 0u)
    {
        return readBand(base);
    }
    uint low = 0u;
    uint high = count;
    while (low < high)
    {
        uint middle = low + (high - low) / 2u;
        AnalyticBand candidate = readBand(base + middle * BandWordCount);
        if (candidate.maximum >= x)
        {
            high = middle;
        }
        else
        {
            low = middle + 1u;
        }
    }
    uint index = low < count ? low : count - 1u;
    return readBand(base + index * BandWordCount);
}

bool rootPrecedes(
    float distance,
    uint curveIndex,
    uint slot,
    bool found,
    float bestDistance,
    uint bestCurve,
    uint bestSlot)
{
    if (!found || distance < bestDistance)
    {
        return true;
    }
    if (distance > bestDistance)
    {
        return false;
    }
    if (curveIndex < bestCurve)
    {
        return true;
    }
    if (curveIndex > bestCurve)
    {
        return false;
    }
    return slot < bestSlot;
}

bool rootFollows(
    float distance,
    uint curveIndex,
    uint slot,
    bool hasLast,
    float lastDistance,
    uint lastCurve,
    uint lastSlot)
{
    if (!hasLast || distance > lastDistance)
    {
        return true;
    }
    if (distance < lastDistance)
    {
        return false;
    }
    if (curveIndex > lastCurve)
    {
        return true;
    }
    if (curveIndex < lastCurve)
    {
        return false;
    }
    return slot > lastSlot;
}

void accumulateHorizontalCurve(
    vec2 point,
    QuadraticCurve curve,
    bool rightRay,
    vec2 pixelsPerPath,
    inout float value,
    inout float weight)
{
    AxisRoots roots = solveHorizontalRoots(curve, point);
    for (uint slot = 0u; slot < 2u; ++slot)
    {
        float root;
        if (horizontalRootAt(roots, slot, root))
        {
            accumulateHorizontalRoot(point, curve, root, rightRay,
                pixelsPerPath, value, weight);
        }
    }
}

void accumulateVerticalCurve(
    vec2 point,
    QuadraticCurve curve,
    bool downRay,
    vec2 pixelsPerPath,
    inout float value,
    inout float weight)
{
    AxisRoots roots = solveVerticalRoots(curve, point);
    for (uint slot = 0u; slot < 2u; ++slot)
    {
        float root;
        if (verticalRootAt(roots, slot, root))
        {
            accumulateVerticalRoot(point, curve, root, downRay,
                pixelsPerPath, value, weight);
        }
    }
}

void accumulateHorizontalEvenOddOrdered(
    vec2 point,
    uint indices,
    uint start,
    uint count,
    bool rightRay,
    vec2 pixelsPerPath,
    inout float value,
    inout float weight)
{
    bool hasLast = false;
    float lastDistance = 0.0;
    uint lastCurve = 0u;
    uint lastSlot = 0u;
    uint maximumRoots = count * 2u;
    for (uint iteration = 0u; iteration < maximumRoots; ++iteration)
    {
        bool found = false;
        float bestDistance = 0.0;
        uint bestCurve = 0u;
        uint bestSlot = 0u;
        for (uint index = 0u; index < count; ++index)
        {
            uint curveIndex = pathWord(indices + start + index);
            if (curveIndex >= curveCount())
            {
                continue;
            }
            QuadraticCurve curve = curveAt(curveIndex);
            AxisRoots roots = solveHorizontalRoots(curve, point);
            for (uint slot = 0u; slot < 2u; ++slot)
            {
                float root;
                if (!horizontalRootAt(roots, slot, root))
                {
                    continue;
                }
                float distancePixels;
                float direction;
                if (!horizontalRootHit(point, curve, root, rightRay, pixelsPerPath,
                    distancePixels, direction)
                    || !rootFollows(distancePixels, curveIndex, slot, hasLast,
                        lastDistance, lastCurve, lastSlot))
                {
                    continue;
                }
                if (rootPrecedes(distancePixels, curveIndex, slot, found,
                    bestDistance, bestCurve, bestSlot))
                {
                    found = true;
                    bestDistance = distancePixels;
                    bestCurve = curveIndex;
                    bestSlot = slot;
                }
            }
        }
        if (!found)
        {
            break;
        }
        float amount = clamp(bestDistance + 0.5, 0.0, 1.0);
        float rootSign = (iteration & 1u) == 0u ? 1.0 : -1.0;
        value += rootSign * amount;
        weight = max(weight, clamp(1.0 - abs(bestDistance) * 2.0, 0.0, 1.0));
        hasLast = true;
        lastDistance = bestDistance;
        lastCurve = bestCurve;
        lastSlot = bestSlot;
    }
}

void accumulateVerticalEvenOddOrdered(
    vec2 point,
    uint indices,
    uint start,
    uint count,
    bool downRay,
    vec2 pixelsPerPath,
    inout float value,
    inout float weight)
{
    bool hasLast = false;
    float lastDistance = 0.0;
    uint lastCurve = 0u;
    uint lastSlot = 0u;
    uint maximumRoots = count * 2u;
    for (uint iteration = 0u; iteration < maximumRoots; ++iteration)
    {
        bool found = false;
        float bestDistance = 0.0;
        uint bestCurve = 0u;
        uint bestSlot = 0u;
        for (uint index = 0u; index < count; ++index)
        {
            uint curveIndex = pathWord(indices + start + index);
            if (curveIndex >= curveCount())
            {
                continue;
            }
            QuadraticCurve curve = curveAt(curveIndex);
            AxisRoots roots = solveVerticalRoots(curve, point);
            for (uint slot = 0u; slot < 2u; ++slot)
            {
                float root;
                if (!verticalRootAt(roots, slot, root))
                {
                    continue;
                }
                float distancePixels;
                float direction;
                if (!verticalRootHit(point, curve, root, downRay, pixelsPerPath,
                    distancePixels, direction)
                    || !rootFollows(distancePixels, curveIndex, slot, hasLast,
                        lastDistance, lastCurve, lastSlot))
                {
                    continue;
                }
                if (rootPrecedes(distancePixels, curveIndex, slot, found,
                    bestDistance, bestCurve, bestSlot))
                {
                    found = true;
                    bestDistance = distancePixels;
                    bestCurve = curveIndex;
                    bestSlot = slot;
                }
            }
        }
        if (!found)
        {
            break;
        }
        float amount = clamp(bestDistance + 0.5, 0.0, 1.0);
        float rootSign = (iteration & 1u) == 0u ? 1.0 : -1.0;
        value += rootSign * amount;
        weight = max(weight, clamp(1.0 - abs(bestDistance) * 2.0, 0.0, 1.0));
        hasLast = true;
        lastDistance = bestDistance;
        lastCurve = bestCurve;
        lastSlot = bestSlot;
    }
}

const uint MaxFractionalRoots = 32u;

void accumulateHorizontalEvenOdd(
    vec2 point,
    uint indices,
    AnalyticBand band,
    vec2 pixelsPerPath,
    out vec2 rightCoverage,
    out vec2 leftCoverage)
{
    float rightDistances[32];
    float leftDistances[32];
    uint rightCount = 0u;
    uint leftCount = 0u;
    uint rightParity = 0u;
    uint leftParity = 0u;
    float rightWeight = 0.0;
    float leftWeight = 0.0;
    bool rightOverflow = false;
    bool leftOverflow = false;
    uint start = band.forwardStart;
    uint count = band.forwardCount;
    for (uint index = 0u; index < count; ++index)
    {
        uint curveIndex = pathWord(indices + start + index);
        if (curveIndex >= curveCount())
        {
            continue;
        }
        QuadraticCurve curve = curveAt(curveIndex);
        AxisRoots roots = solveHorizontalRoots(curve, point);
        for (uint slot = 0u; slot < 2u; ++slot)
        {
            float root;
            if (!horizontalRootAt(roots, slot, root))
            {
                continue;
            }
            float distancePixels;
            float direction;
            if (horizontalRootHit(point, curve, root, true, pixelsPerPath,
                distancePixels, direction))
            {
                rightParity ^= 1u;
                rightWeight = max(rightWeight,
                    clamp(1.0 - abs(distancePixels) * 2.0, 0.0, 1.0));
                if (distancePixels < 0.5)
                {
                    if (rightCount == MaxFractionalRoots)
                    {
                        rightOverflow = true;
                    }
                    else
                    {
                        uint insert = rightCount;
                        for (uint existing = 0u; existing < rightCount; ++existing)
                        {
                            if (distancePixels < rightDistances[existing])
                            {
                                insert = existing;
                                break;
                            }
                        }
                        for (uint move = rightCount; move > insert; --move)
                        {
                            rightDistances[move] = rightDistances[move - 1u];
                        }
                        rightDistances[insert] = distancePixels;
                        rightCount++;
                    }
                }
            }
            if (horizontalRootHit(point, curve, root, false, pixelsPerPath,
                distancePixels, direction))
            {
                leftParity ^= 1u;
                leftWeight = max(leftWeight,
                    clamp(1.0 - abs(distancePixels) * 2.0, 0.0, 1.0));
                if (distancePixels < 0.5)
                {
                    if (leftCount == MaxFractionalRoots)
                    {
                        leftOverflow = true;
                    }
                    else
                    {
                        uint insert = leftCount;
                        for (uint existing = 0u; existing < leftCount; ++existing)
                        {
                            if (distancePixels < leftDistances[existing])
                            {
                                insert = existing;
                                break;
                            }
                        }
                        for (uint move = leftCount; move > insert; --move)
                        {
                            leftDistances[move] = leftDistances[move - 1u];
                        }
                        leftDistances[insert] = distancePixels;
                        leftCount++;
                    }
                }
            }
        }
    }

    float rightValue = 0.0;
    if (rightOverflow)
    {
        rightWeight = 0.0;
        accumulateHorizontalEvenOddOrdered(point, indices,
            band.forwardStart, band.forwardCount, true, pixelsPerPath,
            rightValue, rightWeight);
    }
    else
    {
        for (uint index = 0u; index < rightCount; ++index)
        {
            float amount = clamp(rightDistances[index] + 0.5, 0.0, 1.0);
            rightValue += (index & 1u) == 0u ? amount : -amount;
        }
        uint tailParity = rightParity ^ (rightCount & 1u);
        if (tailParity != 0u)
        {
            rightValue += (rightCount & 1u) == 0u ? 1.0 : -1.0;
        }
    }

    float leftValue = 0.0;
    if (leftOverflow)
    {
        leftWeight = 0.0;
        accumulateHorizontalEvenOddOrdered(point, indices,
            band.reverseStart, band.reverseCount, false, pixelsPerPath,
            leftValue, leftWeight);
    }
    else
    {
        for (uint index = 0u; index < leftCount; ++index)
        {
            float amount = clamp(leftDistances[index] + 0.5, 0.0, 1.0);
            leftValue += (index & 1u) == 0u ? amount : -amount;
        }
        uint tailParity = leftParity ^ (leftCount & 1u);
        if (tailParity != 0u)
        {
            leftValue += (leftCount & 1u) == 0u ? 1.0 : -1.0;
        }
    }

    rightCoverage = vec2(rightValue, rightWeight);
    leftCoverage = vec2(leftValue, leftWeight);
}

void accumulateVerticalEvenOdd(
    vec2 point,
    uint indices,
    AnalyticBand band,
    vec2 pixelsPerPath,
    out vec2 downCoverage,
    out vec2 upCoverage)
{
    float downDistances[32];
    float upDistances[32];
    uint downCount = 0u;
    uint upCount = 0u;
    uint downParity = 0u;
    uint upParity = 0u;
    float downWeight = 0.0;
    float upWeight = 0.0;
    bool downOverflow = false;
    bool upOverflow = false;
    uint start = band.forwardStart;
    uint count = band.forwardCount;
    for (uint index = 0u; index < count; ++index)
    {
        uint curveIndex = pathWord(indices + start + index);
        if (curveIndex >= curveCount())
        {
            continue;
        }
        QuadraticCurve curve = curveAt(curveIndex);
        AxisRoots roots = solveVerticalRoots(curve, point);
        for (uint slot = 0u; slot < 2u; ++slot)
        {
            float root;
            if (!verticalRootAt(roots, slot, root))
            {
                continue;
            }
            float distancePixels;
            float direction;
            if (verticalRootHit(point, curve, root, true, pixelsPerPath,
                distancePixels, direction))
            {
                downParity ^= 1u;
                downWeight = max(downWeight,
                    clamp(1.0 - abs(distancePixels) * 2.0, 0.0, 1.0));
                if (distancePixels < 0.5)
                {
                    if (downCount == MaxFractionalRoots)
                    {
                        downOverflow = true;
                    }
                    else
                    {
                        uint insert = downCount;
                        for (uint existing = 0u; existing < downCount; ++existing)
                        {
                            if (distancePixels < downDistances[existing])
                            {
                                insert = existing;
                                break;
                            }
                        }
                        for (uint move = downCount; move > insert; --move)
                        {
                            downDistances[move] = downDistances[move - 1u];
                        }
                        downDistances[insert] = distancePixels;
                        downCount++;
                    }
                }
            }
            if (verticalRootHit(point, curve, root, false, pixelsPerPath,
                distancePixels, direction))
            {
                upParity ^= 1u;
                upWeight = max(upWeight,
                    clamp(1.0 - abs(distancePixels) * 2.0, 0.0, 1.0));
                if (distancePixels < 0.5)
                {
                    if (upCount == MaxFractionalRoots)
                    {
                        upOverflow = true;
                    }
                    else
                    {
                        uint insert = upCount;
                        for (uint existing = 0u; existing < upCount; ++existing)
                        {
                            if (distancePixels < upDistances[existing])
                            {
                                insert = existing;
                                break;
                            }
                        }
                        for (uint move = upCount; move > insert; --move)
                        {
                            upDistances[move] = upDistances[move - 1u];
                        }
                        upDistances[insert] = distancePixels;
                        upCount++;
                    }
                }
            }
        }
    }

    float downValue = 0.0;
    if (downOverflow)
    {
        downWeight = 0.0;
        accumulateVerticalEvenOddOrdered(point, indices,
            band.forwardStart, band.forwardCount, true, pixelsPerPath,
            downValue, downWeight);
    }
    else
    {
        for (uint index = 0u; index < downCount; ++index)
        {
            float amount = clamp(downDistances[index] + 0.5, 0.0, 1.0);
            downValue += (index & 1u) == 0u ? amount : -amount;
        }
        uint tailParity = downParity ^ (downCount & 1u);
        if (tailParity != 0u)
        {
            downValue += (downCount & 1u) == 0u ? 1.0 : -1.0;
        }
    }

    float upValue = 0.0;
    if (upOverflow)
    {
        upWeight = 0.0;
        accumulateVerticalEvenOddOrdered(point, indices,
            band.reverseStart, band.reverseCount, false, pixelsPerPath,
            upValue, upWeight);
    }
    else
    {
        for (uint index = 0u; index < upCount; ++index)
        {
            float amount = clamp(upDistances[index] + 0.5, 0.0, 1.0);
            upValue += (index & 1u) == 0u ? amount : -amount;
        }
        uint tailParity = upParity ^ (upCount & 1u);
        if (tailParity != 0u)
        {
            upValue += (upCount & 1u) == 0u ? 1.0 : -1.0;
        }
    }

    downCoverage = vec2(downValue, downWeight);
    upCoverage = vec2(upValue, upWeight);
}

vec2 horizontalCoverageDirection(
    vec2 point,
    vec2 pixelsPerPath,
    bool rightRay,
    AnalyticBand band)
{
    uint start = rightRay ? band.forwardStart : band.reverseStart;
    uint count = rightRay ? band.forwardCount : band.reverseCount;
    uint indices = horizontalIndexBase();
    float value = 0.0;
    float weight = 0.0;
    for (uint index = 0u; index < count; ++index)
    {
        uint curveIndex = pathWord(indices + start + index);
        if (curveIndex >= curveCount())
        {
            continue;
        }
        QuadraticCurve curve = curveAt(curveIndex);
        accumulateHorizontalCurve(point, curve, rightRay, pixelsPerPath,
            value, weight);
    }
    if (!rightRay)
    {
        value = -value;
    }
    return vec2(value, weight);
}

vec2 verticalCoverageDirection(
    vec2 point,
    vec2 pixelsPerPath,
    bool downRay,
    AnalyticBand band)
{
    uint start = downRay ? band.forwardStart : band.reverseStart;
    uint count = downRay ? band.forwardCount : band.reverseCount;
    uint indices = verticalIndexBase();
    float value = 0.0;
    float weight = 0.0;
    for (uint index = 0u; index < count; ++index)
    {
        uint curveIndex = pathWord(indices + start + index);
        if (curveIndex >= curveCount())
        {
            continue;
        }
        QuadraticCurve curve = curveAt(curveIndex);
        accumulateVerticalCurve(point, curve, downRay, pixelsPerPath,
            value, weight);
    }
    if (!downRay)
    {
        value = -value;
    }
    return vec2(value, weight);
}

vec2 horizontalCoverage(vec2 point, vec2 pixelsPerPath)
{
    AnalyticBand band = horizontalBandAt(point.y);
    bool rightRay = point.x < band.split;
    vec2 primary;
    vec2 opposite;
    if (pc.params.y == 1u)
    {
        vec2 rightCoverage;
        vec2 leftCoverage;
        accumulateHorizontalEvenOdd(point, horizontalIndexBase(), band,
            pixelsPerPath, rightCoverage, leftCoverage);
        vec2 signedRight = rightCoverage;
        vec2 signedLeft = vec2(-leftCoverage.x, leftCoverage.y);
        primary = rightRay ? signedRight : signedLeft;
        opposite = rightRay ? signedLeft : signedRight;
    }
    else
    {
        primary = horizontalCoverageDirection(point, pixelsPerPath,
            rightRay, band);
        opposite = horizontalCoverageDirection(point, pixelsPerPath,
            !rightRay, band);
    }
    if (opposite.y > primary.y
        || (opposite.y == primary.y && abs(opposite.x) > abs(primary.x)))
    {
        return vec2(opposite.x, max(primary.y, opposite.y));
    }
    return vec2(primary.x, max(primary.y, opposite.y));
}

vec2 verticalCoverage(vec2 point, vec2 pixelsPerPath)
{
    AnalyticBand band = verticalBandAt(point.x);
    bool downRay = point.y < band.split;
    vec2 primary;
    vec2 opposite;
    if (pc.params.y == 1u)
    {
        vec2 downCoverage;
        vec2 upCoverage;
        accumulateVerticalEvenOdd(point, verticalIndexBase(), band,
            pixelsPerPath, downCoverage, upCoverage);
        vec2 signedDown = downCoverage;
        vec2 signedUp = vec2(-upCoverage.x, upCoverage.y);
        primary = downRay ? signedDown : signedUp;
        opposite = downRay ? signedUp : signedDown;
    }
    else
    {
        primary = verticalCoverageDirection(point, pixelsPerPath,
            downRay, band);
        opposite = verticalCoverageDirection(point, pixelsPerPath,
            !downRay, band);
    }
    if (opposite.y > primary.y
        || (opposite.y == primary.y && abs(opposite.x) > abs(primary.x)))
    {
        return vec2(opposite.x, max(primary.y, opposite.y));
    }
    return vec2(primary.x, max(primary.y, opposite.y));
}

vec2 pixelsPerPath()
{
    float inverseWidth = max(abs(pc.sampleStep.x), MinimumPixelsPerPath);
    float inverseHeight = max(abs(pc.sampleStep.y), MinimumPixelsPerPath);
    float width = 1.0 / inverseWidth;
    float height = 1.0 / inverseHeight;
    vec2 pathXAxis = vec2(
        pc.transform0.x * width * 0.5,
        pc.transform1.x * height * 0.5);
    vec2 pathYAxis = vec2(
        pc.transform0.y * width * 0.5,
        pc.transform1.y * height * 0.5);
    return max(vec2(length(pathXAxis), length(pathYAxis)),
        vec2(MinimumPixelsPerPath));
}

float combineCoverage(float horizontal, float vertical, float horizontalWeight, float verticalWeight)
{
    float weighted = abs(horizontal * horizontalWeight + vertical * verticalWeight)
        / max(horizontalWeight + verticalWeight, 1.0 / 65536.0);
    return clamp(max(weighted, min(abs(horizontal), abs(vertical))), 0.0, 1.0);
}

float analyticCoverage()
{
    vec2 pixels = pixelsPerPath();
    vec2 horizontal = horizontalCoverage(pathPosition, pixels);
    vec2 vertical = verticalCoverage(pathPosition, pixels);
    return combineCoverage(horizontal.x, vertical.x, horizontal.y, vertical.y);
}

bool validHeader()
{
    uint requiredRule = pc.params.y == 1u ? 2u : 1u;
    return pathWord(0u) == FormatVersion
        && (pathWord(1u) & requiredRule) != 0u
        && horizontalBandCount() != 0u
        && verticalBandCount() != 0u
        && curveCount() != 0u;
}

#ifdef GOO_CLIP_MASK
float clipBorderCoverage()
{
    vec3 screenPoint = vec3(gl_FragCoord.xy, 1.0);
    vec2 borderPoint = vec2(
        dot(pc.borderTransform0.xyz, screenPoint),
        dot(pc.borderTransform1.xyz, screenPoint));
    vec2 borderCenter = pc.borderRect.xy + pc.borderRect.zw * 0.5;
    vec2 q = abs(borderPoint - borderCenter) - pc.borderRect.zw * 0.5;
    float distance = length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0);
    return 1.0 - smoothstep(0.0, max(fwidth(distance), 0.0001), distance);
}

void main()
{
    float alpha = validHeader() ? analyticCoverage() : 0.0;
    outColor = vec4(alpha * clipBorderCoverage(), 0.0, 0.0, 1.0);
}
#else
void main()
{
    float alpha = validHeader() ? analyticCoverage() : 0.0;
    if (pc.params.z == 0u)
    {
        outColor = vec4(0.0, 0.0, 0.0, alpha) * gooClipCoverage();
    }
    else
    {
        outColor = pc.color * alpha * gooClipCoverage();
    }
}
#endif
