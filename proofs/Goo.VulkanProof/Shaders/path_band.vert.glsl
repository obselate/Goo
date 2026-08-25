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

layout(location = 0) out vec2 pathPosition;
#ifndef GOO_CLIP_MASK
layout(location = 2) flat out uint gooClipDrawOrdinal;
#endif

uint pathWord(uint relativeWord)
{
    return pathBandBuffer.words[pc.params.x + relativeWord];
}

void main()
{
    const vec2 positions[6] = vec2[6](
        vec2(0.0, 0.0),
        vec2(1.0, 0.0),
        vec2(1.0, 1.0),
        vec2(0.0, 0.0),
        vec2(1.0, 1.0),
        vec2(0.0, 1.0));
    vec2 minimum = vec2(
        uintBitsToFloat(pathWord(8u)),
        uintBitsToFloat(pathWord(9u)));
    vec2 maximum = vec2(
        uintBitsToFloat(pathWord(10u)),
        uintBitsToFloat(pathWord(11u)));
    vec2 inflation = abs(pc.sampleStep.zw);
    minimum -= inflation;
    maximum += inflation;
    vec2 path = mix(minimum, maximum, positions[gl_VertexIndex]);
    vec3 homogeneous = vec3(path, 1.0);
    vec2 clip = vec2(
        dot(pc.transform0.xyz, homogeneous),
        dot(pc.transform1.xyz, homogeneous));
    gl_Position = vec4(clip, 0.0, 1.0);
    pathPosition = path;
#ifndef GOO_CLIP_MASK
    gooClipDrawOrdinal = gl_InstanceIndex;
#endif
}
