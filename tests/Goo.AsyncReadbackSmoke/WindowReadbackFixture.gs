package Goo

import System
import System.Diagnostics
import System.Threading

import Hexa.NET.SDL3
internal data struct VulkanPresentationLatencyTestSample {
  internal var Token uint64
  internal var Kind int32
  internal var StartTimestamp int64
  internal var HandoffTimestamp int64
  internal var CompletionObservedTimestamp int64
  internal var PresentId uint64
  internal var PresentFenceObserved bool
}

internal data struct VulkanSceneRetentionTestSnapshot {
  internal var SceneVersion uint64
  internal var ActiveImageIndex uint32
  internal var ActiveSceneVersion uint64
  internal var ActiveAppliedSceneVersion uint64
  internal var ActivePendingSceneVersion uint64
  internal var AcquiredImageState bool
  internal var AppliedImageCount uint32
  internal var PromotedImageCount uint32
  internal var PendingImageCount uint32
  internal var PendingSceneVersion uint64
  internal var DamageX int32
  internal var DamageY int32
  internal var DamageWidth int32
  internal var DamageHeight int32
  internal var PartialRedraw bool
  internal var FullRedraw bool
  internal var DirtyChunkCount uint32
  internal var ReusedChunkCount uint32
  internal var SkippedNodeCount int32
  internal var ExactTextClipCandidateCount int32
  internal var ExactTextClipCullCount int32
  internal var CachedTextPaintCullCount int32
  internal var TextLayoutRequestCount int32
  internal var DrawCount int32
  internal var ResourceCount int32
  internal var TextSegmentCount int32
  internal var RetainedLeafHitCount uint64
  internal var RetainedLeafRebuildCount uint64
  internal var RetainedLeafFallbackCount uint64
  internal var RetainedLeafInvalidationCount uint64
  internal var RetainedLeafTotalCount uint64
  internal var RetainedTextHitCount uint64
  internal var RetainedTextRebuildCount uint64
  internal var RetainedTextFallbackCount uint64
  internal var RetainedTextInvalidationCount uint64
  internal var RetainedTextTotalCount uint64
  internal var RetainedBorderHitCount uint64
  internal var RetainedBorderRebuildCount uint64
  internal var RetainedBorderFallbackCount uint64
  internal var RetainedBorderInvalidationCount uint64
  internal var RetainedBorderTotalCount uint64
  internal var RetainedParentBoxHitCount uint64
  internal var RetainedParentBoxRebuildCount uint64
  internal var RetainedParentBoxFallbackCount uint64
  internal var RetainedParentBoxInvalidationCount uint64
  internal var RetainedParentBoxTotalCount uint64
  internal var RoundedLeafCount uint32
  internal var RoundedLeafBoundsX float32
  internal var RoundedLeafBoundsY float32
  internal var RoundedLeafBoundsWidth float32
  internal var RoundedLeafBoundsHeight float32
  internal var RoundedLeafRadiusTopLeft float32
  internal var RoundedLeafRadiusTopRight float32
  internal var RoundedLeafRadiusBottomRight float32
  internal var RoundedLeafRadiusBottomLeft float32
  internal var RoundedLeafColor uint32
  internal var RoundedLeafOpacity float32
  internal var MutatedSolidLeafFound bool
  internal var MutatedSolidLeafBoundsX float32
  internal var MutatedSolidLeafBoundsY float32
  internal var MutatedSolidLeafBoundsWidth float32
  internal var MutatedSolidLeafBoundsHeight float32
  internal var MutatedSolidLeafColor uint32
  internal var MutatedSolidLeafOpacity float32
  internal var BorderLeafFound bool
  internal var BorderLeafCount uint32
  internal var BorderLeafBoundsX float32
  internal var BorderLeafBoundsY float32
  internal var BorderLeafBoundsWidth float32
  internal var BorderLeafBoundsHeight float32
  internal var BorderLeafTopWidth float32
  internal var BorderLeafRightWidth float32
  internal var BorderLeafBottomWidth float32
  internal var BorderLeafLeftWidth float32
  internal var BorderLeafRadiusTopLeft float32
  internal var BorderLeafRadiusTopRight float32
  internal var BorderLeafRadiusBottomRight float32
  internal var BorderLeafRadiusBottomLeft float32
  internal var BorderLeafTopColor uint32
  internal var BorderLeafRightColor uint32
  internal var BorderLeafBottomColor uint32
  internal var BorderLeafLeftColor uint32
  internal var BorderLeafStyle uint32
  internal var BorderLeafTransformIndex int32
}

internal data struct VulkanClipMaskRetentionTestSnapshot {
  internal var SlotIndex int32
  internal var DrawCount int32
  internal var MaskCount int32
  internal var ClipChainCount int32
  internal var LayerCount int32
  internal var ByteCount VkDeviceSize
  internal var WrittenBytes VkDeviceSize
  internal var SkippedBytes VkDeviceSize
  internal var MappedWrites uint64
  internal var Flushes uint64
  internal var RetainedReuse uint64
  internal var RetentionEligible bool
  internal var Retained bool
  internal var RetentionValid bool
  internal var TotalWrittenBytes VkDeviceSize
  internal var TotalSkippedBytes VkDeviceSize
  internal var TotalMappedWrites uint64
  internal var TotalFlushes uint64
  internal var TotalRetainedReuse uint64
}

internal data struct VulkanPrimitiveFrameRetentionTestSnapshot {
  internal var SlotIndex int32
  internal var RecordCount int32
  internal var ByteCount VkDeviceSize
  internal var Capacity VkDeviceSize
  internal var BufferGeneration uint64
  internal var WrittenBytes VkDeviceSize
  internal var SkippedBytes VkDeviceSize
  internal var DirtyRecordCount int32
  internal var UploadRangeCount int32
  internal var FullUpload bool
  internal var MappedWrites uint64
  internal var Flushes uint64
  internal var RetainedReuse uint64
  internal var LastUseSerial uint64
  internal var Prepared bool
  internal var TotalWrittenBytes VkDeviceSize
  internal var TotalSkippedBytes VkDeviceSize
  internal var TotalDirtyRecordCount uint64
  internal var TotalUploadRangeCount uint64
  internal var TotalFullUploads uint64
  internal var TotalMappedWrites uint64
  internal var TotalFlushes uint64
  internal var TotalRetainedReuse uint64
}
internal data struct VulkanTextFrameRetentionTestSnapshot {
  internal var SlotIndex int32
  internal var SegmentCount int32
  internal var RunCount int32
  internal var RecordCount int32
  internal var ByteCount VkDeviceSize
  internal var Capacity VkDeviceSize
  internal var BufferGeneration uint64
  internal var TopologyKey uint64
  internal var WrittenBytes VkDeviceSize
  internal var SkippedBytes VkDeviceSize
  internal var DirtySegmentCount int32
  internal var UploadRangeCount int32
  internal var FullUpload bool
  internal var MappedWrites uint64
  internal var Flushes uint64
  internal var RetainedReuse uint64
  internal var LastUseSerial uint64
  internal var Prepared bool
  internal var TotalSegmentCount uint64
  internal var TotalRunCount uint64
  internal var TotalRecordCount uint64
  internal var TotalWrittenBytes VkDeviceSize
  internal var TotalSkippedBytes VkDeviceSize
  internal var TotalDirtySegmentCount uint64
  internal var TotalUploadRangeCount uint64
  internal var TotalFullUploads uint64
  internal var TotalMappedWrites uint64
  internal var TotalFlushes uint64
  internal var TotalRetainedReuse uint64
  internal var TotalCapacity VkDeviceSize
  internal var TotalBufferGeneration uint64
  internal var TotalLastUseSerial uint64
  internal var TotalPrepared uint64
}

