using SkiaSharp;

internal sealed class DirectShapeEffectControl : IEffectPaintCase
{
    private readonly DirectShapeNode[] _nodes;
    private readonly DirectShapeEffect _effect;

    internal DirectShapeEffectControl(string name, DirectShapeEffect effect)
    {
        Name = name;
        _effect = effect;
        _nodes = new DirectShapeNode[EffectBenchmarkSupport.VisibleNodes];
        for (var index = 0; index < _nodes.Length; index++)
        {
            var column = index % 20;
            var row = index / 20;
            _nodes[index] = new DirectShapeNode(10 + column * 39.0f, 10 + row * 50.0f, effect);
        }
    }

    public string Name { get; }
    public int VisibleNodeCount => EffectBenchmarkSupport.VisibleNodes;
    public int RetainedNodeCount => EffectBenchmarkSupport.RetainedNodes;
    public EffectPixelRegion EffectRegion => _effect is DirectShapeEffect.NegativeOuterSpreadShadow
        or DirectShapeEffect.PositiveOuterSpreadShadow ? EffectPixelRegion.OutsideBody : EffectPixelRegion.InsideBody;

    public long Paint(SKCanvas canvas)
    {
        canvas.Clear(EffectBenchmarkSupport.Background);
        using var scratch = new DirectSkiaPaintScratch();
        foreach (var node in _nodes)
        {
            node.Paint(canvas, _effect, scratch);
        }
        canvas.Flush();
        return RetainedNodeCount;
    }

    public void PaintReference(SKCanvas canvas)
    {
        canvas.Clear(EffectBenchmarkSupport.Background);
        foreach (var node in _nodes)
        {
            node.PaintReference(canvas, _effect);
        }
        canvas.Flush();
    }

    public void Dispose()
    {
        foreach (var node in _nodes)
        {
            node.Dispose();
        }
    }
}

internal enum DirectShapeEffect
{
    NegativeOuterSpreadShadow,
    InsetShadow,
    PositiveOuterSpreadShadow,
    RoundedDashedStroke,
    NoShadow,
}

internal sealed class DirectShapeNode : IDisposable
{
    private static readonly SKColor FillColor = new(42, 104, 180);
    private static readonly SKColor StrokeColor = new(190, 220, 255);
    private static readonly SKColor ShadowColor = new(0, 0, 0, 144);
    private readonly SKPath _fill;
    private readonly SKPath _stroke;
    private readonly SKPath? _finalFill;
    private readonly SKPath? _silhouette;
    private readonly SKPath? _negativeOuter;
    private readonly SKPath? _insetInverse;
    private readonly SKPathEffect? _corner;
    private readonly SKPathEffect? _dash;
    private readonly SKPathEffect? _composed;
    private readonly SKRect _clip;
    private readonly SKRect _nodeRect;

    internal DirectShapeNode(float left, float top, DirectShapeEffect effect)
    {
        var strokeWidth = effect == DirectShapeEffect.RoundedDashedStroke ? 3.0f : 2.0f;
        _nodeRect = SKRect.Create(left, top, 28, 34);
        _clip = _nodeRect;
        var matrix = SKMatrix.CreateScaleTranslation(28 - strokeWidth, 34 - strokeWidth,
            left + strokeWidth * 0.5f, top + strokeWidth * 0.5f);
        _fill = UnitSquarePath(matrix);
        _stroke = UnitSquarePath(matrix);
        if (effect == DirectShapeEffect.RoundedDashedStroke)
        {
            _corner = SKPathEffect.CreateCorner(5) ?? throw new InvalidOperationException("direct corner effect failed");
            _dash = SKPathEffect.CreateDash(new[] { 6.0f, 4.0f }, 0) ?? throw new InvalidOperationException("direct dash effect failed");
            _composed = SKPathEffect.CreateCompose(_dash, _corner) ?? throw new InvalidOperationException("direct composed effect failed");
            using var paint = new SKPaint { Style = SKPaintStyle.Fill, PathEffect = _corner };
            _finalFill = paint.GetFillPath(_fill) ?? throw new InvalidOperationException("direct rounded fill failed");
            _finalFill.FillType = _fill.FillType;
        }
        if (effect is DirectShapeEffect.NegativeOuterSpreadShadow
            or DirectShapeEffect.InsetShadow
            or DirectShapeEffect.PositiveOuterSpreadShadow)
        {
            _silhouette = BuildSilhouette(_fill, _stroke, strokeWidth);
            if (effect == DirectShapeEffect.NegativeOuterSpreadShadow)
            {
                _negativeOuter = BuildNegativeOuter(_silhouette);
            }
            else if (effect == DirectShapeEffect.InsetShadow)
            {
                _insetInverse = BuildInsetInverse(_silhouette, _nodeRect);
            }
        }
    }

