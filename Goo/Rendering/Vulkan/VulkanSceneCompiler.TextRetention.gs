package Goo

import System

internal sealed class VulkanRetainedTextSnapshot {
  private var segments []CachedTextSegmentRefRecord
  private var resourceRefs []ResourceId

  internal var ChunkBounds ConservativeBounds
  internal var SegmentCount int32
  internal var ResourceCount int32

  internal init() {
    segments = [1]CachedTextSegmentRefRecord
    resourceRefs = [1]ResourceId
  }

  internal prop Segments []CachedTextSegmentRefRecord{ get -> segments }
  internal prop ResourceRefs []ResourceId{ get -> resourceRefs }

  internal func EnsureCapacity(
    requiredSegments int32,
    requiredResources int32) {
      if requiredSegments > segments.Length {
        let expanded = [GrowthCapacity(segments.Length,
          requiredSegments)]CachedTextSegmentRefRecord
        CopySegments(segments, expanded, SegmentCount)
        segments = expanded
      }
      if requiredResources > resourceRefs.Length {
        let expanded = [GrowthCapacity(resourceRefs.Length,
          requiredResources)]ResourceId
        CopyResources(resourceRefs, expanded, ResourceCount)
        resourceRefs = expanded
      }
    }

  private func GrowthCapacity(current int32, required int32) int32 {
    var next = current
    while next < required {
      if next > Int32.MaxValue / 2 {
        return required
      }
      next = next * 2
    }
    return next
  }

  private func CopySegments(
    source []CachedTextSegmentRefRecord,
    destination []CachedTextSegmentRefRecord,
    count int32) {
      var index int32 = 0
      while index < count {
        destination[index] = source[index]
        index = index + 1
      }
    }

  private func CopyResources(
    source []ResourceId,
    destination []ResourceId,
    count int32) {
      var index int32 = 0
      while index < count {
        destination[index] = source[index]
        index = index + 1
      }
    }
}

internal sealed class VulkanRetainedTextSnapshotStorage {
  internal func Snapshot(owner VulkanSceneOwnerId) VulkanRetainedTextSnapshot ? -> owner.RetainedTextSnapshot

  internal func Capture(
    frame SceneFrame,
    owner VulkanSceneOwnerId,
    chunkIndex int32) bool{
      if chunkIndex < 0 || chunkIndex >= frame.ChunkCount || frame.ActiveChunk >= 0 {
        return false
      }
      let chunk = frame.Chunks[chunkIndex]
      if chunk.OwnerId != owner.Value
        || chunk.FirstDraw < 0 || chunk.DrawCount <= 0
        || chunk.FirstDraw > frame.DrawRefCount
        || chunk.DrawCount > frame.DrawRefCount - chunk.FirstDraw
        || chunk.FirstResource < 0 || chunk.ResourceCount < 0
        || chunk.FirstResource > frame.ResourceRefCount
        || chunk.ResourceCount > frame.ResourceRefCount - chunk.FirstResource{
          return false
        }
      var firstSegmentDraw = chunk.FirstDraw
      var segmentCount = chunk.DrawCount
      let firstReference = frame.DrawRefs[firstSegmentDraw]
      if firstReference.Kind == SceneDrawKind.RectClipBegin {
        if firstReference.Index < 0 || firstReference.Index >= frame.RectClipCount {
          return false
        }
        firstSegmentDraw = firstSegmentDraw + 1
        segmentCount = segmentCount - 1
      }
      if segmentCount <= 0 {
        return false
      }
      var expectedResources int32 = 0
      var index int32 = 0
      while index < segmentCount {
        let reference = frame.DrawRefs[firstSegmentDraw + index]
        if reference.Kind != SceneDrawKind.CachedTextSegment
          || reference.Index < 0
          || reference.Index >= frame.CachedTextSegmentCount{
            return false
          }
        let value = frame.CachedTextSegments[reference.Index]
        guard let segment = value.Segment else {
          return false
        }
        if reference.ClipChainId != 0
          || reference.ClipChainId != value.ClipChainId
          || !ValidSegmentReference(value, segment)
          || segment.GlyphCount > Int32.MaxValue - segment.RunCount{
            return false
          }
        let segmentResourceCount = segment.GlyphCount + segment.RunCount
        if expectedResources > chunk.ResourceCount
          || segmentResourceCount > chunk.ResourceCount - expectedResources{
            return false
          }
        var glyphIndex int32 = 0
        while glyphIndex < segment.GlyphCount {
          if !segment.GlyphResources[glyphIndex].IsValid
            || segment.GlyphResources[glyphIndex].Kind != SceneResourceKind.GlyphRun
            || !SameResource(
              frame.ResourceRefs[chunk.FirstResource + expectedResources],
              segment.GlyphResources[glyphIndex]) {
                return false
              }
          expectedResources = expectedResources + 1
          glyphIndex = glyphIndex + 1
        }
        var runIndex int32 = 0
        while runIndex < segment.RunCount {
          let run = segment.Runs[runIndex]
          if !run.AtlasId.IsValid
            || run.AtlasId.Kind != SceneResourceKind.Atlas
            || !SameResource(
              frame.ResourceRefs[chunk.FirstResource + expectedResources],
              run.AtlasId) {
                return false
              }
          expectedResources = expectedResources + 1
          runIndex = runIndex + 1
        }
        index = index + 1
      }
      if expectedResources != chunk.ResourceCount {
        return false
      }
      var snapshot = owner.RetainedTextSnapshot
      if snapshot == nil {
        snapshot = VulkanRetainedTextSnapshot()
        owner.RetainedTextSnapshot = snapshot
      }
      let resolved = snapshot!!
      resolved.EnsureCapacity(segmentCount, chunk.ResourceCount)
      index = 0
      while index < segmentCount {
        let reference = frame.DrawRefs[firstSegmentDraw + index]
        resolved.Segments[index] = frame.CachedTextSegments[reference.Index]
        index = index + 1
      }
      index = 0
      while index < chunk.ResourceCount {
        resolved.ResourceRefs[index] = frame.ResourceRefs[chunk.FirstResource + index]
        index = index + 1
      }
      resolved.ChunkBounds = chunk.Bounds
      resolved.SegmentCount = segmentCount
      resolved.ResourceCount = chunk.ResourceCount
      return true
    }

