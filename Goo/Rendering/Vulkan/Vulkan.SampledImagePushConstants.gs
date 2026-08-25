package Goo

import System.Runtime.InteropServices

@StructLayout(LayoutKind.Explicit, Size: 128)
internal unsafe struct SampledImagePushConstants {
  @FieldOffset(0) var rect_x float32
  @FieldOffset(4) var rect_y float32
  @FieldOffset(8) var rect_z float32
  @FieldOffset(12) var rect_w float32
  @FieldOffset(16) var transform0_x float32
  @FieldOffset(20) var transform0_y float32
  @FieldOffset(24) var transform0_z float32
  @FieldOffset(28) var transform0_w float32
  @FieldOffset(32) var transform1_x float32
  @FieldOffset(36) var transform1_y float32
  @FieldOffset(40) var transform1_z float32
  @FieldOffset(44) var transform1_w float32
  @FieldOffset(48) var radii_x float32
  @FieldOffset(52) var radii_y float32
  @FieldOffset(56) var radii_z float32
  @FieldOffset(60) var radii_w float32
  @FieldOffset(64) var params_x float32
  @FieldOffset(68) var params_y float32
  @FieldOffset(72) var params_z float32
  @FieldOffset(76) var params_w float32
  @FieldOffset(80) var stopPositions_x float32
  @FieldOffset(84) var stopPositions_y float32
  @FieldOffset(88) var stopPositions_z float32
  @FieldOffset(92) var stopPositions_w float32
  @FieldOffset(96) var packedColors_x uint32
  @FieldOffset(100) var packedColors_y uint32
  @FieldOffset(104) var packedColors_z uint32
  @FieldOffset(108) var packedColors_w uint32
  @FieldOffset(112) var packedColorsExtra_x uint32
  @FieldOffset(116) var packedColorsExtra_y uint32
  @FieldOffset(120) var packedColorsExtra_z uint32
  @FieldOffset(124) var packedColorsExtra_w uint32
}
