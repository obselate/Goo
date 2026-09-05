package GooWorkbench.Components

import System
import Goo

class Theme {
  let Kind int32
  let Name string
  let Canvas Color
  let Surface Color
  let Subtle Color
  let Ink Color
  let Muted Color
  let Line Color
  let ControlLine Color
  let Accent Color
  let AccentHover Color
  let AccentPressed Color
  let Selection Color
  let Success Color
  let Warning Color
  let Danger Color
  let Navy Color
  let Rail Color
  let RailInk Color
  let Header Color
  let HeaderInk Color
  let Mark Color
  let PrimaryFill Color
  let PrimaryHoverFill Color
  let PrimaryPressedFill Color
  let PrimaryInk Color
  let FocusRing Style
  let RowFocusRing Style

  internal init(kind int32) {
    Kind = kind
    Name = if kind == 0 { "Division" } else if kind == 1 { "Instrument" } else { "Registry" }
    Canvas = if kind == 0 { Color.Rgb(245, 245, 245) } else if kind == 1 { Color.Rgb(226, 230, 228) } else { Color.Rgb(233, 226, 210) }
    Surface = if kind == 0 { Color.Rgb(255, 255, 255) } else if kind == 1 { Color.Rgb(245, 247, 244) } else { Color.Rgb(251, 247, 235) }
    Subtle = if kind == 0 { Color.Rgb(240, 244, 248) } else if kind == 1 { Color.Rgb(221, 227, 223) } else { Color.Rgb(234, 226, 209) }
    Ink = if kind == 0 { Color.Rgb(31, 54, 92) } else if kind == 1 { Color.Rgb(37, 50, 47) } else { Color.Rgb(52, 44, 41) }
    Muted = if kind == 0 { Color.Rgb(90, 98, 104) } else if kind == 1 { Color.Rgb(78, 94, 87) } else { Color.Rgb(100, 88, 76) }
    Line = if kind == 0 { Color.Rgb(224, 224, 224) } else if kind == 1 { Color.Rgb(168, 181, 173) } else { Color.Rgb(197, 184, 162) }
    ControlLine = if kind == 0 { Color.Rgb(108, 117, 125) } else if kind == 1 { Color.Rgb(98, 116, 107) } else { Color.Rgb(128, 112, 95) }
    Accent = if kind == 0 { Color.Rgb(31, 54, 92) } else if kind == 1 { Color.Rgb(36, 91, 112) } else { Color.Rgb(115, 61, 67) }
    AccentHover = if kind == 0 { Color.Rgb(22, 45, 74) } else if kind == 1 { Color.Rgb(27, 73, 91) } else { Color.Rgb(96, 49, 57) }
    AccentPressed = if kind == 0 { Color.Rgb(15, 29, 48) } else if kind == 1 { Color.Rgb(20, 59, 73) } else { Color.Rgb(75, 37, 45) }
    Selection = if kind == 0 { Color.Rgb(240, 244, 248) } else if kind == 1 { Color.Rgb(220, 233, 233) } else { Color.Rgb(239, 224, 215) }
    Success = Color.Rgb(33, 100, 71)
    Warning = Color.Rgb(128, 84, 0)
    Danger = Color.Rgb(179, 49, 60)
    Navy = if kind == 0 { Color.Rgb(31, 54, 92) } else if kind == 1 { Color.Rgb(41, 60, 53) } else { Color.Rgb(80, 56, 58) }
    Rail = if kind == 0 { Color.Rgb(31, 54, 92) } else if kind == 1 { Color.Rgb(221, 227, 223) } else { Color.Rgb(233, 226, 210) }
    RailInk = if kind == 0 { Color.Rgb(255, 255, 255) } else if kind == 1 { Color.Rgb(37, 50, 47) } else { Color.Rgb(80, 56, 58) }
    Header = if kind == 0 { Color.Rgb(31, 54, 92) } else if kind == 1 { Color.Rgb(245, 247, 244) } else { Color.Rgb(251, 247, 235) }
    HeaderInk = if kind == 0 { Color.Rgb(255, 255, 255) } else if kind == 1 { Color.Rgb(37, 50, 47) } else { Color.Rgb(52, 44, 41) }
    Mark = if kind == 0 { Color.Rgb(255, 181, 54) } else if kind == 1 { Color.Rgb(150, 101, 16) } else { Color.Rgb(115, 61, 67) }
    PrimaryFill = if kind == 0 { Color.Rgb(255, 181, 54) } else if kind == 1 { Color.Rgb(36, 91, 112) } else { Color.Rgb(115, 61, 67) }
    PrimaryHoverFill = if kind == 0 { Color.Rgb(217, 154, 45) } else if kind == 1 { Color.Rgb(27, 73, 91) } else { Color.Rgb(96, 49, 57) }
    PrimaryPressedFill = if kind == 0 { Color.Rgb(229, 160, 47) } else if kind == 1 { Color.Rgb(20, 59, 73) } else { Color.Rgb(75, 37, 45) }
    PrimaryInk = if kind == 0 { Color.Rgb(26, 26, 26) } else if kind == 1 { Color.Rgb(245, 247, 244) } else { Color.Rgb(251, 247, 235) }
    FocusRing = Style{ OutlineWidth: 2, OutlineOffset: 2, OutlineColor: Accent }
    RowFocusRing = Style{ OutlineWidth: 2, OutlineOffset: 0, OutlineColor: Accent }
  }