  internal func ValidSegmentReference(
    value CachedTextSegmentRefRecord,
    segment VulkanRetainedTextSegment) bool -> value.SegmentId != 0uL
    && value.SegmentId == segment.Id
    && value.SegmentVersion != 0uL
    && value.SegmentVersion == segment.Version
    && value.GlyphCount > 0
    && value.GlyphCount == segment.GlyphCount
    && value.ClipChainId == segment.ClipChainId
    && value.FirstInstance == -1
    && segment.AtlasGeneration != 0uL
    && segment.RecordCount == segment.GlyphCount
    && segment.GlyphResourceCount == segment.GlyphCount
    && segment.RunCount > 0
    && segment.RunCount <= segment.Runs.Length
    && segment.GlyphCount <= segment.Records.Length
    && segment.GlyphCount <= segment.GlyphResources.Length
    && segment.GlyphCount <= segment.GlyphAtlasTexelOffsets.Length
    && segment.GlyphCount <= segment.GlyphAtlasTexelCounts.Length
    && segment.GlyphCount <= segment.GlyphEffectAtlasTexelOffsets.Length
    && segment.GlyphCount <= segment.GlyphEffectAtlasTexelCounts.Length
    && ValidBounds(value.Bounds)
    && value.Bounds.X == segment.Bounds.X
    && value.Bounds.Y == segment.Bounds.Y
    && value.Bounds.Width == segment.Bounds.Width
    && value.Bounds.Height == segment.Bounds.Height
    && ValidRuns(segment)

  private func ValidRuns(segment VulkanRetainedTextSegment) bool {
    var index int32 = 0
    var count int32 = 0
    while index < segment.RunCount {
      let run = segment.Runs[index]
      if run.FirstInstance != count || run.InstanceCount <= 0
        || run.PipelineKind > 1u
        || !run.AtlasId.IsValid
        || run.AtlasId.Kind != SceneResourceKind.Atlas
        || run.InstanceCount > segment.GlyphCount - count{
          return false
        }
      count = count + run.InstanceCount
      index = index + 1
    }
    return count == segment.GlyphCount
  }

