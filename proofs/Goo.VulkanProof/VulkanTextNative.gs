package Goo.VulkanProof

import System
import System.IO
import System.Runtime.InteropServices
import System.Text

@DllImport("goo-harfbuzz", EntryPoint: "hb_blob_create", CallingConvention: CallingConvention.Cdecl)
func hb_blob_create(data nint, length uint32, memoryMode uint32, userData nint, destroy nint) nint;

@DllImport("goo-harfbuzz", EntryPoint: "hb_blob_destroy", CallingConvention: CallingConvention.Cdecl)
func hb_blob_destroy(blob nint) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_face_create", CallingConvention: CallingConvention.Cdecl)
func hb_face_create(blob nint, index uint32) nint;

@DllImport("goo-harfbuzz", EntryPoint: "hb_face_destroy", CallingConvention: CallingConvention.Cdecl)
func hb_face_destroy(face nint) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_face_get_upem", CallingConvention: CallingConvention.Cdecl)
func hb_face_get_upem(face nint) uint32;

@DllImport("goo-harfbuzz", EntryPoint: "hb_font_create", CallingConvention: CallingConvention.Cdecl)
func hb_font_create(face nint) nint;

@DllImport("goo-harfbuzz", EntryPoint: "hb_font_destroy", CallingConvention: CallingConvention.Cdecl)
func hb_font_destroy(font nint) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_font_set_scale", CallingConvention: CallingConvention.Cdecl)
func hb_font_set_scale(font nint, xScale int32, yScale int32) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_ot_font_set_funcs", CallingConvention: CallingConvention.Cdecl)
func hb_ot_font_set_funcs(font nint) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_buffer_create", CallingConvention: CallingConvention.Cdecl)
func hb_buffer_create() nint;

@DllImport("goo-harfbuzz", EntryPoint: "hb_buffer_destroy", CallingConvention: CallingConvention.Cdecl)
func hb_buffer_destroy(buffer nint) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_buffer_add_utf8", CallingConvention: CallingConvention.Cdecl)
func hb_buffer_add_utf8(buffer nint, text nint, textLength int32, itemOffset uint32, itemLength int32) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_buffer_guess_segment_properties", CallingConvention: CallingConvention.Cdecl)
func hb_buffer_guess_segment_properties(buffer nint) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_buffer_set_direction", CallingConvention: CallingConvention.Cdecl)
func hb_buffer_set_direction(buffer nint, direction uint32) void;

@DllImport("goo-harfbuzz", EntryPoint: "hb_shape_full", CallingConvention: CallingConvention.Cdecl)
func hb_shape_full(font nint, buffer nint, features nint, featureCount uint32, shaperList nint) uint32;

@DllImport("goo-harfbuzz", EntryPoint: "hb_buffer_get_length", CallingConvention: CallingConvention.Cdecl)
func hb_buffer_get_length(buffer nint) uint32;

@DllImport("goo-harfbuzz", EntryPoint: "hb_buffer_get_glyph_infos", CallingConvention: CallingConvention.Cdecl)
unsafe func hb_buffer_get_glyph_infos(buffer nint, ref length uint32) *VulkanHarfBuzzGlyphInfo;

@DllImport("goo-harfbuzz", EntryPoint: "hb_buffer_get_glyph_positions", CallingConvention: CallingConvention.Cdecl)
unsafe func hb_buffer_get_glyph_positions(buffer nint, ref length uint32) *VulkanHarfBuzzGlyphPosition;

@DllImport("goo-freetype", EntryPoint: "FT_Init_FreeType", CallingConvention: CallingConvention.Cdecl)
unsafe func FT_Init_FreeType(ref library nint) int32;

@DllImport("goo-freetype", EntryPoint: "FT_Done_FreeType", CallingConvention: CallingConvention.Cdecl)
func FT_Done_FreeType(library nint) int32;

@DllImport("goo-text-native", EntryPoint: "goo_ft_new_memory_face", CallingConvention: CallingConvention.Cdecl)
func goo_ft_new_memory_face(library nint, fileBase nint, fileSize int64, faceIndex int64, ref face nint) int32;

