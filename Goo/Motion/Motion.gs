package Goo

import System
import System.Collections.Generic

/// Configures the animation core.
public class Motion {
  /// Creates a motion configuration utility instance.
  public init() {
  }

  shared {
    private var timeScale float64

    /// Gets or sets the global playback rate. 1 is normal speed; 0 or lower
    /// lands every running animation on its target on the next tick.
    public prop TimeScale float64 {
      get { return timeScale }
      set {
        if !motionFinite(value) {
          throw ArgumentOutOfRangeException("value")
        }
        timeScale = value
      }
    }

    /// Gets or sets the sim factory used by `To(target)` when no spec is
    /// given. Core wires a 180 ms linear timed sim at startup.
    public prop Default ((float64, float64, float64) -> Simulation) { get; set; }

    init {
      TimeScale = 1.0
      Default = (from float64, to float64, velocity float64) -> LinearTimed(0.18, from, to)
    }
  }
}

internal class MotionClock {
  internal var now float64

  internal prop Now float64 { get { return now } }

  internal func Advance(dt float64) {
    now = now + dt
  }

  internal func Reset() {
    now = 0.0
  }
}

internal data struct MotionPumpEntry {
  internal var Particle MotionParticle
  internal var Generation int64
}

// Demand-driven registry of live Anim instances owned by one Window.
internal class MotionPump {
  private let clock MotionClock
  private let active List[MotionPumpEntry]
  private let deferred List[MotionPumpEntry]
  private var sweeping bool
  private var logicalCount int32
  private var nextGeneration int64

  internal prop Wake (() -> void)? { get; set; }

  internal init() {
    clock = MotionClock()
    active = List[MotionPumpEntry]()
    deferred = List[MotionPumpEntry]()
  }

  internal prop Now float64 { get { return clock.Now } }

  // True while any animation is still running.
  internal prop Active bool { get { return logicalCount > 0 } }

  internal func Register(p MotionParticle) {
    if p.registrationPump == this && p.registrationGeneration != 0 {
      return
    }
    if let prior = p.registrationPump {
      prior.Deregister(p)
    }
    nextGeneration++
    let generation = nextGeneration
    p.registrationPump = this
    p.registrationGeneration = generation
    let entry = MotionPumpEntry{ Particle: p, Generation: generation }
    let wasEmpty = logicalCount == 0
    logicalCount++
    if sweeping {
      deferred.Add(entry)
    } else {
      active.Add(entry)
    }
    if wasEmpty {
      if let wake = Wake {
        wake()
      }
    }
  }

  internal func Deregister(p MotionParticle) {
    guard let owner = p.registrationPump else {
      return
    }
    if owner != this || p.registrationGeneration == 0 {
      return
    }
    let generation = p.registrationGeneration
    invalidate(p, generation)
    if !sweeping {
      remove(active, p, generation)
      remove(deferred, p, generation)
    }
  }

  internal func Sweep(dt float64) {
    if sweeping {
      throw InvalidOperationException("MotionPump.Sweep cannot be reentered")
    }
    if !motionFinite(dt) || dt < 0.0 {
      throw ArgumentOutOfRangeException("dt")
    }
    clock.Advance(dt)
    let now = clock.Now
    let originalCount = active.Count
    var processed int32 = 0
    var retained int32 = 0
    sweeping = true
    try {
      while processed < originalCount {
        let entry = active[processed]
        if !isValid(entry) {
          processed++
          continue
        }
        let keep = entry.Particle.Tick(now)
        processed++
        if keep {
          if isValid(entry) {
            active[retained] = entry
            retained++
          }
        } else {
          invalidate(entry.Particle, entry.Generation)
        }
      }
    } finally {
      sweeping = false
      var compacted int32 = 0
      var i int32 = 0
      while i < retained {
        let entry = active[i]
        if isValid(entry) {
          active[compacted] = entry
          compacted++
        }
        i++
      }
      i = processed
      while i < active.Count {
        let entry = active[i]
        if isValid(entry) {
          active[compacted] = entry
          compacted++
        }
        i++
      }
      while active.Count > compacted {
        active.RemoveAt(active.Count - 1)
      }
      i = 0
      while i < deferred.Count {
        let entry = deferred[i]
        if isValid(entry) {
          active.Add(entry)
        }
        i++
      }
      deferred.Clear()
    }
  }

  internal func Clear() {
    clearEntries(active)
    clearEntries(deferred)
    active.Clear()
    deferred.Clear()
    logicalCount = 0
    sweeping = false
  }

  private func isValid(entry MotionPumpEntry) bool {
    return entry.Particle.registrationPump == this
      && entry.Particle.registrationGeneration == entry.Generation
  }

  private func invalidate(p MotionParticle, generation int64) {
    if p.registrationPump != this || p.registrationGeneration != generation {
      return
    }
    p.registrationPump = nil
    p.registrationGeneration = 0
    logicalCount--
  }

  private func remove(entries List[MotionPumpEntry], p MotionParticle, generation int64) {
    var i int32 = 0
    while i < entries.Count {
      let entry = entries[i]
      if entry.Particle == p && entry.Generation == generation {
        entries.RemoveAt(i)
        return
      }
      i++
    }
  }

  private func clearEntries(entries List[MotionPumpEntry]) {
    for var i = 0; i < entries.Count; i++ {
      let entry = entries[i]
      if entry.Particle.registrationPump == this
        && entry.Particle.registrationGeneration == entry.Generation {
        entry.Particle.registrationPump = nil
        entry.Particle.registrationGeneration = 0
      }
    }
  }
}
