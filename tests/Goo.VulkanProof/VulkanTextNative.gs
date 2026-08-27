package Goo.VulkanProof

import System
import System.IO
import System.Runtime.InteropServices
import System.Text

@DllImport("goo-harfbuzz", EntryPoint: "hb_blob_create", CallingConvention: CallingConvention.Cdecl)
func hb_blob_create(data nint, length uint32, memoryMode uint32, userData nint, destroy nint) nint;

@DllImport("goo-harfbuzz", EntryPoint: "hb_blob_destroy", CallingConvention: CallingConvention.Cdecl)
func hb_blob_destroy(blob nint) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_blob_get_data", CallingConvention: CallingConvention.Cdecl)
unsafe func hb_blob_get_data(blob nint, ref length uint32) nint;

@DllImport("goo-harfbuzz", EntryPoint: "hb_face_create", CallingConvention: CallingConvention.Cdecl)
func hb_face_create(blob nint, index uint32) nint;

@DllImport("goo-harfbuzz", EntryPoint: "hb_face_count", CallingConvention: CallingConvention.Cdecl)
func hb_face_count(blob nint) uint32;

@DllImport("goo-harfbuzz", EntryPoint: "hb_face_destroy", CallingConvention: CallingConvention.Cdecl)
func hb_face_destroy(face nint) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_face_get_glyph_count", CallingConvention: CallingConvention.Cdecl)
func hb_face_get_glyph_count(face nint) uint32;

@DllImport("goo-harfbuzz", EntryPoint: "hb_face_get_upem", CallingConvention: CallingConvention.Cdecl)
func hb_face_get_upem(face nint) uint32;

@DllImport("goo-harfbuzz", EntryPoint: "hb_font_create", CallingConvention: CallingConvention.Cdecl)
func hb_font_create(face nint) nint;

@DllImport("goo-harfbuzz", EntryPoint: "hb_font_destroy", CallingConvention: CallingConvention.Cdecl)
func hb_font_destroy(font nint) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_font_get_extents_for_direction", CallingConvention: CallingConvention.Cdecl)
unsafe func hb_font_get_extents_for_direction(font nint, direction uint32, ref extents VulkanHarfBuzzFontExtents) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_font_set_scale", CallingConvention: CallingConvention.Cdecl)
func hb_font_set_scale(font nint, xScale int32, yScale int32) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_font_set_variations", CallingConvention: CallingConvention.Cdecl)
func hb_font_set_variations(font nint, variations nint, variationCount uint32) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_ot_font_set_funcs", CallingConvention: CallingConvention.Cdecl)
func hb_ot_font_set_funcs(font nint) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_ot_color_has_paint", CallingConvention: CallingConvention.Cdecl)
func hb_ot_color_has_paint(face nint) uint32;

@DllImport("goo-harfbuzz", EntryPoint: "hb_ot_color_has_layers", CallingConvention: CallingConvention.Cdecl)
func hb_ot_color_has_layers(face nint) uint32;

@DllImport("goo-harfbuzz", EntryPoint: "hb_ot_color_glyph_has_paint", CallingConvention: CallingConvention.Cdecl)
func hb_ot_color_glyph_has_paint(face nint, glyph uint32) uint32;

@DllImport("goo-harfbuzz", EntryPoint: "hb_buffer_create", CallingConvention: CallingConvention.Cdecl)
func hb_buffer_create() nint;

