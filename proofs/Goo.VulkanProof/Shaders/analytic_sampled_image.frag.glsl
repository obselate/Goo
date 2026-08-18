#version 450 core

layout(push_constant) uniform PushConstants {
    vec4 rect;
    vec4 transform0;
    vec4 transform1;
    vec4 radii;
    vec4 params;
    vec4 stopPositions;
    uvec4 packedColors;
    uvec4 packedColorsExtra;
} pc;

layout(set = 0, binding = 0) uniform sampler2D imageTexture;

layout(location = 0) in vec2 uv;
layout(location = 0) out vec4 outColor;

void main()
{
    vec2 sourceUv = pc.params.xy + uv * pc.params.zw;
    vec4 sampleColor = texture(imageTexture, sourceUv);
    float opacity = clamp(pc.radii.x, 0.0, 1.0);
    float alpha = sampleColor.a * opacity;
    outColor = vec4(sampleColor.rgb * alpha, alpha);
}
