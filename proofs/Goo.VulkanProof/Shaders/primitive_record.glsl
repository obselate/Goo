struct GooPrimitiveRecord
{
    vec4 rect;
    vec4 transform0;
    vec4 transform1;
    vec4 radii;
    vec4 params;
    vec4 stopPositions;
    uvec4 packedColors;
    uvec4 packedColorsExtra;
};

layout(set = 2, binding = 0, std430) readonly buffer GooPrimitiveBuffer
{
    GooPrimitiveRecord records[];
} gooPrimitiveBuffer;