internal data struct VulkanFrameSubmissionTestSnapshot {
  internal var Slot0Serial uint64
  internal var Slot1Serial uint64
}
internal data struct VulkanWindowFramebufferExtentTestSnapshot {
  internal var Width int32
  internal var Height int32
}

internal partial class VulkanWindowTarget {
  internal func DiagnosticCountersSnapshotForTest() VulkanDiagnosticCounterSnapshot {
    if let current = diagnostics {
      return current.Counters
    }
    return VulkanDiagnosticCounterSnapshot{}
  }
  internal func TimestampSupportedForTest() bool {
    if let current = timestampState {
      return current.TimestampQueriesSupported
    }
    return false
  }

  internal func SetMainPassTimestampSinkForTest(
    sink Action[VulkanDiagnosticTimestampSnapshot]?) {
      timestampState?.SetMainPassTimestampSink(sink)
    }
  internal func SetAllTimestampSinkForTest(
    sink Action[VulkanDiagnosticTimestampSnapshot]?) {
      timestampState?.SetAllTimestampSink(sink)
    }

  internal func DiagnosticFrameIdForTest() uint64 -> nextFrameId
  internal func FramebufferExtentForTest()
  VulkanWindowFramebufferExtentTestSnapshot{
    if let current = generation {
      return VulkanWindowFramebufferExtentTestSnapshot{
        Width: int32(current.Extent.width),
        Height: int32(current.Extent.height),
      }
    }
    return VulkanWindowFramebufferExtentTestSnapshot{
      Width: framebufferWidth,
      Height: framebufferHeight,
    }
  }