@DllImport("goo-harfbuzz", EntryPoint: "hb_buffer_destroy", CallingConvention: CallingConvention.Cdecl)
func hb_buffer_destroy(buffer nint) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_buffer_add_utf16", CallingConvention: CallingConvention.Cdecl)
func hb_buffer_add_utf16(buffer nint, text nint, textLength int32, itemOffset uint32, itemLength int32) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_buffer_guess_segment_properties", CallingConvention: CallingConvention.Cdecl)
func hb_buffer_guess_segment_properties(buffer nint) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_buffer_set_direction", CallingConvention: CallingConvention.Cdecl)
func hb_buffer_set_direction(buffer nint, direction uint32) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_buffer_set_script", CallingConvention: CallingConvention.Cdecl)
func hb_buffer_set_script(buffer nint, script uint32) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_buffer_set_language", CallingConvention: CallingConvention.Cdecl)
func hb_buffer_set_language(buffer nint, language nint) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_buffer_set_cluster_level", CallingConvention: CallingConvention.Cdecl)
func hb_buffer_set_cluster_level(buffer nint, clusterLevel uint32) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_buffer_set_flags", CallingConvention: CallingConvention.Cdecl)
func hb_buffer_set_flags(buffer nint, flags uint32) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_language_from_string", CallingConvention: CallingConvention.Cdecl)
func hb_language_from_string(language nint, length int32) nint;

@DllImport("goo-harfbuzz", EntryPoint: "hb_shape_full", CallingConvention: CallingConvention.Cdecl)
func hb_shape_full(font nint, buffer nint, features nint, featureCount uint32, shaperList nint) uint32;

@DllImport("goo-harfbuzz", EntryPoint: "hb_buffer_get_length", CallingConvention: CallingConvention.Cdecl)
func hb_buffer_get_length(buffer nint) uint32;

@DllImport("goo-harfbuzz", EntryPoint: "hb_buffer_get_glyph_infos", CallingConvention: CallingConvention.Cdecl)
unsafe func hb_buffer_get_glyph_infos(buffer nint, ref length uint32) * VulkanHarfBuzzGlyphInfo;

@DllImport("goo-harfbuzz", EntryPoint: "hb_buffer_get_glyph_positions", CallingConvention: CallingConvention.Cdecl)
unsafe func hb_buffer_get_glyph_positions(buffer nint, ref length uint32) * VulkanHarfBuzzGlyphPosition;

@DllImport("goo-harfbuzz-gpu", EntryPoint: "hb_gpu_draw_create_or_fail", CallingConvention: CallingConvention.Cdecl)
func hb_gpu_draw_create_or_fail() nint;

@DllImport("goo-harfbuzz-gpu", EntryPoint: "hb_gpu_draw_destroy", CallingConvention: CallingConvention.Cdecl)
func hb_gpu_draw_destroy(draw nint) void;

@DllImport("goo-harfbuzz-gpu", EntryPoint: "hb_gpu_draw_glyph_or_fail", CallingConvention: CallingConvention.Cdecl)
func hb_gpu_draw_glyph_or_fail(draw nint, font nint, glyph uint32) uint32;

@DllImport("goo-harfbuzz-gpu", EntryPoint: "hb_gpu_draw_encode", CallingConvention: CallingConvention.Cdecl)
unsafe func hb_gpu_draw_encode(draw nint, ref extents VulkanTextGlyphExtents) nint;

@DllImport("goo-harfbuzz-gpu", EntryPoint: "hb_gpu_draw_recycle_blob", CallingConvention: CallingConvention.Cdecl)
func hb_gpu_draw_recycle_blob(draw nint, blob nint) void;

@DllImport("goo-harfbuzz-gpu", EntryPoint: "hb_gpu_draw_set_scale", CallingConvention: CallingConvention.Cdecl)
func hb_gpu_draw_set_scale(draw nint, xScale int32, yScale int32) void;

@DllImport("goo-harfbuzz-gpu", EntryPoint: "hb_gpu_paint_create_or_fail", CallingConvention: CallingConvention.Cdecl)
func hb_gpu_paint_create_or_fail() nint;

@DllImport("goo-harfbuzz-gpu", EntryPoint: "hb_gpu_paint_destroy", CallingConvention: CallingConvention.Cdecl)
func hb_gpu_paint_destroy(paint nint) void;

@DllImport("goo-harfbuzz-gpu", EntryPoint: "hb_gpu_paint_set_palette", CallingConvention: CallingConvention.Cdecl)
func hb_gpu_paint_set_palette(paint nint, palette uint32) void;