@DllImport("goo-text-native", EntryPoint: "goo_ft_face_metrics", CallingConvention: CallingConvention.Cdecl)
func goo_ft_face_metrics(face nint, ref unitsPerEm uint32, ref faceAscender int64, ref faceDescender int64, ref faceHeight int64, ref pixelAscender int64, ref pixelDescender int64, ref pixelHeight int64, ref glyphCount int64) int32;

@DllImport("goo-freetype", EntryPoint: "FT_Done_Face", CallingConvention: CallingConvention.Cdecl)
func FT_Done_Face(face nint) int32;

@DllImport("goo-freetype", EntryPoint: "FT_Set_Pixel_Sizes", CallingConvention: CallingConvention.Cdecl)
func FT_Set_Pixel_Sizes(face nint, pixelWidth uint32, pixelHeight uint32) int32;

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

data struct VulkanFreeTypeMetrics {
    var UnitsPerEm uint32
    var FaceAscender int64
    var FaceDescender int64
    var FaceHeight int64
    var PixelAscender int64
    var PixelDescender int64
    var PixelHeight int64
    var GlyphCount int64
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

    internal prop Count int32 { get { return glyphs.Length } }

    internal init(values []VulkanTextGlyph) {
        glyphs = values
    }

    internal func GlyphAt(index int32) VulkanTextGlyph {
        return glyphs[index]
    }
}

internal unsafe sealed class VulkanTextFont : IDisposable {
    private let fontBytes []uint8
    private var fontPin GCHandle
    private var freeTypeLibrary nint
    private var freeTypeFace nint
    private var harfBuzzBlob nint
    private var harfBuzzFace nint
    private var harfBuzzFont nint
    private var harfBuzzUpem uint32
    private var disposed bool
    private var metrics VulkanFreeTypeMetrics

    internal prop Metrics VulkanFreeTypeMetrics { get { return metrics } }
    internal prop HarfBuzzUpem uint32 { get { return harfBuzzUpem } }

    internal init(bytes []uint8, pixelHeight uint32) {
        if bytes.Length == 0 {
            throw ArgumentException("Font bytes are empty", "bytes")
        }
        if pixelHeight == 0u {
            throw ArgumentOutOfRangeException("pixelHeight")
        }
        fontBytes = [bytes.Length]uint8
        Array.Copy(bytes, fontBytes, bytes.Length)
        metrics = VulkanFreeTypeMetrics{}
        try {
            fontPin = GCHandle.Alloc(fontBytes, GCHandleType.Pinned)
            let fontAddress = fontPin.AddrOfPinnedObject()
            let freeTypeResult = FT_Init_FreeType(ref freeTypeLibrary)
            if freeTypeResult != 0 || freeTypeLibrary == nint(0) {
                throw InvalidOperationException("FT_Init_FreeType failed")
            }
            let faceResult = goo_ft_new_memory_face(freeTypeLibrary, fontAddress,
                int64(fontBytes.Length), 0L, ref freeTypeFace)
            if faceResult != 0 || freeTypeFace == nint(0) {
                throw InvalidOperationException("FT_New_Memory_Face failed")
            }
            let sizeResult = FT_Set_Pixel_Sizes(freeTypeFace, 0u, pixelHeight)
            if sizeResult != 0 {
                throw InvalidOperationException("FT_Set_Pixel_Sizes failed")
            }
            metrics = ReadFreeTypeMetrics(freeTypeFace)

            harfBuzzBlob = hb_blob_create(fontAddress, uint32(fontBytes.Length), 1u, nint(0), nint(0))
            if harfBuzzBlob == nint(0) {
                throw InvalidOperationException("hb_blob_create failed")
            }
            harfBuzzFace = hb_face_create(harfBuzzBlob, 0u)
            if harfBuzzFace == nint(0) {
                throw InvalidOperationException("hb_face_create failed")
            }
            harfBuzzUpem = hb_face_get_upem(harfBuzzFace)
            harfBuzzFont = hb_font_create(harfBuzzFace)
            if harfBuzzFont == nint(0) {
                throw InvalidOperationException("hb_font_create failed")
            }
            let scale = int32(pixelHeight * 64u)
            hb_font_set_scale(harfBuzzFont, scale, scale)
            hb_ot_font_set_funcs(harfBuzzFont)
        } catch (error Exception) {
            Dispose()
            throw error
        }
    }