    internal void Paint(SKCanvas canvas, DirectShapeEffect effect, DirectSkiaPaintScratch scratch)
    {
        if (effect == DirectShapeEffect.NegativeOuterSpreadShadow)
        {
            PaintNegativeShadow(canvas, scratch);
        }
        else if (effect == DirectShapeEffect.PositiveOuterSpreadShadow)
        {
            PaintPositiveShadow(canvas, scratch);
        }
        canvas.Save();
        try
        {
            canvas.ClipRect(_clip, SKClipOperation.Intersect, true);
            var fill = scratch.Reset();
            fill.Color = FillColor;
            fill.IsAntialias = true;
            canvas.DrawPath(_finalFill ?? _fill, fill);
            if (effect == DirectShapeEffect.InsetShadow)
            {
                PaintInsetShadow(canvas, scratch);
            }
            var stroke = scratch.Reset();
            stroke.Color = StrokeColor;
            stroke.IsAntialias = true;
            stroke.Style = SKPaintStyle.Stroke;
            stroke.StrokeWidth = effect == DirectShapeEffect.RoundedDashedStroke ? 3 : 2;
            stroke.StrokeCap = effect == DirectShapeEffect.RoundedDashedStroke ? SKStrokeCap.Round : SKStrokeCap.Butt;
            stroke.StrokeJoin = effect == DirectShapeEffect.RoundedDashedStroke ? SKStrokeJoin.Round : SKStrokeJoin.Miter;
            stroke.StrokeMiter = 4;
            stroke.PathEffect = _composed;
            canvas.DrawPath(_stroke, stroke);
        }
        finally
        {
            canvas.Restore();
        }
    }

    internal void PaintReference(SKCanvas canvas, DirectShapeEffect effect)
    {
        canvas.Save();
        try
        {
            canvas.ClipRect(_clip, SKClipOperation.Intersect, true);
            using var fill = new SKPaint { Color = FillColor, IsAntialias = true };
            using var stroke = new SKPaint { Color = StrokeColor, IsAntialias = true, Style = SKPaintStyle.Stroke,
                StrokeWidth = effect == DirectShapeEffect.RoundedDashedStroke ? 3 : 2 };
            canvas.DrawPath(_fill, fill);
            canvas.DrawPath(_stroke, stroke);
        }
        finally
        {
            canvas.Restore();
        }
    }

    private void PaintNegativeShadow(SKCanvas canvas, DirectSkiaPaintScratch scratch)
    {
        if (_negativeOuter is null || _negativeOuter.IsEmpty) return;
        canvas.Save();
        try
        {
            canvas.Translate(3, 2);
            var paint = ShadowPaint(scratch);
            canvas.DrawPath(_negativeOuter, paint);
        }
        finally
        {
            canvas.Restore();
        }
    }

    private void PaintPositiveShadow(SKCanvas canvas, DirectSkiaPaintScratch scratch)
    {
        canvas.Save();
        try
        {
            canvas.Translate(3, 2);
            var paint = ShadowPaint(scratch);
            paint.Style = SKPaintStyle.StrokeAndFill;
            paint.StrokeWidth = 6;
            paint.StrokeJoin = SKStrokeJoin.Miter;
            paint.StrokeMiter = 4;
            canvas.DrawPath(_silhouette!, paint);
        }
        finally
        {
            canvas.Restore();
        }
    }

