package Goo

import System
import System.Threading

/// Owns one retained byte sequence for ShaderEffect data inputs.
public sealed class ShaderEffectData : IDisposable {
  private const MaximumBytes int32 = 16777216
  private let gate object
  private let identity uint64
  private var current ShaderEffectDataGeneration?
  private var changedCallbacks([]Action)?
  private var version uint64
  private var disposed bool

  shared {
    private var nextIdentity int64

    /// Creates a source that takes ownership of bytes without copying them.
    /// @param bytes The non-empty byte sequence transferred to Goo.
    /// @param released Called once Goo no longer reads the transferred array.
    /// @returns The retained data source.
    public func Transfer(bytes []uint8, released Action) ShaderEffectData {
      if Object.ReferenceEquals(released, nil) { throw ArgumentNullException("released") }
      validate(bytes)
      return ShaderEffectData(bytes, released)
    }

    private func allocateIdentity() uint64 {
      let value = Interlocked.Increment(ref nextIdentity)
      if value <= 0L { throw OverflowException("Shader effect data identity overflow") }
      return uint64(value)
    }

    private func validate(bytes []uint8) {
      if Object.ReferenceEquals(bytes, nil) { throw ArgumentNullException("bytes") }
      if bytes.Length <= 0 || bytes.Length > MaximumBytes {
        throw ArgumentOutOfRangeException("bytes")
      }
    }
  }

  /// Copies bytes into the initial retained publication.
  /// @param bytes The non-empty byte sequence to copy.
  public init(bytes []uint8) {
    validate(bytes)
    gate = Object()
    identity = allocateIdentity()
    current = ShaderEffectDataGeneration(bytes, true, nil)
    version = 1uL
  }

  private init(bytes []uint8, released Action) {
    gate = Object()
    identity = allocateIdentity()
    current = ShaderEffectDataGeneration(bytes, false, released)
    version = 1uL
  }

  /// Gets the current publication byte length, or zero after disposal.
  public prop ByteLength int32{
    get {
      lock gate { return current?.ByteLength ?? 0 }
    }
  }

  /// Gets the monotonically increasing publication version.
  public prop ContentVersion uint64{
    get {
      lock gate { return version }
    }
  }

  /// Gets whether this source has released its current publication.
  public prop IsDisposed bool{
    get {
      lock gate { return disposed }
    }
  }

  /// Copies and publishes a complete replacement byte sequence.
  /// @param bytes The non-empty replacement byte sequence.
  public func Publish(bytes []uint8) {
    replace(bytes, true, nil)
  }

  /// Publishes a complete replacement by taking ownership of its array.
  /// @param bytes The non-empty replacement byte sequence transferred to Goo.
  /// @param released Called once Goo no longer reads the transferred array.
  public func PublishTransferred(bytes []uint8, released Action) {
    if Object.ReferenceEquals(released, nil) { throw ArgumentNullException("released") }
    replace(bytes, false, released)
  }

  /// Releases the current owner reference. Captured publications remain valid until released.
  public func Dispose() {
    var previous ShaderEffectDataGeneration?
    var callbacks([]Action)?
    lock gate {
      if disposed { return }
      disposed = true
      previous = current
      current = nil
      callbacks = changedCallbacks
      changedCallbacks = nil
    }
    previous?.Release()
    notify(callbacks)
  }

  internal prop Identity uint64{ get -> identity }

  internal func Capture() ShaderEffectDataCapture {
    lock gate {
      if let generation = current {
        if generation.Retain() {
          return ShaderEffectDataCapture{
            Generation: generation,
            Identity: identity,
            Version: version,
            ByteLength: generation.ByteLength,
          }
        }
      }
      return ShaderEffectDataCapture{ Identity: identity, Version: version }
    }
  }

  internal func AddChanged(callback Action) {
    lock gate {
      if let callbacks = changedCallbacks {
        let expanded = [callbacks.Length + 1]Action
        Array.Copy(callbacks, expanded, callbacks.Length)
        expanded[callbacks.Length] = callback
        changedCallbacks = expanded
      } else {
        changedCallbacks = []Action{ callback }
      }
    }
  }

  internal func RemoveChanged(callback Action) {
    lock gate {
      guard let callbacks = changedCallbacks else { return }
      var removeIndex = -1
      var index int32
      while index < callbacks.Length {
        if Object.ReferenceEquals(callbacks[index], callback) { removeIndex = index }
        index++
      }
      if removeIndex < 0 { return }
      if callbacks.Length == 1 {
        changedCallbacks = nil
        return
      }
      let reduced = [callbacks.Length - 1]Action
      index = 0
      var output int32
      while index < callbacks.Length {
        if index != removeIndex {
          reduced[output] = callbacks[index]
          output++
        }
        index++
      }
      changedCallbacks = reduced
    }
  }

  private func replace(bytes []uint8, copy bool, released Action?) {
    validate(bytes)
    var previous ShaderEffectDataGeneration?
    var callbacks([]Action)?
    lock gate {
      if disposed { throw ObjectDisposedException("ShaderEffectData") }
      if version == UInt64.MaxValue {
        throw OverflowException("Shader effect data version overflow")
      }
      let replacement = ShaderEffectDataGeneration(bytes, copy, released)
      previous = current
      current = replacement
      version++
      callbacks = changedCallbacks
    }
    previous?.Release()
    notify(callbacks)
  }

  private func notify(callbacks([]Action)?) {
    if let currentCallbacks = callbacks {
      for callback in currentCallbacks { callback.Invoke() }
    }
  }
}

internal sealed class ShaderEffectDataGeneration {
  private let gate object
  private let released Action?
  private var bytes([]uint8)?
  private var references int32

  internal init(source []uint8, copy bool, released Action?) {
    gate = Object()
    if copy {
      let owned = [source.Length]uint8
      Array.Copy(source, owned, source.Length)
      bytes = owned
    } else {
      bytes = source
    }
    this.released = released
    references = 1
  }

  internal prop ByteLength int32{
    get {
      lock gate { return bytes?.Length ?? 0 }
    }
  }

  internal func Retain() bool {
    lock gate {
      if bytes == nil || references <= 0 { return false }
      references++
      return true
    }
  }

  internal func CopyTo(destination []uint8, offset int32) {
    lock gate {
      guard let source = bytes else {
        throw ObjectDisposedException("ShaderEffectDataGeneration")
      }
      Array.Copy(source, 0, destination, offset, source.Length)
    }
  }

  internal func Release() {
    var callback Action?
    lock gate {
      if references <= 0 { return }
      references--
      if references == 0 {
        bytes = nil
        callback = released
      }
    }
    if let currentCallback = callback {
      try { currentCallback.Invoke() } catch (error Exception) { }
    }
  }
}

internal data struct ShaderEffectDataCapture {
  internal var Generation ShaderEffectDataGeneration?
  internal var Identity uint64
  internal var Version uint64
  internal var ByteLength int32

  internal func CopyTo(destination []uint8, offset int32) {
    Generation?.CopyTo(destination, offset)
  }

  internal func Release() {
    Generation?.Release()
  }
}
