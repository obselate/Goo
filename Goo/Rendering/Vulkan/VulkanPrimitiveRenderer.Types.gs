package Goo

import System
import System.IO
import System.Runtime.InteropServices
import System.Numerics

@StructLayout(LayoutKind.Explicit, Size: 128)
internal unsafe struct VulkanPrimitiveGpuRecord {
  @FieldOffset(0) var Solid AnalyticSolidPushConstants
  @FieldOffset(0) var Border AnalyticBorderPushConstants
  @FieldOffset(0) var Linear AnalyticLinear4PushConstants
  @FieldOffset(0) var Radial AnalyticRadial4PushConstants
  @FieldOffset(0) var Image SampledImagePushConstants
  @FieldOffset(0) var Lava AnalyticSolidPushConstants
}

@StructLayout(LayoutKind.Explicit, Size: 128)
internal struct VulkanShaderEffectPushConstants {
  @FieldOffset(0) var Parameter0 Vector4
  @FieldOffset(16) var Parameter1 Vector4
  @FieldOffset(32) var Parameter2 Vector4
  @FieldOffset(48) var Parameter3 Vector4
  @FieldOffset(64) var Parameter4 Vector4
  @FieldOffset(80) var Parameter5 Vector4
  @FieldOffset(96) var Parameter6 Vector4
  @FieldOffset(112) var Parameter7 Vector4
}

internal unsafe struct PrimitiveTransform {
  var A float32
  var B float32
  var C float32
  var D float32
  var TX float32
  var TY float32
}

internal struct PrimitiveClip {
  var Left int32
  var Top int32
  var Right int32
  var Bottom int32
}

internal struct VulkanLayerRenderState {
  var Record LayerRecord
  var Target VulkanOffscreenLayerTarget?
  var BackdropTarget VulkanOffscreenLayerTarget?
  var ParentTarget VulkanOffscreenLayerTarget?
  var ParentOriginX float32
  var ParentOriginY float32
  var ParentExtent VkExtent2D
  var ParentClipDepth int32
  var ClipSnapshotOffset int32
  var TimestampHandle int32
}

internal struct PackedPrimitiveColor {
  var Rgb uint32
  var Alpha uint32
}