    private void PaintInsetShadow(SKCanvas canvas, DirectSkiaPaintScratch scratch)
    {
        if (_insetInverse is null) return;
        canvas.Save();
        try
        {
            canvas.ClipPath(_silhouette!, SKClipOperation.Intersect, true);
            var paint = ShadowPaint(scratch);
            canvas.DrawPath(_insetInverse, paint);
        }
        finally
        {
            canvas.Restore();
        }
    }

    private static SKPaint ShadowPaint(DirectSkiaPaintScratch scratch)
    {
        var paint = scratch.Reset();
        paint.Color = ShadowColor;
        paint.IsAntialias = true;
        paint.MaskFilter = scratch.Blur2;
        return paint;
    }

    private static SKPath UnitSquarePath(SKMatrix matrix)
    {
        using var builder = new SKPathBuilder();
        builder.MoveTo(0, 0);
        builder.LineTo(1, 0);
        builder.LineTo(1, 1);
        builder.LineTo(0, 1);
        builder.Close();
        var path = builder.Detach();
        path.FillType = SKPathFillType.Winding;
        path.Transform(matrix);
        return path;
    }

    private static SKPath BuildSilhouette(SKPath fill, SKPath stroke, float width)
    {
        using var paint = new SKPaint { Style = SKPaintStyle.Stroke, StrokeWidth = width };
        using var edge = paint.GetFillPath(stroke) ?? throw new InvalidOperationException("direct shadow silhouette failed");
        return fill.Op(edge, SKPathOp.Union) ?? throw new InvalidOperationException("direct shadow silhouette union failed");
    }

    private static SKPath? BuildNegativeOuter(SKPath silhouette)
    {
        using var paint = new SKPaint { Style = SKPaintStyle.Stroke, StrokeWidth = 6 };
        using var edge = paint.GetFillPath(silhouette);
        return edge is null ? null : silhouette.Op(edge, SKPathOp.Difference);
    }

    private static SKPath? BuildInsetInverse(SKPath silhouette, SKRect rect)
    {
        using var paint = new SKPaint { Style = SKPaintStyle.Stroke, StrokeWidth = 4 };
        using var edge = paint.GetFillPath(silhouette);
        if (edge is null) return null;
        using var eroded = silhouette.Op(edge, SKPathOp.Difference);
        if (eroded is null) return null;
        eroded.Transform(SKMatrix.CreateTranslation(3, 2));
        using var builder = new SKPathBuilder();
        builder.AddRect(SKRect.Create(rect.Left - 15, rect.Top - 15, rect.Width + 30, rect.Height + 30));
        using var outside = builder.Detach();
        return outside.Op(eroded, SKPathOp.Difference);
    }

    public void Dispose()
    {
        _composed?.Dispose();
        _dash?.Dispose();
        _corner?.Dispose();
        _insetInverse?.Dispose();
        _negativeOuter?.Dispose();
        _silhouette?.Dispose();
        _finalFill?.Dispose();
        _stroke.Dispose();
        _fill.Dispose();
    }
}

internal sealed class DirectBoxEffectControl : IEffectPaintCase
{
    private readonly DirectBoxEffect _effect;

    internal DirectBoxEffectControl(string name, DirectBoxEffect effect)
    {
        Name = name;
        _effect = effect;
    }

    public string Name { get; }
    public int VisibleNodeCount => EffectBenchmarkSupport.VisibleNodes;
    public int RetainedNodeCount => EffectBenchmarkSupport.RetainedNodes;
    public EffectPixelRegion EffectRegion => _effect is DirectBoxEffect.Outline or DirectBoxEffect.OuterShadow
        ? EffectPixelRegion.OutsideBody : EffectPixelRegion.InsideBody;

