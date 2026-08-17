layout(push_constant) uniform HbGpuTextPushBlock
{
    mat4 transform;
    vec4 viewport;
    vec4 glyphBounds;
    uvec4 glyphInput;
    vec4 foreground;
} pushConstants;

layout(location = 0) out vec2 v_texcoord;
layout(location = 1) flat out uint v_glyphLoc;

void main()
{
    const vec2 corners[6] = vec2[6](
        vec2(0.0, 0.0),
        vec2(1.0, 0.0),
        vec2(1.0, 1.0),
        vec2(0.0, 0.0),
        vec2(1.0, 1.0),
        vec2(0.0, 1.0));
    const vec2 normals[6] = vec2[6](
        vec2(-1.0, -1.0),
        vec2(1.0, -1.0),
        vec2(1.0, 1.0),
        vec2(-1.0, -1.0),
        vec2(1.0, 1.0),
        vec2(-1.0, 1.0));

    vec2 position = mix(
        pushConstants.glyphBounds.xy,
        pushConstants.glyphBounds.zw,
        corners[gl_VertexIndex]);
    vec2 texcoord = position;
    vec4 jac = vec4(1.0, 0.0, 0.0, 1.0);
    hb_gpu_dilate(
        position,
        texcoord,
        normals[gl_VertexIndex],
        jac,
        pushConstants.transform,
        pushConstants.viewport.xy);

    gl_Position = pushConstants.transform * vec4(position, 0.0, 1.0);
    v_texcoord = texcoord;
    v_glyphLoc = pushConstants.glyphInput.x;
}
