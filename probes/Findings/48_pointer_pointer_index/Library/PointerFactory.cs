using System.Runtime.InteropServices;

namespace FindingPointerPointerIndex;

public static unsafe class PointerFactory
{
    private static readonly nint Storage;

    static PointerFactory()
    {
        var value = (sbyte*)NativeMemory.Alloc(1);
        *value = 42;
        var slots = (sbyte**)NativeMemory.Alloc((nuint)sizeof(nint));
        slots[0] = value;
        Storage = (nint)slots;
    }

    public static sbyte** Get() => (sbyte**)Storage;
}
