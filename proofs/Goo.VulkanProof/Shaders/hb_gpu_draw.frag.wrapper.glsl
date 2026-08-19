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
    vec2 pixelsPerEm = 1.0 / fwidth(v_texcoord);
    float coverage = _hb_gpu_slug(v_texcoord, pixelsPerEm, v_glyphLoc);
    if (pushConstants.glyphInput.y == 2u && pushConstants.viewport.z > 0.0)
    {
        const vec2 directions[8] = vec2[8](
            vec2(1.0, 0.0),
            vec2(-1.0, 0.0),
            vec2(0.0, 1.0),
            vec2(0.0, -1.0),
            vec2(0.70710678, 0.70710678),
            vec2(-0.70710678, 0.70710678),
            vec2(0.70710678, -0.70710678),
            vec2(-0.70710678, -0.70710678));
        for (int index = 0; index < 8; index++)
        {
            coverage = max(coverage, _hb_gpu_slug(
                v_texcoord + directions[index] * pushConstants.viewport.z,
                pixelsPerEm,
                v_glyphLoc));
        }
    }
    outColor = vec4(
        pushConstants.foreground.rgb * coverage,
        pushConstants.foreground.a * coverage);
}
