# Tree API

Generated from `Goo.xml`. Source declarations supply type ownership and XML-emitter omissions.

Source: [`Goo/Tree`](../../Goo/Tree)

## Owned image sources

`Image.Source` and `Style.BackgroundImageSource` accept an `ImageSourceProvider`. A source wins over its local image path. Goo preserves the path for a later source removal, but never falls back to it after source failure.

`ImageSource(width, height, pixels)` copies one exact row-major premultiplied-RGBA buffer (`width * height * 4` bytes) into Goo-owned storage. Width and height must be positive. The buffer must be non-null and exactly that length. Disposing the source releases its owner reference while already-mounted leases remain usable until their elements unmount or replace the source.

Custom providers create one `ImageSourceLease` per mounted binding. Each lease completes once through `Complete(source)` or `Fail()`. Goo releases a replaced or unmounted lease synchronously and raises `Released` exactly once, so providers should cancel outstanding work from that event. Late completion returns `false`; callback exceptions cannot interrupt Goo cleanup. Stable source identity keeps its existing lease, so warm paints do not reacquire or lock provider state.

## Observe mounted element metrics

Subscribe to `ElementHandle.MetricsChanged` on the UI thread. The immutable snapshot contains mounted state, transformed border and content boxes in window logical coordinates, and the actual scroll offset.

Goo calls listeners after reconciliation, layout, rect refresh, and scroll stepping settle. Detach produces one final `IsMounted = false` snapshot after tree disposal. A detach followed by reattach in the same update reports only the final mounted state.

Subscription state is sparse. Handles without a listener and ordinary blobs and nodes do not retain metrics state. New handle subscriptions made during metric delivery wait for the next update. Listener changes on an already accepted handle follow ordinary live event behavior.

## Position a custom IME

A focused generic text client can call `ElementHandle.SetTextInputArea` with a finite, non-negative logical-window rectangle. Goo floors the origin, ceils the far edge, and passes cursor offset zero to the native IME. The call returns false for unmounted, unfocused, built-in, closed-window, nonparticipating, or native-IME-unavailable elements. Invalid and out-of-range rectangles throw.

## `Blob`

Source:

- [`Blob.gs`](../../Goo/Tree/Blob.gs)

Defines the common surface for Goo-owned declarative elements.

### `Accessibility`

Gets the platform-neutral accessibility declaration for this element.

### `Active`

Gets the style that applies while this element is active.

### `AutoFocus`

Requests keyboard focus after mounting while nothing else holds focus.

### `Disabled`

Reports whether this element and its descendants reject input.

### `DisabledStyle`

Gets the style that applies while this element is disabled.

### `Focus`

Gets the style that applies while this element has focus.

### `Focusable`

Reports whether this element can receive keyboard focus.

### `Handle`

Gets the consumer-owned handle attached while this element is mounted.

### `Hover`

Gets the style that applies while the pointer hovers this element.

### `Key`

Gets the stable key within the sibling list.

### `OnBlur`

Gets the non-cancelable lifecycle callback after a focus loss.

### `OnClick`

Gets the action that runs when the element is clicked.

### `OnFocus`

Gets the non-cancelable lifecycle callback after a focus gain.

### `OnKeyDown`

Gets the callback that receives each key down while this element has focus.

### `OnKeyUp`

Gets the callback that receives each key release while this element has focus.

### `OnPointerCancel`

Gets the callback that receives pointer cancellation.

### `OnPointerDown`

Gets the callback that receives each pointer button press.

### `OnPointerEnter`

Gets the non-bubbling lifecycle callback after this element enters the mouse hover route.

### `OnPointerLeave`

Gets the non-bubbling lifecycle callback after this element leaves the mouse hover route.

### `OnPointerMove`

Gets the callback that receives each pointer movement.

### `OnPointerUp`

Gets the callback that receives each pointer button release.

### `OnTextCandidates`

Gets the callback that receives native IME candidate updates while this element has focus.

### `OnTextComposition`

Gets the callback that receives transient IME composition updates while this element has focus.

### `OnTextCompositionCancel`

Gets the callback that receives native IME composition cancellation while this element has focus.

### `OnTextInput`

Gets the callback that receives committed UTF-16 text while this element has focus.

### `OnWheel`

Gets the callback that receives pointer wheel movement.

### `TransitionDelayMs`

Gets the delay before a transition starts, in milliseconds.

### `TransitionEasing`

Gets the easing curve applied to transition progress.

### `TransitionMs`

Gets the transition duration in milliseconds.

### `TransitionProperties`

Gets a defensive copy of the style properties selected for transitions. All interpolable properties are selected when this property is omitted.

## `Button`

Source:

- [`Button.gs`](../../Goo/Tree/Button.gs)