@DllImport("goo-harfbuzz-gpu", EntryPoint: "hb_gpu_paint_set_scale", CallingConvention: CallingConvention.Cdecl)
func hb_gpu_paint_set_scale(paint nint, xScale int32, yScale int32) void;

@DllImport("goo-harfbuzz-gpu", EntryPoint: "hb_gpu_paint_glyph_or_fail", CallingConvention: CallingConvention.Cdecl)
func hb_gpu_paint_glyph_or_fail(paint nint, font nint, glyph uint32) uint32;

@DllImport("goo-harfbuzz-gpu", EntryPoint: "hb_gpu_paint_encode", CallingConvention: CallingConvention.Cdecl)
unsafe func hb_gpu_paint_encode(paint nint, ref extents VulkanTextGlyphExtents) nint;

@DllImport("goo-harfbuzz-gpu", EntryPoint: "hb_gpu_paint_recycle_blob", CallingConvention: CallingConvention.Cdecl)
func hb_gpu_paint_recycle_blob(paint nint, blob nint) void;

unsafe data struct VulkanHarfBuzzGlyphInfo {
  var codepoint uint32
  var mask uint32
  var cluster uint32
  var var1 uint32
  var var2 uint32
}

unsafe data struct VulkanHarfBuzzGlyphPosition {
  var xAdvance int32
  var yAdvance int32
  var xOffset int32
  var yOffset int32
  var var1 int32
}

unsafe data struct VulkanHarfBuzzFontExtents {
  var ascender int32
  var descender int32
  var lineGap int32
  var reserved9 int32
  var reserved8 int32
  var reserved7 int32
  var reserved6 int32
  var reserved5 int32
  var reserved4 int32
  var reserved3 int32
  var reserved2 int32
  var reserved1 int32
}

unsafe data struct VulkanTextGlyphExtents {
  var XBearing int32
  var YBearing int32
  var Width int32
  var Height int32
}

data struct VulkanHarfBuzzMetrics {
  var UnitsPerEm uint32
  var GlyphCount uint32
  var Scale int32
  var Ascender int32
  var Descender int32
  var LineGap int32
}

data struct VulkanTextVariation {
  var Tag uint32
  var Value float32
}

data struct VulkanTextFeature {
  var Tag uint32
  var Value uint32
  var Start uint32
  var End uint32
}

data struct VulkanTextShapingOptions {
  var Direction uint32
  var Script uint32
  var Language string?
  var ClusterLevel uint32
  var Flags uint32
  var Features([]VulkanTextFeature)?
}

data struct VulkanTextGlyphEncoding {
  var Bytes []uint8
  var Extents VulkanTextGlyphExtents
  var Scale int32
}

data struct VulkanTextPaintEncoding {
  var Bytes []uint8
  var Extents VulkanTextGlyphExtents
  var Scale int32
  var Palette uint32
}

data struct VulkanTextGlyph {
  var GlyphId uint32
  var Cluster uint32
  var XAdvance int32
  var YAdvance int32
  var XOffset int32
  var YOffset int32
}

internal sealed class VulkanTextRun {
  private let glyphs []VulkanTextGlyph

  internal prop Count int32{ get { return glyphs.Length } }

  internal init(values []VulkanTextGlyph) {
    glyphs = values
  }

  internal func GlyphAt(index int32) VulkanTextGlyph -> glyphs[index]
}

internal unsafe sealed class VulkanTextFont : IDisposable {
  const MaxTextUnits int32 = 1048576
  const MaxVariations int32 = 16
  const MaxFeatures int32 = 32
  const MaxLanguageUnits int32 = 64
  private let fontBytes []uint8
  private var fontPin GCHandle
  private var harfBuzzBlob nint
  private var harfBuzzFace nint
  private var harfBuzzFont nint
  private var harfBuzzDesignFont nint
  private var harfBuzzDraw nint
  private var harfBuzzPaint nint
  private var harfBuzzDesignScale int32
  private let faceIndex uint32
  private let faceCount uint32
  private let variations([]VulkanTextVariation)?
  private var metrics VulkanHarfBuzzMetrics
  private var disposed bool

