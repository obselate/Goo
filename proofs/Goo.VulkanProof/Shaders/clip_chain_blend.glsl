layout(set = 3, binding = 0) uniform sampler2DArray gooClipMaskAtlas;

layout(set = 3, binding = 1, std430) readonly buffer GooClipChainBuffer
{
    uint words[];
} gooClipChainBuffer;

const uint GooClipMaxDepth = 8u;
const uint GooClipHeaderWords = 4u;
const uint GooClipDrawRefWords = 12u;
const uint GooClipMaskRecordWords = 12u;

float gooClipCoverage()
{
    uint drawCount = gooClipChainBuffer.words[0u];
    uint maskRecordBase = gooClipChainBuffer.words[1u];
    uint maskRecordCount = gooClipChainBuffer.words[2u];
    if (gooClipDrawOrdinal >= drawCount)
    {
        return 0.0;
    }
    uint drawBase = GooClipHeaderWords + gooClipDrawOrdinal * GooClipDrawRefWords;
    uint depth = min(gooClipChainBuffer.words[drawBase], GooClipMaxDepth);
    uint forceZero = gooClipChainBuffer.words[drawBase + 9u];
    if (forceZero == 2u)
    {
        return 0.0;
    }
    float coverage = 1.0;
    for (uint index = 0u; index < GooClipMaxDepth; index++)
    {
        if (index >= depth)
        {
            break;
        }
        uint maskIndex = gooClipChainBuffer.words[drawBase + 1u + index];
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
        vec2 screen = gl_FragCoord.xy + vec2(
            uintBitsToFloat(gooClipChainBuffer.words[drawBase + 10u]),
            uintBitsToFloat(gooClipChainBuffer.words[drawBase + 11u]));
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
