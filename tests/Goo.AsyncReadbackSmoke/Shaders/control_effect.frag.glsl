#version 450 core
#extension GL_GOOGLE_include_directive : require

#include "goo_effect.glsl"

vec4 gooEffect(vec2 uv, vec4 source, vec4 backdrop)
{
    vec4 control = gooParameters.values[0];
    float dataScale = gooDataByteLength(0u) >= 4u
        ? uintBitsToFloat(gooDataWord(0u, 0u))
        : 1.0;
    GooPrimitiveRecord primitive = gooPrimitiveBuffer.records[gooPrimitiveRecordOrdinal];
    vec2 sourceUv = primitive.params.xy + uv * primitive.params.zw;
    vec2 texel = 1.0 / vec2(textureSize(gooBackdropTexture, 0));
    vec2 offsetUv = gooParameters.values[1].xy * texel;
    vec3 tinted = source.rgb * control.rgb * dataScale;
    vec3 refracted = texture(gooBackdropTexture, sourceUv + offsetUv).rgb * source.a;
    return vec4(mix(tinted, refracted, clamp(control.w, 0.0, 1.0)), source.a);
}
