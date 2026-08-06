package Goo

import System
import System.Runtime.CompilerServices
import Facebook.Yoga
import Goo.InternalTextInterop

internal class ImageLayouts {
  shared {
    private var sourceValues ConditionalWeakTable[Node, DirectImageSourceValue]?

    internal func Source(n Node) ImageSourceProvider? {
      return if let value = sourceState(n) { value.Source } else { nil }
    }

    internal func Lease(n Node) ImageSourceLease? {
      return if let value = sourceState(n) { value.Lease } else { nil }
    }

    internal func SourceCompletion(n Node) ImageSourceCompletion? {
      return if let value = sourceState(n) { value.Completion } else { nil }
    }

    internal func IsCurrent(n Node, token object) bool {
      if Object.ReferenceEquals(n.ImageRequest, token) { return true }
      return if let value = sourceState(n) { Object.ReferenceEquals(value, token) } else { false }
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
      if let registration = n.ImageCompletion {
        registration.Dispose()
      }
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
        if let callback = completed {
          callback(n, request)
        }
      })
    }

    internal func ApplySource(n Node, source ImageSourceProvider, fit ImageFit,
      completed ((Node, object) -> void)?) {
      n.ImageFit = fit
      if Source(n) == source {
        Refresh(n)
        return
      }
      let intrinsicWidth = n.ImageIntrinsicWidth
      let intrinsicHeight = n.ImageIntrinsicHeight
      if let registration = n.ImageCompletion {
        registration.Dispose()
      }
      n.ImageRequest?.Release()
      n.ImageRequest = nil
      n.ImageCompletion = nil
      removeSource(n)
      n.ImagePath = ""
      n.DecodedImage = nil
      n.ImageIntrinsicWidth = intrinsicWidth
      n.ImageIntrinsicHeight = intrinsicHeight
      let value = DirectImageSourceValue()
      value.Source = source
      var lease ImageSourceLease?
      try {
        lease = source.Acquire()
      } catch (error Exception) {
        lease = ImageSourceLease()
        lease?.Fail()
      }
      if lease == nil {
        lease = ImageSourceLease()
        lease?.Fail()
      }
      if lease?.IsDisposed ?? false {
        lease = ImageSourceLease()
        lease?.Fail()
      }
      value.Lease = lease
      if sourceValues == nil { sourceValues = ConditionalWeakTable[Node, DirectImageSourceValue]() }
      sourceValues?.Add(n, value)
      n.HasDirectImageSourceState = true
      if Refresh(n) {
        return
      }
      let binding = lease!!
      value.Completion = binding.OnCompleted(func() {
        ImageLayouts.invalidateSource(n, value, binding, completed)
      })
    }

    internal func Refresh(n Node) bool {
      var decoded DecodedImage?
      if let value = sourceState(n) {
        guard let lease = value.Lease else { return false }
        if !lease.IsComplete { return false }
        if let registration = value.Completion {
          registration.Dispose()
          value.Completion = nil
        }
        decoded = lease.Result()
      } else {
        guard let request = n.ImageRequest else {
          return false
        }
        if !request.IsComplete {
          return false
        }
        decoded = request.Result
      }
      if let registration = n.ImageCompletion {
        registration.Dispose()
        n.ImageCompletion = nil
      }
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
      if let registration = n.ImageCompletion {
        registration.Dispose()
      }
      n.ImageRequest?.Release()
      removeSource(n)
      n.ImageRequest = nil
      n.ImageCompletion = nil
      n.DecodedImage = nil
      n.ImageIntrinsicWidth = 0.0F
      n.ImageIntrinsicHeight = 0.0F
      n.ImagePath = ""
      if hadDimensions {
        if let yoga = n.Yoga {
          YGNodeAPI.YGNodeMarkDirty(yoga)
        }
      }
    }

    internal func Measure(yoga Facebook.Yoga.Node, width float32, widthMode MeasureMode,
      height float32, heightMode MeasureMode) YGSize {
      let n = YGNodeAPI.YGNodeGetContext(yoga) as Node
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
        if sourceState(n) != nil {
          return YGSize{}
        }
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

    private func sourceState(n Node) DirectImageSourceValue? {
      if !n.HasDirectImageSourceState { return nil }
      if let table = sourceValues {
        if table.TryGetValue(n, out var value) { return value }
      }
      n.HasDirectImageSourceState = false
      return nil
    }

    private func removeSource(n Node) {
      if n.HasDirectImageSourceState {
        var value DirectImageSourceValue?
        if let table = sourceValues {
          if table.TryGetValue(n, out var current) {
            value = current
            table.Remove(n)
          }
        }
        n.HasDirectImageSourceState = false
        if let current = value {
          current.Completion?.Dispose()
          current.Lease?.Dispose()
          current.Source = nil
          current.Lease = nil
          current.Completion = nil
        }
      }
    }

    private func invalidateSource(n Node, value DirectImageSourceValue, lease ImageSourceLease,
      completed ((Node, object) -> void)?) {
      if !n.Retired {
        if let current = sourceState(n) {
          if current == value && current.Lease == lease {
            if let callback = completed { callback(n, value) }
          }
        }
      }
    }
  }
}

internal class DirectImageSourceValue {
  internal var Source ImageSourceProvider?
  internal var Lease ImageSourceLease?
  internal var Completion ImageSourceCompletion?
}
