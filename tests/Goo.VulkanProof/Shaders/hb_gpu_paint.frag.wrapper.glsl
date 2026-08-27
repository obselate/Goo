layout(location = 0) in vec2 v_texcoord;
layout(location = 1) flat in uint v_glyphLoc;
layout(location = 4) flat in vec4 v_foreground;
layout(location = 0) out vec4 outColor;

#include "clip_chain_text.glsl"

void main()
{
    float coverage;
    outColor = hb_gpu_paint(
        v_texcoord,
        v_glyphLoc,
        v_foreground,
        coverage);
    outColor *= gooClipCoverage();
}
