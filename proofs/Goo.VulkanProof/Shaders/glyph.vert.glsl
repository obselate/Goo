#version 450 core

struct GlyphInstance
{
    vec4 rect;
    vec4 uvRect;
};

layout(set = 0, binding = 0, std430) readonly buffer GlyphInstances
{
    GlyphInstance instances[];
} glyphBuffer;

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

layout(location = 0) out vec2 uv;

void main()
{
    const vec2 positions[6] = vec2[6](
        vec2(0.0, 0.0),
        vec2(1.0, 0.0),
        vec2(1.0, 1.0),
        vec2(0.0, 0.0),
        vec2(1.0, 1.0),
        vec2(0.0, 1.0));
    GlyphInstance instance = glyphBuffer.instances[pc.instanceBase + gl_InstanceIndex];
    vec2 position = instance.rect.xy + positions[gl_VertexIndex] * instance.rect.zw;
    vec3 homogeneous = vec3(position, 1.0);
    vec2 transformed = vec2(dot(pc.transform0.xyz, homogeneous), dot(pc.transform1.xyz, homogeneous));
    gl_Position = vec4(transformed, 0.0, 1.0);
    uv = instance.uvRect.xy + positions[gl_VertexIndex] * instance.uvRect.zw;
}
