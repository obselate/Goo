package Goo.VulkanProof

import System
import System.IO

internal class VulkanTextReadbackContract {
  const Width uint32 = 64u
  const Height uint32 = 64u
  const PixelHeight uint32 = 32u
  const MinInkPixels uint32 = 350u
  const MaxInkPixels uint32 = 650u
  const MinInkX uint32 = 9u
  const MaxInkX uint32 = 13u
  const MinInkY uint32 = 12u
  const MaxInkY uint32 = 17u
  const MinInkRight uint32 = 41u
  const MaxInkRight uint32 = 47u
  const MinInkBottom uint32 = 53u
  const MaxInkBottom uint32 = 58u
}

internal data struct VulkanTextReadbackResult {
  var Digest uint64
  var InkPixels uint32
  var BackgroundPixels uint32
  var OpaquePixels uint32
  var NonGrayPixels uint32
  var RedDominantPixels uint32
  var GreenDominantPixels uint32
  var GrayInkPixels uint32
  var MinInkX uint32
  var MinInkY uint32
  var MaxInkX uint32
  var MaxInkY uint32
}

internal unsafe sealed class VulkanTextReadbackFixture : IDisposable {
  private var font VulkanTextFont? = nil
  private var atlas VulkanTextAtlas? = nil
  private var frame SceneFrame? = nil
  private var encoding VulkanTextGlyphEncoding
  private var glyphId uint32
  private var disposed bool

  internal prop Atlas VulkanTextAtlas{ get { return atlas!! } }
  internal prop Frame SceneFrame{ get { return frame!! } }
  internal prop GlyphId uint32{ get { return glyphId } }
  internal prop Encoding VulkanTextGlyphEncoding{ get { return encoding } }

