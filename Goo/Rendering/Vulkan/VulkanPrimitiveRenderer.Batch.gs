package Goo

import System

internal unsafe partial class VulkanPrimitiveRenderer : IDisposable {
  private const PrimitiveClipDrawOrdinalWord int32 = 7
  private const PrimitiveVertexCount uint32 = 4u

  private var pendingPrimitivePipeline VkPipeline
  private var pendingPrimitiveClipSetIndex uint32
  private var pendingPrimitiveFirstRecord uint32
  private var pendingPrimitiveRecordCount uint32
  private var recordDrawCallCount uint64

  private func ResetPrimitiveBatching() {
    pendingPrimitiveRecordCount = 0u
    recordDrawCallCount = 0uL
  }

  private func CanAppendPrimitiveDraw(
    pipeline VkPipeline,
    clipSetIndex uint32) bool{
      if pendingPrimitiveRecordCount == 0u {
        return false
      }
      if pendingPrimitivePipeline != pipeline
        || pendingPrimitiveClipSetIndex != clipSetIndex{
          return false
        }
      return uint64(pendingPrimitiveFirstRecord)
      +uint64(pendingPrimitiveRecordCount) == uint64(primitiveRecordOrdinal)
    }

  private func QueuePrimitiveDraw(
    commandBuffer VkCommandBuffer,
    pipeline VkPipeline,
    layout VkPipelineLayout,
    clipSetIndex uint32) {
      if CanAppendPrimitiveDraw(pipeline, clipSetIndex) {
        if pendingPrimitiveRecordCount == uint32.MaxValue {
          throw OverflowException("Vulkan primitive batch record count overflow")
        }
        pendingPrimitiveRecordCount++
      } else {
        FlushPendingPrimitiveDraw(commandBuffer)
        EnsureDescriptorLayout(layout)
        if activePipeline != pipeline {
          let bindPipeline = dispatch.vkCmdBindPipeline
          bindPipeline(commandBuffer, VkConstants.VK_PIPELINE_BIND_POINT_GRAPHICS, pipeline)
          recordPipelineChangeCount++
          activePipeline = pipeline
        }
        EnsurePrimitiveDescriptor(commandBuffer, layout)
        EnsureClipDescriptorAt(commandBuffer, layout, clipSetIndex)
        pendingPrimitivePipeline = pipeline
        pendingPrimitiveClipSetIndex = clipSetIndex
        pendingPrimitiveFirstRecord = primitiveRecordOrdinal
        pendingPrimitiveRecordCount = 1u
      }
      primitiveRecordOrdinal++
    }

  private func FlushPendingPrimitiveDraw(commandBuffer VkCommandBuffer) {
    if pendingPrimitiveRecordCount == 0u {
      return
    }
    let firstVertex = uint64(pendingPrimitiveFirstRecord) * uint64(PrimitiveVertexCount)
    if firstVertex > uint64(uint32.MaxValue) {
      throw OverflowException("Vulkan primitive batch vertex range overflow")
    }
    let draw = dispatch.vkCmdDraw
    draw(commandBuffer, PrimitiveVertexCount, pendingPrimitiveRecordCount,
      uint32(firstVertex), 0u)
    recordDrawCallCount++
    pendingPrimitiveRecordCount = 0u
  }

  private func RecordImmediateDraw() {
    recordDrawCallCount++
  }
}
