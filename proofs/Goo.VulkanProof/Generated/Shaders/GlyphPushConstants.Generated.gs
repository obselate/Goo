package Goo.Vulkan.Generated

import System.Runtime.InteropServices

@StructLayout(LayoutKind.Explicit, Size: 64)
unsafe struct GlyphPushConstants {
    @FieldOffset(0) var transform0_x float32
    @FieldOffset(4) var transform0_y float32
    @FieldOffset(8) var transform0_z float32
    @FieldOffset(12) var transform0_w float32
    @FieldOffset(16) var transform1_x float32
    @FieldOffset(20) var transform1_y float32
    @FieldOffset(24) var transform1_z float32
    @FieldOffset(28) var transform1_w float32
    @FieldOffset(32) var color_x float32
    @FieldOffset(36) var color_y float32
    @FieldOffset(40) var color_z float32
    @FieldOffset(44) var color_w float32
    @FieldOffset(48) var instanceBase uint32
    @FieldOffset(52) var reserved0 uint32
    @FieldOffset(56) var reserved1 uint32
    @FieldOffset(60) var reserved2 uint32
}