  internal prop Metrics VulkanHarfBuzzMetrics{ get { return metrics } }
  internal prop FaceIndex uint32{ get { return faceIndex } }
  internal prop FaceCount uint32{ get { return faceCount } }

  internal init(
    bytes []uint8,
    pixelHeight uint32,
    selectedFaceIndex uint32,
    selectedVariations([]VulkanTextVariation)?) {
      if bytes.Length == 0 {
        throw ArgumentException("Font bytes are empty", "bytes")
      }
      if pixelHeight == 0u || pixelHeight > 33554431u {
        throw ArgumentOutOfRangeException("pixelHeight")
      }
      fontBytes = bytes
      faceIndex = selectedFaceIndex
      variations = CopyVariations(selectedVariations)
      try {
        fontPin = GCHandle.Alloc(fontBytes, GCHandleType.Pinned)
        let fontAddress = fontPin.AddrOfPinnedObject()
        harfBuzzBlob = hb_blob_create(fontAddress, uint32(fontBytes.Length), 1u, nint(0), nint(0))
        if harfBuzzBlob == nint(0) {
          throw InvalidOperationException("hb_blob_create failed")
        }
        faceCount = hb_face_count(harfBuzzBlob)
        if faceCount == 0u || selectedFaceIndex >= faceCount {
          throw ArgumentOutOfRangeException("faceIndex")
        }
        harfBuzzFace = hb_face_create(harfBuzzBlob, selectedFaceIndex)
        if harfBuzzFace == nint(0) {
          throw InvalidOperationException("hb_face_create failed")
        }
        let upem = hb_face_get_upem(harfBuzzFace)
        if upem == 0u || upem > uint32(Int32.MaxValue) {
          throw InvalidOperationException("HarfBuzz face UPEM is invalid")
        }
        harfBuzzFont = hb_font_create(harfBuzzFace)
        if harfBuzzFont == nint(0) {
          throw InvalidOperationException("hb_font_create failed")
        }
        let scale = int32(pixelHeight * 64u)
        hb_font_set_scale(harfBuzzFont, scale, scale)
        hb_ot_font_set_funcs(harfBuzzFont)
        ApplyVariations(harfBuzzFont, variations)
        harfBuzzDesignFont = hb_font_create(harfBuzzFace)
        if harfBuzzDesignFont == nint(0) {
          throw InvalidOperationException("hb_font_create design font failed")
        }
        harfBuzzDesignScale = int32(upem)
        hb_font_set_scale(harfBuzzDesignFont, harfBuzzDesignScale, harfBuzzDesignScale)
        hb_ot_font_set_funcs(harfBuzzDesignFont)
        ApplyVariations(harfBuzzDesignFont, variations)
        metrics = ReadMetrics(harfBuzzDesignFont)
      } catch (error Exception) {
        Dispose()
        throw error
      }
    }