  internal func SceneRetentionSnapshotForTest() VulkanSceneRetentionTestSnapshot {
    let sceneVersion = activeSceneVersion
    var appliedImageCount uint32 = 0u
    var promotedImageCount uint32 = 0u
    var pendingImageCount uint32 = 0u
    var pendingSceneVersion uint64 = 0uL
    var activeImageIndexForSnapshot uint32 = 0u
    var activeAppliedSceneVersionForSnapshot uint64 = 0uL
    var activePendingSceneVersion uint64 = 0uL
    let acquiredImageState = lastPresentedImageStateValid
    if acquiredImageState {
      activeImageIndexForSnapshot = lastPresentedImageIndex
      activeAppliedSceneVersionForSnapshot = lastPresentedAppliedSceneVersion
      activePendingSceneVersion = lastPresentedPendingSceneVersion
      pendingSceneVersion = lastPresentedPendingSceneVersion
      pendingImageCount = 1u
      if lastPresentedAppliedSceneVersion != 0uL {
        appliedImageCount = 1u
      }
      if lastPresentedImagePromoted {
        promotedImageCount = 1u
      }
    }
    var dirtyChunkCount uint32 = 0u
    var reusedChunkCount uint32 = 0u
    let frame = sceneCompiler.Frame
    var chunkIndex int32 = 0
    while chunkIndex < frame.ChunkCount {
      if frame.Chunks[chunkIndex].Dirty {
        dirtyChunkCount = dirtyChunkCount + 1u
      } else {
        reusedChunkCount = reusedChunkCount + 1u
      }
      chunkIndex = chunkIndex + 1
    }
    var roundedLeafCount uint32 = 0u
    var roundedLeafBounds ConservativeBounds{}
    var roundedLeafRadiusTopLeft float32 = 0.0F
    var roundedLeafRadiusTopRight float32 = 0.0F
    var roundedLeafRadiusBottomRight float32 = 0.0F
    var roundedLeafRadiusBottomLeft float32 = 0.0F
    var roundedLeafColor uint32 = 0u
    var roundedLeafOpacity float32 = 0.0F
    let logicalWidth = host.LogicalWidth > 0 ? host.LogicalWidth : framebufferWidth
    let logicalHeight = host.LogicalHeight > 0 ? host.LogicalHeight : framebufferHeight
    let payloadScaleX = logicalWidth > 0
    ? float32(framebufferWidth) / float32(logicalWidth) : 1.0F
    let payloadScaleY = logicalHeight > 0
    ? float32(framebufferHeight) / float32(logicalHeight) : 1.0F
    var mutatedSolidLeafFound bool = false
    var mutatedSolidLeafBounds ConservativeBounds{}
    var mutatedSolidLeafColor uint32 = 0u
    var mutatedSolidLeafOpacity float32 = 0.0F
    var borderLeafFound bool = false
    var borderLeafCount uint32 = 0u
    var borderLeaf PerEdgeBorderRecord{}
    var drawIndex int32 = 0
    while drawIndex < frame.DrawRefCount {
      let draw = frame.DrawRefs[drawIndex]
      if draw.Kind == SceneDrawKind.RoundedBox
        && draw.Index >= 0 && draw.Index < frame.RoundedBoxCount{
          let record = frame.RoundedBoxes[draw.Index]
          roundedLeafCount = roundedLeafCount + 1u
          if roundedLeafCount == 1u {
            roundedLeafBounds = record.Bounds
            roundedLeafRadiusTopLeft = record.RadiusTopLeft
            roundedLeafRadiusTopRight = record.RadiusTopRight
            roundedLeafRadiusBottomRight = record.RadiusBottomRight
            roundedLeafRadiusBottomLeft = record.RadiusBottomLeft
            roundedLeafColor = record.Color
            roundedLeafOpacity = record.Opacity
          }
        } else if draw.Kind == SceneDrawKind.SolidBox
        && draw.Index >= 0 && draw.Index < frame.SolidBoxCount{
          let record = frame.SolidBoxes[draw.Index]
          let inX = record.Bounds.X > 80.0F * payloadScaleX
            && record.Bounds.X < 160.0F * payloadScaleX
          let inY = record.Bounds.Y > 0.0F
            && record.Bounds.Y < 16.0F * payloadScaleY
          let widthMatches = record.Bounds.Width > 63.0F * payloadScaleX
            && record.Bounds.Width < 65.0F * payloadScaleX
          let heightMatches = record.Bounds.Height > 31.0F * payloadScaleY
            && record.Bounds.Height < 33.0F * payloadScaleY
          if inX && inY && widthMatches && heightMatches {
            mutatedSolidLeafFound = true
            mutatedSolidLeafBounds = record.Bounds
            mutatedSolidLeafColor = record.Color
            mutatedSolidLeafOpacity = record.Opacity
          }
        } else if draw.Kind == SceneDrawKind.PerEdgeBorder
        && draw.Index >= 0 && draw.Index < frame.PerEdgeBorderCount{
          let record = frame.PerEdgeBorders[draw.Index]
          let inX = record.Bounds.X > 160.0F * payloadScaleX
            && record.Bounds.X < 176.0F * payloadScaleX
          let inY = record.Bounds.Y > 0.0F
            && record.Bounds.Y < 16.0F * payloadScaleY
          if inX && inY {
            borderLeafCount = borderLeafCount + 1u
            if !borderLeafFound {
              borderLeafFound = true
              borderLeaf = record
            }
          }
        }
      drawIndex = drawIndex + 1
    }
    let damage = activeDamageRegion
    let partialRedraw = activePartialRedraw
    return VulkanSceneRetentionTestSnapshot{
      SceneVersion: sceneVersion,
      ActiveImageIndex: activeImageIndexForSnapshot,
      ActiveSceneVersion: activeSceneVersion,
      ActiveAppliedSceneVersion: activeAppliedSceneVersionForSnapshot,
      ActivePendingSceneVersion: activePendingSceneVersion,
      AcquiredImageState: acquiredImageState,
      AppliedImageCount: appliedImageCount,
      PromotedImageCount: promotedImageCount,
      PendingImageCount: pendingImageCount,
      PendingSceneVersion: pendingSceneVersion,
      DamageX: damage.X,
      DamageY: damage.Y,
      DamageWidth: damage.Width,
      DamageHeight: damage.Height,
      PartialRedraw: partialRedraw,
      FullRedraw: !partialRedraw,
      DirtyChunkCount: dirtyChunkCount,
      ReusedChunkCount: reusedChunkCount,
      SkippedNodeCount: sceneCompiler.LastResult.SkippedNodeCount,
      ExactTextClipCandidateCount: sceneCompiler.LastResult.ExactTextClipCandidateCount,
      ExactTextClipCullCount: sceneCompiler.LastResult.ExactTextClipCullCount,
      CachedTextPaintCullCount: sceneCompiler.LastResult.CachedTextPaintCullCount,
      TextLayoutRequestCount: sceneCompiler.LastResult.TextLayoutRequestCount,
      DrawCount: sceneCompiler.LastResult.DrawCount,
      ResourceCount: frame.ResourceRefCount,
      TextSegmentCount: frame.CachedTextSegmentCount,
      RetainedLeafHitCount: sceneCompiler.RetainedLeafHitCount,
      RetainedLeafRebuildCount: sceneCompiler.RetainedLeafRebuildCount,
      RetainedLeafFallbackCount: sceneCompiler.RetainedLeafFallbackCount,
      RetainedLeafInvalidationCount: sceneCompiler.RetainedLeafInvalidationCount,
      RetainedLeafTotalCount: sceneCompiler.RetainedLeafTotalCount,
      RetainedTextHitCount: sceneCompiler.RetainedTextHitCount,
      RetainedTextRebuildCount: sceneCompiler.RetainedTextRebuildCount,
      RetainedTextFallbackCount: sceneCompiler.RetainedTextFallbackCount,
      RetainedTextInvalidationCount: sceneCompiler.RetainedTextInvalidationCount,
      RetainedTextTotalCount: sceneCompiler.RetainedTextTotalCount,
      RetainedBorderHitCount: sceneCompiler.RetainedBorderHitCount,
      RetainedBorderRebuildCount: sceneCompiler.RetainedBorderRebuildCount,
      RetainedBorderFallbackCount: sceneCompiler.RetainedBorderFallbackCount,
      RetainedBorderInvalidationCount: sceneCompiler.RetainedBorderInvalidationCount,
      RetainedBorderTotalCount: sceneCompiler.RetainedBorderTotalCount,
      RetainedParentBoxHitCount: sceneCompiler.RetainedParentBoxHitCount,
      RetainedParentBoxRebuildCount: sceneCompiler.RetainedParentBoxRebuildCount,
      RetainedParentBoxFallbackCount: sceneCompiler.RetainedParentBoxFallbackCount,
      RetainedParentBoxInvalidationCount: sceneCompiler.RetainedParentBoxInvalidationCount,
      RetainedParentBoxTotalCount: sceneCompiler.RetainedParentBoxTotalCount,
      RoundedLeafCount: roundedLeafCount,
      RoundedLeafBoundsX: roundedLeafBounds.X,
      RoundedLeafBoundsY: roundedLeafBounds.Y,
      RoundedLeafBoundsWidth: roundedLeafBounds.Width,
      RoundedLeafBoundsHeight: roundedLeafBounds.Height,
      RoundedLeafRadiusTopLeft: roundedLeafRadiusTopLeft,
      RoundedLeafRadiusTopRight: roundedLeafRadiusTopRight,
      RoundedLeafRadiusBottomRight: roundedLeafRadiusBottomRight,
      RoundedLeafRadiusBottomLeft: roundedLeafRadiusBottomLeft,
      RoundedLeafColor: roundedLeafColor,
      RoundedLeafOpacity: roundedLeafOpacity,
      MutatedSolidLeafFound: mutatedSolidLeafFound,
      MutatedSolidLeafBoundsX: mutatedSolidLeafBounds.X,
      MutatedSolidLeafBoundsY: mutatedSolidLeafBounds.Y,
      MutatedSolidLeafBoundsWidth: mutatedSolidLeafBounds.Width,
      MutatedSolidLeafBoundsHeight: mutatedSolidLeafBounds.Height,
      MutatedSolidLeafColor: mutatedSolidLeafColor,
      MutatedSolidLeafOpacity: mutatedSolidLeafOpacity,
      BorderLeafFound: borderLeafFound,
      BorderLeafCount: borderLeafCount,
      BorderLeafBoundsX: borderLeaf.Bounds.X,
      BorderLeafBoundsY: borderLeaf.Bounds.Y,
      BorderLeafBoundsWidth: borderLeaf.Bounds.Width,
      BorderLeafBoundsHeight: borderLeaf.Bounds.Height,
      BorderLeafTopWidth: borderLeaf.TopWidth,
      BorderLeafRightWidth: borderLeaf.RightWidth,
      BorderLeafBottomWidth: borderLeaf.BottomWidth,
      BorderLeafLeftWidth: borderLeaf.LeftWidth,
      BorderLeafRadiusTopLeft: borderLeaf.RadiusTopLeft,
      BorderLeafRadiusTopRight: borderLeaf.RadiusTopRight,
      BorderLeafRadiusBottomRight: borderLeaf.RadiusBottomRight,
      BorderLeafRadiusBottomLeft: borderLeaf.RadiusBottomLeft,
      BorderLeafTopColor: borderLeaf.TopColor,
      BorderLeafRightColor: borderLeaf.RightColor,
      BorderLeafBottomColor: borderLeaf.BottomColor,
      BorderLeafLeftColor: borderLeaf.LeftColor,
      BorderLeafStyle: borderLeaf.Style,
      BorderLeafTransformIndex: borderLeaf.TransformIndex,
    }
  }