    public long Paint(SKCanvas canvas)
    {
        canvas.Clear(EffectBenchmarkSupport.Background);
        using var boxScratch = new DirectBoxPaintScratch();
        using var scratch = new DirectSkiaPaintScratch();
        for (var index = 0; index < EffectBenchmarkSupport.VisibleNodes; index++)
        {
            var column = index % 20;
            var row = index / 20;
            DirectBoxNode.Paint(canvas, SKRect.Create(10 + column * 39.0f, 10 + row * 50.0f, 28, 34), _effect,
                scratch, boxScratch);
        }
        canvas.Flush();
        return RetainedNodeCount;
    }

    public void PaintReference(SKCanvas canvas)
    {
        canvas.Clear(EffectBenchmarkSupport.Background);
        using var fill = new SKPaint { Color = new SKColor(42, 104, 180), IsAntialias = true };
        for (var index = 0; index < EffectBenchmarkSupport.VisibleNodes; index++)
        {
            var column = index % 20;
            var row = index / 20;
            var rect = SKRect.Create(10 + column * 39.0f, 10 + row * 50.0f, 28, 34);
            if (_effect is DirectBoxEffect.RoundedBorder or DirectBoxEffect.DashedBorder or DirectBoxEffect.Outline)
                canvas.DrawRoundRect(rect, 8, 8, fill);
            else
                canvas.DrawRect(rect, fill);
        }
        canvas.Flush();
    }

    public void Dispose()
    {
    }
}

internal enum DirectBoxEffect
{
    RoundedBorder,
    DashedBorder,
    Outline,
    OuterShadow,
    InsetShadow,
}

internal static class DirectBoxNode
{
    private static readonly SKColor FillColor = new(42, 104, 180);
    private static readonly SKColor BorderColor = new(190, 220, 255);
    private static readonly SKColor OutlineColor = new(255, 190, 96);
    private static readonly SKColor ShadowColor = new(0, 0, 0, 144);

    internal static void Paint(SKCanvas canvas, SKRect rect, DirectBoxEffect effect, DirectSkiaPaintScratch scratch,
        DirectBoxPaintScratch boxScratch)
    {
        if (effect == DirectBoxEffect.OuterShadow)
        {
            PaintOuterShadow(canvas, rect, scratch);
        }
        var fill = scratch.Reset();
        fill.Color = FillColor;
        fill.IsAntialias = true;
        if (effect is DirectBoxEffect.RoundedBorder or DirectBoxEffect.DashedBorder or DirectBoxEffect.Outline)
        {
            canvas.DrawRoundRect(boxScratch.ResetRoundRect(rect, 8), fill);
        }
        else
        {
            canvas.DrawRect(rect, fill);
        }

        if (effect == DirectBoxEffect.RoundedBorder)
        {
            PaintRoundedBorder(canvas, rect, scratch, boxScratch);
        }
        else if (effect == DirectBoxEffect.DashedBorder)
        {
            PaintDashedBorder(canvas, rect, scratch, boxScratch);
        }
        else if (effect == DirectBoxEffect.Outline)
        {
            var paint = scratch.Reset();
            paint.Color = OutlineColor;
            paint.IsAntialias = true;
            paint.Style = SKPaintStyle.Stroke;
            paint.StrokeWidth = 2;
            canvas.DrawRoundRect(boxScratch.ResetRoundRect(
                SKRect.Create(rect.Left - 3, rect.Top - 3, rect.Width + 6, rect.Height + 6), 11), paint);
        }
        else if (effect == DirectBoxEffect.InsetShadow)
        {
            PaintInsetShadow(canvas, rect, scratch, boxScratch);
        }
    }

    private static void PaintRoundedBorder(SKCanvas canvas, SKRect rect, DirectSkiaPaintScratch scratch,
        DirectBoxPaintScratch boxScratch)
    {
        var paint = scratch.Reset();
        paint.Color = BorderColor;
        paint.IsAntialias = true;
        var outer = boxScratch.ResetRoundRect(rect, 8);
        var inner = boxScratch.ResetRoundRect2(
            SKRect.Create(rect.Left + 3, rect.Top + 3, rect.Width - 6, rect.Height - 6), 5);
        canvas.DrawRoundRectDifference(outer, inner, paint);
    }

