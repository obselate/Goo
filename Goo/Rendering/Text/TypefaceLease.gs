package Goo

import System

internal sealed class TypefaceLease : IDisposable {
  private var resource TypefaceResource?

  internal init(resource TypefaceResource) {
    this.resource = resource
  }

  internal prop Font VulkanTextFont {
    get {
      guard let value = resource else { throw ObjectDisposedException("TypefaceLease") }
      return value.Font
    }
  }

  internal prop Family string {
    get {
      guard let value = resource else { throw ObjectDisposedException("TypefaceLease") }
      return value.Family
    }
  }

  internal func Duplicate() TypefaceLease {
    guard let value = resource else { throw ObjectDisposedException("TypefaceLease") }
    return value.Lease()
  }

  public func Dispose() {
    var current TypefaceResource?
    lock (this) {
      current = resource
      resource = nil
    }
    if let value = current { value.Release() }
  }
}
