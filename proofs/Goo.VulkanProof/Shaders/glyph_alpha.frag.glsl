#version 450 core

layout(push_constant) uniform PushConstants
{
    vec4 transform0;
    vec4 transform1;
    vec4 color;
    uint instanceBase;
    uint reserved0;
    uint reserved1;
    uint reserved2;
} pc;

layout(set = 0, binding = 1) uniform sampler2D glyphAtlas;

layout(location = 0) in vec2 uv;
layout(location = 0) out vec4 outColor;

void main()
{
    float coverage = texture(glyphAtlas, uv).r;
    outColor = vec4(pc.color.rgb * coverage, pc.color.a * coverage);
}