  private func ValidBounds(value ConservativeBounds) bool -> !value.IsEmpty
    && !Single.IsNaN(value.X) && !Single.IsInfinity(value.X)
    && !Single.IsNaN(value.Y) && !Single.IsInfinity(value.Y)
    && !Single.IsNaN(value.Width) && !Single.IsInfinity(value.Width)
    && !Single.IsNaN(value.Height) && !Single.IsInfinity(value.Height)

  private func SameResource(left ResourceId, right ResourceId) bool -> left.Kind == right.Kind && left.LogicalId == right.LogicalId
    && left.Version == right.Version
}

internal partial class VulkanSceneCompiler {
  private let retainedTextSnapshots VulkanRetainedTextSnapshotStorage =
  VulkanRetainedTextSnapshotStorage()
  private var retainedTextHitCount uint64
  private var retainedTextRebuildCount uint64
  private var retainedTextFallbackCount uint64
  private var retainedTextInvalidationCount uint64
  private var retainedTextTotalCount uint64

  internal prop RetainedTextHitCount uint64{ get -> retainedTextHitCount }
  internal prop RetainedTextRebuildCount uint64{ get -> retainedTextRebuildCount }
  internal prop RetainedTextFallbackCount uint64{ get -> retainedTextFallbackCount }
  internal prop RetainedTextInvalidationCount uint64{
    get -> retainedTextInvalidationCount
  }
  internal prop RetainedTextTotalCount uint64{ get -> retainedTextTotalCount }

  internal func CaptureRetainedTextSnapshot(
    owner VulkanSceneOwnerId,
    chunkIndex int32) bool -> retainedTextSnapshots.Capture(frame, owner, chunkIndex)

  private func IncrementRetainedTextHit() {
    if retainedTextHitCount != uint64.MaxValue {
      retainedTextHitCount = retainedTextHitCount + 1uL
    }
  }

  private func IncrementRetainedTextRebuild() {
    if retainedTextRebuildCount != uint64.MaxValue {
      retainedTextRebuildCount = retainedTextRebuildCount + 1uL
    }
  }

  private func IncrementRetainedTextFallback() {
    if retainedTextFallbackCount != uint64.MaxValue {
      retainedTextFallbackCount = retainedTextFallbackCount + 1uL
    }
  }

  private func IncrementRetainedTextInvalidation() {
    if retainedTextInvalidationCount != uint64.MaxValue {
      retainedTextInvalidationCount = retainedTextInvalidationCount + 1uL
    }
  }

  private func IncrementRetainedTextTotal() {
    if retainedTextTotalCount != uint64.MaxValue {
      retainedTextTotalCount = retainedTextTotalCount + 1uL
    }
  }

  private func InvalidateRetainedText(owner VulkanSceneOwnerId) {
    if !owner.RetainedTextValid {
      return
    }
    owner.ClearRetainedText()
    IncrementRetainedTextInvalidation()
  }

  private func RetainedTextEligible(
    node Node,
    owner VulkanSceneOwnerId,
    bounds ConservativeBounds,
    opacity float32,
    parentTransformIndex int32,
    parentClipIndex int32,
    parentOpacity float32,
    parentAxisAligned bool,
    parentClipDepth int32,
    parentPathClipChainId int32,
    activeClipBounds ConservativeBounds) bool -> textScene != nil
    && !bounds.IsEmpty
    && Finite(opacity)
    && opacity > 0.0F
    && !Double.IsNaN(node.Opacity)
    && !Double.IsInfinity(node.Opacity)
    && Finite(node.Color.R)
    && Finite(node.Color.G)
    && Finite(node.Color.B)
    && Finite(node.Color.A)
    && !styleMaskHas(node.AppliedMask, StyleField.ShaderEffect)
    && StrictPlainTextContentEligible(node, owner, bounds)
    && RetainedTextOwnRectClipSupported(
      node, bounds, parentAxisAligned, parentClipDepth)
    && RetainedTextContextSupported(parentTransformIndex, parentClipIndex,
      parentOpacity, parentAxisAligned, parentClipDepth,
      parentPathClipChainId, activeClipBounds)

