#include "slang_compat.slang"
struct SolidQuadFragmentInput
{
    [[vk::location(0)]] float4 color;
};
struct SolidQuadFragmentOutput
{
    [[vk::location(0)]] float4 color : SV_Target0;
};
[shader("fragment")]
SolidQuadFragmentOutput main(SolidQuadFragmentInput input)
{
    SolidQuadFragmentOutput output;
    output.color = input.color;
    return output;
}
