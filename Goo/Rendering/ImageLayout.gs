package Goo

import System
import System.Runtime.CompilerServices
import Facebook.Yoga

internal open class ImageSourceBinding {
  internal var Source ImageSourceProvider?
  internal var Lease ImageSourceLease?
  internal var SourceCompletion ImageSourceCompletion?

  internal func BindSource(source ImageSourceProvider) {
    Source = source
    var lease ImageSourceLease?
    try { lease = source.Acquire() } catch (error Exception) { lease = nil }
    if lease == nil || (lease?.IsDisposed ?? false) {
      lease = ImageSourceLease()
      lease?.Fail()
    }
    Lease = lease
  }
  internal func RebindSource(source ImageSourceProvider) {
    ReleaseSource()
    BindSource(source)
  }
  internal func WatchSource(callback Action) {
    SourceCompletion = Lease!!.OnCompleted(callback)
  }
  internal func CompletedResult() DecodedImage? {
    SourceCompletion?.Dispose()
    SourceCompletion = nil
    return Lease?.Result()
  }
  internal func ReleaseSource() {
    SourceCompletion?.Dispose()
    Lease?.Dispose()
    Source = nil
    Lease = nil
    SourceCompletion = nil
  }
}

internal class ImageLayouts {
  shared {
    private var sourceValues ConditionalWeakTable[Node, ImageSourceBinding]?

    internal func Source(n Node) ImageSourceProvider? { return sourceState(n)?.Source }
    internal func Lease(n Node) ImageSourceLease? { return sourceState(n)?.Lease }
    internal func SourceCompletion(n Node) ImageSourceCompletion? { return sourceState(n)?.SourceCompletion }
    internal func IsCurrent(n Node, token object) bool {
      return Object.ReferenceEquals(n.ImageRequest, token)
        || Object.ReferenceEquals(sourceState(n), token)
    }

    internal func ApplyPath(n Node, path string, fit ImageFit,
      completed ((Node, object) -> void)?) {
      n.ImageFit = fit
      if path == "" {
        Dispose(n)
        return
      }
      let request = ImageDecoding.Request(path)
      if n.ImageRequest == request {
        request.Release()
        n.ImagePath = request.Path
        Refresh(n)
        return
      }
      let intrinsicWidth = n.ImageIntrinsicWidth
      let intrinsicHeight = n.ImageIntrinsicHeight
      removeSource(n)
      n.ImageCompletion?.Dispose()
      n.ImageRequest?.Release()
      n.ImagePath = request.Path
      n.ImageRequest = request
      n.ImageCompletion = nil
      n.DecodedImage = nil
      n.ImageIntrinsicWidth = intrinsicWidth
      n.ImageIntrinsicHeight = intrinsicHeight
      if Refresh(n) {
        return
      }
      n.ImageCompletion = request.OnCompleted(func() {
        if let callback = completed { callback(n, request) }
      })
    }

    internal func ApplySource(n Node, source ImageSourceProvider, fit ImageFit,
      completed ((Node, object) -> void)?) {
      n.ImageFit = fit
      let prior = sourceState(n)
      if prior?.Source == source {
        Refresh(n)
        return
      }
      let intrinsicWidth = n.ImageIntrinsicWidth
      let intrinsicHeight = n.ImageIntrinsicHeight
      n.ImageCompletion?.Dispose()
      n.ImageRequest?.Release()
      n.ImageRequest = nil
      n.ImageCompletion = nil
      removeSource(n, prior)
      n.ImagePath = ""
      n.DecodedImage = nil
      n.ImageIntrinsicWidth = intrinsicWidth
      n.ImageIntrinsicHeight = intrinsicHeight
      let value = ImageSourceBinding()
      value.BindSource(source)
      if sourceValues == nil { sourceValues = ConditionalWeakTable[Node, ImageSourceBinding]() }
      sourceValues?.Add(n, value)
      n.HasDirectImageSourceState = true
      if Refresh(n, value) {
        return
      }
      let binding = value.Lease!!
      value.WatchSource(func() {
        ImageLayouts.invalidateSource(n, value, binding, completed)
      })
    }

    internal func Refresh(n Node, known ImageSourceBinding? = nil) bool {
      var decoded DecodedImage?
      if let value = known ?? sourceState(n) {
        guard let lease = value.Lease else { return false }
        if !lease.IsComplete { return false }
        decoded = value.CompletedResult()
      } else if let request = n.ImageRequest {
        if !request.IsComplete { return false }
        decoded = request.Result
      } else {
        return false
      }
      n.ImageCompletion?.Dispose()
      n.ImageCompletion = nil
      let width = if let image = decoded {
        image.IsValid && image.Width > 0 ? float32(image.Width) : 0.0F
      } else { 0.0F }
      let height = if let image = decoded {
        image.IsValid && image.Height > 0 ? float32(image.Height) : 0.0F
      } else { 0.0F }
      if n.DecodedImage == decoded
        && n.ImageIntrinsicWidth == width
        && n.ImageIntrinsicHeight == height {
        return false
      }
      n.DecodedImage = decoded
      n.ImageIntrinsicWidth = width
      n.ImageIntrinsicHeight = height
      if let yoga = n.Yoga {
        YGNodeAPI.YGNodeMarkDirty(yoga)
      }
      return true
    }

    internal func Dispose(n Node) {
      let hadDimensions = n.ImageIntrinsicWidth > 0.0F || n.ImageIntrinsicHeight > 0.0F
        || n.DecodedImage != nil
      n.ImageCompletion?.Dispose()
      n.ImageRequest?.Release()
      removeSource(n)
      n.ImageRequest = nil
      n.ImageCompletion = nil
      n.DecodedImage = nil
      n.ImageIntrinsicWidth = 0.0F
      n.ImageIntrinsicHeight = 0.0F
      n.ImagePath = ""
      if hadDimensions {
        if let yoga = n.Yoga { YGNodeAPI.YGNodeMarkDirty(yoga) }
      }
    }

    internal func Measure(yoga Facebook.Yoga.Node, width float32, widthMode MeasureMode,
      height float32, heightMode MeasureMode) YGSize {
      let n = nodeFromYoga(yoga)
      Refresh(n)
      var naturalWidth = 0.0F
      var naturalHeight = 0.0F
      if let image = n.DecodedImage {
        if !image.IsValid || image.Width <= 0 || image.Height <= 0 {
          return YGSize{}
        }
        naturalWidth = float32(image.Width)
        naturalHeight = float32(image.Height)
      } else {
        if sourceState(n) != nil { return YGSize{} }
        guard let request = n.ImageRequest else { return YGSize{} }
        if request.IsComplete || n.ImageIntrinsicWidth <= 0.0F || n.ImageIntrinsicHeight <= 0.0F {
          return YGSize{}
        }
        naturalWidth = n.ImageIntrinsicWidth
        naturalHeight = n.ImageIntrinsicHeight
      }
      var measuredWidth = naturalWidth
      var measuredHeight = naturalHeight
      if widthMode == MeasureMode.Exactly && heightMode != MeasureMode.Exactly {
        measuredWidth = width
        measuredHeight = naturalHeight * width / naturalWidth
      } else if heightMode == MeasureMode.Exactly && widthMode != MeasureMode.Exactly {
        measuredHeight = height
        measuredWidth = naturalWidth * height / naturalHeight
      } else if widthMode == MeasureMode.Exactly && heightMode == MeasureMode.Exactly {
        measuredWidth = width
        measuredHeight = height
      } else {
        if widthMode == MeasureMode.AtMost && measuredWidth > width {
          measuredWidth = width
          measuredHeight = naturalHeight * width / naturalWidth
        }
        if heightMode == MeasureMode.AtMost && measuredHeight > height {
          measuredHeight = height
          measuredWidth = naturalWidth * height / naturalHeight
        }
      }
      return YGSize{ Width: measuredWidth, Height: measuredHeight }
    }

    private func sourceState(n Node) ImageSourceBinding? {
      if !n.HasDirectImageSourceState { return nil }
      if let table = sourceValues {
        if table.TryGetValue(n, out var value) { return value }
      }
      n.HasDirectImageSourceState = false
      return nil
    }
    private func removeSource(n Node, known ImageSourceBinding? = nil) {
      if let value = known ?? sourceState(n) {
        sourceValues?.Remove(n)
        n.HasDirectImageSourceState = false
        value.ReleaseSource()
      }
    }
    private func invalidateSource(n Node, value ImageSourceBinding, lease ImageSourceLease,
      completed ((Node, object) -> void)?) {
      if n.Retired { return }
      if let current = sourceState(n) {
        if current == value && current.Lease == lease {
          if let callback = completed { callback(n, value) }
        }
      }
    }
  }
}
