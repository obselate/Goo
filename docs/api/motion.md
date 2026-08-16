# Motion API

Generated from `Goo.xml`. Source declarations supply type ownership and XML-emitter omissions.

Source: [`Goo/Motion`](../../Goo/Motion)

## `Anim<T>`

Source:

- [`Anim.gs`](../../Goo/Motion/Anim.gs)

Bridges scalar simulations to a Cell-owned animated value.

### `Set(T)`

Snaps to value, stops all scalar simulations, and invalidates the owner.

- `value`: value to set

### `Snap(T)`

Snaps to value and stops all scalar simulations without invalidating the owner. Safe during Build; the build in progress reads the new value.

- `value`: value to set

### `To(T)`

Animates toward target with Motion.Default.

- `target`: value to animate toward

### `To(T,MotionVelocity)`

Animates toward target with an explicit initial converter-coordinate velocity.

- `target`: value to animate toward
- `velocity`: uniform or dimension-ordered initial velocity

### `To(T,MotionVelocity,System.Func{float64,float64,float64,Simulation},System.Func{float64,float64,float64,Simulation}[])`

Animates toward target with explicit velocity and shared or per-dimension specifications.

- `target`: value to animate toward
- `velocity`: uniform or dimension-ordered initial velocity
- `spec`: first specification
- `specs`: remaining specifications, empty for shared behavior

### `To(T,System.Func{float64,float64,float64,Simulation},System.Func{float64,float64,float64,Simulation}[])`

Animates toward target with one shared or one-per-dimension specification.

- `target`: value to animate toward
- `spec`: first specification
- `specs`: remaining specifications, empty for shared behavior

### `Running`

Gets whether any scalar simulation is still running.

### `Target`

Gets the target value for the current or last animation.

### `Value`

Gets the current value at the current motion clock time.

### `Velocity`

Gets the current velocity in converter-coordinate units per second. A resting animation reports zero velocity in every dimension.

## `Motion`

Source:

- [`Motion.gs`](../../Goo/Motion/Motion.gs)

Configures the animation core.

### `new`

Creates a motion configuration utility instance.

### `Default`

Gets or sets the sim factory used by To(target) when no spec is given. Core wires a 180 ms linear timed sim at startup.

### `TimeScale`

Gets or sets the global playback rate. 1 is normal speed; 0 or lower lands every running animation on its target on the next tick.

## `MotionConverter<T>`

Source:

- [`MotionConverter.gs`](../../Goo/Motion/MotionConverter.gs)

Converts an animated value to fixed scalar simulation coordinates.

### `new(int32,System.Action{T,float64[]},System.Func{float64[],T})`

Creates a converter with a fixed coordinate count and conversion callbacks.

- `dimensions`: positive coordinate count
- `read`: writes a value into an Anim-owned coordinate buffer
- `write`: creates a value from an Anim-owned coordinate buffer

### `Dimensions`

Gets the fixed number of scalar coordinates.

### `Read(T,float64[])`

Writes a value into the supplied coordinate buffer.

- `value`: value to convert
- `into`: destination buffer with Dimensions elements

### `Write(float64[])`

Builds a value from the supplied coordinate buffer.

- `dims`: source buffer with Dimensions elements

Returns: converted value

## `MotionVelocity`

Source:

- [`MotionVelocity.gs`](../../Goo/Motion/MotionVelocity.gs)

Specifies initial scalar velocities in converter-coordinate units per second. Create values with Uniform or Components because the default value is invalid.

### `Add(MotionVelocity)`

Adds another velocity in the same converter-coordinate space.

- `other`: velocity to add

Returns: the component-wise sum

### `Components(float64[])`

Creates velocities ordered by converter dimension.

- `values`: one finite velocity per converter dimension

Returns: a component velocity command

### `Uniform(float64)`

Creates a velocity shared by every converter dimension.

- `value`: finite velocity in converter-coordinate units per second

Returns: a uniform velocity command

## `Simulation`

Source:

- [`Simulation.gs`](../../Goo/Motion/Simulation.gs)

Evaluates a closed-form motion at an elapsed time. No numeric integration: every override is a pure function of elapsed seconds, so evaluation is idempotent and safe to repeat within a frame.

### `Done(float64)`

Gets whether the simulation has settled at the specified elapsed time.

- `elapsed`: seconds since the simulation began

Returns: true once the simulation has reached its target

### `Position(float64)`

Gets the scalar coordinate at the specified elapsed time.

- `elapsed`: seconds since the simulation began

Returns: the coordinate value at elapsed

### `Velocity(float64)`

Gets the rate of change of progress at the specified elapsed time.

- `elapsed`: seconds since the simulation began

Returns: the velocity at elapsed