    internal func ShapeUtf8(text string, rightToLeft bool) VulkanTextRun {
        if disposed {
            throw ObjectDisposedException("VulkanTextFont")
        }
        if text == nil {
            throw ArgumentNullException("text")
        }
        let bytes = Encoding.UTF8.GetBytes(text)
        let textPin = GCHandle.Alloc(bytes, GCHandleType.Pinned)
        try {
            let textAddress = textPin.AddrOfPinnedObject()
            let buffer = hb_buffer_create()
            if buffer == nint(0) {
                throw InvalidOperationException("hb_buffer_create failed")
            }
            try {
                hb_buffer_add_utf8(buffer, textAddress, bytes.Length, 0u, bytes.Length)
                var direction uint32 = 4u
                if rightToLeft {
                    direction = 5u
                }
                hb_buffer_set_direction(buffer, direction)
                hb_buffer_guess_segment_properties(buffer)
                let shapeResult = hb_shape_full(harfBuzzFont, buffer, nint(0), 0u, nint(0))
                if shapeResult == 0u {
                    throw InvalidOperationException("hb_shape_full failed")
                }
                let length = hb_buffer_get_length(buffer)
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
                hb_buffer_destroy(buffer)
            }
        } finally {
            textPin.Free()
        }
    }

    public func Dispose() {
        if disposed {
            return
        }
        disposed = true
        if harfBuzzFont != nint(0) {
            hb_font_destroy(harfBuzzFont)
            harfBuzzFont = nint(0)
        }
        if harfBuzzFace != nint(0) {
            hb_face_destroy(harfBuzzFace)
            harfBuzzFace = nint(0)
        }
        if harfBuzzBlob != nint(0) {
            hb_blob_destroy(harfBuzzBlob)
            harfBuzzBlob = nint(0)
        }
        if freeTypeFace != nint(0) {
            FT_Done_Face(freeTypeFace)
            freeTypeFace = nint(0)
        }
        if freeTypeLibrary != nint(0) {
            FT_Done_FreeType(freeTypeLibrary)
            freeTypeLibrary = nint(0)
        }
        if fontPin.IsAllocated {
            fontPin.Free()
        }
    }

    private func ReadFreeTypeMetrics(face nint) VulkanFreeTypeMetrics {
        var unitsPerEm uint32 = 0u
        var faceAscender int64 = 0L
        var faceDescender int64 = 0L
        var faceHeight int64 = 0L
        var pixelAscender int64 = 0L
        var pixelDescender int64 = 0L
        var pixelHeight int64 = 0L
        var glyphCount int64 = 0L
        let result = goo_ft_face_metrics(face, ref unitsPerEm, ref faceAscender,
            ref faceDescender, ref faceHeight, ref pixelAscender, ref pixelDescender,
            ref pixelHeight, ref glyphCount)
        if result != 0 {
            throw InvalidOperationException("goo_ft_face_metrics failed")
        }
        return VulkanFreeTypeMetrics{
            UnitsPerEm: unitsPerEm,
            FaceAscender: faceAscender,
            FaceDescender: faceDescender,
            FaceHeight: faceHeight,
            PixelAscender: pixelAscender,
            PixelDescender: pixelDescender,
            PixelHeight: pixelHeight,
            GlyphCount: glyphCount,
        }
    }
}

internal func LoadVulkanTextFont(path string, pixelHeight uint32) VulkanTextFont {
    if path == nil {
        throw ArgumentNullException("path")
    }
    return VulkanTextFont(File.ReadAllBytes(path), pixelHeight)
}
