#include "goo_effect.slang"

float4 gooEffect(float2 uv, float4 source, float4 backdrop)
{
    float blend = clamp(gooParameter(0).x, 0.0, 1.0);
    return lerp(source, backdrop, blend) * float4(uv, 1.0, 1.0);
}
