package Goo

import System

internal sealed class TypefaceLease : IDisposable {
  private var resource TypefaceResource?

  internal init(resource TypefaceResource) {
    this.resource = resource
  }

  internal prop Provider VulkanTextProvider{
    get {
      lock (this) {
        guard let value = resource else { throw ObjectDisposedException("TypefaceLease") }
        return value.Provider
      }
    }
  }

  internal prop Family string{
    get {
      lock (this) {
        guard let value = resource else { throw ObjectDisposedException("TypefaceLease") }
        return value.Family
      }
    }
  }

  internal prop IsRegistered bool{
    get {
      lock (this) {
        guard let value = resource else { throw ObjectDisposedException("TypefaceLease") }
        return value.IsRegistered
      }
    }
  }

  internal func Duplicate() TypefaceLease {
    lock (this) {
      guard let value = resource else { throw ObjectDisposedException("TypefaceLease") }
      return value.Lease()
    }
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
