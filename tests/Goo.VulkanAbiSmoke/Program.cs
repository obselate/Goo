using System;
using System.IO;
using Goo;

internal static class Program
{
    private static int Main()
    {
        if (Environment.GetEnvironmentVariable("GOO_VK_SCENE_ALLOC") == "1")
            return RunSceneAllocationGate();

        var fontPath = Path.Combine(AppContext.BaseDirectory, "VendSans-VariableFont_wght.ttf");
        if (!File.Exists(fontPath))
        {
            throw new FileNotFoundException("Vulkan text provider smoke font is missing", fontPath);
        }

        RunFontCacheGate(fontPath);

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

    private static void RunFontCacheGate(string fontPath)
    {
        var cacheBudget = TextShaping.PrimaryFaceCacheByteBudgetForTests();
        var callerBytes = File.ReadAllBytes(fontPath);
        var oversizedBytes = new byte[checked((int)cacheBudget + 1)];
        Array.Copy(callerBytes, oversizedBytes, callerBytes.Length);
        var source = new FontSource("GooAbiOwned", 400, false, callerBytes);
        callerBytes[0] = (byte)(callerBytes[0] ^ 0xFF);
        ShapedText? shaped = null;
        FontSource? oversizedSource = null;
        ShapedText? oversizedShaped = null;
        try
        {
            source.Register();
            if (!source.IsRegistered)
                throw new InvalidOperationException("Font source did not register");

            shaped = TextShaping.Shape("office café", "GooAbiOwned", 16f, 400, false, 0f, 1);
            if (shaped.GlyphCount <= 0 || shaped.Width <= 0f || shaped.HasMissingGlyph)
                throw new InvalidOperationException("Registered font did not produce a complete shaped run");
            if (shaped.Runs.Count == 0)
                throw new InvalidOperationException("Registered font did not produce a shaped run lease");
            var activeProvider = shaped.Runs[0].Provider;

            source.Dispose();
            if (source.IsRegistered || !source.IsDisposed)
                throw new InvalidOperationException("Font source did not unregister on disposal");
            if (shaped.GlyphCount <= 0 || shaped.Width <= 0f || shaped.HasMissingGlyph)
                throw new InvalidOperationException("Active shaped run did not survive source disposal");
            var activeWorkspace = new VulkanTextShapingWorkspace(16);
            var activeResult = activeProvider.ShapeInto("A", new VulkanTextShapingOptions
            {
                Direction = 4u,
                Script = 0x4C61746Eu,
                Language = "en",
                ClusterLevel = 0u,
                Flags = 0u,
                Features = null,
            }, activeWorkspace);
            if (activeResult.Status != VulkanTextProviderAbi.Success
                || activeResult.Count <= 0
                || activeWorkspace.GlyphCount != activeResult.Count)
                throw new InvalidOperationException("Active shaped run lease did not retain its provider");

            shaped.Dispose();
            shaped = null;

            var cacheBefore = TextShaping.PrimaryFaceCacheBytesForTests();
            var countBefore = TextShaping.PrimaryFaceCacheCountForTests();
            if (cacheBefore > cacheBudget)
                throw new InvalidOperationException("Font cache exceeded its byte budget before oversized entry");
            oversizedSource = new FontSource("GooAbiOversized", 400, false, oversizedBytes);
            oversizedSource.Register();
            oversizedShaped = TextShaping.Shape("office café", "GooAbiOversized", 16f, 400, false, 0f, 1);
            if (oversizedShaped.GlyphCount <= 0 || oversizedShaped.Width <= 0f
                || oversizedShaped.HasMissingGlyph || oversizedShaped.Runs.Count == 0)
                throw new InvalidOperationException("Oversized registered font did not shape");
            var oversizedProvider = oversizedShaped.Runs[0].Provider;
            var cacheAfterShape = TextShaping.PrimaryFaceCacheBytesForTests();
            var countAfterShape = TextShaping.PrimaryFaceCacheCountForTests();
            if (cacheAfterShape > cacheBudget || cacheAfterShape != cacheBefore
                || countAfterShape != countBefore)
                throw new InvalidOperationException("Oversized font entered the cache");

            oversizedSource.Dispose();
            var oversizedWorkspace = new VulkanTextShapingWorkspace(16);
            var oversizedResult = oversizedProvider.ShapeInto("A", new VulkanTextShapingOptions
            {
                Direction = 4u,
                Script = 0x4C61746Eu,
                Language = "en",
                ClusterLevel = 0u,
                Flags = 0u,
                Features = null,
            }, oversizedWorkspace);
            var cacheAfterDispose = TextShaping.PrimaryFaceCacheBytesForTests();
            if (oversizedResult.Status != VulkanTextProviderAbi.Success
                || oversizedResult.Count <= 0
                || oversizedWorkspace.GlyphCount != oversizedResult.Count
                || cacheAfterDispose > cacheBudget)
                throw new InvalidOperationException("Oversized active lease or cache budget contract failed");

            Console.WriteLine("FONT_CACHE_SMOKE defensiveCopy=1 cacheBytes=" + cacheAfterDispose
                + " budget=" + cacheBudget + " oversizedBypass=1 activeLease=1");
        }
        finally
        {
            shaped?.Dispose();
            oversizedShaped?.Dispose();
            oversizedSource?.Dispose();
            source.Dispose();
        }
    }

    private static int RunSceneAllocationGate()
    {
        var root = new Node
        {
            Kind = NodeKind.Container,
            Rect = new Rect { X = 0, Y = 0, W = 320, H = 180 },
            BackgroundGradient = new LinearGradient(
                135.0, Color.Rgb(24, 42, 88), Color.Rgb(214, 164, 72)),
            OverflowX = Overflow.Hidden,
            OverflowY = Overflow.Hidden,
        };
        var child = new Node
        {
            Kind = NodeKind.Button,
            Parent = root,
            Rect = new Rect { X = 20, Y = 20, W = 120, H = 60 },
            BackgroundColor = Color.Rgb(42, 72, 132),
            BorderTopWidth = 2,
            BorderRightWidth = 2,
            BorderBottomWidth = 2,
            BorderLeftWidth = 2,
            BorderTopColor = Color.Rgb(220, 220, 220),
            BorderRightColor = Color.Rgb(220, 220, 220),
            BorderBottomColor = Color.Rgb(220, 220, 220),
            BorderLeftColor = Color.Rgb(220, 220, 220),
        };
        root.Children.Add(child);

        var compiler = new VulkanSceneCompiler(8);
        for (var warmup = 0; warmup < 9; warmup++)
            compiler.Compile(root, Color.Transparent, 320, 180);

        var before = GC.GetAllocatedBytesForCurrentThread();
        var result = compiler.Compile(root, Color.Transparent, 320, 180);
        var allocated = GC.GetAllocatedBytesForCurrentThread() - before;
        if (result.VisibleNodeCount != 2 || result.DrawCount == 0 || result.HasUnsupported)
            throw new InvalidOperationException("Vulkan scene allocation gate produced an unsupported scene");

        Console.WriteLine("VULKAN_SCENE_ALLOC allocated=" + allocated
            + " draws=" + result.DrawCount + " visibleNodes=" + result.VisibleNodeCount);
        return allocated == 0 ? 0 : 1;
    }

}
