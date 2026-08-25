package Goo

import System

internal partial class VulkanSceneCompiler {
  private var retentionProofs VulkanSceneRetentionProofStore? = nil
  private var partialRedrawSafe bool
  private var damageJournal VulkanSceneDamageJournal? = nil
  private var retainedLeafHitCount uint64
  private var retainedLeafRebuildCount uint64
  private var retainedLeafFallbackCount uint64
  private var retainedLeafInvalidationCount uint64
  private var retainedLeafTotalCount uint64
  private var retainedBorderHitCount uint64
  private var retainedBorderRebuildCount uint64
  private var retainedBorderFallbackCount uint64
  private var retainedBorderInvalidationCount uint64
  private var retainedBorderTotalCount uint64
  private var retainedParentBoxHitCount uint64
  private var retainedParentBoxRebuildCount uint64
  private var retainedParentBoxFallbackCount uint64
  private var retainedParentBoxInvalidationCount uint64
  private var retainedParentBoxTotalCount uint64

  internal prop RetainedLeafHitCount uint64{ get { return retainedLeafHitCount } }
  internal prop RetainedLeafRebuildCount uint64{ get { return retainedLeafRebuildCount } }
  internal prop RetainedLeafFallbackCount uint64{ get { return retainedLeafFallbackCount } }
  internal prop RetainedLeafInvalidationCount uint64{ get { return retainedLeafInvalidationCount } }
  internal prop RetainedLeafTotalCount uint64{ get { return retainedLeafTotalCount } }
  internal prop RetainedBorderHitCount uint64{ get { return retainedBorderHitCount } }
  internal prop RetainedBorderRebuildCount uint64{ get { return retainedBorderRebuildCount } }
  internal prop RetainedBorderFallbackCount uint64{ get { return retainedBorderFallbackCount } }
  internal prop RetainedBorderInvalidationCount uint64{
    get { return retainedBorderInvalidationCount }
  }
  internal prop RetainedBorderTotalCount uint64{ get { return retainedBorderTotalCount } }
  internal prop RetainedParentBoxHitCount uint64{ get { return retainedParentBoxHitCount } }
  internal prop RetainedParentBoxRebuildCount uint64{
    get { return retainedParentBoxRebuildCount }
  }
  internal prop RetainedParentBoxFallbackCount uint64{
    get { return retainedParentBoxFallbackCount }
  }
  internal prop RetainedParentBoxInvalidationCount uint64{
    get { return retainedParentBoxInvalidationCount }
  }
  internal prop RetainedParentBoxTotalCount uint64{ get { return retainedParentBoxTotalCount } }

  private func IncrementRetainedLeafHit() {
    if retainedLeafHitCount != uint64.MaxValue {
      retainedLeafHitCount = retainedLeafHitCount + 1uL
    }
  }

  private func IncrementRetainedLeafRebuild() {
    if retainedLeafRebuildCount != uint64.MaxValue {
      retainedLeafRebuildCount = retainedLeafRebuildCount + 1uL
    }
  }

  private func IncrementRetainedLeafFallback() {
    if retainedLeafFallbackCount != uint64.MaxValue {
      retainedLeafFallbackCount = retainedLeafFallbackCount + 1uL
    }
  }

  private func IncrementRetainedLeafInvalidation() {
    if retainedLeafInvalidationCount != uint64.MaxValue {
      retainedLeafInvalidationCount = retainedLeafInvalidationCount + 1uL
    }
  }

  private func IncrementRetainedLeafTotal() {
    if retainedLeafTotalCount != uint64.MaxValue {
      retainedLeafTotalCount = retainedLeafTotalCount + 1uL
    }
  }

  private func IncrementRetainedBorderHit() {
    if retainedBorderHitCount != uint64.MaxValue {
      retainedBorderHitCount = retainedBorderHitCount + 1uL
    }
  }

  private func IncrementRetainedBorderRebuild() {
    if retainedBorderRebuildCount != uint64.MaxValue {
      retainedBorderRebuildCount = retainedBorderRebuildCount + 1uL
    }
  }

  private func IncrementRetainedBorderFallback() {
    if retainedBorderFallbackCount != uint64.MaxValue {
      retainedBorderFallbackCount = retainedBorderFallbackCount + 1uL
    }
  }

  private func IncrementRetainedBorderInvalidation() {
    if retainedBorderInvalidationCount != uint64.MaxValue {
      retainedBorderInvalidationCount = retainedBorderInvalidationCount + 1uL
    }
  }

  private func IncrementRetainedBorderTotal() {
    if retainedBorderTotalCount != uint64.MaxValue {
      retainedBorderTotalCount = retainedBorderTotalCount + 1uL
    }
  }

