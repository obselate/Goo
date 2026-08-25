package Goo.Vulkan.Generated

import System.Runtime.InteropServices

@StructLayout(LayoutKind.Explicit, Size: 112)
unsafe struct ClipMaskPushConstants {
  @FieldOffset(0) var transform0_x float32
  @FieldOffset(4) var transform0_y float32
  @FieldOffset(8) var transform0_z float32
  @FieldOffset(12) var transform0_w float32
  @FieldOffset(16) var transform1_x float32
  @FieldOffset(20) var transform1_y float32
  @FieldOffset(24) var transform1_z float32
  @FieldOffset(28) var transform1_w float32
  @FieldOffset(32) var sampleStep_x float32
  @FieldOffset(36) var sampleStep_y float32
  @FieldOffset(40) var sampleStep_z float32
  @FieldOffset(44) var sampleStep_w float32
  @FieldOffset(48) var borderRect_x float32
  @FieldOffset(52) var borderRect_y float32
  @FieldOffset(56) var borderRect_z float32
  @FieldOffset(60) var borderRect_w float32
  @FieldOffset(64) var borderTransform0_x float32
  @FieldOffset(68) var borderTransform0_y float32
  @FieldOffset(72) var borderTransform0_z float32
  @FieldOffset(76) var borderTransform0_w float32
  @FieldOffset(80) var borderTransform1_x float32
  @FieldOffset(84) var borderTransform1_y float32
  @FieldOffset(88) var borderTransform1_z float32
  @FieldOffset(92) var borderTransform1_w float32
  @FieldOffset(96) var params_x uint32
  @FieldOffset(100) var params_y uint32
  @FieldOffset(104) var params_z uint32
  @FieldOffset(108) var params_w uint32
}