Defines a semantic button container with pointer and keyboard activation.

### `new`

Initializes an empty button.

### `Children`

Gets the mutable child list. Give all siblings stable keys, or give no sibling a key.

## `Container`

Source:

- [`Container.gs`](../../Goo/Tree/Container.gs)

Defines an element that contains child blobs.

### `new`

Initializes an empty child collection.

### `Children`

Gets the mutable child list. Give all siblings stable keys, or give no sibling a key.

### `HitTestSelf`

Reports whether the container itself participates in pointer hit testing.

### `PinToBottom`

Reports whether scroll content stays pinned to the bottom.

## `ElementHandle`

Source:

- [`ElementHandle.gs`](../../Goo/Tree/ElementHandle.gs)

Represents a consumer-owned handle for one mounted element.

### `MetricsChanged`

Occurs after this mounted element reaches a new stable geometry or scroll state. Callbacks run on the window UI thread after reconciliation and layout.

### `new`

Initializes an unmounted element handle.

### `Blur`

Removes keyboard focus when this element owns it.

Returns: False when the handle is unmounted or does not own focus.

### `Focus`

Moves keyboard focus to this focusable mounted element.

Returns: False when the handle is unmounted or the element cannot receive focus.

### `ScrollIntoView`

Scrolls each scrollable ancestor enough to reveal this element.

Returns: False when the handle is unmounted.

### `ScrollTo(float64,float64)`

Sets this element's logical scroll target.

- `x`: The non-negative horizontal target.
- `y`: The non-negative vertical target.

Returns: False when the handle is unmounted or the element is not scrollable.

### `SetTextInputArea(ElementRect)`

Sets the native IME caret/input rectangle in window logical coordinates.

Returns: False when the element is ineligible or native text input is unavailable.

### `TryCopyTextRangeRects(TextRange,TextCoordinateSpace,System.Span{ElementRect},int32@)`

Copies retained rectangles for a source UTF-16 range into destination.

- `required`: Receives the full rectangle count, including rectangles that did not fit.

Returns: False when this is unmounted, not a text primitive, the range is invalid, or no current retained layout exists.

### `TryGetTextCaretRect(TextPosition,TextCoordinateSpace,ElementRect@)`

Gets the retained caret rectangle for a source UTF-16 text position.

Returns: False when this is unmounted, not a text primitive, or the position is not retained.

### `TryGetTextPositionAt(Point,TextCoordinateSpace,TextPosition@)`

Gets the retained text position nearest to a point.

Returns: False when this is unmounted, not a text primitive, or has no current retained layout.

### `BorderBox`

Gets the transformed border box in window logical coordinates. An unmounted handle returns an empty rectangle.

### `ContentBox`

Gets the transformed content box in window logical coordinates. An unmounted handle returns an empty rectangle.

### `IsMounted`

Reports whether this handle is currently attached to an element.

### `ScrollOffset`

Gets the current logical scroll offset. An unmounted handle returns the origin.

## `ElementMetrics`

Source:

- [`ElementHandle.gs`](../../Goo/Tree/ElementHandle.gs)

Describes one stable mounted-element geometry snapshot.

### `BorderBox`

Gets the transformed border box in window logical coordinates.

### `ContentBox`

Gets the transformed content box in window logical coordinates.

### `IsMounted`

Reports whether the element is mounted.

### `ScrollOffset`

Gets the current logical scroll offset.

## `ElementRect`

Source:

- [`ElementHandle.gs`](../../Goo/Tree/ElementHandle.gs)

Represents an axis-aligned rectangle in the requested logical coordinate space.

### `Height`

Gets the height.

### `Width`

Gets the width.

### `X`

Gets the horizontal origin.

### `Y`

Gets the vertical origin.

## `Image`

Source:

- [`Image.gs`](../../Goo/Tree/Image.gs)

Defines a local bitmap image element.

### `new`

Initializes an image with an empty path and contained fit mode.

### `Fit`

Gets the image fit mode.

### `Path`

Gets the local image path.

### `Source`

Gets the owned or provider-backed image source. It wins over Path when set.

## `ImageFit`

Source:

- [`Image.gs`](../../Goo/Tree/Image.gs)

Controls how an image fits its destination box.

### Values

- `Contain`
- `Cover`
- `Fill`
- `None`

### `Contain`

Preserves the image aspect ratio within the destination box.

### `Cover`

Preserves the image aspect ratio while filling the destination box.

### `Fill`

Stretches the image to fill the destination box.

### `None`

Paints the image at its intrinsic size without scaling.

## `ImageSource`

Source:

- [`ImageSource.gs`](../../Goo/Tree/ImageSource.gs)

Owns one immutable premultiplied RGBA image resource.

### `ContentChanged`

Occurs when the image content changes.