  private func IncrementRetainedParentBoxHit() {
    if retainedParentBoxHitCount != uint64.MaxValue {
      retainedParentBoxHitCount = retainedParentBoxHitCount + 1uL
    }
  }

  private func IncrementRetainedParentBoxRebuild() {
    if retainedParentBoxRebuildCount != uint64.MaxValue {
      retainedParentBoxRebuildCount = retainedParentBoxRebuildCount + 1uL
    }
  }

  private func IncrementRetainedParentBoxFallback() {
    if retainedParentBoxFallbackCount != uint64.MaxValue {
      retainedParentBoxFallbackCount = retainedParentBoxFallbackCount + 1uL
    }
  }

  private func IncrementRetainedParentBoxInvalidation() {
    if retainedParentBoxInvalidationCount != uint64.MaxValue {
      retainedParentBoxInvalidationCount = retainedParentBoxInvalidationCount + 1uL
    }
  }

  private func IncrementRetainedParentBoxTotal() {
    if retainedParentBoxTotalCount != uint64.MaxValue {
      retainedParentBoxTotalCount = retainedParentBoxTotalCount + 1uL
    }
  }

  private func InvalidateRetainedBox(owner VulkanSceneOwnerId) {
    if !owner.RetainedLeafValid {
      return
    }
    let isLeaf = owner.RetainedBoxIsLeaf
    let kind = owner.RetainedLeafKind
    owner.ClearRetainedLeaf()
    if isLeaf {
      if kind == SceneDrawKind.PerEdgeBorder {
        IncrementRetainedBorderInvalidation()
      } else {
        IncrementRetainedLeafInvalidation()
      }
    } else {
      IncrementRetainedParentBoxInvalidation()
    }
  }

  private func RetainedLeafContextDefault(
    parentTransformIndex int32,
    parentClipIndex int32,
    parentOpacity float32,
    parentAxisAligned bool,
    parentClipDepth int32,
    parentPathClipChainId int32,
    parentIsolated bool,
    activeClipBounds ConservativeBounds) bool -> parentTransformIndex == -1
    && parentClipIndex == -1
    && parentOpacity == 1.0F
    && parentAxisAligned
    && parentClipDepth == 0
    && parentPathClipChainId == 0
    && !parentIsolated
    && ExactBounds(activeClipBounds, ConservativeBounds{
      X: 0.0F,
      Y: 0.0F,
      Width: clipViewportWidth,
      Height: clipViewportHeight,
    })

  private func RetainedCommonEligible(
    node Node,
    bounds ConservativeBounds,
    opacity float32,
    parentTransformIndex int32,
    parentClipIndex int32,
    parentOpacity float32,
    parentAxisAligned bool,
    parentClipDepth int32,
    parentPathClipChainId int32,
    parentIsolated bool,
    activeClipBounds ConservativeBounds,
    requireNoChildren bool) bool{
      if (node.Kind != NodeKind.Container && node.Kind != NodeKind.Button)
        || (requireNoChildren && node.Children.Count != 0)
        || bounds.IsEmpty
        || !Finite(opacity)
        || opacity <= 0.0F
        || Double.IsNaN(node.Opacity) || Double.IsInfinity(node.Opacity)
        || !Finite(node.BackgroundColor.R) || !Finite(node.BackgroundColor.G)
        || !Finite(node.BackgroundColor.B) || !Finite(node.BackgroundColor.A)
        || node.BackgroundGradient != nil
        || node.HasBackgroundImageState
        || node.HasOutlineState
        || boxShadowCount(node.BoxShadows) != 0
        || node.HasTextShadowState
        || node.HasTextStrokeState
        || node.TextDecoration != TextDecoration.None
        || node.HasClipPath
        || ClipPaths.Fit(node) != ShapeFit.Fill
        || ClipPaths.FillRule(node) != FillRule.NonZero
        || node.OverflowX != Overflow.Visible
        || node.OverflowY != Overflow.Visible
        || node.HasTransformState
        || node.HasVisualTransform
        || node.ScrollX != 0.0F || node.ScrollY != 0.0F
        || node.BlendMode != BlendMode.Normal
        || styleMaskHas(node.AppliedMask, StyleField.ShaderEffect)
        || node.Hovered || node.Pressed || node.KeyboardPressed
        || node.Focused || node.Disabled
        || node.PointerPressCount != 0
        || !RetainedLeafContextDefault(parentTransformIndex, parentClipIndex,
          parentOpacity, parentAxisAligned, parentClipDepth,
          parentPathClipChainId, parentIsolated, activeClipBounds) {
            return false
          }
      return true
    }

