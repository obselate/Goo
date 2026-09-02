package Goo.VulkanProof

import System
import System.IO

internal class VulkanTextPaintReadbackContract {
  const Width uint32 = 64u
  const Height uint32 = 64u
  const MinBackgroundPixels uint32 = 1000u
  const MinColoredPixelsPerGlyph uint32 = 64u
}

internal data struct VulkanTextPaintReadbackResult {
  var Digest uint64
  var InkPixels uint32
  var BackgroundPixels uint32
  var OpaquePixels uint32
  var ColoredPixels uint32
  var LeftColoredPixels uint32
  var RightColoredPixels uint32
}

internal unsafe sealed class VulkanTextPaintReadbackFixture : IDisposable {
  private var firstFont VulkanTextFont? = nil
  private var secondFont VulkanTextFont? = nil
  private var atlas VulkanTextAtlas? = nil
  private var frame SceneFrame? = nil
  private var firstEncoding VulkanTextPaintEncoding
  private var secondEncoding VulkanTextPaintEncoding
  private var firstGlyphId uint32
  private var secondGlyphId uint32
  private var disposed bool

  internal prop Atlas VulkanTextAtlas{ get -> atlas!! }
  internal prop Frame SceneFrame{ get -> frame!! }

  internal init(
    nativeDevice VkDevice,
    nativeDispatch VkDeviceDispatch,
    nativeAllocator VulkanMemoryAllocator,
    maxTexelBufferElements uint32) {
      try {
        let firstPath = Path.Combine(AppContext.BaseDirectory, "HarfBuzz-chromacheck-colr.ttf")
        let secondPath = Path.Combine(AppContext.BaseDirectory, "HarfBuzz-adwaita-colrv1.ttf")
        if !File.Exists(firstPath) {
          throw FileNotFoundException("HarfBuzz COLRv0 proof font is missing", firstPath)
        }
        if !File.Exists(secondPath) {
          throw FileNotFoundException("HarfBuzz COLRv1 proof font is missing", secondPath)
        }
        firstFont = LoadVulkanTextFont(firstPath, 16u)
        secondFont = LoadVulkanTextFont(secondPath, 16u)
        firstGlyphId = 1u
        secondGlyphId = 2u
        if !firstFont!!.HasColorLayers()
          || firstFont!!.HasColorPaint()
          || !secondFont!!.HasColorPaint()
          || secondFont!!.HasColorLayers()
          || !secondFont!!.GlyphHasColorPaint(secondGlyphId) {
            throw InvalidOperationException("HarfBuzz COLR paint fixtures do not match the Vulkan proof contract")
          }
        firstEncoding = firstFont!!.EncodePaintGlyph(firstGlyphId, 0u)
        secondEncoding = secondFont!!.EncodePaintGlyph(secondGlyphId, 0u)
        if firstEncoding.Bytes.Length == 0 || secondEncoding.Bytes.Length == 0
          || (firstEncoding.Bytes.Length & 7) != 0
          || (secondEncoding.Bytes.Length & 7) != 0 {
            throw InvalidOperationException("HarfBuzz COLR paint blobs are not texel aligned")
          }
        let firstTexelCount = firstEncoding.Bytes.Length / 8
        let totalBytes = firstEncoding.Bytes.Length + secondEncoding.Bytes.Length
        let combined = [totalBytes]uint8
        var index int32 = 0
        while index < firstEncoding.Bytes.Length {
          combined[index] = firstEncoding.Bytes[index]
          index++
        }
        index = 0
        while index < secondEncoding.Bytes.Length {
          combined[firstEncoding.Bytes.Length + index] = secondEncoding.Bytes[index]
          index++
        }
        atlas = VulkanTextAtlas(nativeDevice, nativeDispatch, nativeAllocator,
          VkDeviceSize(totalBytes), maxTexelBufferElements)
        QueueVulkanTextPaintAtlasUpload(atlas!!, combined)
        frame = SceneFrame(2)
        BuildFrame(frame!!, uint32(firstTexelCount))
      } catch (error Exception) {
        Dispose()
        throw error
      }
    }

  internal func FlushBeforeSubmit() VkResult -> atlas!!.FlushBeforeSubmit()

