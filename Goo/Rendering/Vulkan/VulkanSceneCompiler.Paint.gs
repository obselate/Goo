package Goo

import System

internal partial class VulkanSceneCompiler {
    private func ValidateViewport(width float32, height float32) {
        if !Finite(width) || !Finite(height) || width < 0.0F || height < 0.0F {
            throw ArgumentOutOfRangeException("viewport")
        }
    }

    private func NodeBounds(node Node) ConservativeBounds {
        let rect = node.Rect
        let x = Finite(rect.X) ? rect.X : 0.0F
        let y = Finite(rect.Y) ? rect.Y : 0.0F
        let width = Finite(rect.W) && rect.W > 0.0F ? rect.W : 0.0F
        let height = Finite(rect.H) && rect.H > 0.0F ? rect.H : 0.0F
        return ConservativeBounds{ X: x, Y: y, Width: width, Height: height }
    }

    private func EffectiveOpacity(parent float32, value float64) float32 {
        if !Finite(parent) || Double.IsNaN(value) || Double.IsInfinity(value) {
            return 0.0F
        }
        let local = float32(value)
        if !Finite(local) {
            return 0.0F
        }
        if local <= 0.0F || parent <= 0.0F {
            return 0.0F
        }
        let boundedLocal = local >= 1.0F ? 1.0F : local
        let product = parent * boundedLocal
        if product >= 1.0F { return 1.0F }
        return product <= 0.0F ? 0.0F : product
    }

    private func AddNodeTransform(node Node, parentIndex int32) VulkanSceneTransformState {
        if !node.HasVisualTransform {
            return VulkanSceneTransformState{ Index: parentIndex, AxisAligned: true }
        }
        let matrix = TransformGeometry.Matrix(node)
        let record = TransformRecord{
            A: matrix.A,
            B: matrix.C,
            C: matrix.B,
            D: matrix.D,
            TX: matrix.TX,
            TY: matrix.TY,
            ParentIndex: parentIndex,
        }
        let index = frame.AddTransform(record)
        return VulkanSceneTransformState{
            Index: index,
            AxisAligned: matrix.B == 0.0F && matrix.C == 0.0F,
        }
    }

    private func AddScrollTransform(node Node, parentIndex int32) int32 {
        let x = Finite(node.ScrollX) ? node.ScrollX : 0.0F
        let y = Finite(node.ScrollY) ? node.ScrollY : 0.0F
        if x == 0.0F && y == 0.0F {
            return parentIndex
        }
        return frame.AddTransform(TransformRecord{
            A: 1.0F,
            B: 0.0F,
            C: 0.0F,
            D: 1.0F,
            TX: -x,
            TY: -y,
            ParentIndex: parentIndex,
        })
    }

    private func HasOverflowClip(node Node) bool {
        return node.OverflowX != Overflow.Visible || node.OverflowY != Overflow.Visible
    }

    private func PaintNode(
        node Node,
        bounds ConservativeBounds,
        opacity float32,
        transformIndex int32) {
        var paintedGradient = false
        if let gradient = node.BackgroundGradient {
            if HasRadius(node, bounds) {
                MarkUnsupported(VulkanSceneUnsupportedKind.Gradient)
            } else {
                paintedGradient = PaintGradient(gradient, bounds, opacity, transformIndex)
            }
        }
        if !paintedGradient {
            PaintSolid(node.BackgroundColor, node, bounds, opacity, transformIndex)
        }
        PaintBorder(node, bounds, opacity, transformIndex)
    }

    private func PaintSolid(
        color Color,
        node Node,
        bounds ConservativeBounds,
        opacity float32,
        transformIndex int32) {
        if color.A <= 0.0F || opacity <= 0.0F || bounds.IsEmpty {
            return
        }
        if HasRadius(node, bounds) {
            frame.AddRoundedBox(RoundedBoxRecord{
                Bounds: bounds,
                RadiusTopLeft: Radius(node.BorderTopLeftRadius, node.BorderRadius, bounds),
                RadiusTopRight: Radius(node.BorderTopRightRadius, node.BorderRadius, bounds),
                RadiusBottomRight: Radius(node.BorderBottomRightRadius, node.BorderRadius, bounds),
                RadiusBottomLeft: Radius(node.BorderBottomLeftRadius, node.BorderRadius, bounds),
                Color: color.ToPackedRgba(),
                Opacity: opacity,
                TransformIndex: transformIndex,
            })
        } else {
            frame.AddSolidBox(SolidBoxRecord{
                Bounds: bounds,
                Color: color.ToPackedRgba(),
                Opacity: opacity,
                TransformIndex: transformIndex,
            })
        }
    }