  private func RetainedBoxEligible(
    node Node,
    bounds ConservativeBounds,
    opacity float32,
    parentTransformIndex int32,
    parentClipIndex int32,
    parentOpacity float32,
    parentAxisAligned bool,
    parentClipDepth int32,
    parentPathClipChainId int32,
    parentIsolated bool,
    activeClipBounds ConservativeBounds,
    requireNoChildren bool) bool{
      if !RetainedCommonEligible(node, bounds, opacity, parentTransformIndex,
        parentClipIndex, parentOpacity, parentAxisAligned, parentClipDepth,
        parentPathClipChainId, parentIsolated, activeClipBounds, requireNoChildren)
        || node.BackgroundColor.A <= 0.0F {
          return false
        }
      if node.BorderStyle != BorderStyle.Solid
        || HasBorderWidth(node, bounds)
        || node.BorderTopColor.A > 0.0F
        || node.BorderRightColor.A > 0.0F
        || node.BorderBottomColor.A > 0.0F
        || node.BorderLeftColor.A > 0.0F {
          return false
        }
      return true
    }

  private func RetainedBorderVisible(
    node Node,
    record PerEdgeBorderRecord) bool{
      let topVisible = record.TopWidth > 0.0F && node.BorderTopColor.A > 0.0F
      let rightVisible = record.RightWidth > 0.0F && node.BorderRightColor.A > 0.0F
      let bottomVisible = record.BottomWidth > 0.0F
        && node.BorderBottomColor.A > 0.0F
      let leftVisible = record.LeftWidth > 0.0F && node.BorderLeftColor.A > 0.0F
      return topVisible || rightVisible || bottomVisible || leftVisible
    }

  private func RetainedBorderColorsFinite(node Node) bool -> Finite(node.BorderTopColor.R) && Finite(node.BorderTopColor.G)
    && Finite(node.BorderTopColor.B) && Finite(node.BorderTopColor.A)
    && Finite(node.BorderRightColor.R) && Finite(node.BorderRightColor.G)
    && Finite(node.BorderRightColor.B) && Finite(node.BorderRightColor.A)
    && Finite(node.BorderBottomColor.R) && Finite(node.BorderBottomColor.G)
    && Finite(node.BorderBottomColor.B) && Finite(node.BorderBottomColor.A)
    && Finite(node.BorderLeftColor.R) && Finite(node.BorderLeftColor.G)
    && Finite(node.BorderLeftColor.B) && Finite(node.BorderLeftColor.A)

  private func RetainedBorderCandidate(node Node, bounds ConservativeBounds) bool -> node.Kind == NodeKind.Container || node.Kind == NodeKind.Button
  ? node.Children.Count == 0
    && !bounds.IsEmpty
    && node.BackgroundColor.A <= 0.0F
    && HasBorderWidth(node, bounds): false

  private func RetainedBorderEligible(
    node Node,
    bounds ConservativeBounds,
    opacity float32,
    parentTransformIndex int32,
    parentClipIndex int32,
    parentOpacity float32,
    parentAxisAligned bool,
    parentClipDepth int32,
    parentPathClipChainId int32,
    parentIsolated bool,
    activeClipBounds ConservativeBounds,
    out record PerEdgeBorderRecord) bool{
      record = PerEdgeBorderRecord{}
      if !RetainedCommonEligible(node, bounds, opacity, parentTransformIndex,
        parentClipIndex, parentOpacity, parentAxisAligned, parentClipDepth,
        parentPathClipChainId, parentIsolated, activeClipBounds, true)
        || node.Opacity != 1.0
        || node.BackgroundColor.A > 0.0F
        || node.BorderStyle != BorderStyle.Solid
        || HasRadius(node, bounds)
        || !RetainedBorderColorsFinite(node) {
          return false
        }
      record = RetainedBorderRecord(node, bounds, opacity)
      return RetainedBorderVisible(node, record)
    }

  private func RetainedLeafEligible(
    node Node,
    bounds ConservativeBounds,
    opacity float32,
    parentTransformIndex int32,
    parentClipIndex int32,
    parentOpacity float32,
    parentAxisAligned bool,
    parentClipDepth int32,
    parentPathClipChainId int32,
    parentIsolated bool,
    activeClipBounds ConservativeBounds) bool -> RetainedBoxEligible(node, bounds, opacity, parentTransformIndex,
      parentClipIndex, parentOpacity, parentAxisAligned, parentClipDepth,
      parentPathClipChainId, parentIsolated, activeClipBounds, true)

  private func RetainedParentBoxEligible(
    node Node,
    bounds ConservativeBounds,
    opacity float32,
    parentTransformIndex int32,
    parentClipIndex int32,
    parentOpacity float32,
    parentAxisAligned bool,
    parentClipDepth int32,
    parentPathClipChainId int32,
    parentIsolated bool,
    activeClipBounds ConservativeBounds) bool -> ExactFloat(opacity, 1.0F)
    && RetainedBoxEligible(node, bounds, opacity, parentTransformIndex,
      parentClipIndex, parentOpacity, parentAxisAligned, parentClipDepth,
      parentPathClipChainId, parentIsolated, activeClipBounds, false)