  internal func Shape(text string, options VulkanTextShapingOptions) VulkanTextRun {
    if disposed {
      throw ObjectDisposedException("VulkanTextFont")
    }
    if text == nil {
      throw ArgumentNullException("text")
    }
    if text.Length > MaxTextUnits {
      throw ArgumentOutOfRangeException("text")
    }
    ValidateShapingOptions(options)
    let textPin = GCHandle.Alloc(text, GCHandleType.Pinned)
    var featurePin GCHandle
    var hasFeaturePin bool = false
    try {
      let textAddress = textPin.AddrOfPinnedObject()
      let buffer = hb_buffer_create()
      if buffer == nint(0) {
        throw InvalidOperationException("hb_buffer_create failed")
      }
      try {
        hb_buffer_add_utf16(buffer, textAddress, text.Length, 0u, text.Length)
        if options.Direction != 0u {
          hb_buffer_set_direction(buffer, options.Direction)
        }
        if options.Script != 0u {
          hb_buffer_set_script(buffer, options.Script)
        }
        if options.Language != nil && options.Language!!.Length != 0 {
          let languageBytes = Encoding.UTF8.GetBytes(options.Language!!)
          let languagePin = GCHandle.Alloc(languageBytes, GCHandleType.Pinned)
          try {
            let language = hb_language_from_string(languagePin.AddrOfPinnedObject(), languageBytes.Length)
            if language != nint(0) {
              hb_buffer_set_language(buffer, language)
            }
          } finally {
            languagePin.Free()
          }
        }
        hb_buffer_set_cluster_level(buffer, options.ClusterLevel)
        hb_buffer_set_flags(buffer, options.Flags)
        hb_buffer_guess_segment_properties(buffer)
        var featureAddress nint = nint(0)
        var featureCount uint32 = 0u
        if options.Features != nil && options.Features!!.Length != 0 {
          featurePin = GCHandle.Alloc(options.Features!!, GCHandleType.Pinned)
          hasFeaturePin = true
          featureAddress = featurePin.AddrOfPinnedObject()
          featureCount = uint32(options.Features!!.Length)
        }
        let shapeResult = hb_shape_full(harfBuzzFont, buffer, featureAddress, featureCount, nint(0))
        if shapeResult == 0u {
          throw InvalidOperationException("hb_shape_full failed")
        }
        let length = hb_buffer_get_length(buffer)
        if length > uint32(Int32.MaxValue) {
          throw InvalidOperationException("HarfBuzz glyph output is too large")
        }
        let values = [int32(length)]VulkanTextGlyph
        if length != 0u {
          var infoLength uint32 = length
          var positionLength uint32 = length
          let infos = hb_buffer_get_glyph_infos(buffer, ref infoLength)
          let positions = hb_buffer_get_glyph_positions(buffer, ref positionLength)
          if infos == nil || positions == nil || infoLength != length || positionLength != length {
            throw InvalidOperationException("HarfBuzz glyph output is incomplete")
          }
          var index uint32 = 0u
          while index < length {
            let info = infos[index]
            let position = positions[index]
            values[int32(index)] = VulkanTextGlyph{
              GlyphId: info.codepoint,
              Cluster: info.cluster,
              XAdvance: position.xAdvance,
              YAdvance: position.yAdvance,
              XOffset: position.xOffset,
              YOffset: position.yOffset,
            }
            index++
          }
        }
        return VulkanTextRun(values)
      } finally {
        if hasFeaturePin {
          featurePin.Free()
        }
        hb_buffer_destroy(buffer)
      }
    } finally {
      textPin.Free()
    }
  }

  internal func EncodeGlyph(glyphId uint32) VulkanTextGlyphEncoding {
    if disposed {
      throw ObjectDisposedException("VulkanTextFont")
    }
    if harfBuzzDraw == nint(0) {
      harfBuzzDraw = hb_gpu_draw_create_or_fail()
      if harfBuzzDraw == nint(0) {
        throw InvalidOperationException("hb_gpu_draw_create_or_fail failed")
      }
    }
    hb_gpu_draw_set_scale(harfBuzzDraw, harfBuzzDesignScale, harfBuzzDesignScale)
    let drawResult = hb_gpu_draw_glyph_or_fail(harfBuzzDraw, harfBuzzDesignFont, glyphId)
    if drawResult == 0u {
      throw InvalidOperationException("hb_gpu_draw_glyph_or_fail failed")
    }
    var extents = VulkanTextGlyphExtents{}
    let blob = hb_gpu_draw_encode(harfBuzzDraw, ref extents)
    if blob == nint(0) {
      throw InvalidOperationException("hb_gpu_draw_encode failed")
    }
    try {
      var length uint32 = 0u
      let data = hb_blob_get_data(blob, ref length)
      if data == nint(0) || length == 0u {
        throw InvalidOperationException("Encoded glyph blob is empty")
      }
      if length > uint32(Int32.MaxValue) {
        throw InvalidOperationException("Encoded glyph blob is too large")
      }
      let bytes = [int32(length)]uint8
      Marshal.Copy(data, bytes, 0, int32(length))
      return VulkanTextGlyphEncoding{
        Bytes: bytes,
        Extents: extents,
        Scale: harfBuzzDesignScale,
      }
    } finally {
      hb_gpu_draw_recycle_blob(harfBuzzDraw, blob)
    }
  }

