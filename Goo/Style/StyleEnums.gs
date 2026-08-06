package Goo

import System

/// Selects the main-axis direction of a flex container.
public enum FlexDirection { Column; ColumnReverse; Row; RowReverse }

/// Selects how flex children wrap.
public enum FlexWrap { NoWrap; Wrap; WrapReverse }

/// Selects main-axis child distribution.
public enum JustifyContent { FlexStart; Center; FlexEnd; SpaceBetween; SpaceAround; SpaceEvenly }

/// Selects default cross-axis alignment for children.
public enum AlignItems { Stretch; FlexStart; Center; FlexEnd; Baseline }

/// Selects a child's cross-axis alignment.
public enum AlignSelf { Auto; Stretch; FlexStart; Center; FlexEnd; Baseline }

/// Selects cross-axis distribution for wrapped lines.
public enum AlignContent { FlexStart; Center; FlexEnd; Stretch; SpaceBetween; SpaceAround }

/// Selects relative, absolute, or static positioning; static ignores inset offsets.
public enum PositionType { Relative; Absolute; Static }

/// Selects whether an element participates in layout.
public enum Display { Flex; None }

/// Selects the inherited inline direction used by layout and logical edges.
/// Auto keeps flex layout left-to-right and detects each text paragraph's direction.
public enum Direction { Auto; LeftToRight; RightToLeft }

/// Selects whether an element and its descendants are visible and interactive.
public enum Visibility { Visible; Hidden }

/// Selects overflow behavior.
public enum Overflow { Visible; Hidden; Scroll }

/// Selects how box border edges paint.
public enum BorderStyle { Solid; Dashed; Dotted }

/// Selects how an element and its descendants composite with the backdrop.
public enum BlendMode {
  Normal; Multiply; Screen; Overlay; Darken; Lighten;
  ColorDodge; ColorBurn; HardLight; SoftLight;
  Difference; Exclusion; Hue; Saturation; Color; Luminosity
}

/// Selects the system pointer cursor shown over an element and its descendants.
public enum Cursor {
  Default; Pointer; Text; Crosshair; Move; NotAllowed; Wait; Progress;
  ResizeHorizontal; ResizeVertical;
  ResizeNorthwestSoutheast; ResizeNortheastSouthwest;
  ResizeNorthwest; ResizeNorth; ResizeNortheast; ResizeEast;
  ResizeSoutheast; ResizeSouth; ResizeSouthwest; ResizeWest
}

/// Selects horizontal text alignment. Start is the default and follows paragraph direction.
public enum TextAlign { Left; Center; Right; Start; End }

/// Selects the lines painted with text. Values can be combined.
@Flags
public enum TextDecoration {
  None = 0;
  Underline = 1;
  LineThrough = 2;
}

/// Selects whether static text wraps at soft-wrap opportunities.
public enum TextWrap { Wrap; NoWrap }

/// Selects how overflowing static text is trimmed.
public enum TextTrimming { None; Ellipsis }

/// Selects invariant casing for static text.
public enum TextTransform { None; Uppercase; Lowercase }

/// Selects the curve that shapes transition progress; Ease curves are quadratic.
public enum Easing { Linear; EaseIn; EaseOut; EaseInOut }

/// Selects the font slant.
public enum FontStyle { Normal; Italic }