  private func ExactFloat(left float32, right float32) bool -> BitConverter.SingleToInt32Bits(left) == BitConverter.SingleToInt32Bits(right)

  private func ExactBounds(left ConservativeBounds, right ConservativeBounds) bool -> ExactFloat(left.X, right.X) && ExactFloat(left.Y, right.Y)
    && ExactFloat(left.Width, right.Width) && ExactFloat(left.Height, right.Height)

  private func TryAppendRetainedBox(
    node Node,
    owner VulkanSceneOwnerId,
    ownerId uint64,
    bounds ConservativeBounds,
    opacity float32,
    isLeaf bool) bool{
      if !owner.RetainedLeafValid
        || owner.RetainedLeafNodeKind != node.Kind
        || owner.RetainedLeafPaintVersion != node.ScenePaintVersion
        || !ExactBounds(owner.RetainedLeafBounds, bounds) {
          return false
        }
      let color = node.BackgroundColor.ToPackedRgba()
      if owner.RetainedLeafKind == SceneDrawKind.SolidBox {
        if HasRadius(node, bounds) {
          return false
        }
        let record = owner.RetainedLeafSolid
        if !ExactBounds(record.Bounds, bounds)
          || record.Color != color
          || !ExactFloat(record.Opacity, opacity)
          || record.TransformIndex != -1 {
            return false
          }
        frame.AppendRetainedSolidLeaf(ownerId, frameVersion, bounds, record)
        owner.RetainedBoxIsLeaf = isLeaf
        if isLeaf {
          IncrementRetainedLeafHit()
        } else {
          IncrementRetainedParentBoxHit()
        }
        return true
      }
      if owner.RetainedLeafKind == SceneDrawKind.RoundedBox {
        if !HasRadius(node, bounds) {
          return false
        }
        let record = owner.RetainedLeafRounded
        if !ExactBounds(record.Bounds, bounds)
          || !ExactFloat(record.RadiusTopLeft, Radius(node.BorderTopLeftRadius,
            node.BorderRadius, bounds))
          || !ExactFloat(record.RadiusTopRight, Radius(node.BorderTopRightRadius,
            node.BorderRadius, bounds))
          || !ExactFloat(record.RadiusBottomRight, Radius(node.BorderBottomRightRadius,
            node.BorderRadius, bounds))
          || !ExactFloat(record.RadiusBottomLeft, Radius(node.BorderBottomLeftRadius,
            node.BorderRadius, bounds))
          || record.Color != color
          || !ExactFloat(record.Opacity, opacity)
          || record.TransformIndex != -1 {
            return false
          }
        frame.AppendRetainedRoundedLeaf(ownerId, frameVersion, bounds, record)
        owner.RetainedBoxIsLeaf = isLeaf
        if isLeaf {
          IncrementRetainedLeafHit()
        } else {
          IncrementRetainedParentBoxHit()
        }
        return true
      }
      return false
    }

  private func RetainedBorderRecord(
    node Node,
    bounds ConservativeBounds,
    opacity float32) PerEdgeBorderRecord{
      let basis = MinDimension(bounds)
      return PerEdgeBorderRecord{
        Bounds: bounds,
        TopWidth: ResolveLength(node.BorderTopWidth, basis),
        RightWidth: ResolveLength(node.BorderRightWidth, basis),
        BottomWidth: ResolveLength(node.BorderBottomWidth, basis),
        LeftWidth: ResolveLength(node.BorderLeftWidth, basis),
        RadiusTopLeft: 0.0F,
        RadiusTopRight: 0.0F,
        RadiusBottomRight: 0.0F,
        RadiusBottomLeft: 0.0F,
        TopColor: EffectiveColor(node.BorderTopColor, opacity),
        RightColor: EffectiveColor(node.BorderRightColor, opacity),
        BottomColor: EffectiveColor(node.BorderBottomColor, opacity),
        LeftColor: EffectiveColor(node.BorderLeftColor, opacity),
        Style: uint32(int32(BorderStyle.Solid)),
        TransformIndex: -1,
      }
    }