    private func PaintBorder(
        node Node,
        bounds ConservativeBounds,
        opacity float32,
        transformIndex int32) {
        let top = ResolveLength(node.BorderTopWidth, MinDimension(bounds))
        let right = ResolveLength(node.BorderRightWidth, MinDimension(bounds))
        let bottom = ResolveLength(node.BorderBottomWidth, MinDimension(bounds))
        let left = ResolveLength(node.BorderLeftWidth, MinDimension(bounds))
        if top <= 0.0F && right <= 0.0F && bottom <= 0.0F && left <= 0.0F {
            return
        }
        if node.BorderStyle != BorderStyle.Solid {
            MarkUnsupported(VulkanSceneUnsupportedKind.BorderStyle)
            return
        }
        frame.AddPerEdgeBorder(PerEdgeBorderRecord{
            Bounds: bounds,
            TopWidth: top,
            RightWidth: right,
            BottomWidth: bottom,
            LeftWidth: left,
            TopColor: EffectiveColor(node.BorderTopColor, opacity),
            RightColor: EffectiveColor(node.BorderRightColor, opacity),
            BottomColor: EffectiveColor(node.BorderBottomColor, opacity),
            LeftColor: EffectiveColor(node.BorderLeftColor, opacity),
            Style: uint32(int32(BorderStyle.Solid)),
            TransformIndex: transformIndex,
        })
    }

    private func PaintGradient(
        gradient Gradient,
        bounds ConservativeBounds,
        opacity float32,
        transformIndex int32) bool {
        let stops = gradient.Stops
        if stops.Count != 3 || bounds.IsEmpty {
            if stops.Count != 3 {
                MarkUnsupported(VulkanSceneUnsupportedKind.Gradient)
            }
            return false
        }
        let start = frame.GradientStopCount
        var index int32 = 0
        while index < stops.Count {
            let stop = stops[index]
            frame.AddGradientStop(GradientStopRecord{
                Offset: float32(stop.Offset),
                Color: stop.Color.ToPackedRgba(),
            })
            index = index + 1
        }
        switch gradient {
            case linear is LinearGradient {
                let radians = float32(linear.Angle) * MathF.PI / 180.0F
                let dx = MathF.Sin(radians)
                let dy = -MathF.Cos(radians)
                let half = 0.5F * (MathF.Abs(dx) * bounds.Width + MathF.Abs(dy) * bounds.Height)
                let centerX = bounds.X + bounds.Width * 0.5F
                let centerY = bounds.Y + bounds.Height * 0.5F
                frame.AddLinearGradient(LinearGradientRecord{
                    Bounds: bounds,
                    StartX: centerX - dx * half,
                    StartY: centerY - dy * half,
                    EndX: centerX + dx * half,
                    EndY: centerY + dy * half,
                    StopStart: start,
                    StopCount: 3,
                    Opacity: opacity,
                    TransformIndex: transformIndex,
                })
                return true
            }
            case radial is RadialGradient {
                frame.AddRadialGradient(RadialGradientRecord{
                    Bounds: bounds,
                    CenterX: bounds.X + bounds.Width * float32(radial.CenterX),
                    CenterY: bounds.Y + bounds.Height * float32(radial.CenterY),
                    RadiusX: bounds.Width * float32(radial.Radius),
                    RadiusY: bounds.Height * float32(radial.Radius),
                    StopStart: start,
                    StopCount: 3,
                    Opacity: opacity,
                    TransformIndex: transformIndex,
                })
                return true
            }
            case _ {
                MarkUnsupported(VulkanSceneUnsupportedKind.Gradient)
                return false
            }
        }
    }

    private func HasRadius(node Node, bounds ConservativeBounds) bool {
        return Radius(node.BorderTopLeftRadius, node.BorderRadius, bounds) > 0.0F
            || Radius(node.BorderTopRightRadius, node.BorderRadius, bounds) > 0.0F
            || Radius(node.BorderBottomRightRadius, node.BorderRadius, bounds) > 0.0F
            || Radius(node.BorderBottomLeftRadius, node.BorderRadius, bounds) > 0.0F
    }

    private func Radius(value Length, fallback Length, bounds ConservativeBounds) float32 {
        let source = value.HasMagnitude ? value : fallback
        let radius = ResolveLength(source, MinDimension(bounds))
        let limit = MinDimension(bounds) * 0.5F
        return radius > limit ? limit : radius
    }

    private func ResolveLength(value Length, basis float32) float32 {
        if !value.HasMagnitude || !Finite(value.Value) {
            return 0.0F
        }
        let resolved = value.Unit == LengthUnit.Percent
            ? basis * value.Value / 100.0F
            : value.Value
        if !Finite(resolved) || resolved <= 0.0F {
            return 0.0F
        }
        return resolved
    }

    private func MinDimension(bounds ConservativeBounds) float32 {
        return bounds.Width < bounds.Height ? bounds.Width : bounds.Height
    }

    private func EffectiveColor(color Color, opacity float32) uint32 {
        let alpha = color.A * opacity
        return Color.FromNormalized(color.R, color.G, color.B, alpha).ToPackedRgba()
    }

    private func Finite(value float32) bool {
        return !Single.IsNaN(value) && !Single.IsInfinity(value)
    }
}
