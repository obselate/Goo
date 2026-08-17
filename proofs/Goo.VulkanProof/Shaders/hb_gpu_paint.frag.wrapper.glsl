layout(push_constant) uniform HbGpuTextPushBlock
{
    mat4 transform;
    vec4 viewport;
    vec4 glyphBounds;
    uvec4 glyphInput;
    vec4 foreground;
} pushConstants;

layout(location = 0) in vec2 v_texcoord;
layout(location = 1) flat in uint v_glyphLoc;
layout(location = 0) out vec4 outColor;

void main()
{
    float coverage;
    outColor = hb_gpu_paint(
        v_texcoord,
        v_glyphLoc,
        pushConstants.foreground,
        coverage);
}
