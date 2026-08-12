using System.Runtime.InteropServices;

namespace Goo.InternalTextInterop;

internal static unsafe class LinuxMemory
{
    private const int ProtRead = 1;
    private const int ProtWrite = 2;
    private const int MapShared = 1;
    private const uint MemfdCloseOnExec = 1;

    public static int Create(nuint length)
    {
        ReadOnlySpan<byte> name = "goo-raster\0"u8;
        fixed (byte* namePointer = name)
        {
            var fd = MemfdCreate(namePointer, MemfdCloseOnExec);
            if (fd < 0)
                throw new InvalidOperationException("memfd_create failed.");
            if (Ftruncate(fd, checked((nint)length)) != 0)
            {
                Close(fd);
                throw new InvalidOperationException("ftruncate failed for the raster buffer.");
            }
            return fd;
        }
    }

    public static IntPtr Map(int fd, nuint length)
    {
        var result = Mmap(IntPtr.Zero, length, ProtRead | ProtWrite, MapShared, fd, 0);
        if (result == new IntPtr(-1))
            throw new InvalidOperationException("mmap failed for the raster buffer.");
        return result;
    }

    public static void Unmap(IntPtr address, nuint length)
    {
        if (Munmap(address, length) != 0)
            throw new InvalidOperationException("munmap failed for the raster buffer.");
    }

    public static void Close(int fd)
    {
        if (fd >= 0)
            CloseFile(fd);
    }

    [DllImport("libc", EntryPoint = "memfd_create", CallingConvention = CallingConvention.Cdecl)]
    private static extern int MemfdCreate(byte* name, uint flags);

    [DllImport("libc", EntryPoint = "ftruncate", CallingConvention = CallingConvention.Cdecl)]
    private static extern int Ftruncate(int fd, nint length);

    [DllImport("libc", EntryPoint = "mmap", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr Mmap(
        IntPtr address,
        nuint length,
        int protection,
        int flags,
        int fd,
        nint offset);

    [DllImport("libc", EntryPoint = "munmap", CallingConvention = CallingConvention.Cdecl)]
    private static extern int Munmap(IntPtr address, nuint length);

    [DllImport("libc", EntryPoint = "close", CallingConvention = CallingConvention.Cdecl)]
    private static extern int CloseFile(int fd);
}
