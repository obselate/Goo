# Vulkan Capability Census

Date: 2026-08-16

Status: started, one of four required qualification configurations measured

This is the ephemeral P02 result record for S05. It records facts only. It does not yet select the
common Vulkan contract, registry revision, or shader toolchain.

## Required configurations

| Configuration | Status |
|---|---|
| Windows x64 integrated GPU | Pending |
| Windows x64 discrete GPU | Pending |
| Linux Wayland x64 integrated GPU | Pending |
| Linux Wayland x64 discrete GPU | Measured, surface and presentation proof pending |

## Linux discrete configuration

| Item | Value |
|---|---|
| Operating system | CachyOS rolling, Linux 7.1.8-1-cachyos, x86-64 |
| GPU | NVIDIA GeForce RTX 3080, device `0x2216` |
| GPU class | Discrete |
| Driver | NVIDIA proprietary 610.57.04 |
| Vulkan device API | 1.4.341 |
| Vulkan instance loader | 1.4.357 |
| Vulkan conformance | 1.4.3.3 |
| SDL | 3.4.14 |
| Vulkan loader package | 1.4.357.0 |
| `libvulkan.so.1` SHA-256 | `178df8d45eab3af821a74cc2ceb0ef55d754b00bce8fac45a170787919ad799a` |
| `libSDL3.so.0` SHA-256 | `3d15e96eb7a23ef24cfaf47592fcc58b7f64d03247b75fc84e03a82891c4f7a3` |
| NVIDIA ICD manifest SHA-256 | `5d0a0cd95951433c9ae3699932765c88ad5060288ebefeebd6c55ab945ef4be1` |

## Capability observations

| Capability | Observation |
|---|---|
| `VK_KHR_surface` | Instance extension present |
| `VK_KHR_wayland_surface` | Instance extension present |
| `VK_KHR_swapchain` | Device extension revision 70 present |
| Dynamic rendering | Core feature true, `VK_KHR_dynamic_rendering` present |
| Synchronization2 | Core feature true, `VK_KHR_synchronization2` present |
| Timeline semaphores | Core feature true, `VK_KHR_timeline_semaphore` revision 2 present |
| `VK_EXT_swapchain_maintenance1` | Present |
| `VK_EXT_memory_budget` | Present |
| `VK_KHR_incremental_present` | Revision 2 present |
| Graphics and compute timestamps | Supported |
| Maximum push constants | 256 bytes |
| Maximum 2D image dimension | 32,768 |
| Maximum per-stage descriptor samplers | 1,048,576 |
| Maximum descriptor-set sampled images | 1,048,576 |

All candidate required and optional S05 capabilities are available on this device. This result
cannot make any feature mandatory until the three missing configurations are measured.

## Surface and validation gaps

The loader advertises Wayland surface support, but a real SDL-created `VkSurfaceKHR`, presentation
queue, surface format, present mode, resize, and close path were not exercised. `weston` is absent on
this host. The Khronos validation layer is also absent, so a validation-clean P04 result cannot be
claimed here.

These gaps block S05 and S06 exit. They do not block recording the device capability facts above.

## Development tool observations

| Tool | Observed version |
|---|---|
| `glslc` and shaderc | 2026.3, Vulkan SDK 1.4.357 |
| `glslangValidator` | Glslang 16.4.0, SPIR-V 1.6 |
| `spirv-val` | SPIRV-Tools 2026.3 |
| `spirv-opt` | SPIRV-Tools 2026.3 |
| `dxc` | Not installed |
| Local `vk.xml` | Not installed |

These versions are observations, not pins. S05 still requires a reviewed Khronos `vk.xml` commit
and content hash, a fixed offline compiler and target environment, and proof that all build tools
stay out of runtime packages.

## Candidate common floor to test

Vulkan 1.3 is the first candidate floor because dynamic rendering, synchronization2, and timeline
semaphores are core at that level. It is not accepted until every target configuration reports the
required behavior. Optional swapchain maintenance, memory budget, and incremental present support
must retain correctness-preserving paths when absent.
