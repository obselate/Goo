using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

namespace Goo.InternalTextInterop;

internal static unsafe class WaylandNative
{
    private const string Library = "libwayland-client.so.0";
    private const uint MarshalDestroy = 1;
    private const uint DisplayGetRegistry = 1;
    private const uint RegistryBind = 0;
    private const uint ShmCreatePool = 0;
    private const uint ShmPoolCreateBuffer = 0;
    private const uint ShmPoolDestroy = 1;
    private const uint BufferDestroy = 0;
    private const uint SurfaceAttach = 1;
    private const uint SurfaceDamage = 2;
    private const uint SurfaceCommit = 6;
    private const uint SurfaceDamageBuffer = 9;
    private const uint ShmFormatXrgb8888 = 1;
    private static readonly IntPtr library = NativeLibrary.Load(Library);
    private static readonly IntPtr registryInterface = Export("wl_registry_interface");
    private static readonly IntPtr shmInterface = Export("wl_shm_interface");
    private static readonly IntPtr shmPoolInterface = Export("wl_shm_pool_interface");
    private static readonly IntPtr bufferInterface = Export("wl_buffer_interface");
    private static readonly IntPtr registryListener = CreateRegistryListener();
    private static readonly IntPtr bufferListener = CreateBufferListener();

    public static IntPtr BindShm(IntPtr display)
    {
        var registry = MarshalNewId(
            display,
            DisplayGetRegistry,
            registryInterface,
            GetVersion(display),
            0,
            IntPtr.Zero);
        if (registry == IntPtr.Zero)
            throw new InvalidOperationException("Wayland could not create a registry proxy.");

        var binding = new RegistryBinding();
        var handle = GCHandle.Alloc(binding);
        try
        {
            if (AddListener(registry, registryListener, GCHandle.ToIntPtr(handle)) != 0)
                throw new InvalidOperationException("Wayland could not add the registry listener.");
            Roundtrip(display);
            if (binding.ShmName == 0)
                throw new PlatformNotSupportedException("The Wayland compositor does not expose wl_shm.");
            var version = Math.Min(binding.ShmVersion, 1u);
            var result = MarshalRegistryBind(
                registry,
                RegistryBind,
                shmInterface,
                version,
                0,
                binding.ShmName,
                Marshal.ReadIntPtr(shmInterface),
                version,
                IntPtr.Zero);
            if (result == IntPtr.Zero)
                throw new InvalidOperationException("Wayland could not bind wl_shm.");
            return result;
        }
        finally
        {
            handle.Free();
            DestroyProxy(registry);
        }
    }

    public static IntPtr CreateShmPool(IntPtr shm, int fd, int size)
    {
        var pool = MarshalShmPool(
            shm,
            ShmCreatePool,
            shmPoolInterface,
            GetVersion(shm),
            0,
            IntPtr.Zero,
            fd,
            size);
        if (pool == IntPtr.Zero)
            throw new InvalidOperationException("Wayland could not create a shared-memory pool.");
        return pool;
    }

    public static IntPtr CreateBuffer(
        IntPtr pool,
        int offset,
        int width,
        int height,
        int stride)
    {
        var buffer = MarshalBuffer(
            pool,
            ShmPoolCreateBuffer,
            bufferInterface,
            GetVersion(pool),
            0,
            IntPtr.Zero,
            offset,
            width,
            height,
            stride,
            ShmFormatXrgb8888);
        if (buffer == IntPtr.Zero)
            throw new InvalidOperationException("Wayland could not create a raster buffer.");
        return buffer;
    }

    public static void AddBufferListener(IntPtr buffer, IntPtr data)
    {
        if (AddListener(buffer, bufferListener, data) != 0)
            throw new InvalidOperationException("Wayland could not add the buffer listener.");
    }

    public static void Attach(IntPtr surface, IntPtr buffer, int width, int height)
    {
        var version = GetVersion(surface);
        var damageWidth = SelectDamageExtent(version, width);
        var damageHeight = SelectDamageExtent(version, height);
        MarshalAttach(
            surface,
            SurfaceAttach,
            IntPtr.Zero,
            version,
            0,
            buffer,
            0,
            0);
        MarshalDamage(
            surface,
            SelectDamageOpcode(version),
            IntPtr.Zero,
            version,
            0,
            0,
            0,
            damageWidth,
            damageHeight);
        MarshalRequest(surface, SurfaceCommit, IntPtr.Zero, version, 0);
    }

    internal static uint SelectDamageOpcode(uint surfaceVersion) =>
        surfaceVersion >= 4 ? SurfaceDamageBuffer : SurfaceDamage;

    internal static int SelectDamageExtent(uint surfaceVersion, int bufferExtent) =>
        surfaceVersion >= 4 ? bufferExtent : int.MaxValue;

    public static void DestroyShmPool(IntPtr pool)
    {
        if (pool != IntPtr.Zero)
            MarshalRequest(pool, ShmPoolDestroy, IntPtr.Zero, GetVersion(pool), MarshalDestroy);
    }

    public static void DestroyBuffer(IntPtr buffer)
    {
        if (buffer != IntPtr.Zero)
            MarshalRequest(buffer, BufferDestroy, IntPtr.Zero, GetVersion(buffer), MarshalDestroy);
    }

    public static void DestroyProxy(IntPtr proxy)
    {
        if (proxy != IntPtr.Zero)
            ProxyDestroy(proxy);
    }

    public static void Roundtrip(IntPtr display)
    {
        if (DisplayRoundtrip(display) < 0)
            throw new InvalidOperationException("Wayland display roundtrip failed.");
    }

