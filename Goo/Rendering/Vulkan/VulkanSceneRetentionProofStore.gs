package Goo

import System

internal struct VulkanSceneTextChunkProof {
  internal var HasText bool
  internal var CachedTextSegmentStart int32
  internal var CachedTextSegmentCount int32
}

internal class VulkanSceneRetentionProofStore {
  private var chunks []VulkanSceneChunkIdentity
  private var draws []VulkanSceneDrawIdentity
  private var nextDraws []VulkanSceneDrawIdentity
  private var resources []ResourceId
  private var nextResources []ResourceId
  private var textProofs []VulkanSceneTextChunkProof
  private var nextTextProofs []VulkanSceneTextChunkProof
  private var cachedTextSegments []CachedTextSegmentRefRecord
  private var nextCachedTextSegments []CachedTextSegmentRefRecord
  private var chunkCount int32
  private var drawCount int32
  private var resourceCount int32
  private var cachedTextSegmentCount int32
  private var ready bool

  internal init(capacity int32) {
    if capacity <= 0 {
      throw ArgumentOutOfRangeException("capacity")
    }
    chunks = [capacity]VulkanSceneChunkIdentity
    draws = [capacity]VulkanSceneDrawIdentity
    nextDraws = [capacity]VulkanSceneDrawIdentity
    resources = [capacity]ResourceId
    nextResources = [capacity]ResourceId
    textProofs = [capacity]VulkanSceneTextChunkProof
    nextTextProofs = [capacity]VulkanSceneTextChunkProof
    cachedTextSegments = [capacity]CachedTextSegmentRefRecord
    nextCachedTextSegments = [capacity]CachedTextSegmentRefRecord
  }

  internal prop Ready bool{
    get -> ready
  }

  internal prop ChunkCount int32{
    get -> chunkCount
  }

  internal prop Chunks []VulkanSceneChunkIdentity{
    get -> chunks
  }

  internal prop Draws []VulkanSceneDrawIdentity{
    get -> draws
  }

  internal prop Resources []ResourceId{
    get -> resources
  }

  internal prop TextProofs []VulkanSceneTextChunkProof{
    get -> textProofs
  }

  internal prop CachedTextSegments []CachedTextSegmentRefRecord{
    get -> cachedTextSegments
  }

  internal prop CachedTextSegmentCount int32{
    get -> cachedTextSegmentCount
  }

  internal func Reset() {
    chunkCount = 0
    drawCount = 0
    resourceCount = 0
    cachedTextSegmentCount = 0
    ready = false
  }

  internal func EnsureFor(frame SceneFrame) {
    if frame == nil {
      throw ArgumentNullException("frame")
    }
    EnsureChunkCapacity(frame.ChunkCount)
    EnsureDrawCapacity(frame.DrawRefCount)
    EnsureResourceCapacity(frame.ResourceRefCount)
    EnsureSegmentCapacity(frame.CachedTextSegmentCount)
  }

