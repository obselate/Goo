package Goo

import System.Runtime.InteropServices

@StructLayout(LayoutKind.Explicit, Size: 32)
internal unsafe struct SolidQuadPushConstants {
    @FieldOffset(0) var rect_x float32
    @FieldOffset(4) var rect_y float32
    @FieldOffset(8) var rect_z float32
    @FieldOffset(12) var rect_w float32
    @FieldOffset(16) var color_x float32
    @FieldOffset(20) var color_y float32
    @FieldOffset(24) var color_z float32
    @FieldOffset(28) var color_w float32
}
