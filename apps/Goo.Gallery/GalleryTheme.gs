package GooGallery

import System
import System.Collections.Generic
import Goo

class GalleryTheme {
  shared {
    let Background Color = Color.Rgb(10, 10, 11)
    let Surface Color = Color.Rgb(15, 15, 17)
    let SurfaceRaised Color = Color.Rgb(24, 24, 27)
    let Border Color = Color.Rgb(39, 39, 42)
    let BorderStrong Color = Color.Rgb(63, 63, 70)
    let Ink Color = Color.Rgb(250, 250, 250)
    let InkMuted Color = Color.Rgb(161, 161, 170)
    let InkSubtle Color = Color.Rgb(113, 113, 122)

    let Breakpoint float64 = 1180.0
    let RailWide float64 = 184.0
    let RailCompact float64 = 72.0
    let PadWide float64 = 56.0
    let PadCompact float64 = 32.0
    let MaxContent float64 = 1120.0

    func ChapterTitle(content string) Text -> Text {
      Content: content,
      FontSize: 30.0,
      FontWeight: 700.0,
      LetterSpacing: -0.6,
      Color: Ink,
    }

    func ChapterSentence(content string) Text -> Text {
      Content: content,
      FontSize: 15.0,
      LineHeight: 1.5,
      Color: InkMuted,
    }

    func SpecimenName(content string) Text -> Text {
      Content: content,
      FontSize: 13.0,
      FontWeight: 600.0,
      LetterSpacing: 0.4,
      TextTransform: TextTransform.Uppercase,
      Color: InkMuted,
    }

    func Hint(content string) Text -> Text {
      Key: "spec-hint",
      Content: content,
      Width: Length.Percent(100.0),
      FontSize: 12.0,
      TransitionMs: 100.0,
    }

    func Frame(children List[Blob]) Container -> Container {
      BackgroundColor: Surface,
      BorderWidth: 1.0,
      BorderColor: Border,
      BorderRadius: 12.0,
      Padding: 20.0,
      FlexDirection: FlexDirection.Column,
      Gap: 12.0,
      Children: children,
    }

    func GhostButton(content string, onClick Action) Button -> Button {
      Padding: 10.0,
      BackgroundColor: SurfaceRaised,
      BorderWidth: 1.0,
      BorderColor: Border,
      BorderRadius: 8.0,
      TransitionMs: 100.0,
      Hover: Style{ BackgroundColor: Border, BorderColor: BorderStrong },
      Focus: Style{ OutlineWidth: 1.0, OutlineColor: BorderStrong },
      OnClick: onClick,
      Children: {
        Text{
          Content: content,
          FontSize: 13.0,
          FontWeight: 600.0,
          Color: Ink,
        },
      },
    }
  }
}