  internal func Capture(frame SceneFrame) {
    EnsureFor(frame)
    var drawCursor int32 = 0
    var resourceCursor int32 = 0
    var segmentCursor int32 = 0
    var index int32 = 0
    while index < frame.ChunkCount {
      let current = frame.Chunks[index]
      var proofDrawStart int32 = -1
      var proofResourceStart int32 = -1
      var proofValid = false
      var textProof = VulkanSceneTextChunkProof{
        HasText: false,
        CachedTextSegmentStart: -1,
        CachedTextSegmentCount: 0,
      }
      if current.RetentionState == SceneChunkRetentionState.Generic {
        proofDrawStart = drawCursor
        proofResourceStart = resourceCursor
        proofValid = true
        var drawIndex int32 = 0
        while drawIndex < current.DrawCount {
          let reference = frame.DrawRefs[current.FirstDraw + drawIndex]
          var retained = VulkanSceneDrawIdentity{
            Kind: reference.Kind,
            Flags: reference.Flags,
            ClipChainId: reference.ClipChainId,
            Solid: SolidBoxRecord{},
            Rounded: RoundedBoxRecord{},
            Border: PerEdgeBorderRecord{},
          }
          if reference.Kind == SceneDrawKind.SolidBox {
            retained.Solid = frame.SolidBoxes[reference.Index]
          } else if reference.Kind == SceneDrawKind.RoundedBox {
            retained.Rounded = frame.RoundedBoxes[reference.Index]
          } else if reference.Kind == SceneDrawKind.PerEdgeBorder {
            retained.Border = frame.PerEdgeBorders[reference.Index]
          } else if reference.Kind == SceneDrawKind.CachedTextSegment {
            if !textProof.HasText {
              textProof.HasText = true
              textProof.CachedTextSegmentStart = segmentCursor
            }
            nextCachedTextSegments[segmentCursor] =
            frame.CachedTextSegments[reference.Index]
            segmentCursor = segmentCursor + 1
            textProof.CachedTextSegmentCount =
            textProof.CachedTextSegmentCount + 1
          } else {
            proofValid = false
          }
          nextDraws[drawCursor] = retained
          drawCursor = drawCursor + 1
          drawIndex = drawIndex + 1
        }
        var resourceIndex int32 = 0
        while resourceIndex < current.ResourceCount {
          nextResources[resourceCursor] = frame.ResourceRefs[
            current.FirstResource + resourceIndex]
          resourceCursor = resourceCursor + 1
          resourceIndex = resourceIndex + 1
        }
      }
      nextTextProofs[index] = textProof
      var exactLeafKind SceneDrawKind = SceneDrawKind.SolidBox
      if current.RetentionState != SceneChunkRetentionState.Generic
        && current.DrawCount == 1 {
          exactLeafKind = frame.DrawRefs[current.FirstDraw].Kind
        }
      chunks[index] = VulkanSceneChunkIdentity{
        OwnerId: current.OwnerId,
        Version: current.Version,
        Bounds: current.Bounds,
        ContentKey: current.ContentKey,
        TopologyKey: current.TopologyKey,
        RetentionState: current.RetentionState,
        ExactLeafKind: exactLeafKind,
        ProofDrawStart: proofDrawStart,
        ProofDrawCount: current.DrawCount,
        ProofResourceStart: proofResourceStart,
        ProofResourceCount: current.ResourceCount,
        ProofValid: proofValid,
      }
      index = index + 1
    }
    let previousDraws = draws
    draws = nextDraws
    nextDraws = previousDraws
    let previousResources = resources
    resources = nextResources
    nextResources = previousResources
    let previousTextProofs = textProofs
    textProofs = nextTextProofs
    nextTextProofs = previousTextProofs
    let previousSegments = cachedTextSegments
    cachedTextSegments = nextCachedTextSegments
    nextCachedTextSegments = previousSegments
    chunkCount = frame.ChunkCount
    drawCount = drawCursor
    resourceCount = resourceCursor
    cachedTextSegmentCount = segmentCursor
    ready = true
  }

  private func EnsureChunkCapacity(required int32) {
    let capacity = GrowthCapacity(Max(chunks.Length,
      Max(textProofs.Length, nextTextProofs.Length)), required)
    if capacity > chunks.Length {
      let expanded = [capacity]VulkanSceneChunkIdentity
      Array.Copy(chunks, expanded, chunkCount)
      chunks = expanded
    }
    if capacity > textProofs.Length {
      let expanded = [capacity]VulkanSceneTextChunkProof
      Array.Copy(textProofs, expanded, chunkCount)
      textProofs = expanded
    }
    if capacity > nextTextProofs.Length {
      nextTextProofs = [capacity]VulkanSceneTextChunkProof
    }
  }

  private func EnsureDrawCapacity(required int32) {
    let capacity = GrowthCapacity(Max(draws.Length, nextDraws.Length), required)
    if capacity > draws.Length {
      let expanded = [capacity]VulkanSceneDrawIdentity
      Array.Copy(draws, expanded, drawCount)
      draws = expanded
    }
    if capacity > nextDraws.Length {
      nextDraws = [capacity]VulkanSceneDrawIdentity
    }
  }

  private func EnsureResourceCapacity(required int32) {
    let capacity = GrowthCapacity(Max(resources.Length, nextResources.Length), required)
    if capacity > resources.Length {
      let expanded = [capacity]ResourceId
      Array.Copy(resources, expanded, resourceCount)
      resources = expanded
    }
    if capacity > nextResources.Length {
      nextResources = [capacity]ResourceId
    }
  }

  private func EnsureSegmentCapacity(required int32) {
    let capacity = GrowthCapacity(Max(cachedTextSegments.Length,
      nextCachedTextSegments.Length), required)
    if capacity > cachedTextSegments.Length {
      let expanded = [capacity]CachedTextSegmentRefRecord
      Array.Copy(cachedTextSegments, expanded, cachedTextSegmentCount)
      cachedTextSegments = expanded
    }
    if capacity > nextCachedTextSegments.Length {
      nextCachedTextSegments = [capacity]CachedTextSegmentRefRecord
    }
  }

  private func GrowthCapacity(current int32, required int32) int32 {
    if required < 0 {
      throw ArgumentOutOfRangeException("required")
    }
    var capacity = current > 0 ? current : 1
    while capacity < required {
      if capacity > Int32.MaxValue / 2 {
        return required
      }
      capacity = capacity * 2
    }
    return capacity
  }

  private func Max(left int32, right int32) int32
  -> left > right ? left : right
}
