package Goo

import System
import System.Globalization

internal data struct EditState {
  internal var Text string
  internal var Caret int32
  internal var Anchor int32
}

// Pure single-line editing over text, caret, and anchor.
internal class Edit {
  internal func HasSelection(s EditState) bool { return s.Caret != s.Anchor }
  internal func SelStart(s EditState) int32 { return s.Caret < s.Anchor ? s.Caret : s.Anchor }
  internal func SelEnd(s EditState) int32 { return s.Caret > s.Anchor ? s.Caret : s.Anchor }
  internal func Selected(s EditState) string { return s.Text.Substring(SelStart(s), SelEnd(s) - SelStart(s)) }

  internal func Insert(s EditState, str string) EditState {
    let lo = SelStart(s)
    let hi = SelEnd(s)
    let text = s.Text.Substring(0, lo) + str + s.Text.Substring(hi)
    let c = lo + str.Length
    return EditState{ Text: text, Caret: c, Anchor: c }
  }

  internal func Backspace(s EditState) EditState {
    if HasSelection(s) { return Insert(s, "") }
    let end = elementStart(s.Text, s.Caret)
    if end == 0 { return s }
    let start = previousElement(s.Text, end)
    let text = s.Text.Substring(0, start) + s.Text.Substring(end)
    return EditState{ Text: text, Caret: start, Anchor: start }
  }

  internal func Delete(s EditState) EditState {
    if HasSelection(s) { return Insert(s, "") }
    let start = elementStart(s.Text, s.Caret)
    if start == s.Text.Length { return s }
    let end = nextElement(s.Text, start)
    let text = s.Text.Substring(0, start) + s.Text.Substring(end)
    return EditState{ Text: text, Caret: start, Anchor: start }
  }


  internal func Home(s EditState, extend bool) EditState { return place(s, 0, extend) }
  internal func End(s EditState, extend bool) EditState { return place(s, s.Text.Length, extend) }

  internal func WordLeft(s EditState, extend bool) EditState { return place(s, prevWord(s.Text, s.Caret), extend) }
  internal func WordRight(s EditState, extend bool) EditState { return place(s, nextWord(s.Text, s.Caret), extend) }

  internal func KillWordLeft(s EditState) EditState {
    if HasSelection(s) { return Insert(s, "") }
    return Insert(EditState{ Text: s.Text, Caret: s.Caret, Anchor: prevWord(s.Text, s.Caret) }, "")
  }

  internal func KillWordRight(s EditState) EditState {
    if HasSelection(s) { return Insert(s, "") }
    return Insert(EditState{ Text: s.Text, Caret: s.Caret, Anchor: nextWord(s.Text, s.Caret) }, "")
  }

  internal func SelectAll(s EditState) EditState {
    return EditState{ Text: s.Text, Caret: s.Text.Length, Anchor: 0 }
  }

  // The caret follows the run. Gaps select the non-word run.
  internal func SelectWordAt(s EditState, index int32) EditState {
    if s.Text.Length == 0 { return EditState{ Text: s.Text, Caret: 0, Anchor: 0 } }
    var i = index
    if i < 0 { i = 0 }
    if i >= s.Text.Length { i = s.Text.Length - 1 }
    let start = elementStart(s.Text, i)
    let word = isWord(s.Text, start)
    var lo int32 = 0
    var scan int32 = 0
    var runWord = false
    while scan <= start {
      let currentWord = isWord(s.Text, scan)
      if scan == 0 || currentWord != runWord {
        lo = scan
        runWord = currentWord
      }
      let next = scan + StringInfo.GetNextTextElementLength(s.Text, scan)
      if next > start { break }
      scan = next
    }
    var hi = start
    while hi < s.Text.Length && isWord(s.Text, hi) == word {
      hi = hi + StringInfo.GetNextTextElementLength(s.Text, hi)
    }
    return EditState{ Text: s.Text, Caret: hi, Anchor: lo }
  }

  internal func place(s EditState, index int32, extend bool) EditState {
    var c = index
    if c < 0 { c = 0 }
    if c > s.Text.Length { c = s.Text.Length }
    return EditState{ Text: s.Text, Caret: c, Anchor: extend ? s.Anchor : c }
  }

  internal func prevWord(text string, from int32) int32 {
    let limit = elementStart(text, from)
    var i int32 = 0
    var latestWordStart int32 = 0
    var hasWord = false
    var previousWord = false
    while i < limit {
      let currentWord = isWord(text, i)
      if currentWord && !previousWord {
        latestWordStart = i
        hasWord = true
      }
      previousWord = currentWord
      i = i + StringInfo.GetNextTextElementLength(text, i)
    }
    return hasWord ? latestWordStart : 0
  }

  internal func nextWord(text string, from int32) int32 {
    var i = elementStart(text, from)
    while i < text.Length && !isWord(text, i) {
      i = i + StringInfo.GetNextTextElementLength(text, i)
    }
    while i < text.Length && isWord(text, i) {
      i = i + StringInfo.GetNextTextElementLength(text, i)
    }
    return i
  }

  private func elementStart(text string, index int32) int32 {
    var target = index
    if target < 0 { target = 0 }
    if target >= text.Length { return text.Length }
    var start int32 = 0
    while start < target {
      let next = start + StringInfo.GetNextTextElementLength(text, start)
      if next > target { return start }
      start = next
    }
    return start
  }

  private func nextElement(text string, from int32) int32 {
    let start = elementStart(text, from)
    if start == text.Length { return start }
    return start + StringInfo.GetNextTextElementLength(text, start)
  }

  private func previousElement(text string, from int32) int32 {
    var target = from
    if target > text.Length { target = text.Length }
    if target <= 0 { return 0 }
    var start int32 = 0
    while true {
      let next = start + StringInfo.GetNextTextElementLength(text, start)
      if next >= target { return start }
      start = next
    }
  }

  private func isWord(text string, elementStart int32) bool {
    return Char.IsLetterOrDigit(text, elementStart)
  }
}