  internal func MarkSubmitted(commandBuffer VkCommandBuffer, fence uint64) {
    atlas!!.MarkSubmitted(commandBuffer, fence)
  }

  internal func Collect(completedFence uint64) bool -> atlas!!.Collect(completedFence)

  internal func AbortUpload(commandBuffer VkCommandBuffer) bool {
    if atlas == nil {
      return false
    }
    return atlas!!.AbortUpload(commandBuffer)
  }

  public func Dispose() {
    if disposed {
      return
    }
    var firstError Exception? = nil
    if atlas != nil {
      try {
        atlas!!.Dispose()
        atlas = nil
      } catch (error Exception) {
        firstError = error
      }
    }
    if firstFont != nil {
      try {
        firstFont!!.Dispose()
        firstFont = nil
      } catch (error Exception) {
        if firstError == nil {
          firstError = error
        }
      }
    }
    if secondFont != nil {
      try {
        secondFont!!.Dispose()
        secondFont = nil
      } catch (error Exception) {
        if firstError == nil {
          firstError = error
        }
      }
    }
    frame = nil
    if firstError != nil {
      throw firstError!!
    }
    disposed = true
  }

  deinit{
    try {
      Dispose()
    } catch (error Exception) {
    }
  }

  private func BuildFrame(target SceneFrame, secondAtlasTexelOffset uint32) {
    let firstBounds = PaintBounds(firstEncoding.Extents)
    let secondBounds = PaintBounds(secondEncoding.Extents)
    target.BeginChunk(0x544558545041494EuL, 1uL,
      ConservativeBounds{ X: 0.0F, Y: -250.0F, Width: 1300.0F, Height: 1250.0F }, true)
    let firstTransform = target.AddTransform(TransformRecord{
      A: 0.025F,
      B: 0.0F,
      C: 0.0F,
      D: -0.025F,
      TX: 4.0F,
      TY: 54.0F,
      ParentIndex: -1,
    })
    let secondTransform = target.AddTransform(TransformRecord{
      A: 0.025F,
      B: 0.0F,
      C: 0.0F,
      D: -0.025F,
      TX: 29.0F,
      TY: 54.0F,
      ParentIndex: -1,
    })
    target.AddCachedGlyphRun(CachedGlyphRunRefRecord{
      Bounds: firstBounds,
      GlyphRunId: ProofResource(SceneResourceKind.GlyphRun, 9701uL),
      AtlasId: ProofResource(SceneResourceKind.Atlas, 9703uL),
      GlyphId: firstGlyphId,
      AtlasTexelOffset: 0u,
      AtlasTexelCount: uint32(firstEncoding.Bytes.Length / 8),
      GlyphMinX: float32(firstEncoding.Extents.XBearing),
      GlyphMinY: float32(firstEncoding.Extents.YBearing + firstEncoding.Extents.Height),
      GlyphMaxX: float32(firstEncoding.Extents.XBearing + firstEncoding.Extents.Width),
      GlyphMaxY: float32(firstEncoding.Extents.YBearing),
      Color: 0xFFFFFFFFu,
      RenderMode: 3u,
      TransformIndex: firstTransform,
    })
    target.AddCachedGlyphRun(CachedGlyphRunRefRecord{
      Bounds: secondBounds,
      GlyphRunId: ProofResource(SceneResourceKind.GlyphRun, 9702uL),
      AtlasId: ProofResource(SceneResourceKind.Atlas, 9703uL),
      GlyphId: secondGlyphId,
      AtlasTexelOffset: secondAtlasTexelOffset,
      AtlasTexelCount: uint32(secondEncoding.Bytes.Length / 8),
      GlyphMinX: float32(secondEncoding.Extents.XBearing),
      GlyphMinY: float32(secondEncoding.Extents.YBearing + secondEncoding.Extents.Height),
      GlyphMaxX: float32(secondEncoding.Extents.XBearing + secondEncoding.Extents.Width),
      GlyphMaxY: float32(secondEncoding.Extents.YBearing),
      Color: 0xFFFFFFFFu,
      RenderMode: 3u,
      TransformIndex: secondTransform,
    })
    target.EndChunk()
  }