  private func RetainedTextContextSupported(
    parentTransformIndex int32,
    parentClipIndex int32,
    parentOpacity float32,
    parentAxisAligned bool,
    parentClipDepth int32,
    parentPathClipChainId int32,
    activeClipBounds ConservativeBounds) bool{
      if !ExactFloat(parentOpacity, 1.0F) || !parentAxisAligned
        || parentPathClipChainId != 0 {
          return false
        }
      let viewport = ConservativeBounds{
        X: 0.0F,
        Y: 0.0F,
        Width: clipViewportWidth,
        Height: clipViewportHeight,
      }
      if parentClipDepth == 0 {
        return parentTransformIndex == -1 && parentClipIndex == -1
          && ExactBounds(activeClipBounds, viewport)
      }
      if parentClipDepth != 1 || parentClipIndex < 0
        || parentClipIndex >= frame.RectClipCount
        || parentTransformIndex < -1
        || parentTransformIndex >= frame.TransformCount{
          return false
        }
      let parentTransform = ResolveCompilerFrameTransform(parentTransformIndex)
      if !RetainedTextUnitTranslation(parentTransform) {
        return false
      }
      let clip = frame.RectClips[parentClipIndex]
      if clip.ParentIndex != -1 {
        return false
      }
      let clipTransform = ResolveCompilerFrameTransform(clip.TransformIndex)
      if !RetainedTextUnitTranslation(clipTransform) {
        return false
      }
      let expectedClipBounds = IntersectBounds(viewport,
        TransformCompilerBounds(clip.Bounds, clipTransform))
      return !expectedClipBounds.IsEmpty
        && ExactBounds(activeClipBounds, expectedClipBounds)
    }

  private func RetainedTextOwnRectClipSupported(
    node Node,
    bounds ConservativeBounds,
    parentAxisAligned bool,
    parentClipDepth int32) bool{
      if node.OverflowX == Overflow.Visible
        && node.OverflowY == Overflow.Visible{
          return true
        }
      return node.OverflowX == Overflow.Hidden
        && node.OverflowY == Overflow.Hidden
        && parentAxisAligned
        && parentClipDepth < MaxRectClipDepth
        && !HasRadius(node, bounds)
    }

  private func RetainedTextUnitTranslation(value PrimitiveTransform) bool -> ExactFloat(value.A, 1.0F)
    && ExactFloat(value.B, 0.0F)
    && ExactFloat(value.C, 0.0F)
    && ExactFloat(value.D, 1.0F)
    && Finite(value.TX)
    && Finite(value.TY)

  private func TryAppendRetainedText(
    node Node,
    owner VulkanSceneOwnerId,
    bounds ConservativeBounds,
    opacity float32,
    parentTransformIndex int32,
    parentClipIndex int32,
    parentClipDepth int32,
    activeClipBounds ConservativeBounds) bool{
      if !owner.RetainedTextValid {
        return false
      }
      guard let scene = textScene else {
        InvalidateRetainedText(owner)
        return false
      }
      let parentTransform = ResolveCompilerFrameTransform(parentTransformIndex)
      if !Object.ReferenceEquals(owner.RetainedTextContent, node.Content)
        || owner.RetainedTextPaintVersion != node.ScenePaintVersion
        || owner.RetainedTextFontRegistryGeneration != FontRegistry.Generation
        || !ExactBounds(owner.RetainedTextBounds, bounds)
        || owner.RetainedTextColor != node.Color.ToPackedRgba()
        || !ExactFloat(owner.RetainedTextOpacity, opacity)
        || owner.RetainedTextAtlasGeneration != scene.ResourceGeneration
        || !ExactFloat(owner.RetainedTextParentTranslateX, parentTransform.TX)
        || !ExactFloat(owner.RetainedTextParentTranslateY, parentTransform.TY)
        || owner.RetainedTextClipDepth != parentClipDepth
        || !ExactBounds(owner.RetainedTextClipBounds, activeClipBounds) {
          InvalidateRetainedText(owner)
          return false
        }
      guard let snapshot = retainedTextSnapshots.Snapshot(owner) else {
        InvalidateRetainedText(owner)
        return false
      }
      let ownRectClip = node.OverflowX == Overflow.Hidden
        && node.OverflowY == Overflow.Hidden
      let rectClip = RectClipRecord{
        Bounds: bounds,
        TransformIndex: parentTransformIndex,
        ParentIndex: parentClipIndex,
      }
      if !ProtectRetainedTextAtlases(scene, snapshot)
        || !frame.AppendRetainedTextSnapshot(owner.Value, frameVersion, snapshot,
          ownRectClip, rectClip) {
            InvalidateRetainedText(owner)
            return false
          }
      IncrementRetainedTextHit()
      return true
    }

