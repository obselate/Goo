using BidiInfo = Unicode.Bidi.BidiInfo;

namespace Goo.InternalTextInterop;

internal sealed record BidiResolution(BidiInfo? Info, bool RightToLeft);
