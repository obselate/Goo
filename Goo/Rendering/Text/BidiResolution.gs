package Goo

import Unicode.Bidi

internal sealed class BidiResolution {
  internal prop Info Unicode.Bidi.BidiInfo? { get; set; }
  internal prop RightToLeft bool{ get; set; }

  internal init(info Unicode.Bidi.BidiInfo?, rightToLeft bool) {
    Info = info
    RightToLeft = rightToLeft
  }
}
