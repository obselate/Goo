// G# BUG: An imported Action[T] field with a G# value-struct type argument closes over object, not T.
// A correctly typed lambda for the declared Action[KeyPress] field is rejected with GS0156 object-to-KeyPress.
package FindingActionValueStructDelegate

import System

struct KeyPress {
  var Code int32
  var Text string
}

class Host {
  var OnPress Action[KeyPress]?
  var OnNative ((KeyPress) -> void)?
}

func Main() int32 {
  let host = Host()
  var importedCode = 0
  var importedText = ""
  var nativeCode = 0
  var nativeText = ""

  host.OnPress = (press KeyPress) -> {
    importedCode = press.Code
    importedText = press.Text
  }
  host.OnNative = (press KeyPress) -> {
    nativeCode = press.Code
    nativeText = press.Text
  }

  host.OnPress?(KeyPress{ Code: 42, Text: "a" })
  host.OnNative?(KeyPress{ Code: 42, Text: "a" })

  let importedOk = importedCode == 42 && importedText == "a"
  let nativeOk = nativeCode == 42 && nativeText == "a"
  return importedOk && nativeOk ? 0 : (nativeOk ? 1 : 2)
}

// Source: gsharp/website/docs/guide/types-and-values.md - imported CLR generic types close over the written G# type argument.
// Source: gsharp/website/docs/guide/expressions-and-statements.md:35 - a lambda's parameter types come from the target delegate.
// Tested SDK: Gsharp.NET.Sdk 0.3.362.
// Untyped-lambda control: (press) -> { press.Code } fails GS0158 Cannot find member Code, so the inferred parameter is object.
// Native control: the ((KeyPress) -> void)? field accepts the same typed lambda and preserves both fields. That is the workaround.
// Reference-type control: Action[string] binds and invokes correctly. The defect needs a G# value-struct type argument.
// Downstream impact: Goo callbacks declared Action[Key, KeyModifiers] emitted Action<int32,object>::Invoke and corrupted struct payloads at runtime.
// Expected: Main builds and returns 0. Both callbacks receive Code=42 and Text="a".
// Actual on 0.3.362: build fails with GS0156: Cannot convert type 'object' to 'KeyPress' on the typed lambda parameter.
// Status: FIXED in Gsharp.NET.Sdk 0.3.633. The probe builds clean and Main returns 0. Do not file upstream.
