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
    vec2 local = pc.rect.xy + positions[gl_VertexIndex] * pc.rect.zw;
    vec3 homogeneous = vec3(local, 1.0);
    vec2 position = vec2(dot(pc.transform0.xyz, homogeneous), dot(pc.transform1.xyz, homogeneous));
    gl_Position = vec4(position, 0.0, 1.0);
    uv = positions[gl_VertexIndex];
}