  private func TryAppendRetainedBorder(
    node Node,
    owner VulkanSceneOwnerId,
    ownerId uint64,
    bounds ConservativeBounds,
    record PerEdgeBorderRecord) bool{
      if !owner.RetainedLeafValid
        || owner.RetainedLeafKind != SceneDrawKind.PerEdgeBorder
        || owner.RetainedLeafNodeKind != node.Kind
        || owner.RetainedLeafPaintVersion != node.ScenePaintVersion
        || !ExactBounds(owner.RetainedLeafBounds, bounds) {
          return false
        }
      if !ExactBorder(owner.RetainedLeafBorder, record) {
        return false
      }
      frame.AppendRetainedBorderLeaf(ownerId, frameVersion, bounds, record)
      owner.RetainedBoxIsLeaf = true
      IncrementRetainedBorderHit()
      return true
    }

  private func AppendRetainedBoxRebuild(
    node Node,
    owner VulkanSceneOwnerId,
    ownerId uint64,
    bounds ConservativeBounds,
    opacity float32,
    isLeaf bool) {
      let color = node.BackgroundColor.ToPackedRgba()
      let radiusTopLeft = Radius(node.BorderTopLeftRadius, node.BorderRadius, bounds)
      let radiusTopRight = Radius(node.BorderTopRightRadius, node.BorderRadius, bounds)
      let radiusBottomRight = Radius(node.BorderBottomRightRadius, node.BorderRadius, bounds)
      let radiusBottomLeft = Radius(node.BorderBottomLeftRadius, node.BorderRadius, bounds)
      if radiusTopLeft > 0.0F || radiusTopRight > 0.0F
        || radiusBottomRight > 0.0F || radiusBottomLeft > 0.0F {
          let record = RoundedBoxRecord{
            Bounds: bounds,
            RadiusTopLeft: radiusTopLeft,
            RadiusTopRight: radiusTopRight,
            RadiusBottomRight: radiusBottomRight,
            RadiusBottomLeft: radiusBottomLeft,
            Color: color,
            Opacity: opacity,
            TransformIndex: -1,
          }
          let chunk = frame.AppendRetainedRoundedLeaf(ownerId, frameVersion, bounds, record)
          frame.Chunks[chunk].RetentionState = SceneChunkRetentionState.ExactLeafRebuild
          owner.RetainedLeafKind = SceneDrawKind.RoundedBox
          owner.RetainedLeafNodeKind = node.Kind
          owner.RetainedLeafPaintVersion = node.ScenePaintVersion
          owner.RetainedLeafBounds = bounds
          owner.RetainedLeafRounded = record
        } else {
          let record = SolidBoxRecord{
            Bounds: bounds,
            Color: color,
            Opacity: opacity,
            TransformIndex: -1,
          }
          let chunk = frame.AppendRetainedSolidLeaf(ownerId, frameVersion, bounds, record)
          frame.Chunks[chunk].RetentionState = SceneChunkRetentionState.ExactLeafRebuild
          owner.RetainedLeafKind = SceneDrawKind.SolidBox
          owner.RetainedLeafNodeKind = node.Kind
          owner.RetainedLeafPaintVersion = node.ScenePaintVersion
          owner.RetainedLeafBounds = bounds
          owner.RetainedLeafSolid = record
        }
      owner.RetainedLeafValid = true
      owner.RetainedBoxIsLeaf = isLeaf
      if isLeaf {
        IncrementRetainedLeafRebuild()
      } else {
        IncrementRetainedParentBoxRebuild()
      }
      emittedNodeCount = emittedNodeCount + 1
    }

  private func AppendRetainedBorderRebuild(
    node Node,
    owner VulkanSceneOwnerId,
    ownerId uint64,
    bounds ConservativeBounds,
    record PerEdgeBorderRecord) {
      let chunk = frame.AppendRetainedBorderLeaf(ownerId, frameVersion, bounds, record)
      frame.Chunks[chunk].RetentionState = SceneChunkRetentionState.ExactLeafRebuild
      owner.RetainedLeafKind = SceneDrawKind.PerEdgeBorder
      owner.RetainedLeafNodeKind = node.Kind
      owner.RetainedLeafPaintVersion = node.ScenePaintVersion
      owner.RetainedLeafBounds = bounds
      owner.RetainedLeafBorder = record
      owner.RetainedLeafValid = true
      owner.RetainedBoxIsLeaf = true
      IncrementRetainedBorderRebuild()
      emittedNodeCount = emittedNodeCount + 1
    }

  private func TryAppendRetainedLeaf(
    node Node,
    owner VulkanSceneOwnerId,
    ownerId uint64,
    bounds ConservativeBounds,
    opacity float32) bool -> TryAppendRetainedBox(node, owner, ownerId, bounds, opacity, true)

  private func AppendRetainedLeafRebuild(
    node Node,
    owner VulkanSceneOwnerId,
    ownerId uint64,
    bounds ConservativeBounds,
    opacity float32) {
      AppendRetainedBoxRebuild(node, owner, ownerId, bounds, opacity, true)
    }