  private func ProtectRetainedTextAtlases(
    scene VulkanTextScene,
    snapshot VulkanRetainedTextSnapshot) bool{
      if snapshot.SegmentCount < 0
        || snapshot.SegmentCount > snapshot.Segments.Length
        || snapshot.ResourceCount < 0
        || snapshot.ResourceCount > snapshot.ResourceRefs.Length{
          return false
        }
      var index int32 = 0
      while index < snapshot.ResourceCount {
        let resource = snapshot.ResourceRefs[index]
        if resource.Kind == SceneResourceKind.Atlas
          && !scene.TryMarkAtlasActive(resource) {
            return false
          }
        index = index + 1
      }
      var expectedResources int32 = 0
      index = 0
      while index < snapshot.SegmentCount {
        let value = snapshot.Segments[index]
        guard let segment = value.Segment else {
          return false
        }
        if !retainedTextSnapshots.ValidSegmentReference(value, segment)
          || segment.GlyphCount > Int32.MaxValue - segment.RunCount{
            return false
          }
        let segmentResourceCount = segment.GlyphCount + segment.RunCount
        if expectedResources > snapshot.ResourceCount
          || segmentResourceCount > snapshot.ResourceCount - expectedResources{
            return false
          }
        var glyphIndex int32 = 0
        while glyphIndex < segment.GlyphCount {
          if !SameRetainedTextResource(
            snapshot.ResourceRefs[expectedResources],
            segment.GlyphResources[glyphIndex]) {
              return false
            }
          expectedResources = expectedResources + 1
          glyphIndex = glyphIndex + 1
        }
        var glyphBase int32 = 0
        var runIndex int32 = 0
        while runIndex < segment.RunCount {
          let run = segment.Runs[runIndex]
          if run.InstanceCount > segment.GlyphCount - glyphBase
            || !scene.TryMarkAtlasActive(run.AtlasId) {
              return false
            }
          if !SameRetainedTextResource(
            snapshot.ResourceRefs[expectedResources],
            run.AtlasId) {
              return false
            }
          expectedResources = expectedResources + 1
          let runEnd = glyphBase + run.InstanceCount
          if run.ByteRangeEnd == 0uL
            || !scene.IsAtlasRangeResident(
              run.AtlasId, run.ByteRangeEnd) {
                return false
              }
          glyphBase = runEnd
          runIndex = runIndex + 1
        }
        if glyphBase != segment.GlyphCount {
          return false
        }
        index = index + 1
      }
      return expectedResources == snapshot.ResourceCount
    }

  private func SameRetainedTextResource(
    left ResourceId,
    right ResourceId) bool -> left.Kind == right.Kind
    && left.LogicalId == right.LogicalId
    && left.Version == right.Version

  private func StoreRetainedTextFingerprint(
    node Node,
    owner VulkanSceneOwnerId,
    bounds ConservativeBounds,
    opacity float32,
    parentTransformIndex int32,
    parentClipDepth int32,
    activeClipBounds ConservativeBounds) {
      guard let scene = textScene else {
        throw InvalidOperationException("Vulkan retained text scene is unavailable")
      }
      guard let layout = node.TextLayout else {
        throw InvalidOperationException("Vulkan retained text layout is unavailable")
      }
      let parentTransform = ResolveCompilerFrameTransform(parentTransformIndex)
      owner.RetainedTextContent = node.Content
      owner.RetainedTextPaintVersion = node.ScenePaintVersion
      owner.RetainedTextFontRegistryGeneration = layout.FontRegistryGeneration
      owner.RetainedTextBounds = bounds
      owner.RetainedTextColor = node.Color.ToPackedRgba()
      owner.RetainedTextOpacity = opacity
      owner.RetainedTextAtlasGeneration = scene.ResourceGeneration
      owner.RetainedTextParentTranslateX = parentTransform.TX
      owner.RetainedTextParentTranslateY = parentTransform.TY
      owner.RetainedTextClipDepth = parentClipDepth
      owner.RetainedTextClipBounds = activeClipBounds
      owner.RetainedTextValid = true
    }
}
