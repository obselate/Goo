using System;
using System.IO;
using Goo;

internal static class Program
{
    private static int Main()
    {
        var fontPath = Path.Combine(AppContext.BaseDirectory, "VendSans-VariableFont_wght.ttf");
        if (!File.Exists(fontPath))
        {
            throw new FileNotFoundException("Vulkan text provider smoke font is missing", fontPath);
        }

        VulkanTextFont? font = null;
        try
        {
            font = new VulkanTextFont(File.ReadAllBytes(fontPath), 32u, 0u, null);
            var provider = font;
            var options = new VulkanTextShapingOptions
            {
                Direction = 4u,
                Script = 0x4C61746Eu,
                Language = "en",
                ClusterLevel = 0u,
                Flags = 0u,
                Features = null
            };
            var text = "office café";
            var capacityProbe = new VulkanTextShapingWorkspace(0);
            var capacityResult = provider.ShapeInto(text, options, capacityProbe);
            if (capacityResult.AbiVersion != VulkanTextProviderAbi.Version
                || capacityResult.Status != VulkanTextProviderAbi.CapacityExceeded
                || capacityResult.Required <= 0
                || capacityResult.Count != 0
                || capacityProbe.GlyphCount != 0)
            {
                throw new InvalidOperationException("Vulkan text provider shaping capacity contract failed");
            }

            var glyphWorkspace = new VulkanTextShapingWorkspace(capacityResult.Required + 2);
            var glyphBuffer = glyphWorkspace.GlyphBuffer;
            glyphBuffer[capacityResult.Required] = new VulkanTextGlyph
            {
                GlyphId = 0xDEADBEEFu,
                Cluster = 0xA11CEu,
                XAdvance = 101,
                YAdvance = 102,
                XOffset = 103,
                YOffset = 104
            };
            glyphBuffer[capacityResult.Required + 1] = new VulkanTextGlyph
            {
                GlyphId = 0xC0FFEEu,
                Cluster = 0xBADC0DEu,
                XAdvance = 201,
                YAdvance = 202,
                XOffset = 203,
                YOffset = 204
            };
            var shapeResult = provider.ShapeInto(text, options, glyphWorkspace);
            if (shapeResult.AbiVersion != VulkanTextProviderAbi.Version
                || shapeResult.Status != VulkanTextProviderAbi.Success
                || shapeResult.Count != capacityResult.Required
                || shapeResult.Required != capacityResult.Required
                || glyphWorkspace.GlyphCount != capacityResult.Required
                || glyphBuffer[capacityResult.Required].GlyphId != 0xDEADBEEFu
                || glyphBuffer[capacityResult.Required].Cluster != 0xA11CEu
                || glyphBuffer[capacityResult.Required].XAdvance != 101
                || glyphBuffer[capacityResult.Required + 1].GlyphId != 0xC0FFEEu
                || glyphBuffer[capacityResult.Required + 1].Cluster != 0xBADC0DEu
                || glyphBuffer[capacityResult.Required + 1].XAdvance != 201)
            {
                throw new InvalidOperationException("Vulkan text provider shaping output bounds contract failed");
            }

            var warmShapeResult = provider.ShapeInto(text, options, glyphWorkspace);
            if (warmShapeResult.Status != VulkanTextProviderAbi.Success
                || warmShapeResult.Count != shapeResult.Count
                || warmShapeResult.Required != shapeResult.Required
                || glyphBuffer[capacityResult.Required].GlyphId != 0xDEADBEEFu
                || glyphBuffer[capacityResult.Required + 1].GlyphId != 0xC0FFEEu)
            {
                throw new InvalidOperationException("Vulkan text provider shaping workspace reuse contract failed");
            }

            var glyphId = glyphBuffer[0].GlyphId;
            var byteCapacityProbe = new VulkanTextProviderWorkspace(Array.Empty<byte>());
            var byteCapacityResult = provider.EncodeGlyphInto(glyphId, byteCapacityProbe);
            if (byteCapacityResult.AbiVersion != VulkanTextProviderAbi.Version
                || byteCapacityResult.Status != VulkanTextProviderAbi.CapacityExceeded
                || byteCapacityResult.Required <= 0
                || byteCapacityResult.Count != 0
                || byteCapacityProbe.ByteCount != 0)
            {
                throw new InvalidOperationException("Vulkan text provider glyph capacity contract failed");
            }

            var outputBytes = new byte[byteCapacityResult.Required + 2];
            outputBytes[byteCapacityResult.Required] = 0xA5;
            outputBytes[byteCapacityResult.Required + 1] = 0x5A;
            var byteWorkspace = new VulkanTextProviderWorkspace(outputBytes);
            var byteResult = provider.EncodeGlyphInto(glyphId, byteWorkspace);
            if (byteResult.AbiVersion != VulkanTextProviderAbi.Version
                || byteResult.Status != VulkanTextProviderAbi.Success
                || byteResult.Count != byteCapacityResult.Required
                || byteResult.Required != byteCapacityResult.Required
                || byteWorkspace.ByteCount != byteCapacityResult.Required
                || outputBytes[byteCapacityResult.Required] != 0xA5
                || outputBytes[byteCapacityResult.Required + 1] != 0x5A)
            {
                throw new InvalidOperationException("Vulkan text provider glyph output bounds contract failed");
            }

            var warmByteResult = provider.EncodeGlyphInto(glyphId, byteWorkspace);
            if (warmByteResult.Status != VulkanTextProviderAbi.Success
                || warmByteResult.Count != byteResult.Count
                || warmByteResult.Required != byteResult.Required
                || outputBytes[byteCapacityResult.Required] != 0xA5
                || outputBytes[byteCapacityResult.Required + 1] != 0x5A)
            {
                throw new InvalidOperationException("Vulkan text provider glyph workspace reuse contract failed");
            }

            provider.Dispose();
            var disposedShape = provider.ShapeInto(text, options, glyphWorkspace);
            if (disposedShape.AbiVersion != VulkanTextProviderAbi.Version
                || disposedShape.Status != VulkanTextProviderAbi.Disposed
                || disposedShape.Count != 0
                || disposedShape.Required != 0)
            {
                throw new InvalidOperationException("Vulkan text provider disposed shaping contract failed");
            }

            var disposedEncoding = provider.EncodeGlyphInto(glyphId, byteWorkspace);
            if (disposedEncoding.AbiVersion != VulkanTextProviderAbi.Version
                || disposedEncoding.Status != VulkanTextProviderAbi.Disposed
                || disposedEncoding.Count != 0
                || disposedEncoding.Required != 0)
            {
                throw new InvalidOperationException("Vulkan text provider disposed encoding contract failed");
            }

            Console.WriteLine("TEXT_PROVIDER_ABI_SMOKE shapeRequired=" + capacityResult.Required
                + " glyphRequired=" + byteCapacityResult.Required + " warmReuse=1 disposed=1");
            return 0;
        }
        finally
        {
            font?.Dispose();
        }
    }
}