### `new(int32,int32,System.Byte[])`

Copies exactly Width times Height premultiplied RGBA pixels into an owned image.

- `width`: The positive pixel width.
- `height`: The positive pixel height.
- `pixels`: The row-major premultiplied RGBA pixels.

### `Acquire`

Creates an already-completed binding that retains this source until release.

Returns: The completed binding for this source.

### `Dispose`

Releases this source's owner reference. Existing mounted leases stay valid.

### `ContentVersion`

Gets the current image content version.

### `Height`

Gets this immutable source's pixel height.

### `IsDisposed`

Gets whether this source has released its owner reference.

### `Width`

Gets this immutable source's pixel width.

## `ImageSourceLease`

Source:

- [`ImageSource.gs`](../../Goo/Tree/ImageSource.gs)

Owns one provider result while it is mounted by Goo.

### `Released`

Raised synchronously once when Goo releases this binding.

### `new`

Creates a pending provider binding.

### `Complete(ImageSource)`

Completes this binding with a retained source resource.

- `source`: The source whose image the binding retains.

Returns: False when this binding was already completed or released.

### `Dispose`

Releases the retained result and notifies the provider.

### `Fail`

Completes this binding as a failure.

Returns: False when this binding was already completed or released.

### `IsComplete`

Gets whether the provider completed this binding.

### `IsDisposed`

Gets whether Goo released this binding.

### `IsFailed`

Gets whether this binding completed without an image.

## `ImageSourceProvider`

Source:

- [`ImageSource.gs`](../../Goo/Tree/ImageSource.gs)

Supplies one image binding when a Goo element mounts.

### `ContentChanged`

Occurs when provider-backed image content changes.

### `Acquire`

Creates the lease Goo owns and disposes for one mounted element.

### `ContentVersion`

Gets the content version used to invalidate mounted image bindings.

## `Text`

Source:

- [`Text.gs`](../../Goo/Tree/Text.gs)

Defines a text element.

### `new`

Initializes a text element with empty content.

### `Content`

Gets the displayed text.

### `StyleRanges`

Gets ordered passive inline styles in UTF-16 source offsets. A cluster uses the style at its logical start. Later ranges override earlier fields.

## `TextCoordinateSpace`

Source:

- [`ElementHandle.gs`](../../Goo/Tree/ElementHandle.gs)

Specifies the coordinate space used by mounted text geometry queries.

### Values

- `Element`
- `Content`
- `Window`

## `TextEditor`

Source:

- [`TextEditor.gs`](../../Goo/Tree/TextEditor.gs)

Defines a retained multiline text editor.

### `new(TextDocument,TextEditorController)`

Creates an editor without presentation layers.

- `document`: The document to edit.
- `controller`: The per-view controller bound to the document.

### `new(TextDocument,TextEditorController,ElementHandle)`

Creates an editor without presentation layers and attaches a mounted handle.

- `document`: The document to edit.
- `controller`: The per-view controller bound to the document.
- `handle`: The consumer-owned mounted element handle.

### `new(TextDocument,TextEditorController,TextPresentationLayer[])`

Creates an editor with ordered presentation layers.

- `document`: The document to edit.
- `controller`: The per-view controller bound to the document.
- `layers`: The ordered presentation layers.

### `new(TextDocument,TextEditorController,TextPresentationLayer[],ElementHandle)`

Creates an editor with ordered presentation layers and a mounted handle.

- `document`: The document to edit.
- `controller`: The per-view controller bound to the document.
- `layers`: The ordered presentation layers.
- `handle`: The consumer-owned mounted element handle.

### `CaretColor`

Gets the caret color.

### `Controller`

Gets the per-view editing controller.

### `CurrentLineColor`

Gets the current-line highlight color.

### `Document`

Gets the edited document.

### `Layers`

Gets the ordered presentation layers.

### `OnChange`

Gets the callback that receives committed document changes.

### `OnSubmit`

Gets the callback invoked by an accepted submit command.

### `OverscanLines`

Gets the logical-line overscan used by viewport layout.

### `Placeholder`

Gets the placeholder shown for an empty document.

### `ReadOnly`

Gets whether editing commands are disabled.

### `SelectionColor`

Gets the selection highlight color.

## `TextEntry`

Source:

- [`TextEntry.gs`](../../Goo/Tree/TextEntry.gs)

Defines an editable single-line text element.

### `new`

Initializes an empty text entry with the default selection highlight.

### `OnChange`

Gets the action that receives each edited value.

### `OnSubmit`

Gets the action that receives the submitted value.

### `Password`

Reports whether the value is presented as protected text.

### `Placeholder`

Gets the placeholder shown for an empty value.

### `SelectionColor`

Gets the selection highlight color.

### `Value`

Gets the value used while the entry is not focused.
