from pathlib import Path
import re

root = Path("/home/xaz/Projects/goo-gsharp")
generated = (root / "tests/Goo.VulkanProof/Generated/Vulkan.Generated.gs").read_text()

def one(pattern, text=generated):
    matches = re.findall(pattern, text, re.MULTILINE)
    if len(matches) != 1:
        raise RuntimeError(f"expected one match for {pattern}, got {len(matches)}")
    return matches[0]

types = (root / "Goo/Rendering/Vulkan/Vulkan.Abi.Types.gs").read_text()
for name in ("VkSemaphoreType", "VkSemaphoreWaitFlagBits", "VkSemaphoreWaitFlags"):
    source = one(r"^(type " + name + r" = .+)$")
    target = one(r"^(internal type " + name + r" = .+)$", types)
    if target != "internal " + source:
        raise RuntimeError(f"type mismatch: {name}")

constants = (root / "Goo/Rendering/Vulkan/Vulkan.Abi.Constants.gs").read_text()
for name in (
    "VK_SEMAPHORE_TYPE_BINARY",
    "VK_SEMAPHORE_TYPE_TIMELINE",
    "VK_SEMAPHORE_WAIT_ANY_BIT",
    "VK_STRUCTURE_TYPE_SEMAPHORE_TYPE_CREATE_INFO",
    "VK_STRUCTURE_TYPE_SEMAPHORE_WAIT_INFO",
):
    source = one(r"^\s+(const " + name + r" .+)$")
    target = one(r"^    (const " + name + r" .+)$", constants)
    if target != source:
        raise RuntimeError(f"constant mismatch: {name}")

def generated_struct(name):
    source = one(
        r"(@StructLayout\(LayoutKind\.Sequential\)\n"
        r"unsafe struct " + name + r" \{\n(?:  .*\n)+?\})"
    )
    source = source.replace("unsafe struct ", "internal unsafe struct ", 1)
    return re.sub(r"\*([A-Za-z])", r"* \1", source)

structs = (root / "Goo/Rendering/Vulkan/Vulkan.Abi.Structs.Device.gs").read_text()
for name in ("VkSemaphoreTypeCreateInfo", "VkSemaphoreWaitInfo"):
    target = one(
        r"(@StructLayout\(LayoutKind\.Sequential\)\n"
        r"internal unsafe struct " + name + r" \{\n(?:  .*\n)+?\})",
        structs,
    )
    if target != generated_struct(name):
        raise RuntimeError(f"struct mismatch: {name}")

dispatch = (root / "Goo/Rendering/Vulkan/Vulkan.Abi.Dispatch.gs").read_text()
for name in ("vkGetSemaphoreCounterValue", "vkWaitSemaphores"):
    source = one(r"^\s+(var " + name + r" .+)$")
    target = one(r"^  (var " + name + r" .+)$", dispatch)
    if target != source.replace("unmanaged[Cdecl] ", "unmanaged[Cdecl]"):
        raise RuntimeError(f"dispatch mismatch: {name}")

print("timeline ABI parity: 3 types, 5 constants, 2 structs, 2 commands")
