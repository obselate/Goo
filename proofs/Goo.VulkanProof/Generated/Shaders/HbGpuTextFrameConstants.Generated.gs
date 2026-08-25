package Goo.Vulkan.Generated

import System.Runtime.InteropServices

@StructLayout(LayoutKind.Explicit, Size: 32)
unsafe struct HbGpuTextFrameConstants {
  @FieldOffset(0) var viewport_x float32
  @FieldOffset(4) var viewport_y float32
  @FieldOffset(8) var viewport_z float32
  @FieldOffset(12) var viewport_w float32
  @FieldOffset(16) var origin_x float32
  @FieldOffset(20) var origin_y float32
  @FieldOffset(24) var origin_z float32
  @FieldOffset(28) var origin_w float32
}
