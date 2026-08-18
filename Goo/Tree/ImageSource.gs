package Goo

import System
import System.Collections.Generic

/// Supplies one image binding when a Goo element mounts.
public interface ImageSourceProvider {
  /// Creates the lease Goo owns and disposes for one mounted element.
  func Acquire() ImageSourceLease;
}

/// Owns one immutable premultiplied RGBA image resource.
public class ImageSource : ImageSourceProvider, IDisposable {
  private let gate object
  private var image DecodedImage?
  private let width int32
  private let height int32
  private var disposed bool
  private var activeLeases int32

  /// Copies exactly Width times Height premultiplied RGBA pixels into an owned image.
  /// @param width The positive pixel width.
  /// @param height The positive pixel height.
  /// @param pixels The row-major premultiplied RGBA pixels.
  public init(width int32, height int32, pixels []uint8) {
    gate = Object()
    if width <= 0 { throw ArgumentOutOfRangeException("width") }
    if height <= 0 { throw ArgumentOutOfRangeException("height") }
    if Object.ReferenceEquals(pixels, nil) { throw ArgumentNullException("pixels") }
    if int64(width) > Int64.MaxValue / int64(height) / int64(4) {
      throw ArgumentOutOfRangeException("width")
    }
    let required = int64(width) * int64(height) * int64(4)
    if required != int64(pixels.Length) { throw ArgumentException("Pixels must exactly fill the image", "pixels") }
    let created = DecodedImage.FromRgba(width, height, pixels)
    if !created.IsValid {
      created.Release()
      throw InvalidOperationException("Unable to create image source")
    }
    this.width = width
    this.height = height
    image = created
  }

  /// Gets this immutable source's pixel width.
  public prop Width int32 { get { return width } }
  /// Gets this immutable source's pixel height.
  public prop Height int32 { get { return height } }
  /// Gets whether this source has released its owner reference.
  public prop IsDisposed bool {
    get {
      var result bool
      lock gate { result = disposed }
      return result
    }
  }

  /// Creates an already-completed binding that retains this source until release.
  /// @returns The completed binding for this source.
  public func Acquire() ImageSourceLease {
    return ImageSourceLease(this)
  }

  /// Releases this source's owner reference. Existing mounted leases stay valid.
  public func Dispose() {
    var current DecodedImage?
    var release bool
    lock gate {
      if !disposed {
        disposed = true
        current = image
        image = nil
        release = true
      }
    }
    if release { current?.Release() }
  }

  internal func retainImage() DecodedImage? {
    lock gate {
      if disposed { return nil }
      if let current = image {
        current.Retain()
        activeLeases = activeLeases + 1
        return current
      }
    }
    return nil
  }

  internal func releaseLease() {
    lock gate { activeLeases = activeLeases - 1 }
  }

  internal prop ActiveLeases int32 {
    get {
      var result int32
      lock gate { result = activeLeases }
      return result
    }
  }
}

/// Owns one provider result while it is mounted by Goo.
public class ImageSourceLease : IDisposable {
  private let registrations List[ImageSourceCompletion]
  private var image DecodedImage?
  private var owner ImageSource?
  private var completed bool
  private var failed bool
  private var disposed bool

  /// Raised synchronously once when Goo releases this binding.
  public event Released Action

  /// Creates a pending provider binding.
  public init() {
    registrations = List[ImageSourceCompletion]()
  }

  internal init(source ImageSource) {
    registrations = List[ImageSourceCompletion]()
    let retained = source.retainImage()
    completed = true
    image = retained
    owner = retained == nil ? nil : source
    failed = retained == nil
  }

  /// Gets whether the provider completed this binding.
  public prop IsComplete bool {
    get {
      var result bool
      lock registrations { result = completed }
      return result
    }
  }
  /// Gets whether this binding completed without an image.
  public prop IsFailed bool {
    get {
      var result bool
      lock registrations { result = completed && failed }
      return result
    }
  }
  /// Gets whether Goo released this binding.
  public prop IsDisposed bool {
    get {
      var result bool
      lock registrations { result = disposed }
      return result
    }
  }

  /// Completes this binding with a retained source resource.
  /// @param source The source whose image the binding retains.
  /// @returns False when this binding was already completed or released.
  public func Complete(source ImageSource) bool {
    if Object.ReferenceEquals(source, nil) { throw ArgumentNullException("source") }
    return complete(source)
  }

  private func complete(source ImageSource?) bool {
    var completedRegistrations []?ImageSourceCompletion = nil
    var retained DecodedImage?
    if source != nil { retained = source?.retainImage() }
    lock registrations {
      if disposed || completed {
        retained?.Release()
        if retained != nil { source?.releaseLease() }
        return false
      }
      completed = true
      image = retained
      owner = retained == nil ? nil : source
      failed = retained == nil
      completedRegistrations = registrations.ToArray()
      registrations.Clear()
    }
    if let current = completedRegistrations {
      for registration in current { registration.Invoke() }
    }
    return true
  }

  /// Completes this binding as a failure.
  /// @returns False when this binding was already completed or released.
  public func Fail() bool { return complete(nil) }

  internal func OnCompleted(callback Action) ImageSourceCompletion {
    if Object.ReferenceEquals(callback, nil) { throw ArgumentNullException("callback") }
    let registration = ImageSourceCompletion(callback, registrations)
    var invokeNow bool
    lock registrations {
      if completed {
        invokeNow = true
      } else if !disposed {
        registrations.Add(registration)
      }
    }
    if invokeNow { registration.Invoke() }
    return registration
  }

  /// Releases the retained result and notifies the provider.
  public func Dispose() {
    var current DecodedImage?
    var source ImageSource?
    var cancelled []?ImageSourceCompletion = nil
    var release bool
    lock registrations {
      if !disposed {
        disposed = true
        current = image
        image = nil
        source = owner
        owner = nil
        cancelled = registrations.ToArray()
        registrations.Clear()
        release = true
      }
    }
    if !release {
      return
    }
    if let currentCancelled = cancelled {
      for registration in currentCancelled { registration.Dispose() }
    }
    current?.Release()
    source?.releaseLease()
    try {
      Released?.Invoke()
    } catch (error Exception) {
    }
  }

  internal func Result() DecodedImage? {
    var result DecodedImage?
    lock registrations { result = image }
    return result
  }
}

internal class ImageSourceCompletion : IDisposable {
  private let gate object
  private var callback Action?

  internal init(callback Action, gate object) {
    this.gate = gate
    this.callback = callback
  }

  public func Dispose() {
    lock gate { callback = nil }
  }

  internal func Invoke() {
    var current Action?
    lock gate {
      current = callback
      callback = nil
    }
    current?.Invoke()
  }
}