  private func TryAppendRetainedBorderLeaf(
    node Node,
    owner VulkanSceneOwnerId,
    ownerId uint64,
    bounds ConservativeBounds,
    record PerEdgeBorderRecord) bool -> TryAppendRetainedBorder(node, owner, ownerId, bounds, record)

  private func AppendRetainedBorderLeafRebuild(
    node Node,
    owner VulkanSceneOwnerId,
    ownerId uint64,
    bounds ConservativeBounds,
    record PerEdgeBorderRecord) {
      AppendRetainedBorderRebuild(node, owner, ownerId, bounds, record)
    }

  internal prop PartialRedrawSafe bool{
    get { return partialRedrawSafe }
  }

  internal prop DamageJournal VulkanSceneDamageJournal? {
    get { return damageJournal }
  }

  internal func InitializeRetention(capacity int32) {
    let journalCapacity = capacity < 32 ? 32 : capacity * 2
    damageJournal = VulkanSceneDamageJournal(journalCapacity)
    retentionProofs = VulkanSceneRetentionProofStore(capacity)
  }

  internal func BuildDamage(appliedVersion uint64, currentVersion uint64,
    scaleX float32, scaleY float32, extentWidth uint32, extentHeight uint32,
    out region VulkanDamageRegion, out fullRedraw bool) bool{
      guard let journal = damageJournal else {
        region = VulkanDamageRegion{}
        fullRedraw = true
        return true
      }
      let tracked = journal.BuildSince(appliedVersion, currentVersion, scaleX, scaleY,
        extentWidth, extentHeight, out region, out fullRedraw)
      if !partialRedrawSafe {
        region = VulkanDamageRegion{
          X: 0,
          Y: 0,
          Width: int32(extentWidth),
          Height: int32(extentHeight),
        }
        fullRedraw = true
        return true
      }
      return tracked
    }

  private func ClassifyRetainedChunks() {
    guard let journal = damageJournal else {
      throw InvalidOperationException("Vulkan scene damage journal is unavailable")
    }
    guard let proofs = retentionProofs else {
      throw InvalidOperationException("Vulkan retained scene proof storage is unavailable")
    }
    journal.BeginVersion(frameVersion)
    let currentCount = frame.ChunkCount
    let retainedChunks = proofs.Chunks
    var topologySame = proofs.Ready && proofs.ChunkCount == currentCount
    var index int32 = 0
    while index < currentCount {
      let current = frame.Chunks[index]
      if topologySame {
        let prior = retainedChunks[index]
        if prior.OwnerId != current.OwnerId {
          topologySame = false
        } else if !IsPlaceholderChunkTransition(current, prior) {
          var topologyMatches bool = false
          if current.RetentionState != SceneChunkRetentionState.Generic
            && prior.RetentionState != SceneChunkRetentionState.Generic{
              topologyMatches = ExactChunkTopology(index, prior)
            } else if prior.TopologyKey == current.TopologyKey {
              topologyMatches = ExactChunkTopology(index, prior)
            }
          if !topologyMatches {
            if current.DrawCount == 0 || prior.ProofDrawCount == 0 {
              topologySame = false
            }
          }
        }
      }
      index = index + 1
    }
    if !proofs.Ready {
      journal.MarkFullRedraw()
      index = 0
      while index < currentCount {
        let current = frame.Chunks[index]
        journal.AddChange(ConservativeBounds{}, false, current.Bounds, true)
        index = index + 1
      }
    } else if !topologySame {
      journal.MarkFullRedraw()
      let maximum = proofs.ChunkCount > currentCount ? proofs.ChunkCount : currentCount
      index = 0
      while index < maximum {
        let hasOld = index < proofs.ChunkCount
        let hasNew = index < currentCount
        let oldBounds = hasOld ? retainedChunks[index].Bounds : ConservativeBounds{}
        let newBounds = hasNew ? frame.Chunks[index].Bounds : ConservativeBounds{}
        journal.AddChange(oldBounds, hasOld, newBounds, hasNew)
        index = index + 1
      }
    } else {
      index = 0
      while index < currentCount {
        let current = frame.Chunks[index]
        let prior = retainedChunks[index]
        if IsPlaceholderChunkTransition(current, prior) {
          journal.AddChange(prior.Bounds, true, current.Bounds, true)
          frame.Chunks[index] = SceneChunk{
            OwnerId: current.OwnerId,
            Version: current.Version,
            Bounds: current.Bounds,
            FirstDraw: current.FirstDraw,
            DrawCount: current.DrawCount,
            FirstResource: current.FirstResource,
            ResourceCount: current.ResourceCount,
            ContentKey: current.ContentKey,
            TopologyKey: current.TopologyKey,
            Dirty: true,
            RetentionState: current.RetentionState,
          }
        } else if current.RetentionState == SceneChunkRetentionState.ExactLeafRebuild {
          journal.AddChange(prior.Bounds, true, current.Bounds, true)
        } else if (current.RetentionState == SceneChunkRetentionState.ExactLeafHit
            && prior.RetentionState != SceneChunkRetentionState.Generic)
          || (current.ContentKey == prior.ContentKey
              && ((current.RetentionState != SceneChunkRetentionState.Generic
                  && prior.RetentionState != SceneChunkRetentionState.Generic)
                  || ExactGenericChunkContent(index, prior))) {
                    frame.Chunks[index] = SceneChunk{
                      OwnerId: current.OwnerId,
                      Version: prior.Version,
                      Bounds: current.Bounds,
                      FirstDraw: current.FirstDraw,
                      DrawCount: current.DrawCount,
                      FirstResource: current.FirstResource,
                      ResourceCount: current.ResourceCount,
                      ContentKey: current.ContentKey,
                      TopologyKey: current.TopologyKey,
                      Dirty: false,
                      RetentionState: current.RetentionState,
                    }
                  } else {
                    journal.AddChange(prior.Bounds, true, current.Bounds, true)
                  }
        index = index + 1
      }
    }
    partialRedrawSafe = proofs.Ready && topologySame && !IsPartialUnsafe()
    if !partialRedrawSafe {
      journal.MarkFullRedraw()
    }
    journal.EndVersion()
    proofs.Capture(frame)
  }

