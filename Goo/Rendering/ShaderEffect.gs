package Goo

import System
import System.Numerics
import System.Runtime.CompilerServices
import System.Threading

public sealed class ShaderEffect {
  private const MaximumByteCount int32 = 1048576
  private const MaximumBackdropOutset float32 = 256.0F
  private const ParameterCount int32 = 8
  private let gate object
  private let code []uint8
  private let parameters []Vector4
  private var changedCallbacks([]Action)?
  private let programId uint64
  private let samplesBackdrop bool
  private let backdropOutset float32
  private var version uint64

  shared {
    private var nextProgramId int64

    private func allocateProgramId() uint64 {
      let value = Interlocked.Increment(ref nextProgramId)
      if value <= 0L {
        throw OverflowException("Shader effect program identity overflow")
      }
      return uint64(value)
    }
  }

  public init(fragmentSpirv []uint8, samplesBackdrop bool = false, backdropOutset float32 = 0.0F) {
    if Object.ReferenceEquals(fragmentSpirv, nil) {
      throw ArgumentNullException("fragmentSpirv")
    }
    if fragmentSpirv.Length < 20 || fragmentSpirv.Length > MaximumByteCount
      || (fragmentSpirv.Length & 3) != 0 {
        throw ArgumentOutOfRangeException("fragmentSpirv")
      }
    if readWord(fragmentSpirv, 0) != 0x07230203u {
      throw ArgumentException("Shader effect is not SPIR-V", "fragmentSpirv")
    }
    let spirvVersion = readWord(fragmentSpirv, 4)
    if spirvVersion < 0x00010000u || spirvVersion > 0x00010600u
      || readWord(fragmentSpirv, 12) == 0u || readWord(fragmentSpirv, 16) != 0u {
        throw ArgumentException("Shader effect SPIR-V header is invalid", "fragmentSpirv")
      }
    if !finite(backdropOutset) || backdropOutset < 0.0F
      || backdropOutset > MaximumBackdropOutset{
        throw ArgumentOutOfRangeException("backdropOutset")
      }
    if !samplesBackdrop && backdropOutset != 0.0F {
      throw ArgumentException("Backdrop outset requires backdrop sampling", "backdropOutset")
    }
    gate = Object()
    code = [fragmentSpirv.Length]uint8
    Array.Copy(fragmentSpirv, code, fragmentSpirv.Length)
    parameters = [ParameterCount]Vector4
    programId = allocateProgramId()
    this.samplesBackdrop = samplesBackdrop
    this.backdropOutset = backdropOutset
    version = 1uL
  }

  public func SetParameter(slot int32, value Vector4) bool {
    if slot < 0 || slot >= ParameterCount {
      throw ArgumentOutOfRangeException("slot")
    }
    if !finite(value.X) || !finite(value.Y) || !finite(value.Z) || !finite(value.W) {
      throw ArgumentOutOfRangeException("value")
    }
    var changed bool
    var callbacks([]Action)?
    lock gate {
      if parameters[slot] != value {
        parameters[slot] = value
        if version == UInt64.MaxValue {
          version = 1uL
        } else {
          version = version + 1uL
        }
        changed = true
        callbacks = changedCallbacks
      }
    }
    if let current = callbacks {
      for callback in current { callback.Invoke() }
    }
    return changed
  }

  internal func AddChanged(callback Action) {
    lock gate {
      if let current = changedCallbacks {
        let expanded = [current.Length + 1]Action
        var index int32
        while index < current.Length {
          expanded[index] = current[index]
          index++
        }
        expanded[current.Length] = callback
        changedCallbacks = expanded
      } else {
        changedCallbacks = []Action{ callback }
      }
    }
  }