  internal func PrimitiveFrameRetentionSnapshotForTest()
  VulkanPrimitiveFrameRetentionTestSnapshot{
    guard let renderer = primitiveRenderer else {
      return VulkanPrimitiveFrameRetentionTestSnapshot{}
    }
    let stats = renderer.PrimitiveFrameStats
    return VulkanPrimitiveFrameRetentionTestSnapshot{
      SlotIndex: stats.SlotIndex,
      RecordCount: stats.RecordCount,
      ByteCount: stats.ByteCount,
      Capacity: stats.Capacity,
      BufferGeneration: stats.BufferGeneration,
      WrittenBytes: stats.WrittenBytes,
      SkippedBytes: stats.SkippedBytes,
      DirtyRecordCount: stats.DirtyRecordCount,
      UploadRangeCount: stats.UploadRangeCount,
      FullUpload: stats.FullUpload,
      MappedWrites: stats.MappedWrites,
      Flushes: stats.Flushes,
      RetainedReuse: stats.RetainedReuse,
      LastUseSerial: stats.LastUseSerial,
      Prepared: stats.Prepared,
      TotalWrittenBytes: stats.TotalWrittenBytes,
      TotalSkippedBytes: stats.TotalSkippedBytes,
      TotalDirtyRecordCount: stats.TotalDirtyRecordCount,
      TotalUploadRangeCount: stats.TotalUploadRangeCount,
      TotalFullUploads: stats.TotalFullUploads,
      TotalMappedWrites: stats.TotalMappedWrites,
      TotalFlushes: stats.TotalFlushes,
      TotalRetainedReuse: stats.TotalRetainedReuse,
    }
  }
  internal func TextFrameRetentionSnapshotForTest()
  VulkanTextFrameRetentionTestSnapshot{
    guard let renderer = primitiveRenderer else {
      return VulkanTextFrameRetentionTestSnapshot{}
    }
    let stats = renderer.TextFrameStats
    return VulkanTextFrameRetentionTestSnapshot{
      SlotIndex: stats.SlotIndex,
      SegmentCount: stats.SegmentCount,
      RunCount: stats.RunCount,
      RecordCount: stats.RecordCount,
      ByteCount: stats.ByteCount,
      Capacity: stats.Capacity,
      BufferGeneration: stats.BufferGeneration,
      TopologyKey: stats.TopologyKey,
      WrittenBytes: stats.WrittenBytes,
      SkippedBytes: stats.SkippedBytes,
      DirtySegmentCount: stats.DirtySegmentCount,
      UploadRangeCount: stats.UploadRangeCount,
      FullUpload: stats.FullUpload,
      MappedWrites: stats.MappedWrites,
      Flushes: stats.Flushes,
      RetainedReuse: stats.RetainedReuse,
      LastUseSerial: stats.LastUseSerial,
      Prepared: stats.Prepared,
      TotalSegmentCount: stats.TotalSegmentCount,
      TotalRunCount: stats.TotalRunCount,
      TotalRecordCount: stats.TotalRecordCount,
      TotalWrittenBytes: stats.TotalWrittenBytes,
      TotalSkippedBytes: stats.TotalSkippedBytes,
      TotalDirtySegmentCount: stats.TotalDirtySegmentCount,
      TotalUploadRangeCount: stats.TotalUploadRangeCount,
      TotalFullUploads: stats.TotalFullUploads,
      TotalMappedWrites: stats.TotalMappedWrites,
      TotalFlushes: stats.TotalFlushes,
      TotalRetainedReuse: stats.TotalRetainedReuse,
      TotalCapacity: stats.TotalCapacity,
      TotalBufferGeneration: stats.TotalBufferGeneration,
      TotalLastUseSerial: stats.TotalLastUseSerial,
      TotalPrepared: stats.TotalPrepared,
    }
  }

  internal func FrameSubmissionSerialsForTest() VulkanFrameSubmissionTestSnapshot -> VulkanFrameSubmissionTestSnapshot {
    Slot0Serial: frameSlots.Slot(0u)?.SubmissionSerial ?? 0uL,
    Slot1Serial: frameSlots.Slot(1u)?.SubmissionSerial ?? 0uL,
  }

  internal func SetForceFullRedrawForTest(value bool) {
    forceFullRedraw = value
  }

  internal func SetExactTextClipCullForTest(value bool) {
    sceneCompiler.SetExactTextClipCullEnabled(value)
  }
}

public partial class Window {
  internal func S16HoldNextQueueSubmitForTest() {
    windowTarget?.HoldNextQueueSubmitForTest()
  }

  internal func S16HoldNextQueuePresentForTest() {
    windowTarget?.HoldNextQueuePresentForTest()
  }

  internal func S16ReleaseHeldQueueCallForTest() {
    VulkanSharedRuntime.ReleaseHeldQueueCallForTest()
  }

  internal func S16DeferNextQueueEnqueueForTest() {
    VulkanSharedRuntime.DeferNextQueueEnqueueForTest()
  }

  internal func S16WaitForHeldQueueCallForTest(timeoutMs int32) bool -> VulkanSharedRuntime.WaitForHeldQueueCallForTest(timeoutMs)

  internal func S16QueueWorkPendingForTest() bool -> windowTarget?.QueueWorkPending ?? false

  internal func PollQueueCompletionForTest() bool {
    let completed = windowTarget?.PollQueueCompletion() == true
    if completed {
      markFrameRendered()
      host?.FramePacing.MarkFrame(float64(Stopwatch.GetTimestamp()))
    }
    return completed
  }

  internal func DiagnosticCountersSnapshotForTest() VulkanDiagnosticCounterSnapshot {
    guard let target = windowTarget else {
      return VulkanDiagnosticCounterSnapshot{}
    }
    return target.DiagnosticCountersSnapshotForTest()
  }
  internal func TimestampSupportedForTest() bool -> windowTarget?.TimestampSupportedForTest() == true

  internal func SetMainPassTimestampSinkForTest(
    sink Action[VulkanDiagnosticTimestampSnapshot]?) {
      windowTarget?.SetMainPassTimestampSinkForTest(sink)
    }
  internal func SetAllTimestampSinkForTest(
    sink Action[VulkanDiagnosticTimestampSnapshot]?) {
      windowTarget?.SetAllTimestampSinkForTest(sink)
    }
  internal func SetPresentationLatencySinkForTest(
    sink Action[VulkanPresentationLatencyTestSample]?) {
      guard let target = windowTarget else {
        return
      }
      guard let callback = sink else {
        target.SetPresentationLatencySink(nil)
        return
      }
      target.SetPresentationLatencySink((sample VulkanPresentationLatencySample) -> {
        callback.Invoke(VulkanPresentationLatencyTestSample{
          Token: sample.token,
          Kind: sample.kind,
          StartTimestamp: sample.startTimestamp,
          HandoffTimestamp: sample.handoffTimestamp,
          CompletionObservedTimestamp: sample.completionObservedTimestamp,
          PresentId: sample.presentId,
          PresentFenceObserved: sample.presentFenceObserved,
        })
      })
    }

  internal func BeginPresentationLatencyForTest(
    token uint64, kind int32, startTimestamp int64) {
      windowTarget?.BeginPresentationLatency(token, kind, startTimestamp)
    }

  internal func PresentFenceSupportedForTest() bool -> windowTarget?.PresentFenceSupported ?? false

  internal func DiagnosticFrameIdForTest() uint64 -> windowTarget?.DiagnosticFrameIdForTest() ?? 0uL
  internal func CaptureTargetForTest() VulkanWindowTarget ? -> windowTarget

  internal func ForceRenderForTest(dt float64) {
    requestRender()
    PumpScheduled(dt)
  }

  internal func PumpForTest(dt float64) {
    PumpScheduled(dt)
  }

  internal func RequestReadbackForTest(width uint32, height uint32)
  VulkanReadbackRequestStatus{
    guard let target = windowTarget else {
      return VulkanReadbackRequestStatus.NotReady
    }
    let region = VulkanReadbackRegion{
      X: 0u,
      Y: 0u,
      Width: width,
      Height: height,
    }
    return target.RequestReadback(node, background, dpi, region)
  }

  internal func RequestReadbackForTest() VulkanReadbackRequestStatus -> RequestReadbackForTest(64u, 64u)

  internal func CurrentWindowMetricsForTest() WindowMetrics -> CurrentWindowMetrics()

