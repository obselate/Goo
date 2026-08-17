package Goo.VulkanProof

import System
import System.IO

internal class VulkanTextE2EContract {
    const PixelHeight uint32 = 32u
    const ExpectedUnitsPerEm uint32 = 1000u
    const ExpectedGlyphCount uint32 = 447u
    const ExpectedRunCount int32 = 9
    const ExpectedDigest uint64 = 11802865774309286459uL
}

internal func RunVulkanTextE2E() {
    let fontPath = Path.Combine(AppContext.BaseDirectory, "VendSans-VariableFont_wght.ttf")
    if !File.Exists(fontPath) {
        throw FileNotFoundException("VendSans proof font is missing", fontPath)
    }
    var font VulkanTextFont? = nil
    try {
        font = LoadVulkanTextFont(fontPath, VulkanTextE2EContract.PixelHeight)
        let metrics = font!!.Metrics
        let run = font!!.ShapeUtf8("office café", false)
        if metrics.UnitsPerEm != VulkanTextE2EContract.ExpectedUnitsPerEm {
            throw InvalidOperationException("FreeType units-per-em contract failed")
        }
        if metrics.GlyphCount != int64(VulkanTextE2EContract.ExpectedGlyphCount) {
            throw InvalidOperationException("FreeType glyph count contract failed")
        }
        if metrics.GlyphCount == 0L || metrics.PixelAscender <= 0L || metrics.PixelDescender >= 0L {
            throw InvalidOperationException("FreeType metrics contract failed")
        }
        if font!!.HarfBuzzUpem != metrics.UnitsPerEm {
            throw InvalidOperationException("HarfBuzz and FreeType face units differ")
        }
        if run.Count != VulkanTextE2EContract.ExpectedRunCount {
            throw InvalidOperationException("HarfBuzz glyph count contract failed")
        }
        let digest = VulkanTextRunDigest(run)
        if digest != VulkanTextE2EContract.ExpectedDigest {
            throw InvalidOperationException("HarfBuzz glyph digest contract failed")
        }
        Console.WriteLine("TEXT_E2E unitsPerEm=" + metrics.UnitsPerEm.ToString()
            + " glyphs=" + metrics.GlyphCount.ToString()
            + " runGlyphs=" + run.Count.ToString()
            + " digest=" + digest.ToString()
            + " pixelAscender=" + metrics.PixelAscender.ToString()
            + " pixelDescender=" + metrics.PixelDescender.ToString()
            + " pixelHeight=" + metrics.PixelHeight.ToString())
    } finally {
        if let value = font {
            value.Dispose()
        }
    }
}

internal func VulkanTextRunDigest(run VulkanTextRun) uint64 {
    var hash uint64 = 14695981039346656037uL
    var index int32 = 0
    while index < run.Count {
        let glyph = run.GlyphAt(index)
        hash = (hash ^ uint64(glyph.GlyphId)) * 1099511628211uL
        hash = (hash ^ uint64(glyph.Cluster)) * 1099511628211uL
        hash = (hash ^ uint64(glyph.XAdvance)) * 1099511628211uL
        hash = (hash ^ uint64(glyph.YAdvance)) * 1099511628211uL
        hash = (hash ^ uint64(glyph.XOffset)) * 1099511628211uL
        hash = (hash ^ uint64(glyph.YOffset)) * 1099511628211uL
        index++
    }
    return hash
}
