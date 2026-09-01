layout(set = 1, binding = 0) uniform sampler2DArray gooClipMaskAtlas;

layout(set = 1, binding = 1, std430) readonly buffer GooClipChainBuffer
{
    uint words[];
} gooClipChainBuffer;

layout(location = 2) flat in uint v_clipChainId;
layout(location = 3) flat in vec4 v_effectAndOrigin;

const uint GooClipMaxDepth = 8u;
const uint GooClipChainWords = 12u;
const uint GooClipMaskRecordWords = 12u;

vec2 gooClipScreenPosition()
{
    uint maskRecordCount = gooClipChainBuffer.words[2u];
    if (maskRecordCount == 0u)
    {
        return gl_FragCoord.xy;
    }
    return gl_FragCoord.xy + v_effectAndOrigin.zw;
}

float gooClipCoverage()
{
    uint maskRecordCount = gooClipChainBuffer.words[2u];
    if (maskRecordCount == 0u)
    {
        return 1.0;
    }
    if (v_clipChainId == 0u)
    {
        return 1.0;
    }
    uint chainTableBase = gooClipChainBuffer.words[3u];
    if (chainTableBase == 0u)
    {
        return 0.0;
    }
    uint chainCount = gooClipChainBuffer.words[chainTableBase];
    if (v_clipChainId >= chainCount)
    {
        return 0.0;
    }
    uint chainBase = chainTableBase + 1u + v_clipChainId * GooClipChainWords;
    uint depth = min(gooClipChainBuffer.words[chainBase], GooClipMaxDepth);
    if (gooClipChainBuffer.words[chainBase + 9u] == 2u)
    {
        return 0.0;
    }
    float coverage = 1.0;
    vec2 screen = gooClipScreenPosition();
    uint maskRecordBase = gooClipChainBuffer.words[1u];
    for (uint index = 0u; index < GooClipMaxDepth; index++)
    {
        if (index >= depth)
        {
            break;
        }
        uint maskIndex = gooClipChainBuffer.words[chainBase + 1u + index];
        if (maskIndex >= maskRecordCount)
        {
            return 0.0;
        }
        uint entryBase = maskRecordBase + maskIndex * GooClipMaskRecordWords;
        vec4 screenBounds = vec4(
            uintBitsToFloat(gooClipChainBuffer.words[entryBase + 0u]),
            uintBitsToFloat(gooClipChainBuffer.words[entryBase + 1u]),
            uintBitsToFloat(gooClipChainBuffer.words[entryBase + 2u]),
            uintBitsToFloat(gooClipChainBuffer.words[entryBase + 3u]));
        if (screen.x < screenBounds.x || screen.y < screenBounds.y
            || screen.x >= screenBounds.z || screen.y >= screenBounds.w)
        {
            return 0.0;
        }
        vec4 uvTransform = vec4(
            uintBitsToFloat(gooClipChainBuffer.words[entryBase + 4u]),
            uintBitsToFloat(gooClipChainBuffer.words[entryBase + 5u]),
            uintBitsToFloat(gooClipChainBuffer.words[entryBase + 6u]),
            uintBitsToFloat(gooClipChainBuffer.words[entryBase + 7u]));
        uint layer = gooClipChainBuffer.words[entryBase + 8u];
        uint mode = gooClipChainBuffer.words[entryBase + 9u];
        if (mode == 2u)
        {
            return 0.0;
        }
        vec2 atlasUv = screen * uvTransform.xy + uvTransform.zw;
        coverage *= clamp(texture(gooClipMaskAtlas, vec3(atlasUv, float(layer))).r, 0.0, 1.0);
    }
    return coverage;
}