    private static void PaintDashedBorder(SKCanvas canvas, SKRect rect, DirectSkiaPaintScratch scratch,
        DirectBoxPaintScratch boxScratch)
    {
        var paint = scratch.Reset();
        paint.Color = BorderColor;
        paint.IsAntialias = true;
        paint.Style = SKPaintStyle.Stroke;
        paint.StrokeWidth = 3;
        paint.PathEffect = boxScratch.Dash;
        try
        {
            canvas.DrawRoundRect(boxScratch.ResetRoundRect(
                SKRect.Create(rect.Left + 1.5f, rect.Top + 1.5f, rect.Width - 3, rect.Height - 3), 6.5f), paint);
        }
        finally
        {
            paint.PathEffect = null;
        }
    }

    private static void PaintOuterShadow(SKCanvas canvas, SKRect rect, DirectSkiaPaintScratch scratch)
    {
        var paint = scratch.Reset();
        paint.Color = ShadowColor;
        paint.IsAntialias = true;
        paint.MaskFilter = scratch.Blur2;
        canvas.DrawRect(SKRect.Create(rect.Left + 1, rect.Top, rect.Width + 4, rect.Height + 4), paint);
    }

    private static void PaintInsetShadow(SKCanvas canvas, SKRect rect, DirectSkiaPaintScratch scratch,
        DirectBoxPaintScratch boxScratch)
    {
        var hole = SKRect.Create(rect.Left + 5, rect.Top + 4, rect.Width - 4, rect.Height - 4);
        var outside = boxScratch.ResetRoundRect(
            SKRect.Create(rect.Left - 15, rect.Top - 15, rect.Width + 30, rect.Height + 30), 0);
        var holeRound = boxScratch.ResetRoundRect2(hole, 0);
        canvas.Save();
        try
        {
            canvas.ClipRect(rect, SKClipOperation.Intersect, true);
            var paint = scratch.Reset();
            paint.Color = ShadowColor;
            paint.IsAntialias = true;
            paint.MaskFilter = scratch.Blur2;
            canvas.DrawRoundRectDifference(outside, holeRound, paint);
        }
        finally
        {
            canvas.Restore();
        }
    }
}

internal sealed class DirectBoxPaintScratch : IDisposable
{
    private SKRoundRect? _roundRect;
    private SKRoundRect? _roundRect2;
    private SKPathEffect? _dash;

    internal SKPathEffect Dash => _dash ??= SKPathEffect.CreateDash(new[] { 9.0f, 6.0f }, 0)
        ?? throw new InvalidOperationException("direct box dash effect failed");

    internal SKRoundRect ResetRoundRect(SKRect rect, float radius)
    {
        var roundRect = _roundRect ??= new SKRoundRect();
        roundRect.SetRect(rect, radius, radius);
        return roundRect;
    }

    internal SKRoundRect ResetRoundRect2(SKRect rect, float radius)
    {
        var roundRect = _roundRect2 ??= new SKRoundRect();
        roundRect.SetRect(rect, radius, radius);
        return roundRect;
    }

    public void Dispose()
    {
        _roundRect?.Dispose();
        _roundRect2?.Dispose();
        _dash?.Dispose();
    }
}

internal sealed class DirectSkiaPaintScratch : IDisposable
{
    private readonly SKPaint _paint = new();
    private SKMaskFilter? _blur2;

    internal SKMaskFilter Blur2 => _blur2 ??= SKMaskFilter.CreateBlur(SKBlurStyle.Normal, 2)
        ?? throw new InvalidOperationException("direct blur filter failed");

    internal SKPaint Reset()
    {
        _paint.Reset();
        return _paint;
    }

    public void Dispose()
    {
        _paint.Dispose();
        _blur2?.Dispose();
    }
}
