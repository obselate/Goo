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
    float coverage = hb_gpu_draw(v_texcoord, v_glyphLoc);
    outColor = vec4(
        pushConstants.foreground.rgb * coverage,
        pushConstants.foreground.a * coverage);
}
