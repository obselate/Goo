from pathlib import Path
import re

root = Path("/home/xaz/Projects/goo-gsharp")
generated = (root / "tests/Goo.VulkanProof/Generated/Vulkan.Generated.gs").read_text()

def insert_after_line(path, anchor, additions):
    text = path.read_text()
    if additions[0] in text:
        return
    needle = anchor + "\n"
    if text.count(needle) != 1:
        raise RuntimeError(f"unexpected anchor count in {path}: {anchor}")
    path.write_text(text.replace(needle, needle + "\n".join(additions) + "\n", 1))

def generated_line(pattern):
    matches = re.findall(pattern, generated, re.MULTILINE)
    if len(matches) != 1:
        raise RuntimeError(f"unexpected generated match count for {pattern}")
    return matches[0]

types = [
    generated_line(r"^(type VkSemaphoreType = .+)$"),
    generated_line(r"^(type VkSemaphoreWaitFlagBits = .+)$"),
    generated_line(r"^(type VkSemaphoreWaitFlags = .+)$"),
]
insert_after_line(
    root / "Goo/Rendering/Vulkan/Vulkan.Abi.Types.gs",
    "internal type VkSemaphoreCreateFlags = VkFlags",
    ["internal " + line for line in types],
)

constant_names = [
    "VK_SEMAPHORE_TYPE_BINARY",
    "VK_SEMAPHORE_TYPE_TIMELINE",
    "VK_SEMAPHORE_WAIT_ANY_BIT",
]
constants = [
    generated_line(r"^\s+(const " + name + r" .+)$") for name in constant_names
]
insert_after_line(
    root / "Goo/Rendering/Vulkan/Vulkan.Abi.Constants.gs",
    "    const VK_SAMPLE_COUNT_8_BIT VkSampleCountFlagBits = 8",
    ["    " + line for line in constants],
)

structure_constant_names = [
    "VK_STRUCTURE_TYPE_SEMAPHORE_TYPE_CREATE_INFO",
    "VK_STRUCTURE_TYPE_SEMAPHORE_WAIT_INFO",
]
structure_constants = [
    generated_line(r"^\s+(const " + name + r" .+)$")
    for name in structure_constant_names
]
insert_after_line(
    root / "Goo/Rendering/Vulkan/Vulkan.Abi.Constants.gs",
    "    const VK_STRUCTURE_TYPE_SEMAPHORE_SUBMIT_INFO VkStructureType = 1000314005",
    ["    " + line for line in structure_constants],
)

def generated_struct(name):
    pattern = (
        r"(@StructLayout\(LayoutKind\.Sequential\)\n"
        r"unsafe struct " + name + r" \{\n(?:  .*\n)+?\})"
    )
    block = generated_line(pattern)
    block = block.replace("unsafe struct ", "internal unsafe struct ", 1)
    return re.sub(r"\*([A-Za-z])", r"* \1", block)

device_structs = root / "Goo/Rendering/Vulkan/Vulkan.Abi.Structs.Device.gs"
device_text = device_structs.read_text()
if "internal unsafe struct VkSemaphoreTypeCreateInfo" not in device_text:
    anchor = re.search(
        r"@StructLayout\(LayoutKind\.Sequential\)\n"
        r"internal unsafe struct VkSemaphoreSubmitInfo \{\n(?:  .*\n)+?\}",
        device_text,
    )
    if anchor is None:
        raise RuntimeError("VkSemaphoreSubmitInfo anchor missing")
    blocks = "\n\n".join(generated_struct(name) for name in (
        "VkSemaphoreTypeCreateInfo", "VkSemaphoreWaitInfo"
    ))
    device_text = device_text[:anchor.end()] + "\n\n" + blocks + device_text[anchor.end():]
    device_structs.write_text(device_text)

dispatch_lines = [
    generated_line(r"^\s+(var vkGetSemaphoreCounterValue .+)$"),
    generated_line(r"^\s+(var vkWaitSemaphores .+)$"),
]
insert_after_line(
    root / "Goo/Rendering/Vulkan/Vulkan.Abi.Dispatch.gs",
    "  var vkDestroySemaphore unmanaged[Cdecl](VkDevice, VkSemaphore, *VkAllocationCallbacks) -> void",
    ["  " + line.replace("unmanaged[Cdecl] ", "unmanaged[Cdecl]") for line in dispatch_lines],
)