  let Control Style = Style{
    MinHeight: 36,
    PaddingLeft: 12,
    PaddingRight: 12,
    PaddingTop: 8,
    PaddingBottom: 8,
    BorderRadius: 0,
    FlexShrink: 0,
    FlexDirection: FlexDirection.Row,
    AlignItems: AlignItems.Center,
    JustifyContent: JustifyContent.Center,
  }

  func Label(value string, size float64 = 14, color Color = default (Color), weight int32 = 400) Text -> Text {
    Content: value,
    FontFamily: if size == 12.0 && Kind != 2 { "IBM Plex Mono" } else { "IBM Plex Sans" },
    FontSize: size,
    FontWeight: if size == 12.0 { 400 } else { weight },
    LineHeight: if size == 28.0 { 36.0 / 28.0 } else { 1.45 },
    Color: if color == default (Color) { Ink } else { color },
    FlexShrink: 1,
    MinWidth: 0,
  }

  func Meta(value string, color Color = default (Color)) Text -> Text {
    Content: value,
    FontFamily: if Kind == 2 { "IBM Plex Sans" } else { "IBM Plex Mono" },
    FontSize: 12,
    LineHeight: 1.5,
    LetterSpacing: 0.5,
    TextTransform: if Kind == 2 { TextTransform.None } else { TextTransform.Uppercase },
    Color: if color == default (Color) { Muted } else { color },
    FlexShrink: 1,
    MinWidth: 0,
  }

  func Action(label string, callback Action, primary bool = false, inHeader bool = false) Button -> Button {
    BasedOn: Control,
    BackgroundColor: if primary { PrimaryFill } else { Surface },
    BorderWidth: 1,
    BorderColor: if primary { PrimaryFill } else { ControlLine },
    Hover: Style{ BackgroundColor: if primary { PrimaryHoverFill } else { Subtle } },
    Active: Style{ BackgroundColor: if primary { PrimaryPressedFill } else { Selection } },
    Focus: if inHeader { Style{ OutlineWidth: 2, OutlineOffset: 2, OutlineColor: HeaderInk } } else { FocusRing },
    Accessibility: Accessibility{ Name: label },
    OnClick: callback,
    Children: { Label(label, 14, if primary { PrimaryInk } else { Ink }, 600) },
  }

  func MarkSymbol() Container -> Container {
    Width: 48,
    Height: 32,
    FlexShrink: 0,
    FlexDirection: FlexDirection.Row,
    AlignItems: AlignItems.FlexEnd,
    Gap: 4,
    Accessibility: Accessibility{ Hidden: true },
    Children: {
      Container{ Width: if Kind == 0 { 30 } else { 12 }, Height: if Kind == 2 { 24 } else { 32 }, BackgroundColor: Mark },
      Container{ Width: if Kind == 0 { 14 } else { 28 }, Height: if Kind == 1 { 12 } else { 32 }, BackgroundColor: if Kind == 0 { RailInk } else { Accent } },
    },
  }
}