  internal func ApplyNativeResizeForTest(logicalWidth int32, logicalHeight int32,
    framebufferWidth int32, framebufferHeight int32) bool{
      guard let target = windowTarget else {
        return false
      }
      let previousGeneration = target.CurrentPresentGeneration
      if !applyNativeResize(logicalWidth, logicalHeight, framebufferWidth,
        framebufferHeight) {
          return false
        }
      let deadline = Stopwatch.GetTimestamp() + Stopwatch.Frequency * 2L
      var actual = target.FramebufferExtentForTest()
      var currentGeneration = target.CurrentPresentGeneration
      while (currentGeneration == previousGeneration
          || actual.Width != framebufferWidth
          || actual.Height != framebufferHeight)
        && Stopwatch.GetTimestamp() < deadline{
          Thread.Yield()
          if !target.Resize(framebufferWidth, framebufferHeight) {
            return false
          }
          actual = target.FramebufferExtentForTest()
          currentGeneration = target.CurrentPresentGeneration
        }
      host?.SetMetricsForTest(logicalWidth, logicalHeight, actual.Width,
        actual.Height)
      this.framebufferWidth = actual.Width
      this.framebufferHeight = actual.Height
      return currentGeneration != 0uL
        && currentGeneration != previousGeneration
        && actual.Width == framebufferWidth
        && actual.Height == framebufferHeight
    }

  internal func HasDemandForTest() bool -> hasDemand()

  internal func HandleFocusChangedForTest(hasFocus bool) {
    handleFocusChanged(hasFocus)
  }

  internal func SdlWindowIdForTest() uint32 -> host?.WindowIdForTest() ?? 0u

  internal func QueueTextForTest(value string) {
    input.QueueText(value)
  }

  internal func CurrentPresentModeForTest() VkPresentModeKHR -> windowTarget?.CurrentPresentMode ?? VkPresentModeKHR(-1)

  internal func CurrentPresentGenerationForTest() uint64 -> windowTarget?.CurrentPresentGeneration ?? 0uL

  internal func FrameSubmissionSerialsForTest() VulkanFrameSubmissionTestSnapshot {
    guard let target = windowTarget else {
      return VulkanFrameSubmissionTestSnapshot{}
    }
    return target.FrameSubmissionSerialsForTest()
  }

  internal func PacingRefreshRateForTest() float64 -> host?.FramePacing.RefreshRate ?? 0.0

  internal func PollReadbackForTest() VkResult {
    guard let target = windowTarget else {
      return VkConstants.VK_NOT_READY
    }
    return target.PollReadback()
  }

  internal func TakeReadbackForTest() VulkanReadbackResult? {
    guard let target = windowTarget else {
      return nil
    }
    return target.TakeReadbackResult()
  }

  internal func ReadbackRequestCountForTest() uint64 {
    guard let target = windowTarget else {
      return 0uL
    }
    return target.ReadbackRequestCount
  }

  internal func ReadbackCompletionCountForTest() uint64 {
    guard let target = windowTarget else {
      return 0uL
    }
    return target.ReadbackCompletionCount
  }

  internal func ReadbackResidentResourceBytesForTest() uint64 {
    guard let target = windowTarget else {
      return 0uL
    }
    return uint64(target.ReadbackResidentResourceBytes)
  }

  internal func ReadbackTimingForTest() VulkanReadbackTimingSnapshot {
    guard let target = windowTarget else {
      return VulkanReadbackTimingSnapshot{}
    }
    return target.ReadbackTiming
  }

  internal func SceneRetentionSnapshotForTest() VulkanSceneRetentionTestSnapshot {
    guard let target = windowTarget else {
      return VulkanSceneRetentionTestSnapshot{}
    }
    return target.SceneRetentionSnapshotForTest()
  }

  internal func SetForceFullRedrawForTest(value bool) {
    windowTarget?.SetForceFullRedrawForTest(value)
  }

  internal func SetExactTextClipCullForTest(value bool) {
    windowTarget?.SetExactTextClipCullForTest(value)
  }

  internal func S17ValidateInitialForTest(handle ElementHandle, source string) bool {
    guard let n = handle.AttachedNodeFor(this) else { return false }
    if !n.Password || n.Buffer != source { return false }
    let metrics = TextMetrics()
    let shape = metrics.BufferShape(n)
    guard let state = n.EntryShape else { return false }
    if state.Display != "•••" || state.SourceStarts.Length != 3 { return false }
    if entryDisplayOffset(state, 0, TextAffinity.Downstream) != 0
      || entryDisplayOffset(state, 2, TextAffinity.Downstream) != 1
      || entryDisplayOffset(state, 13, TextAffinity.Downstream) != 2
      || entryDisplayOffset(state, 14, TextAffinity.Downstream) != 3
      || entrySourceOffset(state, 0) != 0
      || entrySourceOffset(state, 1) != 2
      || entrySourceOffset(state, 2) != 13
      || entrySourceOffset(state, 3) != 14 {
        return false
      }
    n.CaretAffinity = TextAffinity.Downstream
    if metrics.CaretX(n, 0) != shape.CaretX(0, int32(TextAffinity.Downstream))
      || metrics.CaretX(n, 2) != shape.CaretX(1, int32(TextAffinity.Downstream))
      || metrics.CaretX(n, 13) != shape.CaretX(2, int32(TextAffinity.Downstream))
      || metrics.CaretX(n, 14) != shape.CaretX(3, int32(TextAffinity.Downstream)) {
        return false
      }
    n.Anchor = 2
    n.AnchorAffinity = TextAffinity.Downstream
    n.Caret = 13
    n.CaretAffinity = TextAffinity.Upstream
    let actual = metrics.SelectionRects(n)
    let expected = shape.SelectionRects(1, 2)
    if actual.Length != expected.Length { return false }
    for index in 0 ... actual.Length {
      if actual[index] != expected[index] { return false }
    }
    var caretRect ElementRect
    if !handle.TryGetTextCaretRect(TextPosition {
      Offset: 2, Affinity: TextAffinity.Downstream,
    }, TextCoordinateSpace.Element, out caretRect) {
      return false
    }
    var hit TextPosition
    if !handle.TryGetTextPositionAt(Point {
      X: caretRect.X, Y: caretRect.Y + caretRect.Height * 0.5,
    }, TextCoordinateSpace.Element, out hit) || hit.Offset != 2 {
      return false
    }
    let rangeValues = [4]ElementRect
    let rangeDestination = rangeValues.AsSpan()
    var rangeRequired int32
    return handle.TryCopyTextRangeRects(TextRange{ Start: 2, Length: 11 },
      TextCoordinateSpace.Element, rangeDestination, out rangeRequired)
      && rangeRequired == 1 && rangeValues[0].Width > 0.0
  }

  internal func S17SelectionMappedForTest(handle ElementHandle) bool {
    guard let n = handle.AttachedNodeFor(this) else { return false }
    return n.Anchor == 2 && n.Caret == 13
  }