  private func IsPlaceholderChunkTransition(
    current SceneChunk,
    prior VulkanSceneChunkIdentity) bool{
      if current.OwnerId != prior.OwnerId {
        return false
      }
      let currentPlaceholder = current.RetentionState == SceneChunkRetentionState.Generic
        && current.DrawCount == 0
      let priorPlaceholder = prior.RetentionState == SceneChunkRetentionState.Generic
        && prior.ProofDrawCount == 0
      if currentPlaceholder {
        return prior.RetentionState != SceneChunkRetentionState.Generic
          || prior.ProofDrawCount > 0
      }
      return priorPlaceholder && current.DrawCount > 0
    }

  private func IsPartialUnsafe() bool {
    if unsupportedNodeCount != 0 || unsupportedPrimitiveCount != 0
      || clipCount != 0 || pathClipCount != 0 || clipMaskCount != 0
      || clipChainCount != 0 {
        return true
      }
    var index int32 = 0
    while index < frame.DrawRefCount {
      let reference = frame.DrawRefs[index]
      let kind = reference.Kind
      if kind == SceneDrawKind.PerEdgeBorder {
        let value = frame.PerEdgeBorders[reference.Index]
        if value.Style != uint32(int32(BorderStyle.Solid))
          || value.RadiusTopLeft != 0.0F || value.RadiusTopRight != 0.0F
          || value.RadiusBottomRight != 0.0F
          || value.RadiusBottomLeft != 0.0F
          || value.TransformIndex != -1 {
            return true
          }
      } else if kind != SceneDrawKind.SolidBox && kind != SceneDrawKind.RoundedBox
        && kind != SceneDrawKind.CachedTextSegment{
          return true
        }
      index = index + 1
    }
    return false
  }

  private func ExactChunkTopology(index int32, prior VulkanSceneChunkIdentity) bool {
    let current = frame.Chunks[index]
    let currentExactLeaf = current.RetentionState != SceneChunkRetentionState.Generic
    let priorExactLeaf = prior.RetentionState != SceneChunkRetentionState.Generic
    if currentExactLeaf && priorExactLeaf {
      if current.DrawCount == 1 && current.ResourceCount == 0 {
        return prior.ExactLeafKind == frame.DrawRefs[current.FirstDraw].Kind
      }
    } else if currentExactLeaf != priorExactLeaf {
      return false
    }
    return current.DrawCount == prior.ProofDrawCount
      && current.ResourceCount == prior.ProofResourceCount
  }

