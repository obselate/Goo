package Goo

import System
import System.IO
import System.Runtime.InteropServices

internal unsafe struct PrimitiveTransform {
    var A float32
    var B float32
    var C float32
    var D float32
    var TX float32
    var TY float32
}

internal struct PrimitiveClip {
    var Left int32
    var Top int32
    var Right int32
    var Bottom int32
}

internal struct PackedPrimitiveColor {
    var Rgb uint32
    var Alpha uint32
}