    public static void Flush(IntPtr display)
    {
        if (DisplayFlush(display) < 0 && Marshal.GetLastPInvokeError() != 11)
            throw new InvalidOperationException("Wayland display flush failed.");
    }

    private static IntPtr Export(string name) => NativeLibrary.GetExport(library, name);

    private static IntPtr CreateRegistryListener()
    {
        var listener = (IntPtr*)NativeMemory.Alloc(checked((nuint)(IntPtr.Size * 2)));
        listener[0] = (IntPtr)(delegate* unmanaged[Cdecl]<IntPtr, IntPtr, uint, IntPtr, uint, void>)&OnGlobal;
        listener[1] = (IntPtr)(delegate* unmanaged[Cdecl]<IntPtr, IntPtr, uint, void>)&OnGlobalRemove;
        return (IntPtr)listener;
    }

    private static IntPtr CreateBufferListener()
    {
        var listener = (IntPtr*)NativeMemory.Alloc((nuint)IntPtr.Size);
        listener[0] = (IntPtr)(delegate* unmanaged[Cdecl]<IntPtr, IntPtr, void>)&OnBufferRelease;
        return (IntPtr)listener;
    }

    [UnmanagedCallersOnly(CallConvs = [typeof(CallConvCdecl)])]
    private static void OnGlobal(
        IntPtr data,
        IntPtr registry,
        uint name,
        IntPtr interfaceName,
        uint version)
    {
        try
        {
            if (!IsShm(interfaceName))
                return;
            var binding = (RegistryBinding?)GCHandle.FromIntPtr(data).Target;
            if (binding is not null)
            {
                binding.ShmName = name;
                binding.ShmVersion = version;
            }
        }
        catch
        {
        }
    }

    [UnmanagedCallersOnly(CallConvs = [typeof(CallConvCdecl)])]
    private static void OnGlobalRemove(IntPtr data, IntPtr registry, uint name)
    {
    }

    [UnmanagedCallersOnly(CallConvs = [typeof(CallConvCdecl)])]
    private static void OnBufferRelease(IntPtr data, IntPtr buffer)
    {
        try
        {
            var target = (WaylandRasterBuffer?)GCHandle.FromIntPtr(data).Target;
            if (target is not null)
                target.Busy = false;
        }
        catch
        {
        }
    }

    private static bool IsShm(IntPtr value)
    {
        if (value == IntPtr.Zero)
            return false;
        ReadOnlySpan<byte> expected = "wl_shm\0"u8;
        var actual = (byte*)value;
        for (var index = 0; index < expected.Length; index++)
        {
            if (actual[index] != expected[index])
                return false;
        }
        return true;
    }

    private sealed class RegistryBinding
    {
        public uint ShmName { get; set; }
        public uint ShmVersion { get; set; }
    }

    [DllImport(Library, EntryPoint = "wl_proxy_get_version", CallingConvention = CallingConvention.Cdecl)]
    private static extern uint GetVersion(IntPtr proxy);

    [DllImport(Library, EntryPoint = "wl_proxy_add_listener", CallingConvention = CallingConvention.Cdecl)]
    private static extern int AddListener(IntPtr proxy, IntPtr listener, IntPtr data);

    [DllImport(Library, EntryPoint = "wl_proxy_destroy", CallingConvention = CallingConvention.Cdecl)]
    private static extern void ProxyDestroy(IntPtr proxy);

    [DllImport(Library, EntryPoint = "wl_display_roundtrip", CallingConvention = CallingConvention.Cdecl)]
    private static extern int DisplayRoundtrip(IntPtr display);

    [DllImport(
        Library,
        EntryPoint = "wl_display_flush",
        CallingConvention = CallingConvention.Cdecl,
        SetLastError = true)]
    private static extern int DisplayFlush(IntPtr display);

    [DllImport(Library, EntryPoint = "wl_proxy_marshal_flags", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr MarshalNewId(
        IntPtr proxy,
        uint opcode,
        IntPtr @interface,
        uint version,
        uint flags,
        IntPtr newId);

    [DllImport(Library, EntryPoint = "wl_proxy_marshal_flags", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr MarshalRegistryBind(
        IntPtr proxy,
        uint opcode,
        IntPtr @interface,
        uint version,
        uint flags,
        uint name,
        IntPtr interfaceName,
        uint bindVersion,
        IntPtr newId);

    [DllImport(Library, EntryPoint = "wl_proxy_marshal_flags", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr MarshalShmPool(
        IntPtr proxy,
        uint opcode,
        IntPtr @interface,
        uint version,
        uint flags,
        IntPtr newId,
        int fd,
        int size);

    [DllImport(Library, EntryPoint = "wl_proxy_marshal_flags", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr MarshalBuffer(
        IntPtr proxy,
        uint opcode,
        IntPtr @interface,
        uint version,
        uint flags,
        IntPtr newId,
        int offset,
        int width,
        int height,
        int stride,
        uint format);

    [DllImport(Library, EntryPoint = "wl_proxy_marshal_flags", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr MarshalAttach(
        IntPtr proxy,
        uint opcode,
        IntPtr @interface,
        uint version,
        uint flags,
        IntPtr buffer,
        int x,
        int y);

    [DllImport(Library, EntryPoint = "wl_proxy_marshal_flags", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr MarshalDamage(
        IntPtr proxy,
        uint opcode,
        IntPtr @interface,
        uint version,
        uint flags,
        int x,
        int y,
        int width,
        int height);

    [DllImport(Library, EntryPoint = "wl_proxy_marshal_flags", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr MarshalRequest(
        IntPtr proxy,
        uint opcode,
        IntPtr @interface,
        uint version,
        uint flags);
}