  private func ExactGenericChunkContent(index int32,
    prior VulkanSceneChunkIdentity) bool{
      let current = frame.Chunks[index]
      if current.RetentionState != SceneChunkRetentionState.Generic
        || prior.RetentionState != SceneChunkRetentionState.Generic
        || !prior.ProofValid
        || !ExactBounds(current.Bounds, prior.Bounds) {
          return false
        }
      guard let proofs = retentionProofs else {
        return false
      }
      let draws = proofs.Draws
      let resources = proofs.Resources
      let cachedTextSegments = proofs.CachedTextSegments
      let textProof = proofs.TextProofs[index]
      if textProof.HasText {
        if textProof.CachedTextSegmentStart < 0
          || textProof.CachedTextSegmentCount < 0
          || textProof.CachedTextSegmentStart > proofs.CachedTextSegmentCount
          || textProof.CachedTextSegmentCount > proofs.CachedTextSegmentCount
        -textProof.CachedTextSegmentStart{
          return false
        }
      }
      var segmentProofIndex int32 = 0
      var drawIndex int32 = 0
      while drawIndex < current.DrawCount {
        let reference = frame.DrawRefs[current.FirstDraw + drawIndex]
        let retained = draws[prior.ProofDrawStart + drawIndex]
        if reference.Kind != retained.Kind || reference.Flags != retained.Flags
          || reference.ClipChainId != retained.ClipChainId{
            return false
          }
        if reference.Kind == SceneDrawKind.SolidBox {
          if !ExactSolid(frame.SolidBoxes[reference.Index], retained.Solid) {
            return false
          }
        } else if reference.Kind == SceneDrawKind.RoundedBox {
          if !ExactRounded(frame.RoundedBoxes[reference.Index], retained.Rounded) {
            return false
          }
        } else if reference.Kind == SceneDrawKind.PerEdgeBorder {
          if !ExactBorder(frame.PerEdgeBorders[reference.Index], retained.Border) {
            return false
          }
        } else if reference.Kind == SceneDrawKind.CachedTextSegment {
          if !textProof.HasText
            || segmentProofIndex >= textProof.CachedTextSegmentCount
            || !ExactCachedTextSegment(frame.CachedTextSegments[reference.Index],
              cachedTextSegments[
                textProof.CachedTextSegmentStart + segmentProofIndex]) {
                  return false
                }
          segmentProofIndex = segmentProofIndex + 1
        } else {
          return false
        }
        drawIndex = drawIndex + 1
      }
      if textProof.HasText
        && segmentProofIndex != textProof.CachedTextSegmentCount{
          return false
        }
      var resourceIndex int32 = 0
      while resourceIndex < current.ResourceCount {
        let currentResource = frame.ResourceRefs[current.FirstResource + resourceIndex]
        let retainedResource = resources[prior.ProofResourceStart + resourceIndex]
        if !ExactResource(currentResource, retainedResource) {
          return false
        }
        resourceIndex = resourceIndex + 1
      }
      return true
    }

  private func ExactSolid(left SolidBoxRecord, right SolidBoxRecord) bool -> ExactBounds(left.Bounds, right.Bounds)
    && left.Color == right.Color
    && ExactFloat(left.Opacity, right.Opacity)
    && left.TransformIndex == right.TransformIndex

  private func ExactRounded(left RoundedBoxRecord, right RoundedBoxRecord) bool -> ExactBounds(left.Bounds, right.Bounds)
    && ExactFloat(left.RadiusTopLeft, right.RadiusTopLeft)
    && ExactFloat(left.RadiusTopRight, right.RadiusTopRight)
    && ExactFloat(left.RadiusBottomRight, right.RadiusBottomRight)
    && ExactFloat(left.RadiusBottomLeft, right.RadiusBottomLeft)
    && left.Color == right.Color
    && ExactFloat(left.Opacity, right.Opacity)
    && left.TransformIndex == right.TransformIndex

  private func ExactBorder(left PerEdgeBorderRecord, right PerEdgeBorderRecord) bool -> ExactBounds(left.Bounds, right.Bounds)
    && ExactFloat(left.TopWidth, right.TopWidth)
    && ExactFloat(left.RightWidth, right.RightWidth)
    && ExactFloat(left.BottomWidth, right.BottomWidth)
    && ExactFloat(left.LeftWidth, right.LeftWidth)
    && ExactFloat(left.RadiusTopLeft, right.RadiusTopLeft)
    && ExactFloat(left.RadiusTopRight, right.RadiusTopRight)
    && ExactFloat(left.RadiusBottomRight, right.RadiusBottomRight)
    && ExactFloat(left.RadiusBottomLeft, right.RadiusBottomLeft)
    && left.TopColor == right.TopColor
    && left.RightColor == right.RightColor
    && left.BottomColor == right.BottomColor
    && left.LeftColor == right.LeftColor
    && left.Style == right.Style
    && left.TransformIndex == right.TransformIndex

  private func ExactCachedTextSegment(
    left CachedTextSegmentRefRecord,
    right CachedTextSegmentRefRecord) bool -> ExactBounds(left.Bounds, right.Bounds)
    && left.SegmentId == right.SegmentId
    && left.SegmentVersion == right.SegmentVersion
    && left.GlyphCount == right.GlyphCount
    && left.ClipChainId == right.ClipChainId
    && Object.ReferenceEquals(left.Segment, right.Segment)

  private func ExactResource(left ResourceId, right ResourceId) bool -> left.Kind == right.Kind && left.LogicalId == right.LogicalId
    && left.Version == right.Version

}