  internal func S17ExerciseInputForTest(handle ElementHandle, source string) bool {
    guard let n = handle.AttachedNodeFor(this) else { return false }
    input.SetClipboardFallback("safe")
    let primary = KeyModifiers{ Ctrl: true }
    if !input.HandleKey(node, resolver, Key.A, primary)
      || !input.HandleKey(node, resolver, Key.C, primary)
      || !input.HandleKey(node, resolver, Key.End, KeyModifiers{})
      || !input.HandleKey(node, resolver, Key.V, primary) {
        return false
      }
    if n.Buffer != source + "safe" { return false }
    let beforeCut = n.Buffer
    if !input.HandleKey(node, resolver, Key.A, primary)
      || !input.HandleKey(node, resolver, Key.X, primary)
      || n.Buffer != beforeCut
      || !input.HandleKey(node, resolver, Key.End, KeyModifiers{}) {
        return false
      }
    let metrics = TextMetrics()
    let beforeComposition = n.Buffer
    let beforeCompositionShape = metrics.BufferShape(n)
    input.QueueComposition("z\u0301", 1, 0)
    if input.Drain(node, resolver, 0.0, nil)
      || n.Buffer != beforeComposition
      || metrics.BufferShape(n) != beforeCompositionShape{
        return false
      }
    input.QueueText("z\u0301")
    if !input.Drain(node, resolver, 0.0, nil)
      || n.Buffer != beforeComposition + "z\u0301" {
        return false
      }
    metrics.BufferShape(n)
    accessibility?.MarkDirty()
    resolver.VisualDirty = true
    return n.EntryShape!!.Display == "••••••••"
  }

  internal func S17QueuePointerMoveForTest(x float64, y float64) {
    input.QueuePointerMove(float32(x), float32(y))
  }

  internal func S17QueuePointerPressForTest(x float64, y float64) {
    input.QueuePointerPress(float32(x), float32(y), PointerButton.Primary, KeyModifiers{})
  }

  internal func S17QueuePointerReleaseForTest(x float64, y float64) {
    input.QueuePointerRelease(float32(x), float32(y), PointerButton.Primary, KeyModifiers{})
  }

  internal func S17QueueWheelForTest(x float64, y float64, dx float64, dy float64) {
    input.QueuePointerWheel(float32(x), float32(y), float32(dx), float32(dy), KeyModifiers{})
  }

  internal func S17QueueKeyPressForTest(key Key) {
    input.QueueKeyPress(key, KeyModifiers{})
  }

  internal func S17QueueKeyReleaseForTest(key Key) {
    input.QueueKeyRelease(key)
  }

  internal func PrimitiveFrameRetentionSnapshotForTest()
  VulkanPrimitiveFrameRetentionTestSnapshot{
    guard let target = windowTarget else {
      return VulkanPrimitiveFrameRetentionTestSnapshot{}
    }
    return target.PrimitiveFrameRetentionSnapshotForTest()
  }
  internal func TextFrameRetentionSnapshotForTest()
  VulkanTextFrameRetentionTestSnapshot{
    guard let target = windowTarget else {
      return VulkanTextFrameRetentionTestSnapshot{}
    }
    return target.TextFrameRetentionSnapshotForTest()
  }

  internal func ClipMaskRetentionSnapshotForTest()
  VulkanClipMaskRetentionTestSnapshot{
    guard let target = windowTarget else {
      return VulkanClipMaskRetentionTestSnapshot{}
    }
    let stats = target.LastClipMaskFrameStats
    let totals = target.ClipMaskFrameTotals
    return VulkanClipMaskRetentionTestSnapshot{
      SlotIndex: stats.SlotIndex,
      DrawCount: stats.DrawCount,
      MaskCount: stats.MaskCount,
      ClipChainCount: stats.ClipChainCount,
      LayerCount: stats.LayerCount,
      ByteCount: stats.ByteCount,
      WrittenBytes: stats.WrittenBytes,
      SkippedBytes: stats.SkippedBytes,
      MappedWrites: stats.MappedWrites,
      Flushes: stats.Flushes,
      RetainedReuse: stats.RetainedReuse,
      RetentionEligible: stats.RetentionEligible,
      Retained: stats.Retained,
      RetentionValid: stats.RetentionValid,
      TotalWrittenBytes: totals.WrittenBytes,
      TotalSkippedBytes: totals.SkippedBytes,
      TotalMappedWrites: totals.MappedWrites,
      TotalFlushes: totals.Flushes,
      TotalRetainedReuse: totals.RetainedReuse,
    }
  }

}

internal partial class SdlHost {
  internal func SetMetricsForTest(logicalWidth int32, logicalHeight int32,
    framebufferWidth int32, framebufferHeight int32) {
      LogicalWidth = logicalWidth
      LogicalHeight = logicalHeight
      FramebufferWidth = framebufferWidth
      FramebufferHeight = framebufferHeight
    }

  internal func WindowIdForTest() uint32 {
    if window.IsNull {
      return 0u
    }
    return SDL.GetWindowID(window)
  }

}