  internal func RemoveChanged(callback Action) {
    lock gate {
      guard let current = changedCallbacks else { return }
      var removeIndex = -1
      var index int32
      while index < current.Length {
        if Object.ReferenceEquals(current[index], callback) { removeIndex = index }
        index++
      }
      if removeIndex < 0 { return }
      if current.Length == 1 {
        changedCallbacks = nil
        return
      }
      let reduced = [current.Length - 1]Action
      index = 0
      var output int32
      while index < current.Length {
        if index != removeIndex {
          reduced[output] = current[index]
          output++
        }
        index++
      }
      changedCallbacks = reduced
    }
  }

  internal prop ProgramId uint64{ get { return programId } }
  internal prop FragmentSpirv []uint8{ get { return code } }
  internal prop SamplesBackdrop bool{ get { return samplesBackdrop } }
  internal prop BackdropOutset float32{ get { return backdropOutset } }

  internal func CopySnapshot(out snapshot ShaderEffectSnapshot) {
    lock gate {
      snapshot = ShaderEffectSnapshot{
        Program: this,
        ProgramId: programId,
        Version: version,
        SamplesBackdrop: SamplesBackdrop,
        BackdropOutset: BackdropOutset,
        Parameter0: parameters[0],
        Parameter1: parameters[1],
        Parameter2: parameters[2],
        Parameter3: parameters[3],
        Parameter4: parameters[4],
        Parameter5: parameters[5],
        Parameter6: parameters[6],
        Parameter7: parameters[7],
      }
    }
  }

  private func finite(value float32) bool -> !Single.IsNaN(value) && !Single.IsInfinity(value)

  private func readWord(bytes []uint8, offset int32) uint32 -> uint32(bytes[offset])
  | (uint32(bytes[offset + 1]) << 8)
  | (uint32(bytes[offset + 2]) << 16)
  | (uint32(bytes[offset + 3]) << 24)
}

internal data struct ShaderEffectSnapshot {
  internal var Program ShaderEffect?
  internal var ProgramId uint64
  internal var Version uint64
  internal var SamplesBackdrop bool
  internal var BackdropOutset float32
  internal var Parameter0 Vector4
  internal var Parameter1 Vector4
  internal var Parameter2 Vector4
  internal var Parameter3 Vector4
  internal var Parameter4 Vector4
  internal var Parameter5 Vector4
  internal var Parameter6 Vector4
  internal var Parameter7 Vector4
}

internal class ShaderEffectStyles {
  shared {
    private var values ConditionalWeakTable[Node, ShaderEffectBinding]?

    internal func Get(n Node) ShaderEffect? {
      if let table = values {
        if table.TryGetValue(n, out var value) { return value.Effect }
      }
      return nil
    }

    internal func Set(n Node, effect ShaderEffect?, invalidated Action?) {
      let current = state(n)
      if let value = current {
        if Object.ReferenceEquals(value.Effect, effect) {
          value.Invalidated = invalidated
          return
        }
        values?.Remove(n)
        value.Dispose()
      }
      if effect == nil { return }
      if values == nil { values = ConditionalWeakTable[Node, ShaderEffectBinding]() }
      let binding = ShaderEffectBinding(n, effect!!, invalidated)
      values?.Add(n, binding)
    }

    internal func Dispose(n Node) {
      guard let value = state(n) else { return }
      values?.Remove(n)
      value.Dispose()
    }

    private func state(n Node) ShaderEffectBinding? {
      if let table = values {
        if table.TryGetValue(n, out var value) { return value }
      }
      return nil
    }
  }
}

internal sealed class ShaderEffectBinding : IDisposable {
  internal let Effect ShaderEffect
  internal var Invalidated Action?
  private let node Node
  private let changed Action
  private var disposed bool

  internal init(n Node, effect ShaderEffect, invalidated Action?) {
    node = n
    Effect = effect
    Invalidated = invalidated
    changed = func() {
      if !disposed && !node.Retired { Invalidated?.Invoke() }
    }
    effect.AddChanged(changed)
  }

  public func Dispose() {
    if disposed { return }
    disposed = true
    try { Effect.RemoveChanged(changed) } catch (error Exception) { }
    Invalidated = nil
  }
}