  private func PaintBounds(extents VulkanTextGlyphExtents) ConservativeBounds {
    let minX = float32(extents.XBearing)
    let minY = float32(extents.YBearing + extents.Height)
    let maxX = float32(extents.XBearing + extents.Width)
    let maxY = float32(extents.YBearing)
    return ConservativeBounds{
      X: minX,
      Y: minY,
      Width: maxX - minX,
      Height: maxY - minY,
    }
  }
}

internal unsafe func QueueVulkanTextPaintAtlasUpload(atlas VulkanTextAtlas, bytes []uint8) {
  fixed source * uint8 = bytes{
    if !atlas.QueueUpload(source, VkDeviceSize(bytes.Length)) {
      throw InvalidOperationException("Vulkan COLR paint atlas upload did not queue")
    }
  }
}

internal unsafe func AnalyzeVulkanTextPaintReadback(
  readback * uint8,
  width uint32,
  height uint32) VulkanTextPaintReadbackResult{
    if readback == nil || width < VulkanTextPaintReadbackContract.Width
      || height < VulkanTextPaintReadbackContract.Height{
        throw ArgumentException("invalid Vulkan COLR paint readback")
      }
    var hash uint64 = 14695981039346656037uL
    var inkPixels uint32 = 0u
    var backgroundPixels uint32 = 0u
    var opaquePixels uint32 = 0u
    var coloredPixels uint32 = 0u
    var leftColoredPixels uint32 = 0u
    var rightColoredPixels uint32 = 0u
    var y uint32 = 0u
    while y < VulkanTextPaintReadbackContract.Height {
      var x uint32 = 0u
      while x < VulkanTextPaintReadbackContract.Width {
        let offset = uint64(y) * uint64(width) * 4uL + uint64(x) * 4uL
        let red = readback[offset]
        let green = readback[offset + 1uL]
        let blue = readback[offset + 2uL]
        let alpha = readback[offset + 3uL]
        hash = (hash ^ uint64(red)) * 1099511628211uL
        hash = (hash ^ uint64(green)) * 1099511628211uL
        hash = (hash ^ uint64(blue)) * 1099511628211uL
        hash = (hash ^ uint64(alpha)) * 1099511628211uL
        if alpha == 255u {
          opaquePixels++
        }
        let isBackground = red == 0u && green == 0u && blue == 0u && alpha == 255u
        if isBackground {
          backgroundPixels++
        } else if red != 0u || green != 0u || blue != 0u {
          inkPixels++
          if red != green || green != blue {
            coloredPixels++
            if x < 32u {
              leftColoredPixels++
            } else {
              rightColoredPixels++
            }
          }
        }
        x++
      }
      y++
    }
    return VulkanTextPaintReadbackResult{
      Digest: hash,
      InkPixels: inkPixels,
      BackgroundPixels: backgroundPixels,
      OpaquePixels: opaquePixels,
      ColoredPixels: coloredPixels,
      LeftColoredPixels: leftColoredPixels,
      RightColoredPixels: rightColoredPixels,
    }
  }

internal unsafe func VerifyVulkanTextPaintReadback(
  readback * uint8,
  width uint32,
  height uint32,
  result VulkanTextPaintReadbackResult) bool{
    if readback == nil || width < VulkanTextPaintReadbackContract.Width
      || height < VulkanTextPaintReadbackContract.Height{
        return false
      }
    let totalPixels = VulkanTextPaintReadbackContract.Width * VulkanTextPaintReadbackContract.Height
    if result.OpaquePixels != totalPixels
      || result.BackgroundPixels < VulkanTextPaintReadbackContract.MinBackgroundPixels
      || result.InkPixels == 0u
      || result.ColoredPixels < VulkanTextPaintReadbackContract.MinColoredPixelsPerGlyph
      || result.LeftColoredPixels < VulkanTextPaintReadbackContract.MinColoredPixelsPerGlyph
      || result.RightColoredPixels < VulkanTextPaintReadbackContract.MinColoredPixelsPerGlyph{
        return false
      }
    return result.BackgroundPixels + result.InkPixels == totalPixels
  }