internal class WindowReadbackTestFixture {
  shared {
    internal func S20VerifyPresentationRetirement() {
      let retirement = VulkanPresentationRetirement(4u, 2u)
      let completed = retirement.RecordPresent(1uL, 0u)
      retirement.CompletePresent(completed)
      if retirement.TryBindPriorSameImageToCompletion(1uL, 0u, 0u, 1uL) {
        throw InvalidOperationException("completed presentation required a retirement bind")
      }
      retirement.RecordPresent(1uL, 0u)
      if !retirement.TryBindPriorSameImageToCompletion(1uL, 0u, 1u, 2uL) {
        throw InvalidOperationException("unresolved presentation did not bind")
      }
      if retirement.TryBindPriorSameImageToCompletion(1uL, 0u, 1u, 2uL) {
        throw InvalidOperationException("presentation retirement accepted a duplicate bind")
      }
      if retirement.CollectCompleted(1u, 2uL) != 1 {
        throw InvalidOperationException("bound presentation did not retire")
      }
    }

    internal func DiagnosticCounters(window Window) VulkanDiagnosticCounterSnapshot -> window.DiagnosticCountersSnapshotForTest()
    internal func CellDirty(cell Cell) bool -> cell.IsDirty()

    internal func CellMounted(cell Cell) bool -> cell.MountedNode() != nil

    internal func TimestampSupported(window Window) bool -> window.TimestampSupportedForTest()

    internal func SetMainPassTimestampSink(window Window,
      sink Action[VulkanDiagnosticTimestampSnapshot]?) {
        window.SetMainPassTimestampSinkForTest(sink)
      }
    internal func SetAllTimestampSink(window Window,
      sink Action[VulkanDiagnosticTimestampSnapshot]?) {
        window.SetAllTimestampSinkForTest(sink)
      }
    internal func SetPresentationLatencySink(window Window,
      sink Action[VulkanPresentationLatencyTestSample]?) {
        window.SetPresentationLatencySinkForTest(sink)
      }

    internal func BeginPresentationLatency(window Window,
      token uint64, kind int32, startTimestamp int64) {
        window.BeginPresentationLatencyForTest(token, kind, startTimestamp)
      }

    internal func PresentFenceSupported(window Window) bool -> window.PresentFenceSupportedForTest()

    internal func DiagnosticFrameId(window Window) uint64 -> window.DiagnosticFrameIdForTest()
    internal func CaptureTarget(window Window) VulkanWindowTarget ? -> window.CaptureTargetForTest()

    internal func ForceRender(window Window, dt float64,
      timeoutSeconds float64 = 2.0) {
        let baseline = window.FrameSubmissionSerialsForTest()
        window.ForceRenderForTest(dt)
        let deadline = Stopwatch.GetTimestamp()
        +int64(float64(Stopwatch.Frequency) * timeoutSeconds)
        var accepted = false
        while Stopwatch.GetTimestamp() < deadline {
          SdlRuntime.PumpEvents(Int32.MaxValue)
          window.PollQueueCompletionForTest()
          let current = window.FrameSubmissionSerialsForTest()
          accepted = current.Slot0Serial != baseline.Slot0Serial
            || current.Slot1Serial != baseline.Slot1Serial
          let pending = window.S16QueueWorkPendingForTest()
          if accepted && !pending {
            return
          }
          if !accepted && !pending {
            window.ForceRenderForTest(0.0)
          }
          Thread.Yield()
        }
        throw InvalidOperationException("WindowReadbackTestFixture.ForceRender did not accept and drain queue work")
      }

    internal func ForceRenderNonblocking(window Window, dt float64) {
      window.ForceRenderForTest(dt)
    }

    internal func Pump(window Window, dt float64) {
      window.PumpForTest(dt)
    }

    internal func SdlWindowId(window Window) uint32 -> window.SdlWindowIdForTest()
    internal func PumpNativeEvents() {
      SdlRuntime.PumpEvents(Int32.MaxValue)
    }
    internal func PumpNativeEventsForTest() int32 -> SdlRuntime.PumpEvents(Int32.MaxValue)

    internal func SetForceFullRedraw(window Window, value bool) {
      window.SetForceFullRedrawForTest(value)
    }

    internal func SetExactTextClipCull(window Window, value bool) {
      window.SetExactTextClipCullForTest(value)
    }

    internal func Request(window Window) VulkanReadbackRequestStatus -> window.RequestReadbackForTest()

    internal func Request(window Window, width uint32, height uint32)
    VulkanReadbackRequestStatus -> window.RequestReadbackForTest(width, height)

    internal func Metrics(window Window) WindowMetrics -> window.CurrentWindowMetricsForTest()
    internal func Resize(window Window, logicalWidth int32, logicalHeight int32,
      framebufferWidth int32, framebufferHeight int32) bool{
        if logicalWidth <= 0 || logicalHeight <= 0
          || framebufferWidth <= 0 || framebufferHeight <= 0 {
            throw InvalidOperationException(
              "WindowReadbackTestFixture.Resize dimensions must be positive")
          }
        return window.ApplyNativeResizeForTest(logicalWidth, logicalHeight,
          framebufferWidth, framebufferHeight)
      }

    internal func HasDemand(window Window) bool -> window.HasDemandForTest()

    internal func SetFocus(window Window, value bool) {
      window.HandleFocusChangedForTest(value)
    }

    internal func QueueText(window Window, value string) {
      window.QueueTextForTest(value)
    }

    internal func PresentMode(window Window) VkPresentModeKHR -> window.CurrentPresentModeForTest()

    internal func PresentGeneration(window Window) uint64 -> window.CurrentPresentGenerationForTest()

    internal func FrameSubmissions(window Window) VulkanFrameSubmissionTestSnapshot -> window.FrameSubmissionSerialsForTest()

    internal func PacingRefreshRate(window Window) float64 -> window.PacingRefreshRateForTest()

    internal func UpdateTree(window Window) {
      window.UpdateTree()
    }

    internal func S17ValidateInitial(window Window, handle ElementHandle, source string) bool -> window.S17ValidateInitialForTest(handle, source)

    internal func S17SelectionMapped(window Window, handle ElementHandle) bool -> window.S17SelectionMappedForTest(handle)

    internal func S17ExerciseInput(window Window, handle ElementHandle, source string) bool -> window.S17ExerciseInputForTest(handle, source)

    internal func S17QueuePointerMove(window Window, x float64, y float64) {
      window.S17QueuePointerMoveForTest(x, y)
    }

    internal func S17QueuePointerPress(window Window, x float64, y float64) {
      window.S17QueuePointerPressForTest(x, y)
    }

    internal func S17QueuePointerRelease(window Window, x float64, y float64) {
      window.S17QueuePointerReleaseForTest(x, y)
    }

    internal func S17QueueWheel(window Window, x float64, y float64,
      dx float64, dy float64) {
        window.S17QueueWheelForTest(x, y, dx, dy)
      }

    internal func S17QueueKeyPress(window Window, key Key) {
      window.S17QueueKeyPressForTest(key)
    }

    internal func S17QueueKeyRelease(window Window, key Key) {
      window.S17QueueKeyReleaseForTest(key)
    }

    internal func Poll(window Window) VkResult -> window.PollReadbackForTest()

    internal func Take(window Window) VulkanReadbackResult ? -> window.TakeReadbackForTest()

    internal func RequestCount(window Window) uint64 -> window.ReadbackRequestCountForTest()

    internal func CompletionCount(window Window) uint64 -> window.ReadbackCompletionCountForTest()

    internal func ResidentResourceBytes(window Window) uint64 -> window.ReadbackResidentResourceBytesForTest()
    internal func TargetResidentResourceBytes(target VulkanWindowTarget?) uint64 {
      guard let retained = target else {
        return 0uL
      }
      return uint64(retained.ReadbackResidentResourceBytes)
    }

    internal func TargetFramebufferExtent(target VulkanWindowTarget?)
    VulkanWindowFramebufferExtentTestSnapshot{
      guard let retained = target else {
        return VulkanWindowFramebufferExtentTestSnapshot{}
      }
      return retained.FramebufferExtentForTest()
    }

    internal func Timing(window Window) VulkanReadbackTimingSnapshot -> window.ReadbackTimingForTest()

    internal func SceneRetention(window Window) VulkanSceneRetentionTestSnapshot -> window.SceneRetentionSnapshotForTest()

    internal func PrimitiveFrameRetention(window Window)
    VulkanPrimitiveFrameRetentionTestSnapshot -> window.PrimitiveFrameRetentionSnapshotForTest()
    internal func TextFrameRetention(window Window)
    VulkanTextFrameRetentionTestSnapshot -> window.TextFrameRetentionSnapshotForTest()

    internal func ClipMaskRetention(window Window)
    VulkanClipMaskRetentionTestSnapshot -> window.ClipMaskRetentionSnapshotForTest()

    internal func S16HoldNextQueueSubmit(window Window) {
      window.S16HoldNextQueueSubmitForTest()
    }

    internal func S16HoldNextQueuePresent(window Window) {
      window.S16HoldNextQueuePresentForTest()
    }

    internal func S16WaitForHeldQueueCall(window Window, timeoutMs int32) bool -> window.S16WaitForHeldQueueCallForTest(timeoutMs)

    internal func S16ReleaseHeldQueueCall() {
      VulkanSharedRuntime.ReleaseHeldQueueCallForTest()
    }

    internal func S16DeferNextQueueEnqueue(window Window) {
      window.S16DeferNextQueueEnqueueForTest()
    }

    internal func S16QueueWorkPending(window Window) bool -> window.S16QueueWorkPendingForTest()

    internal func DrainWindowQueue(window Window, timeoutMs int32) {
      let timeoutTicks = int64(float64(Stopwatch.Frequency) * float64(timeoutMs) / 1000.0)
      let start = Stopwatch.GetTimestamp()
      while S16QueueWorkPending(window) {
        SdlRuntime.PumpEvents(Int32.MaxValue)
        window.PollQueueCompletionForTest()
        if Stopwatch.GetTimestamp() - start >= timeoutTicks {
          throw InvalidOperationException("window queue did not drain within the timeout")
        }
        Thread.Yield()
      }
    }

    internal func S16DeferredQueueEnqueueCount() int64 -> VulkanSharedRuntime.QueueEnqueueDeferralCountForTest

    internal func RunFramePacingGate() string {
      let previousUncapped = SdlFramePacing.UncappedBenchmark
      try {
        CheckPresentModes()
        CheckFramePacingRate(60.0, uint32(1), 9)
        CheckFramePacingRate(144.0, uint32(2), 4)
        CheckFramePacingRate(60000.0 / 1001.0, uint32(3), 9)
        CheckFramePacingFallbackAndRetention()
        CheckFramePacingDefer()

        let base = 200000.0
        let pacing = SdlFramePacing{}
        pacing.Refresh(uint32(7), 60.0, base, true)
        pacing.MarkFrame(base)
        pacing.Refresh(uint32(8), 144.0, base + 10.0, false)
        FramePacingRequire(pacing.DisplayId == uint32(8),
          "S16 pacing display change was not applied")
        FramePacingRequire(Math.Abs(pacing.RefreshRate - 144.0) < 0.000000001,
          "S16 pacing rate change was not applied")
        FramePacingRequire(pacing.IsDue(base + 10.0),
          "S16 pacing display change did not reset the deadline")

        SdlFramePacing.SetUncappedBenchmark(true)
        pacing.MarkFrame(base + 11.0)
        FramePacingRequire(pacing.IsDue(base + 11.0),
          "S16 uncapped pacing seam did not make the frame due")
        FramePacingRequire(pacing.WaitMilliseconds(base + 11.0, 100) == 0,
          "S16 uncapped pacing seam returned a wait")
      } finally {
        SdlFramePacing.SetUncappedBenchmark(previousUncapped)
      }
      FramePacingRequire(SdlFramePacing.UncappedBenchmark == previousUncapped,
        "S16 pacing uncapped seam did not restore its state")
      return "s16-frame-pacing-gate: rates=60,144,60000/1001 anchored=1 reset=1 defer=1 uncapped=1 presentModes=1"
    }

    private func CheckPresentModes() {
      var selected VkPresentModeKHR
      FramePacingRequire(VulkanPresentModeSelector.TrySelect(true, true, true, true, out selected)
          && selected == VkConstants.VK_PRESENT_MODE_FIFO_KHR,
        "S16 VSync-on did not select FIFO")
      FramePacingRequire(VulkanPresentModeSelector.TrySelect(false, true, true, true, out selected)
          && selected == VkConstants.VK_PRESENT_MODE_IMMEDIATE_KHR,
        "S16 VSync-off did not prefer immediate")
      FramePacingRequire(VulkanPresentModeSelector.TrySelect(false, false, true, true, out selected)
          && selected == VkConstants.VK_PRESENT_MODE_MAILBOX_KHR,
        "S16 VSync-off did not fall back to mailbox")
      FramePacingRequire(VulkanPresentModeSelector.TrySelect(false, false, false, true, out selected)
          && selected == VkConstants.VK_PRESENT_MODE_FIFO_KHR,
        "S16 VSync-off did not fall back to FIFO")
      FramePacingRequire(!VulkanPresentModeSelector.TrySelect(true, true, true, false, out selected),
        "S16 VSync-on accepted a surface without FIFO")
      FramePacingRequire(!VulkanPresentModeSelector.TrySelect(false, false, false, false, out selected),
        "S16 present mode selection accepted an empty mode set")
      FramePacingRequire(selected != VkConstants.VK_PRESENT_MODE_FIFO_RELAXED_KHR,
        "S16 present mode selection returned FIFO relaxed")
    }

    private func CheckFramePacingRate(rate float64, display uint32,
      expectedWaitMs int32) {
        let frequency = float64(Stopwatch.Frequency)
        let base = 100000.0
        let interval = frequency / rate
        let pacing = SdlFramePacing{}
        pacing.Refresh(display, rate, base, true)
        FramePacingRequire(pacing.DisplayId == display,
          "S16 pacing display identity is incorrect")
        FramePacingRequire(Math.Abs(pacing.RefreshRate - rate) < 0.000000001,
          "S16 pacing refresh rate is incorrect")
        FramePacingRequire(pacing.IsDue(base),
          "S16 pacing reset did not make the first frame due")
        pacing.MarkFrame(base)
        FramePacingRequire(!pacing.IsDue(base + interval - 0.5),
          "S16 pacing deadline became due early")
        FramePacingRequire(pacing.WaitMilliseconds(base + interval * 0.5, 100)
          == expectedWaitMs,
          "S16 pacing wait rounding is incorrect")
        FramePacingRequire(pacing.IsDue(base + interval),
          "S16 pacing deadline was not due at one refresh interval")
        let late = base + interval * 5.25
        pacing.MarkFrame(late)
        let expectedNext = base + interval * 6.0
        FramePacingRequire(!pacing.IsDue(expectedNext - 0.5),
          "S16 pacing late-frame advancement drifted early")
        FramePacingRequire(pacing.IsDue(expectedNext + 1.0),
          "S16 pacing late-frame advancement did not stay anchored")
      }

    private func CheckFramePacingFallbackAndRetention() {
      let base = 300000.0
      let pacing = SdlFramePacing{}
      FramePacingRequire(!pacing.HasValidSample && pacing.DisplayId == 0u,
        "S16 pacing fallback started with a display sample")
      FramePacingRequire(Math.Abs(pacing.RefreshRate - 60.0) < 0.000000001,
        "S16 pacing fallback rate is not 60 Hz")
      pacing.Refresh(0u, 0.0, base, true)
      FramePacingRequire(!pacing.HasValidSample && pacing.DisplayId == 0u &&
        Math.Abs(pacing.RefreshRate - 60.0) < 0.000000001,
        "S16 pacing initial invalid sample changed the fallback")
      pacing.Refresh(uint32(5), 120.0, base + 1.0, true)
      pacing.MarkFrame(base + 1.0)
      pacing.Refresh(0u, 0.0, base + 2.0, true)
      FramePacingRequire(pacing.HasValidSample && pacing.DisplayId == uint32(5) &&
        Math.Abs(pacing.RefreshRate - 120.0) < 0.000000001,
        "S16 pacing transient invalid sample discarded the last valid sample")
      FramePacingRequire(pacing.IsDue(base + 2.0),
        "S16 pacing transient invalid sample did not reset the retained deadline")
      pacing.Refresh(uint32(5), -1.0, base + 3.0, false)
      FramePacingRequire(pacing.DisplayId == uint32(5) &&
        Math.Abs(pacing.RefreshRate - 120.0) < 0.000000001,
        "S16 pacing invalid mode rate changed the retained sample")
    }

    private func CheckFramePacingDefer() {
      let base = 400000.0
      let frequency = float64(Stopwatch.Frequency)
      let interval = frequency / 60.0
      let pacing = SdlFramePacing{}
      pacing.Refresh(uint32(9), 60.0, base, true)
      pacing.Defer(base)
      FramePacingRequire(!pacing.IsDue(base + interval - 0.5),
        "S16 pacing defer did not honor the full display cadence")
      FramePacingRequire(pacing.IsDue(base + interval + 0.5),
        "S16 pacing defer did not release at the display cadence")
    }

    private func FramePacingRequire(condition bool, message string) {
      if !condition {
        throw InvalidOperationException(message)
      }
    }

  }
}
