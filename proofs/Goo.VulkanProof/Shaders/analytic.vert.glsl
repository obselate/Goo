#include "primitive_record.glsl"

#define pc gooPrimitiveBuffer.records[uint(gl_VertexIndex) >> 2u]

layout(location = 0) out vec2 uv;
layout(location = 2) flat out uint gooClipDrawOrdinal;
layout(location = 3) flat out uint gooPrimitiveRecordOrdinal;

void main()
{
    const vec2 positions[4] = vec2[4](
        vec2(0.0, 0.0),
        vec2(1.0, 0.0),
        vec2(0.0, 1.0),
        vec2(1.0, 1.0));
    uint quadVertex = gl_VertexIndex & 3u;
    vec2 local = pc.rect.xy + positions[quadVertex] * pc.rect.zw;
    vec3 homogeneous = vec3(local, 1.0);
    vec2 position = vec2(dot(pc.transform0.xyz, homogeneous), dot(pc.transform1.xyz, homogeneous));
    gl_Position = vec4(position, 0.0, 1.0);
    uv = positions[quadVertex];
    gooClipDrawOrdinal = uint(gl_InstanceIndex);
    gooPrimitiveRecordOrdinal = uint(gl_VertexIndex) >> 2u;
}
