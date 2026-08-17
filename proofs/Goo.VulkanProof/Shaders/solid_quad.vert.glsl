#version 450 core

layout(push_constant) uniform PushConstants {
    vec4 rect;
    vec4 color;
} pc;

layout(location = 0) out vec4 color;

void main()
{
    const vec2 positions[6] = vec2[6](
        vec2(0.0, 0.0),
        vec2(1.0, 0.0),
        vec2(1.0, 1.0),
        vec2(0.0, 0.0),
        vec2(1.0, 1.0),
        vec2(0.0, 1.0));
    vec2 position = pc.rect.xy + positions[gl_VertexIndex] * pc.rect.zw;
    gl_Position = vec4(position, 0.0, 1.0);
    color = pc.color;
}
