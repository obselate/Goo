package Goo

import System.Runtime.InteropServices

@StructLayout(LayoutKind.Explicit, Size: 128)
internal unsafe struct HbGpuTextPushConstants {
    @FieldOffset(0) var transform_m00 float32
    @FieldOffset(4) var transform_m01 float32
    @FieldOffset(8) var transform_m02 float32
    @FieldOffset(12) var transform_m03 float32
    @FieldOffset(16) var transform_m10 float32
    @FieldOffset(20) var transform_m11 float32
    @FieldOffset(24) var transform_m12 float32
    @FieldOffset(28) var transform_m13 float32
    @FieldOffset(32) var transform_m20 float32
    @FieldOffset(36) var transform_m21 float32
    @FieldOffset(40) var transform_m22 float32
    @FieldOffset(44) var transform_m23 float32
    @FieldOffset(48) var transform_m30 float32
    @FieldOffset(52) var transform_m31 float32
    @FieldOffset(56) var transform_m32 float32
    @FieldOffset(60) var transform_m33 float32
    @FieldOffset(64) var viewport_x float32
    @FieldOffset(68) var viewport_y float32
    @FieldOffset(72) var viewport_z float32
    @FieldOffset(76) var viewport_w float32
    @FieldOffset(80) var glyphBounds_x float32
    @FieldOffset(84) var glyphBounds_y float32
    @FieldOffset(88) var glyphBounds_z float32
    @FieldOffset(92) var glyphBounds_w float32
    @FieldOffset(96) var glyphInput_x uint32
    @FieldOffset(100) var glyphInput_y uint32
    @FieldOffset(104) var glyphInput_z uint32
    @FieldOffset(108) var glyphInput_w uint32
    @FieldOffset(112) var foreground_x float32
    @FieldOffset(116) var foreground_y float32
    @FieldOffset(120) var foreground_z float32
    @FieldOffset(124) var foreground_w float32
}
