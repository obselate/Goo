#include "primitive_record.glsl"

layout(set = 0, binding = 0) uniform sampler2D imageTexture;

layout(location = 0) in vec2 uv;
layout(location = 3) flat in uint gooPrimitiveRecordOrdinal;
layout(location = 0) out vec4 outColor;

#include "clip_chain.glsl"

#define pc gooPrimitiveBuffer.records[gooPrimitiveRecordOrdinal]

void main()
{
    vec2 sourceUv = pc.params.xy + uv * pc.params.zw;
    vec4 sampleColor = texture(imageTexture, sourceUv);
    float opacity = clamp(pc.radii.x, 0.0, 1.0);
    float alpha = sampleColor.a * opacity;
    outColor = vec4(sampleColor.rgb * opacity, alpha) * gooClipCoverage();
}
