package Goo

import System

internal sealed class TypefaceResource : IDisposable {
  private let font VulkanTextFont
  private let family string
  private var references int32 = 1
  private var disposed bool

  internal prop Font VulkanTextFont { get { return font } }
  internal prop Family string { get { return family } }

  internal init(family string, bytes []uint8, faceIndex uint32,
    variations ([]VulkanTextVariation)?) {
    if family == nil { throw ArgumentNullException("family") }
    if bytes.Length == 0 { throw ArgumentException("Font bytes are empty", "bytes") }
    this.family = family
    font = VulkanTextFont(bytes, 1u, faceIndex, variations)
  }

  internal func Lease() TypefaceLease {
    lock (this) {
      if disposed { throw ObjectDisposedException("TypefaceResource") }
      references++
    }
    return TypefaceLease(this)
  }

  internal func Release() {
    var last = false
    lock (this) {
      if disposed { return }
      references--
      if references == 0 {
        disposed = true
        last = true
      }
    }
    if last { font.Dispose() }
  }

  public func Dispose() {
    Release()
  }
}