  internal init(
    nativeDevice VkDevice,
    nativeDispatch VkDeviceDispatch,
    nativeAllocator VulkanMemoryAllocator,
    maxTexelBufferElements uint32,
    effects bool) {
      try {
        let fontPath = Path.Combine(AppContext.BaseDirectory, "VendSans-VariableFont_wght.ttf")
        if !File.Exists(fontPath) {
          throw FileNotFoundException("VendSans proof font is missing", fontPath)
        }
        font = LoadVulkanTextFont(fontPath, VulkanTextReadbackContract.PixelHeight)
        let options = VulkanTextShapingOptions{
          Direction: 4u,
          Script: VulkanTextTag("Latn"),
          Language: "en",
          ClusterLevel: 0u,
          Flags: 0u,
          Features: nil,
        }
        let run = font!!.Shape("A", options)
        if run.Count != 1 {
          throw InvalidOperationException("Vulkan text readback shaping did not produce one glyph")
        }
        let glyph = run.GlyphAt(0)
        if glyph.GlyphId == 0u {
          throw InvalidOperationException("Vulkan text readback shaped a missing glyph")
        }
        glyphId = glyph.GlyphId
        encoding = font!!.EncodeGlyph(glyphId)
        if encoding.Bytes.Length == 0 || (encoding.Bytes.Length & 7) != 0 {
          throw InvalidOperationException("Vulkan text readback glyph blob is not 8-byte aligned")
        }
        atlas = VulkanTextAtlas(nativeDevice, nativeDispatch, nativeAllocator,
          VkDeviceSize(encoding.Bytes.Length), maxTexelBufferElements)
        QueueVulkanTextAtlasUpload(atlas!!, encoding.Bytes)
        frame = SceneFrame(1)
        BuildFrame(frame!!, effects)
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
    if font != nil {
      try {
        font!!.Dispose()
        font = nil
      } catch (error Exception) {
        if firstError == nil {
          firstError = error
        } else {
          Console.Error.WriteLine("Vulkan text fixture font cleanup failed: " + error.ToString())
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

  private func BuildFrame(target SceneFrame, effects bool) {
    let extents = encoding.Extents
    let minX = float32(extents.XBearing)
    let minY = float32(extents.YBearing + extents.Height)
    let maxX = float32(extents.XBearing + extents.Width)
    let maxY = float32(extents.YBearing)
    let bounds = ConservativeBounds{
      X: minX,
      Y: minY,
      Width: maxX - minX,
      Height: maxY - minY,
    }
    let chunkBounds = if effects {
      ConservativeBounds{ X: 0.0F, Y: 0.0F, Width: 64.0F, Height: 64.0F }
    } else { bounds }
    target.BeginChunk(0x5445585452454144uL, 1uL, chunkBounds, true)
    let transformIndex = target.AddTransform(TransformRecord{
      A: 0.06F,
      B: 0.0F,
      C: 0.0F,
      D: -0.06F,
      TX: 8.0F,
      TY: 56.0F,
      ParentIndex: -1,
    })
    if effects {
      let shadowTransform = target.AddTransform(TransformRecord{
        A: 0.06F,
        B: 0.0F,
        C: 0.0F,
        D: -0.06F,
        TX: 11.0F,
        TY: 58.0F,
        ParentIndex: -1,
      })
      let strokeRadius = 2.0F / 0.06F * 0.5F
      target.AddCachedGlyphRun(CachedGlyphRunRefRecord{
        Bounds: bounds,
        GlyphRunId: ProofResource(SceneResourceKind.GlyphRun, 9601uL),
        AtlasId: ProofResource(SceneResourceKind.Atlas, 9602uL),
        GlyphId: glyphId,
        AtlasTexelOffset: 0u,
        AtlasTexelCount: uint32(encoding.Bytes.Length / 8),
        GlyphMinX: minX,
        GlyphMinY: minY,
        GlyphMaxX: maxX,
        GlyphMaxY: maxY,
        Color: 0x00FF00FFu,
        RenderMode: 2u,
        EffectMode: 1u,
        EffectRadius: 0.0F,
        TransformIndex: shadowTransform,
      })
      target.AddCachedGlyphRun(CachedGlyphRunRefRecord{
        Bounds: bounds.Inflate(2.0F),
        GlyphRunId: ProofResource(SceneResourceKind.GlyphRun, 9601uL),
        AtlasId: ProofResource(SceneResourceKind.Atlas, 9602uL),
        GlyphId: glyphId,
        AtlasTexelOffset: 0u,
        AtlasTexelCount: uint32(encoding.Bytes.Length / 8),
        GlyphMinX: minX - strokeRadius,
        GlyphMinY: minY - strokeRadius,
        GlyphMaxX: maxX + strokeRadius,
        GlyphMaxY: maxY + strokeRadius,
        Color: 0xFF0000FFu,
        RenderMode: 2u,
        EffectMode: 2u,
        EffectRadius: strokeRadius,
        TransformIndex: transformIndex,
      })
    }
    target.AddCachedGlyphRun(CachedGlyphRunRefRecord{
      Bounds: bounds,
      GlyphRunId: ProofResource(SceneResourceKind.GlyphRun, 9601uL),
      AtlasId: ProofResource(SceneResourceKind.Atlas, 9602uL),
      GlyphId: glyphId,
      AtlasTexelOffset: 0u,
      AtlasTexelCount: uint32(encoding.Bytes.Length / 8),
      GlyphMinX: minX,
      GlyphMinY: minY,
      GlyphMaxX: maxX,
      GlyphMaxY: maxY,
      Color: 0xFFFFFFFFu,
      RenderMode: 2u,
      TransformIndex: transformIndex,
    })
    target.EndChunk()
  }
}

internal unsafe func QueueVulkanTextAtlasUpload(atlas VulkanTextAtlas, bytes []uint8) {
  fixed source * uint8 = bytes{
    if !atlas.QueueUpload(source, VkDeviceSize(bytes.Length)) {
      throw InvalidOperationException("Vulkan text readback glyph upload did not queue")
    }
  }
}

internal unsafe func AnalyzeVulkanTextReadback(
  readback * uint8,
  width uint32,
  height uint32) VulkanTextReadbackResult{
    if readback == nil || width < VulkanTextReadbackContract.Width
      || height < VulkanTextReadbackContract.Height{
        throw ArgumentException("invalid Vulkan text readback")
      }
    var hash uint64 = 14695981039346656037uL
    var inkPixels uint32 = 0u
    var backgroundPixels uint32 = 0u
    var opaquePixels uint32 = 0u
    var nonGrayPixels uint32 = 0u
    var redDominantPixels uint32 = 0u
    var greenDominantPixels uint32 = 0u
    var grayInkPixels uint32 = 0u
    var minInkX uint32 = width
    var minInkY uint32 = height
    var maxInkX uint32 = 0u
    var maxInkY uint32 = 0u
    var y uint32 = 0u
    while y < VulkanTextReadbackContract.Height {
      var x uint32 = 0u
      while x < VulkanTextReadbackContract.Width {
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
        if red != green || green != blue {
          nonGrayPixels++
        }
        if red > green && red > blue {
          redDominantPixels++
        } else if green > red && green > blue {
          greenDominantPixels++
        } else if red == green && green == blue && red != 0u {
          grayInkPixels++
        }
        if red == 0u && green == 0u && blue == 0u && alpha == 255u {
          backgroundPixels++
        }
        if red != 0u || green != 0u || blue != 0u {
          inkPixels++
          if x < minInkX { minInkX = x }
          if y < minInkY { minInkY = y }
          if x > maxInkX { maxInkX = x }
          if y > maxInkY { maxInkY = y }
        }
        x++
      }
      y++
    }
    return VulkanTextReadbackResult{
      Digest: hash,
      InkPixels: inkPixels,
      BackgroundPixels: backgroundPixels,
      OpaquePixels: opaquePixels,
      NonGrayPixels: nonGrayPixels,
      RedDominantPixels: redDominantPixels,
      GreenDominantPixels: greenDominantPixels,
      GrayInkPixels: grayInkPixels,
      MinInkX: minInkX,
      MinInkY: minInkY,
      MaxInkX: maxInkX,
      MaxInkY: maxInkY,
    }
  }

internal unsafe func VerifyVulkanTextReadback(
  readback * uint8,
  width uint32,
  height uint32,
  result VulkanTextReadbackResult) bool{
    if readback == nil || width < VulkanTextReadbackContract.Width
      || height < VulkanTextReadbackContract.Height{
        return false
      }
    let totalPixels = VulkanTextReadbackContract.Width * VulkanTextReadbackContract.Height
    if result.InkPixels < VulkanTextReadbackContract.MinInkPixels
      || result.InkPixels > VulkanTextReadbackContract.MaxInkPixels
      || result.BackgroundPixels == 0u
      || result.BackgroundPixels + result.InkPixels != totalPixels
      || result.OpaquePixels != totalPixels
      || result.NonGrayPixels != 0u {
        return false
      }
    if result.MinInkX < VulkanTextReadbackContract.MinInkX
      || result.MinInkX > VulkanTextReadbackContract.MaxInkX
      || result.MinInkY < VulkanTextReadbackContract.MinInkY
      || result.MinInkY > VulkanTextReadbackContract.MaxInkY
      || result.MaxInkX < VulkanTextReadbackContract.MinInkRight
      || result.MaxInkX > VulkanTextReadbackContract.MaxInkRight
      || result.MaxInkY < VulkanTextReadbackContract.MinInkBottom
      || result.MaxInkY > VulkanTextReadbackContract.MaxInkBottom{
        return false
      }
    return true
  }

internal func VerifyVulkanTextEffectReadback(result VulkanTextReadbackResult) bool {
  if result.InkPixels <= VulkanTextReadbackContract.MinInkPixels
    || result.NonGrayPixels == 0u
    || result.RedDominantPixels == 0u
    || result.GreenDominantPixels == 0u
    || result.GrayInkPixels == 0u
    || result.MinInkX > 8u
    || result.MaxInkX < 46u
    || result.MinInkY > 13u
    || result.MaxInkY < 57u {
      return false
    }
  return result.BackgroundPixels != 0u
    && result.OpaquePixels == VulkanTextReadbackContract.Width * VulkanTextReadbackContract.Height
}