  internal func HasColorPaint() bool {
    if disposed {
      throw ObjectDisposedException("VulkanTextFont")
    }
    return hb_ot_color_has_paint(harfBuzzFace) != 0u
  }

  internal func HasColorLayers() bool {
    if disposed {
      throw ObjectDisposedException("VulkanTextFont")
    }
    return hb_ot_color_has_layers(harfBuzzFace) != 0u
  }

  internal func GlyphHasColorPaint(glyphId uint32) bool {
    if disposed {
      throw ObjectDisposedException("VulkanTextFont")
    }
    return hb_ot_color_glyph_has_paint(harfBuzzFace, glyphId) != 0u
  }

  internal func EncodePaintGlyph(glyphId uint32, paletteIndex uint32) VulkanTextPaintEncoding {
    if disposed {
      throw ObjectDisposedException("VulkanTextFont")
    }
    if harfBuzzPaint == nint(0) {
      harfBuzzPaint = hb_gpu_paint_create_or_fail()
      if harfBuzzPaint == nint(0) {
        throw InvalidOperationException("hb_gpu_paint_create_or_fail failed")
      }
    }
    hb_gpu_paint_set_scale(harfBuzzPaint, harfBuzzDesignScale, harfBuzzDesignScale)
    hb_gpu_paint_set_palette(harfBuzzPaint, paletteIndex)
    let paintResult = hb_gpu_paint_glyph_or_fail(harfBuzzPaint, harfBuzzDesignFont, glyphId)
    if paintResult == 0u {
      throw InvalidOperationException("hb_gpu_paint_glyph_or_fail failed")
    }
    var extents = VulkanTextGlyphExtents{}
    let blob = hb_gpu_paint_encode(harfBuzzPaint, ref extents)
    if blob == nint(0) {
      throw InvalidOperationException("hb_gpu_paint_encode failed")
    }
    try {
      var length uint32 = 0u
      let data = hb_blob_get_data(blob, ref length)
      if data == nint(0) || length == 0u {
        throw InvalidOperationException("Encoded paint blob is empty")
      }
      if length > uint32(Int32.MaxValue) {
        throw InvalidOperationException("Encoded paint blob is too large")
      }
      let bytes = [int32(length)]uint8
      Marshal.Copy(data, bytes, 0, int32(length))
      return VulkanTextPaintEncoding{
        Bytes: bytes,
        Extents: extents,
        Scale: harfBuzzDesignScale,
        Palette: paletteIndex,
      }
    } finally {
      hb_gpu_paint_recycle_blob(harfBuzzPaint, blob)
    }
  }

  public func Dispose() {
    if disposed {
      return
    }
    disposed = true
    if harfBuzzDraw != nint(0) {
      hb_gpu_draw_destroy(harfBuzzDraw)
      harfBuzzDraw = nint(0)
    }
    if harfBuzzPaint != nint(0) {
      hb_gpu_paint_destroy(harfBuzzPaint)
      harfBuzzPaint = nint(0)
    }
    if harfBuzzFont != nint(0) {
      hb_font_destroy(harfBuzzFont)
      harfBuzzFont = nint(0)
    }
    if harfBuzzDesignFont != nint(0) {
      hb_font_destroy(harfBuzzDesignFont)
      harfBuzzDesignFont = nint(0)
    }
    if harfBuzzFace != nint(0) {
      hb_face_destroy(harfBuzzFace)
      harfBuzzFace = nint(0)
    }
    if harfBuzzBlob != nint(0) {
      hb_blob_destroy(harfBuzzBlob)
      harfBuzzBlob = nint(0)
    }
    if fontPin.IsAllocated {
      fontPin.Free()
    }
  }

