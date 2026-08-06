package Goo

import SkiaSharp

internal partial class Painter {
  internal func paintImage(n Node, canvas SKCanvas) {
    guard let image = n.DecodedImage else {
      return
    }
    if !image.IsValid || image.Width <= 0 || image.Height <= 0 {
      return
    }
    let left = TextLayouts.ContentLeft(n)
    let top = TextLayouts.ContentTop(n)
    let width = TextLayouts.ContentWidth(n)
    let height = TextLayouts.ContentHeight(n)
    if width <= 0.0F || height <= 0.0F {
      return
    }
    let rect = SKRect.Create(left, top, width, height)
    let destination = fittedImageRect(rect, image, n.ImageFit)
    canvas.Save()
    clipImageContent(n, canvas, rect)
    drawImage(image, canvas, destination)
    canvas.Restore()
  }

  internal func clipImageContent(n Node, canvas SKCanvas, rect SKRect) {
    if !hasRadius(n) {
      canvas.ClipRect(rect, SKClipOperation.Intersect, true)
      return
    }
    let leftInset = rect.Left - n.Rect.X
    let topInset = rect.Top - n.Rect.Y
    let rightInset = n.Rect.X + n.Rect.W - rect.Right
    let bottomInset = n.Rect.Y + n.Rect.H - rect.Bottom
    let tl = insetRadius(cornerPx(n.BorderTopLeftRadius, n.BorderRadius), leftInset, topInset)
    let tr = insetRadius(cornerPx(n.BorderTopRightRadius, n.BorderRadius), rightInset, topInset)
    let br = insetRadius(cornerPx(n.BorderBottomRightRadius, n.BorderRadius), rightInset, bottomInset)
    let bl = insetRadius(cornerPx(n.BorderBottomLeftRadius, n.BorderRadius), leftInset, bottomInset)
    using let rr = SKRoundRect()
    rr.SetRectRadii(rect, []SKPoint{ SKPoint(tl, tl), SKPoint(tr, tr), SKPoint(br, br), SKPoint(bl, bl) })
    canvas.ClipRoundRect(rr, SKClipOperation.Intersect, true)
  }
}
