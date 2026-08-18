package Goo

import System
import System.Buffers
import System.Collections.Generic
import System.Globalization
import System.Text

internal sealed class LineBreakMap {
  internal prop Offsets []int32 { get; set; }
  internal prop MandatoryOffsets []int32 { get; set; }

  internal init(offsets []int32, mandatoryOffsets []int32) {
    Offsets = offsets
    MandatoryOffsets = mandatoryOffsets
  }

  internal func CanBreak(utf16Offset int32) bool {
    return Array.BinarySearch(Offsets, utf16Offset) >= 0
  }

  internal func IsMandatory(utf16Offset int32) bool {
    return Array.BinarySearch(MandatoryOffsets, utf16Offset) >= 0
  }
}

internal enum TextLineBreakClass {
  Ordinary;
  Mandatory;
  Space;
  NonBreaking;
  WordJoiner;
  ZeroWidth;
  Hyphen;
  Slash;
  Cjk;
  Opening;
  Closing;
  Quote;
}

internal data struct TextLineBreakCluster(Start int32, End int32, Class TextLineBreakClass,
  IsCarriageReturn bool, IsLineFeed bool) { }

internal class LineBreakOpportunities {
  shared {
    internal func Resolve(text string) LineBreakMap {
      if text == nil { throw ArgumentNullException("text") }
      if text.Length == 0 {
        let offsets = [1]int32
        offsets[0] = 0
        return LineBreakMap(offsets, []int32{})
      }

      let rawStarts = StringInfo.ParseCombiningCharacters(text)
      let rawClusters = List[TextLineBreakCluster](rawStarts.Length)
      for i in 0 ... rawStarts.Length {
        let start = rawStarts[i]
        let end = if i + 1 < rawStarts.Length { rawStarts[i + 1] } else { text.Length }
        rawClusters.Add(classify(text, start, end))
      }

      let clusters = coalesceCrLf(rawClusters)
      let offsets = List[int32](clusters.Count)
      let mandatoryOffsets = List[int32]()
      for i in 0 ... clusters.Count {
        let current = clusters[i]
        let mandatory = current.Class == TextLineBreakClass.Mandatory
        let allowed = mandatory || i == clusters.Count - 1
          || allowsBreak(current, clusters[i + 1])
        if !allowed { continue }
        offsets.Add(current.End)
        if mandatory { mandatoryOffsets.Add(current.End) }
      }
      return LineBreakMap(offsets.ToArray(), mandatoryOffsets.ToArray())
    }

    private func coalesceCrLf(rawClusters List[TextLineBreakCluster]) []TextLineBreakCluster {
      let clusters = List[TextLineBreakCluster](rawClusters.Count)
      var i int32 = 0
      while i < rawClusters.Count {
        let current = rawClusters[i]
        if current.IsCarriageReturn && i + 1 < rawClusters.Count
          && rawClusters[i + 1].IsLineFeed {
          clusters.Add(TextLineBreakCluster(current.Start, rawClusters[i + 1].End,
            TextLineBreakClass.Mandatory, false, false))
          i = i + 2
          continue
        }
        clusters.Add(current)
        i++
      }
      return clusters.ToArray()
    }

    private func allowsBreak(before TextLineBreakCluster, after TextLineBreakCluster) bool {
      if after.Class == TextLineBreakClass.Mandatory
        || after.Class == TextLineBreakClass.Space
        || after.Class == TextLineBreakClass.ZeroWidth { return false }
      if before.Class == TextLineBreakClass.NonBreaking
        || before.Class == TextLineBreakClass.WordJoiner
        || after.Class == TextLineBreakClass.NonBreaking
        || after.Class == TextLineBreakClass.WordJoiner { return false }
      if before.Class == TextLineBreakClass.Space
        || before.Class == TextLineBreakClass.ZeroWidth { return true }
      if before.Class == TextLineBreakClass.Opening
        || before.Class == TextLineBreakClass.Quote
        || after.Class == TextLineBreakClass.Closing
        || after.Class == TextLineBreakClass.Quote { return false }
      if before.Class == TextLineBreakClass.Hyphen
        || before.Class == TextLineBreakClass.Slash { return true }
      return before.Class == TextLineBreakClass.Cjk || after.Class == TextLineBreakClass.Cjk
    }

    private func classify(text string, start int32, end int32) TextLineBreakCluster {
      var cursor = start
      var count int32 = 0
      var scalar int32 = 0
      var value = TextLineBreakClass.Ordinary
      while cursor < end {
        let status = Rune.DecodeFromUtf16(text.AsSpan(cursor, end - cursor), out var rune,
          out var consumed)
        if status != OperationStatus.Done {
          throw ArgumentException("Text must contain valid UTF-16.", "text")
        }
        count++
        scalar = rune.Value
        value = moreRestrictive(value, classifyRune(rune))
        cursor = cursor + consumed
      }
      return TextLineBreakCluster(start, end, value, count == 1 && scalar == 13,
        count == 1 && scalar == 10)
    }

    private func moreRestrictive(prior TextLineBreakClass, candidate TextLineBreakClass)
      TextLineBreakClass {
      if candidate == TextLineBreakClass.Mandatory
        || candidate == TextLineBreakClass.NonBreaking
        || candidate == TextLineBreakClass.WordJoiner { return candidate }
      if prior == TextLineBreakClass.Mandatory
        || prior == TextLineBreakClass.NonBreaking
        || prior == TextLineBreakClass.WordJoiner { return prior }
      return if candidate == TextLineBreakClass.Ordinary { prior } else { candidate }
    }

    private func classifyRune(rune Rune) TextLineBreakClass {
      let value = rune.Value
      if value == 13 || value == 10 || value == 11 || value == 12
        || value == 133 || value == 0x2028 || value == 0x2029 {
        return TextLineBreakClass.Mandatory
      }
      if value == 0x00A0 || value == 0x2007 || value == 0x202F {
        return TextLineBreakClass.NonBreaking
      }
      if value == 0x2060 { return TextLineBreakClass.WordJoiner }
      if value == 0x200B { return TextLineBreakClass.ZeroWidth }
      if Rune.IsWhiteSpace(rune) { return TextLineBreakClass.Space }
      if isHyphen(value) { return TextLineBreakClass.Hyphen }
      if value == 47 || value == 92 { return TextLineBreakClass.Slash }
      if isOpening(value) { return TextLineBreakClass.Opening }
      if isClosing(value) { return TextLineBreakClass.Closing }
      if isQuote(value) { return TextLineBreakClass.Quote }
      return if isCjk(value) { TextLineBreakClass.Cjk } else { TextLineBreakClass.Ordinary }
    }

    private func isHyphen(value int32) bool {
      return value == 45 || value == 0x00AD || value == 0x058A || value == 0x05BE
        || value == 0x1400 || value == 0x1806 || value == 0x2010 || value == 0x2011
        || value == 0x2012 || value == 0x2013 || value == 0x2014 || value == 0x2E17
        || value == 0x30A0 || value == 0xFE63 || value == 0xFF0D
    }

    private func isOpening(value int32) bool {
      return value == 40 || value == 91 || value == 123 || value == 0x00AB || value == 0x2039
        || value == 0x3008 || value == 0x300A || value == 0x300C || value == 0x300E
        || value == 0x3010 || value == 0x3014 || value == 0x3016 || value == 0x3018
        || value == 0x301A || value == 0xFF08 || value == 0xFF3B || value == 0xFF5B
    }

    private func isClosing(value int32) bool {
      return value == 44 || value == 46 || value == 58 || value == 59 || value == 33
        || value == 63 || value == 37 || value == 41 || value == 93 || value == 125
        || value == 0x00BB || value == 0x203A || value == 0x2026 || value == 0x3001
        || value == 0x3002 || value == 0x3009 || value == 0x300B || value == 0x300D
        || value == 0x300F || value == 0x3011 || value == 0x3015 || value == 0x3017
        || value == 0x3019 || value == 0x301B || value == 0xFF01 || value == 0xFF09
        || value == 0xFF0C || value == 0xFF0E || value == 0xFF1A || value == 0xFF1B
        || value == 0xFF1F || value == 0xFF3D || value == 0xFF5D
    }

    private func isQuote(value int32) bool {
      return value == 34 || value == 39 || value == 0x2018 || value == 0x2019
        || value == 0x201C || value == 0x201D || value == 0x300C || value == 0x300D
        || value == 0x300E || value == 0x300F
    }

    private func isCjk(value int32) bool {
      return (value >= 0x1100 && value <= 0x11FF) || (value >= 0x2E80 && value <= 0x2FDF)
        || (value >= 0x3040 && value <= 0x30FF) || (value >= 0x3100 && value <= 0x312F)
        || (value >= 0x3130 && value <= 0x318F) || (value >= 0x31A0 && value <= 0x31FF)
        || (value >= 0x3400 && value <= 0x4DBF) || (value >= 0x4E00 && value <= 0x9FFF)
        || (value >= 0xAC00 && value <= 0xD7A3) || (value >= 0xF900 && value <= 0xFAFF)
        || (value >= 0x20000 && value <= 0x2FA1F)
    }
  }
}