  private func CopyVariations(values([]VulkanTextVariation)?)([]VulkanTextVariation)? {
    if values == nil || values.Length == 0 {
      return nil
    }
    if values.Length > MaxVariations {
      throw ArgumentOutOfRangeException("variations")
    }
    let copy = [values.Length]VulkanTextVariation
    var index int32 = 0
    while index < values.Length {
      let value = values[index]
      if value.Tag == 0u || Single.IsNaN(value.Value) || Single.IsInfinity(value.Value) {
        throw ArgumentException("Variation records are invalid", "variations")
      }
      copy[index] = value
      index++
    }
    return copy
  }

  private func ApplyVariations(font nint, values([]VulkanTextVariation)?) {
    if values == nil || values.Length == 0 {
      return
    }
    let pin = GCHandle.Alloc(values, GCHandleType.Pinned)
    try {
      hb_font_set_variations(font, pin.AddrOfPinnedObject(), uint32(values.Length))
    } finally {
      pin.Free()
    }
  }

  private func ValidateShapingOptions(options VulkanTextShapingOptions) {
    if options.Direction != 0u && (options.Direction < 4u || options.Direction > 7u) {
      throw ArgumentOutOfRangeException("direction")
    }
    if options.Language != nil && options.Language!!.Length > MaxLanguageUnits {
      throw ArgumentOutOfRangeException("language")
    }
    if options.ClusterLevel > 3u {
      throw ArgumentOutOfRangeException("clusterLevel")
    }
    if (options.Flags & 0xFFFFFF00u) != 0u {
      throw ArgumentOutOfRangeException("flags")
    }
    if options.Features == nil || options.Features!!.Length == 0 {
      return
    }
    if options.Features!!.Length > MaxFeatures {
      throw ArgumentOutOfRangeException("features")
    }
    var index int32 = 0
    while index < options.Features!!.Length {
      let feature = options.Features!! [index]
      if feature.Tag == 0u || feature.Start > feature.End {
        throw ArgumentException("Feature records are invalid", "features")
      }
      index++
    }
  }

  private func ReadMetrics(font nint) VulkanHarfBuzzMetrics {
    var extents = VulkanHarfBuzzFontExtents{}
    hb_font_get_extents_for_direction(font, 4u, ref extents)
    return VulkanHarfBuzzMetrics{
      UnitsPerEm: hb_face_get_upem(harfBuzzFace),
      GlyphCount: hb_face_get_glyph_count(harfBuzzFace),
      Scale: harfBuzzDesignScale,
      Ascender: extents.ascender,
      Descender: extents.descender,
      LineGap: extents.lineGap,
    }
  }
}

internal func LoadVulkanTextFont(path string, pixelHeight uint32) VulkanTextFont -> LoadVulkanTextFont(path, pixelHeight, 0u, nil)

internal func LoadVulkanTextFont(
  path string,
  pixelHeight uint32,
  faceIndex uint32,
  variations([]VulkanTextVariation)?) VulkanTextFont{
    if path == nil {
      throw ArgumentNullException("path")
    }
    return VulkanTextFont(File.ReadAllBytes(path), pixelHeight, faceIndex, variations)
  }

internal func VulkanTextTag(value string) uint32 {
  if value == nil || value.Length != 4 {
    throw ArgumentException("OpenType tags must contain four characters", "value")
  }
  let bytes = Encoding.ASCII.GetBytes(value)
  return (uint32(bytes[0]) << 24)
  | (uint32(bytes[1]) << 16)
  | (uint32(bytes[2]) << 8)
  | uint32(bytes[3])
}
