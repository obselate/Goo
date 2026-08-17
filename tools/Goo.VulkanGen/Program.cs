#nullable enable
#pragma warning disable CS8600, CS8602, CS8603, CS8619

using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml.Linq;

internal static class Program
{
	private sealed class Manifest
	{
		public string RegistrySha256 { get; }

		public List<string> Extensions { get; }

		public List<string> GlobalCommands { get; }

		public List<string> InstanceCommands { get; }

		public List<string> DeviceCommands { get; }

		public List<string> RequiredTypes { get; }

		public List<string> RequiredConstants { get; }

		public Manifest(string registrySha256, List<string> extensions, List<string> globalCommands, List<string> instanceCommands, List<string> deviceCommands, List<string> requiredTypes, List<string> requiredConstants)
		{
			RegistrySha256 = registrySha256;
			Extensions = extensions;
			GlobalCommands = globalCommands;
			InstanceCommands = instanceCommands;
			DeviceCommands = deviceCommands;
			RequiredTypes = requiredTypes;
			RequiredConstants = requiredConstants;
		}
	}

	private sealed class Registry
	{
		public Dictionary<string, List<TypeDefinition>> Definitions { get; }

		public Dictionary<string, CommandDefinition> Commands { get; }

		public Dictionary<string, XElement> EnumGroups { get; }

		public List<XElement> Extensions { get; }

		public XElement Root { get; }

		public Registry(Dictionary<string, List<TypeDefinition>> definitions, Dictionary<string, CommandDefinition> commands, Dictionary<string, XElement> enumGroups, List<XElement> extensions, XElement root)
		{
			Definitions = definitions;
			Commands = commands;
			EnumGroups = enumGroups;
			Extensions = extensions;
			Root = root;
		}

		public TypeDefinition? GetDefinition(string name)
		{
			if (!Definitions.TryGetValue(name, out List<TypeDefinition> value))
			{
				return null;
			}
			return (from candidate in value
				where candidate.SupportsVulkan
				orderby (candidate.Api == null || !candidate.Api.Split(',').Contains<string>("vulkan", StringComparer.Ordinal)) ? 1 : 2 descending, candidate.Ordinal
				select candidate).FirstOrDefault();
		}

		public (XElement Element, string? Extends, string GroupName, string? GroupType, string? ExtensionNumber)? FindEnum(string name)
		{
			foreach (XElement item in EnumGroups.Values.OrderBy<XElement, string>((XElement value) => value.Attribute("name")?.Value, StringComparer.Ordinal))
			{
				XElement xElement = item.Elements("enum").FirstOrDefault((XElement value) => value.Attribute("name")?.Value == name);
				if (xElement != null)
				{
					return (xElement, xElement.Attribute("extends")?.Value, item.Attribute("name")?.Value ?? string.Empty, item.Attribute("type")?.Value, null);
				}
			}
			foreach (XElement feature in Root.Elements("feature").Where(Program.SupportsVulkan).OrderBy(value => value.Attribute("name")?.Value, StringComparer.Ordinal))
			{
				XElement? featureValue = feature.Descendants("require").Elements("enum").FirstOrDefault(value => value.Attribute("name")?.Value == name);
				if (featureValue != null)
				{
					return (featureValue, featureValue.Attribute("extends")?.Value, feature.Attribute("name")?.Value ?? string.Empty, null, null);
				}
			}
			foreach (XElement extension in Extensions)
			{
				XElement xElement2 = extension.Descendants("require").Elements("enum").FirstOrDefault((XElement value) => value.Attribute("name")?.Value == name);
				if (xElement2 != null)
				{
					return (xElement2, xElement2.Attribute("extends")?.Value, extension.Attribute("name")?.Value ?? string.Empty, null, extension.Attribute("number")?.Value);
				}
			}
			foreach (XElement extension2 in Root.Element("extensions")?.Elements("extension") ?? Enumerable.Empty<XElement>())
			{
				XElement xElement3 = extension2.Descendants("require").Elements("enum").FirstOrDefault((XElement value) => value.Attribute("name")?.Value == name);
				if (xElement3 != null)
				{
					return (xElement3, xElement3.Attribute("extends")?.Value, extension2.Attribute("name")?.Value ?? string.Empty, null, extension2.Attribute("number")?.Value);
				}
			}
			return null;
		}
	}

	private sealed class TypeDefinition
	{
		private static int nextOrdinal;

		public string? Name { get; }

		public string? Category { get; }

		public string? Alias { get; }

		public string? Requires { get; }

		public string? BitValues { get; }

		public string? Api { get; }

		public XElement Element { get; }

		public int Ordinal { get; }

		public bool HandleIsNonDispatchable { get; }

		public bool SupportsVulkan
		{
			get
			{
				if (Api != null && !Api.Split(',').Contains<string>("vulkan", StringComparer.Ordinal))
				{
					return Api.Split(',').Contains<string>("vulkanbase", StringComparer.Ordinal);
				}
				return true;
			}
		}

		private TypeDefinition(string? name, string? category, string? alias, string? requires, string? bitValues, string? api, XElement element, int ordinal, bool handleIsNonDispatchable)
		{
			Name = name;
			Category = category;
			Alias = alias;
			Requires = requires;
			BitValues = bitValues;
			Api = api;
			Element = element;
			Ordinal = ordinal;
			HandleIsNonDispatchable = handleIsNonDispatchable;
		}

		public static TypeDefinition Create(XElement element)
		{
			string text = element.Attribute("category")?.Value;
			string name = element.Attribute("name")?.Value ?? element.Element("name")?.Value.Trim();
			if (text == "funcpointer")
			{
				name = element.Element("proto")?.Element("name")?.Value.Trim();
			}
			string a = element.Element("type")?.Value.Trim();
			return new TypeDefinition(name, text, element.Attribute("alias")?.Value, element.Attribute("requires")?.Value, element.Attribute("bitvalues")?.Value, element.Attribute("api")?.Value, element, nextOrdinal++, string.Equals(a, "VK_DEFINE_NON_DISPATCHABLE_HANDLE", StringComparison.Ordinal));
		}

		public IEnumerable<string> ReferencedTypes()
		{
			if (Alias != null)
			{
				yield return Alias;
				yield break;
			}
			switch (Category)
			{
			case "basetype":
			case "bitmask":
			{
				XElement xElement3 = Element.Element("type");
				if (xElement3 != null)
				{
					yield return xElement3.Value.Trim();
				}
				if (Category == "bitmask" && Requires != null)
				{
					yield return Requires;
				}
				if (Category == "bitmask" && BitValues != null)
				{
					yield return BitValues;
				}
				break;
			}
			case "struct":
			case "union":
				foreach (XElement item in Element.Elements("member").Where(Program.SupportsVulkan))
				{
					XElement xElement4 = item.Element("type");
					if (xElement4 != null)
					{
						yield return xElement4.Value.Trim();
					}
				}
				break;
			case "funcpointer":
			{
				XElement xElement = Element.Element("proto")?.Element("type");
				if (xElement != null)
				{
					yield return xElement.Value.Trim();
				}
				foreach (XElement item2 in Element.Elements("param").Where(Program.SupportsVulkan))
				{
					XElement xElement2 = item2.Element("type");
					if (xElement2 != null)
					{
						yield return xElement2.Value.Trim();
					}
				}
				break;
			}
			}
		}
	}

	private sealed class CommandDefinition : FunctionDefinition
	{
		public string Name { get; }

		public CommandDefinition(string name, TypeSpec returnType, List<ParameterDefinition> parameters)
			: base(returnType, parameters)
		{
			Name = name;
		}

		public static CommandDefinition Create(XElement element)
		{
			return ParseCommand(element);
		}
	}

	private class FunctionDefinition
	{
		public TypeSpec ReturnType { get; }

		public List<ParameterDefinition> Parameters { get; }

		public FunctionDefinition(TypeSpec returnType, List<ParameterDefinition> parameters)
		{
			ReturnType = returnType;
			Parameters = parameters;
		}
	}

	private sealed class ParameterDefinition
	{
		public string Name { get; }

		public TypeSpec Type { get; }

		public ParameterDefinition(string name, TypeSpec type)
		{
			Name = name;
			Type = type;
		}
	}

	private sealed class FieldDefinition
	{
		public string Name { get; }

		public TypeSpec Type { get; }

		public string? ArrayExpression { get; }

		public FieldDefinition(string name, TypeSpec type, string? arrayExpression)
		{
			Name = name;
			Type = type;
			ArrayExpression = arrayExpression;
		}
	}

	private readonly record struct TypeSpec(string Name, int PointerDepth, string? ArrayExpression, string DeclaredName);

	private sealed class ConstantDefinition
	{
		public string Name { get; }

		public string TypeName { get; }

		public string? Alias { get; }

		public string? Value { get; }

		public string? BitPosition { get; }

		public string? Offset { get; }

		public string? ExtensionNumber { get; }

		public string? Direction { get; }

		public string? GroupName { get; }

		public string? GroupType { get; }

		public ConstantDefinition(string name, string typeName, string? alias, string? value, string? bitPosition, string? offset, string? extensionNumber, string? direction, string? groupName, string? groupType)
		{
			Name = name;
			TypeName = typeName;
			Alias = alias;
			Value = value;
			BitPosition = bitPosition;
			Offset = offset;
			ExtensionNumber = extensionNumber;
			Direction = direction;
			GroupName = groupName;
			GroupType = groupType;
		}

		public static ConstantDefinition FromEnum(XElement element, string? extends, string groupName, string? groupType, string? extensionNumber = null)
		{
			object obj = element.Attribute("name")?.Value;
			string text = element.Attribute("type")?.Value;
			string text2 = element.Attribute("value")?.Value;
			string typeName = ((text != null) ? (MapPrimitive(text) ?? text) : ((text2 != null && text2.TrimStart().StartsWith("\"", StringComparison.Ordinal)) ? "string" : (extends ?? (groupName.StartsWith("Vk", StringComparison.Ordinal) ? groupName : "int32"))));
			if (obj == null)
			{
				obj = string.Empty;
			}
			return new ConstantDefinition((string)obj, typeName, element.Attribute("alias")?.Value, text2, element.Attribute("bitpos")?.Value, element.Attribute("offset")?.Value, element.Attribute("extnumber")?.Value ?? extensionNumber, element.Attribute("dir")?.Value, groupName, groupType);
		}

		public ConstantDefinition WithType(string typeName)
		{
			return new ConstantDefinition(Name, typeName, Alias, Value, BitPosition, Offset, ExtensionNumber, Direction, GroupName, GroupType);
		}
	}

	private static readonly string[] ExpectedGlobalCommands = new string[4] { "vkGetInstanceProcAddr", "vkEnumerateInstanceVersion", "vkEnumerateInstanceExtensionProperties", "vkCreateInstance" };

	private static readonly string[] ExpectedInstanceCommands = new string[17] { "vkDestroyInstance", "vkEnumeratePhysicalDevices", "vkGetPhysicalDeviceQueueFamilyProperties", "vkGetPhysicalDeviceProperties", "vkDestroySurfaceKHR", "vkGetPhysicalDeviceSurfaceSupportKHR", "vkGetDeviceProcAddr", "vkGetPhysicalDeviceFeatures2", "vkEnumerateDeviceExtensionProperties", "vkGetPhysicalDeviceSurfaceCapabilitiesKHR", "vkGetPhysicalDeviceSurfaceFormatsKHR", "vkGetPhysicalDeviceSurfacePresentModesKHR", "vkGetPhysicalDeviceMemoryProperties", "vkGetPhysicalDeviceFormatProperties", "vkCreateDevice", "vkCreateDebugUtilsMessengerEXT", "vkDestroyDebugUtilsMessengerEXT" };

	private static readonly string[] ExpectedDeviceCommands = new string[69] { "vkDestroyDevice", "vkGetDeviceQueue", "vkCreateSwapchainKHR", "vkDestroySwapchainKHR", "vkGetSwapchainImagesKHR", "vkCreateCommandPool", "vkDestroyCommandPool", "vkAllocateCommandBuffers", "vkResetCommandBuffer", "vkCreateSemaphore", "vkDestroySemaphore", "vkCreateFence", "vkDestroyFence", "vkWaitForFences", "vkGetFenceStatus", "vkResetFences", "vkAcquireNextImageKHR", "vkBeginCommandBuffer", "vkEndCommandBuffer", "vkCmdPipelineBarrier2", "vkCmdClearColorImage", "vkQueueSubmit2", "vkQueuePresentKHR", "vkCreateQueryPool", "vkDestroyQueryPool", "vkGetQueryPoolResults", "vkCmdResetQueryPool", "vkCmdWriteTimestamp2", "vkCreateImageView", "vkDestroyImageView", "vkCreateShaderModule", "vkDestroyShaderModule", "vkCreatePipelineLayout", "vkDestroyPipelineLayout", "vkCreateGraphicsPipelines", "vkDestroyPipeline", "vkCmdBeginRendering", "vkCmdEndRendering", "vkCmdBindPipeline", "vkCmdPushConstants", "vkCmdDraw", "vkCmdSetViewport", "vkCmdSetScissor", "vkCreateImage", "vkDestroyImage", "vkGetImageMemoryRequirements2", "vkAllocateMemory", "vkFreeMemory", "vkBindImageMemory2", "vkCreateBuffer", "vkDestroyBuffer", "vkGetBufferMemoryRequirements2", "vkBindBufferMemory2", "vkMapMemory", "vkUnmapMemory", "vkInvalidateMappedMemoryRanges", "vkFlushMappedMemoryRanges", "vkCmdCopyImageToBuffer", "vkCmdCopyBuffer", "vkCmdCopyBufferToImage", "vkCreateSampler", "vkDestroySampler", "vkCreateDescriptorSetLayout", "vkDestroyDescriptorSetLayout", "vkCreateDescriptorPool", "vkDestroyDescriptorPool", "vkAllocateDescriptorSets", "vkUpdateDescriptorSets", "vkCmdBindDescriptorSets" };

	private static readonly string[] ExpectedRequiredTypes = new string[9] { "VkClearValue", "VkPhysicalDeviceFeatures2", "VkPhysicalDeviceVulkan12Features", "VkPhysicalDeviceVulkan13Features", "VkMemoryDedicatedRequirements", "VkMemoryDedicatedAllocateInfo", "VkPipelineRenderingCreateInfo", "VkPhysicalDeviceSwapchainMaintenance1FeaturesEXT", "VkSwapchainPresentFenceInfoEXT" };

	private static readonly string[] ExpectedRequiredConstants = new string[9] { "VK_FORMAT_FEATURE_TRANSFER_SRC_BIT", "VK_EXT_SWAPCHAIN_MAINTENANCE_1_EXTENSION_NAME", "VK_EXT_SWAPCHAIN_MAINTENANCE_1_SPEC_VERSION", "VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_SWAPCHAIN_MAINTENANCE_1_FEATURES_EXT", "VK_STRUCTURE_TYPE_SWAPCHAIN_PRESENT_FENCE_INFO_EXT", "VK_EXT_SURFACE_MAINTENANCE_1_EXTENSION_NAME", "VK_EXT_SURFACE_MAINTENANCE_1_SPEC_VERSION", "VK_KHR_GET_SURFACE_CAPABILITIES_2_EXTENSION_NAME", "VK_KHR_GET_SURFACE_CAPABILITIES_2_SPEC_VERSION" };

	private static readonly string[] GsharpKeywords = new string[55]
	{
		"as", "async", "await", "break", "case", "chan", "class", "const", "continue", "default",
		"defer", "do", "else", "enum", "false", "fallthrough", "finally", "for", "func", "go",
		"goto", "guard", "if", "import", "interface", "internal", "is", "let", "lock", "map",
		"nil", "open", "operator", "override", "package", "private", "protected", "public", "range", "return",
		"scope", "sealed", "select", "sequence", "shared", "struct", "switch", "throw", "true", "try",
		"type", "unsafe", "using", "var", "while"
	};

	private static readonly HashSet<string> GsharpKeywordSet = new HashSet<string>(GsharpKeywords, StringComparer.Ordinal);

	private static int Main(string[] args)
	{
		try
		{
			if (args.Length != 1 || string.IsNullOrWhiteSpace(args[0]))
			{
				throw new InvalidOperationException("usage: Goo.VulkanGen <output-path>");
			}
			string path = FindInputDirectory();
			string xmlPath = Path.Combine(path, "vk.xml");
			Manifest manifest = ReadManifest(Path.Combine(path, "registry-manifest.json"), xmlPath);
			string contents = Generate(ReadRegistry(xmlPath, manifest), manifest);
			string fullPath = Path.GetFullPath(args[0]);
			Directory.CreateDirectory(Path.GetDirectoryName(fullPath) ?? throw new InvalidOperationException("output path has no directory"));
			File.WriteAllText(fullPath, contents, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
			return 0;
		}
		catch (Exception ex)
		{
			Console.Error.WriteLine(ex.Message);
			return 1;
		}
	}

	private static string FindInputDirectory()
	{
		List<string> list = new List<string>();
		AddCandidate(list, Path.Combine(Directory.GetCurrentDirectory(), "input"));
		AddCandidate(list, Path.Combine(Directory.GetCurrentDirectory(), "tools", "Goo.VulkanGen", "input"));
		AddCandidate(list, Path.Combine(AppContext.BaseDirectory, "input"));
		string[] array = new string[2]
		{
			Directory.GetCurrentDirectory(),
			AppContext.BaseDirectory
		};
		for (int i = 0; i < array.Length; i++)
		{
			for (DirectoryInfo directoryInfo = new DirectoryInfo(array[i]); directoryInfo != null; directoryInfo = directoryInfo.Parent)
			{
				AddCandidate(list, Path.Combine(directoryInfo.FullName, "input"));
				AddCandidate(list, Path.Combine(directoryInfo.FullName, "tools", "Goo.VulkanGen", "input"));
			}
		}
		return list.FirstOrDefault(HasRegistryInputs) ?? throw new FileNotFoundException("could not locate input/vk.xml and input/registry-manifest.json");
	}

	private static void AddCandidate(List<string> candidates, string candidate)
	{
		string fullPath = Path.GetFullPath(candidate);
		if (!candidates.Contains<string>(fullPath, StringComparer.Ordinal))
		{
			candidates.Add(fullPath);
		}
	}

	private static bool HasRegistryInputs(string directory)
	{
		if (File.Exists(Path.Combine(directory, "vk.xml")))
		{
			return File.Exists(Path.Combine(directory, "registry-manifest.json"));
		}
		return false;
	}

	private static Manifest ReadManifest(string manifestPath, string xmlPath)
	{
		using JsonDocument jsonDocument = JsonDocument.Parse(File.ReadAllText(manifestPath));
		JsonElement rootElement = jsonDocument.RootElement;
		string text = rootElement.GetProperty("registrySha256").GetString();
		if (string.IsNullOrWhiteSpace(text))
		{
			throw new InvalidDataException("registry-manifest.json has no registrySha256");
		}
		string text2 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(xmlPath))).ToLowerInvariant();
		if (!string.Equals(text2, text, StringComparison.OrdinalIgnoreCase))
		{
			throw new InvalidDataException("vk.xml SHA-256 mismatch: expected " + text + ", actual " + text2);
		}
		string text3 = rootElement.GetProperty("api").GetString();
		if (!string.Equals(text3, "vulkan", StringComparison.Ordinal))
		{
			throw new InvalidDataException("unsupported registry API: " + text3);
		}
		string text4 = rootElement.GetProperty("core").GetString();
		if (!string.Equals(text4, "1.3", StringComparison.Ordinal))
		{
			throw new InvalidDataException("unsupported Vulkan core version: " + text4);
		}
		List<string> extensions = ReadStringArray(rootElement, "extensions");
		List<string> list = ReadStringArray(rootElement, "globalCommands");
		List<string> list2 = ReadStringArray(rootElement, "instanceCommands");
		List<string> list3 = ReadStringArray(rootElement, "deviceCommands");
		List<string> list4 = ReadStringArray(rootElement, "requiredTypes");
		List<string> list5 = ReadStringArray(rootElement, "requiredConstants");
		RequireExactCommands(list, ExpectedGlobalCommands, "globalCommands");
		RequireExactCommands(list2, ExpectedInstanceCommands, "instanceCommands");
		RequireExactCommands(list3, ExpectedDeviceCommands, "deviceCommands");
		RequireExactCommands(list4, ExpectedRequiredTypes, "requiredTypes");
		RequireExactCommands(list5, ExpectedRequiredConstants, "requiredConstants");
		return new Manifest(text, extensions, list, list2, list3, list4, list5);
	}

	private static List<string> ReadStringArray(JsonElement root, string property)
	{
		return (from value in root.GetProperty(property).EnumerateArray()
			select value.GetString() ?? string.Empty).ToList();
	}

	private static void RequireExactCommands(IReadOnlyList<string> actual, IReadOnlyList<string> expected, string property)
	{
		if (actual.Count != expected.Count || !actual.SequenceEqual<string>(expected, StringComparer.Ordinal))
		{
			throw new InvalidDataException(property + " does not match the required command subset");
		}
	}

	private static Registry ReadRegistry(string xmlPath, Manifest manifest)
	{
		XElement xElement = XDocument.Load(xmlPath, LoadOptions.None).Root ?? throw new InvalidDataException("vk.xml has no root element");
		XElement? obj = xElement.Element("types") ?? throw new InvalidDataException("vk.xml has no types element");
		Dictionary<string, List<TypeDefinition>> definitions = new Dictionary<string, List<TypeDefinition>>(StringComparer.Ordinal);
		foreach (XElement item in obj.Elements("type"))
		{
			TypeDefinition typeDefinition = TypeDefinition.Create(item);
			if (typeDefinition.Name != null)
			{
				AddDefinition(definitions, typeDefinition);
			}
		}
		Dictionary<string, CommandDefinition> dictionary = new Dictionary<string, CommandDefinition>(StringComparer.Ordinal);
		foreach (XElement item2 in (xElement.Element("commands") ?? throw new InvalidDataException("vk.xml has no commands element")).Elements("command"))
		{
			if (item2.Element("proto") != null)
			{
				CommandDefinition commandDefinition = CommandDefinition.Create(item2);
				if (commandDefinition.Name != null)
				{
					dictionary.TryAdd(commandDefinition.Name, commandDefinition);
				}
			}
		}
		Dictionary<string, XElement> enumGroups = (from element in xElement.Elements("enums")
			where element.Attribute("name") != null
			select element).ToDictionary<XElement, string>((XElement element) => element.Attribute("name").Value, StringComparer.Ordinal);
		List<XElement> extensions = (xElement.Element("extensions")?.Elements("extension") ?? Enumerable.Empty<XElement>()).Where((XElement element) => manifest.Extensions.Contains<string>(element.Attribute("name")?.Value ?? string.Empty, StringComparer.Ordinal)).OrderBy<XElement, string>((XElement element) => element.Attribute("name")?.Value, StringComparer.Ordinal).ToList();
		return new Registry(definitions, dictionary, enumGroups, extensions, xElement);
	}

	private static void AddDefinition(Dictionary<string, List<TypeDefinition>> definitions, TypeDefinition definition)
	{
		if (definition.Name != null)
		{
			if (!definitions.TryGetValue(definition.Name, out List<TypeDefinition> value))
			{
				value = new List<TypeDefinition>();
				definitions.Add(definition.Name, value);
			}
			value.Add(definition);
		}
	}

	private static string Generate(Registry registry, Manifest manifest)
	{
		HashSet<string> selectedTypes = SelectTypes(registry, manifest);
		Dictionary<string, ConstantDefinition> constants = SelectConstants(registry, selectedTypes, manifest);
		StringBuilder stringBuilder = new StringBuilder();
		stringBuilder.AppendLine("package Goo.Vulkan.Generated");
		stringBuilder.AppendLine();
		stringBuilder.AppendLine("import System.Runtime.InteropServices");
		stringBuilder.AppendLine();
		EmitAliases(stringBuilder, registry, selectedTypes);
		EmitConstants(stringBuilder, constants);
		EmitStructs(stringBuilder, registry, selectedTypes, constants);
		EmitDispatch(stringBuilder, registry, manifest.GlobalCommands, "VkGlobalDispatch");
		EmitDispatch(stringBuilder, registry, manifest.InstanceCommands, "VkInstanceDispatch");
		EmitDispatch(stringBuilder, registry, manifest.DeviceCommands, "VkDeviceDispatch");
		return stringBuilder.ToString();
	}

	private static HashSet<string> SelectTypes(Registry registry, Manifest manifest)
	{
		HashSet<string> hashSet = new HashSet<string>(StringComparer.Ordinal);
		Queue<string> queue = new Queue<string>();
		foreach (string item in manifest.GlobalCommands.Concat(manifest.InstanceCommands).Concat(manifest.DeviceCommands))
		{
			if (!registry.Commands.TryGetValue(item, out CommandDefinition value))
			{
				throw new InvalidDataException("command definition missing: " + item);
			}
			AddType(value.ReturnType.Name, queue, registry);
			foreach (ParameterDefinition parameter in value.Parameters)
			{
				AddType(parameter.Type.Name, queue, registry);
			}
		}
		foreach (string item2 in manifest.RequiredTypes)
		{
			AddType(item2, queue, registry);
		}
		while (queue.Count > 0)
		{
			string text = queue.Dequeue();
			if (IsPrimitive(text) || !hashSet.Add(text))
			{
				continue;
			}
			TypeDefinition definition = registry.GetDefinition(text);
			if (definition == null)
			{
				continue;
			}
			IEnumerable<string> referencedTypes = definition.ReferencedTypes();
			if (definition.Category == "struct" && definition.Alias != null)
			{
				TypeDefinition aliasedDefinition = registry.GetDefinition(definition.Alias) ?? throw new InvalidDataException("aliased Vulkan struct definition missing: " + definition.Alias);
				referencedTypes = aliasedDefinition.ReferencedTypes();
			}
			foreach (string item2 in referencedTypes)
			{
				AddType(item2, queue, registry);
			}
		}
		return hashSet;
	}

	private static void AddType(string name, Queue<string> pending, Registry registry)
	{
		if (!IsPrimitive(name))
		{
			if (registry.GetDefinition(name) == null)
			{
				throw new InvalidDataException("transitive Vulkan type definition missing: " + name);
			}
			pending.Enqueue(name);
		}
	}

	private static Dictionary<string, ConstantDefinition> SelectConstants(Registry registry, HashSet<string> selectedTypes, Manifest manifest)
	{
		Dictionary<string, ConstantDefinition> dictionary = new Dictionary<string, ConstantDefinition>(StringComparer.Ordinal);
		foreach (XElement item in registry.EnumGroups.Values.Where((XElement element) => string.Equals(element.Attribute("name")?.Value, "API Constants", StringComparison.Ordinal)))
		{
			foreach (XElement item2 in item.Elements("enum"))
			{
				AddConstant(dictionary, ConstantDefinition.FromEnum(item2, null, "API Constants", null));
			}
		}
		foreach (string selectedType in selectedTypes)
		{
			if (!registry.EnumGroups.TryGetValue(selectedType, out XElement value))
			{
				continue;
			}
			foreach (XElement item3 in value.Elements("enum"))
			{
				AddConstant(dictionary, ConstantDefinition.FromEnum(item3, selectedType, selectedType, value.Attribute("type")?.Value));
			}
		}
		foreach (string selectedType in selectedTypes.OrderBy(value => value, StringComparer.Ordinal))
		{
			TypeDefinition? definition = registry.GetDefinition(selectedType);
			if (definition == null || definition.Category is not ("struct" or "union"))
			{
				continue;
			}
			foreach (XElement member in definition.Element.Elements("member").Where(Program.SupportsVulkan))
			{
				foreach (string valueName in (member.Attribute("values")?.Value ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
				{
					(XElement, string?, string, string?, string?)? value = registry.FindEnum(valueName);
					if (value.HasValue)
					{
						AddConstant(dictionary, ConstantDefinition.FromEnum(value.Value.Item1, value.Value.Item2, value.Value.Item3, value.Value.Item4, value.Value.Item5));
					}
				}
			}
		}
		foreach (XElement extension in registry.Extensions)
		{
			foreach (XElement item4 in extension.Descendants("require").Elements("enum"))
			{
				string extends = item4.Attribute("extends")?.Value;
				AddConstant(dictionary, ConstantDefinition.FromEnum(item4, extends, extension.Attribute("name")?.Value ?? string.Empty, null, extension.Attribute("number")?.Value));
			}
		}
		foreach (string requiredConstant in manifest.RequiredConstants)
		{
			(XElement, string?, string, string?, string?)? value = registry.FindEnum(requiredConstant);
			if (!value.HasValue)
			{
				throw new InvalidDataException("required Vulkan constant definition missing: " + requiredConstant);
			}
			AddConstant(dictionary, ConstantDefinition.FromEnum(value.Value.Item1, value.Value.Item2, value.Value.Item3, value.Value.Item4, value.Value.Item5));
		}
		AddDefineConstant(dictionary, "VK_API_VERSION_1_0", "uint32", "4194304");
		AddDefineConstant(dictionary, "VK_API_VERSION_1_1", "uint32", "4198400");
		AddDefineConstant(dictionary, "VK_API_VERSION_1_2", "uint32", "4202496");
		AddDefineConstant(dictionary, "VK_API_VERSION_1_3", "uint32", "4206592");
		AddDefineConstant(dictionary, "VK_HEADER_VERSION", "uint32", "357");
		foreach (ConstantDefinition item5 in dictionary.Values.ToList())
		{
			if (item5.TypeName.StartsWith("Vk", StringComparison.Ordinal) && !selectedTypes.Contains(item5.TypeName))
			{
				string typeName = (string.Equals(item5.GroupType, "bitmask", StringComparison.Ordinal) ? EnumUnderlying(item5.GroupName ?? string.Empty) : "int32");
				dictionary[item5.Name] = item5.WithType(typeName);
			}
		}
		foreach (ConstantDefinition item6 in dictionary.Values.ToList())
		{
			if (item6.Alias != null && !dictionary.ContainsKey(item6.Alias))
			{
				(XElement, string?, string, string?, string?)? tuple = registry.FindEnum(item6.Alias);
				if (tuple.HasValue)
				{
					AddConstant(dictionary, ConstantDefinition.FromEnum(tuple.Value.Item1, tuple.Value.Item2, tuple.Value.Item3, tuple.Value.Item4, tuple.Value.Item5));
				}
			}
		}
		return dictionary;
	}

	private static void AddDefineConstant(Dictionary<string, ConstantDefinition> constants, string name, string typeName, string value)
	{
		AddConstant(constants, new ConstantDefinition(name, typeName, null, value, null, null, null, null, null, null));
	}

	private static void AddConstant(Dictionary<string, ConstantDefinition> constants, ConstantDefinition definition)
	{
		if (definition.Name != null)
		{
			if (!constants.TryGetValue(definition.Name, out ConstantDefinition value))
			{
				constants.Add(definition.Name, definition);
			}
			else if (!string.Equals(value.Alias, definition.Alias, StringComparison.Ordinal) || !string.Equals(value.Value, definition.Value, StringComparison.Ordinal))
			{
				throw new InvalidDataException("conflicting Vulkan constant definitions: " + definition.Name);
			}
		}
	}

	private static void EmitAliases(StringBuilder text, Registry registry, HashSet<string> selectedTypes)
	{
		foreach (string item in OrderAliases(registry, selectedTypes))
		{
			TypeDefinition typeDefinition = registry.GetDefinition(item) ?? throw new InvalidDataException("selected type missing: " + item);
			switch (typeDefinition.Category)
			{
			case "handle":
				EmitAlias(text, item, typeDefinition.Alias ?? (typeDefinition.HandleIsNonDispatchable ? "uint64" : "nint"));
				break;
			case "basetype":
				EmitAlias(text, item, RenderType(ParseType(typeDefinition.Element), registry, selectedTypes, pointerAsNativeInt: false, callbackAlias: false));
				break;
			case "bitmask":
				EmitAlias(text, item, typeDefinition.Alias ?? RenderType(ParseType(typeDefinition.Element), registry, selectedTypes, pointerAsNativeInt: false, callbackAlias: false));
				break;
			case "enum":
				EmitAlias(text, item, typeDefinition.Alias ?? EnumUnderlying(item));
				break;
			}
		}
	}

	private static IReadOnlyList<string> OrderAliases(Registry registry, HashSet<string> selectedTypes)
	{
		List<string> ordered = new List<string>();
		HashSet<string> visited = new HashSet<string>(StringComparer.Ordinal);
		HashSet<string> active = new HashSet<string>(StringComparer.Ordinal);
		foreach (string name in selectedTypes.OrderBy(value => value, StringComparer.Ordinal))
		{
			VisitAlias(name);
		}
		return ordered;

		void VisitAlias(string name)
		{
			if (!selectedTypes.Contains(name) || !visited.Add(name))
			{
				return;
			}
			if (!active.Add(name))
			{
				throw new InvalidDataException("cyclic Vulkan type alias: " + name);
			}
			TypeDefinition? definition = registry.GetDefinition(name);
			if (definition != null && definition.Category is "basetype" or "bitmask")
			{
				if (definition.Alias != null)
				{
					VisitAlias(definition.Alias);
				}
				else
				{
					foreach (string reference in definition.ReferencedTypes().OrderBy(value => value, StringComparer.Ordinal))
					{
						VisitAlias(reference);
					}
				}
			}
			active.Remove(name);
			ordered.Add(name);
		}
	}

	private static void EmitAlias(StringBuilder text, string name, string target)
	{
		text.Append("type ").Append(name).Append(" = ")
			.Append(target)
			.AppendLine();
	}

	private static void EmitConstants(StringBuilder text, Dictionary<string, ConstantDefinition> constants)
	{
		text.AppendLine("class VkConstants {");
		text.AppendLine("    shared {");
		foreach (ConstantDefinition item in constants.Values.OrderBy<ConstantDefinition, string>((ConstantDefinition constantDefinition) => constantDefinition.Name, StringComparer.Ordinal))
		{
			string typeName = item.TypeName;
			string value = RenderConstantValue(item, constants);
			text.Append("        const ").Append(item.Name).Append(' ')
				.Append(typeName)
				.Append(" = ")
				.Append(value)
				.AppendLine();
		}
		text.AppendLine("    }");
		text.AppendLine("}");
		text.AppendLine();
	}

	private static void EmitStructs(StringBuilder text, Registry registry, HashSet<string> selectedTypes, Dictionary<string, ConstantDefinition> constants)
	{
		foreach (string item in selectedTypes.OrderBy<string, string>((string result) => result, StringComparer.Ordinal))
		{
			TypeDefinition typeDefinition = registry.GetDefinition(item) ?? throw new InvalidDataException("selected type missing: " + item);
			if (typeDefinition.Category == "struct" && typeDefinition.Alias != null)
			{
				typeDefinition = registry.GetDefinition(typeDefinition.Alias) ?? throw new InvalidDataException("aliased Vulkan struct definition missing: " + typeDefinition.Alias);
			}
			string category = typeDefinition.Category;
			if (category == "union")
			{
				EmitUnion(text, item, typeDefinition, registry, selectedTypes, constants);
				continue;
			}
			if (category != "struct")
			{
				continue;
			}
			text.AppendLine("@StructLayout(LayoutKind.Sequential)");
			text.Append("unsafe struct ").Append(item).AppendLine(" {");
			foreach (XElement item2 in typeDefinition.Element.Elements("member").Where(Program.SupportsVulkan))
			{
				FieldDefinition fieldDefinition = ParseField(item2);
				string value = EscapeIdentifier(fieldDefinition.Name);
				if (fieldDefinition.ArrayExpression != null)
				{
					long num = ResolveArrayLength(fieldDefinition.ArrayExpression, constants);
					string text2 = RenderType(fieldDefinition.Type with
					{
						PointerDepth = 0,
						ArrayExpression = null
					}, registry, selectedTypes, pointerAsNativeInt: false, callbackAlias: false);
					if (IsFixedBufferElement(text2))
					{
						text.Append("    fixed ").Append(value).Append(" [")
							.Append(num.ToString(CultureInfo.InvariantCulture))
							.Append(']')
							.Append(text2)
							.AppendLine();
					}
					else if (fieldDefinition.Type.PointerDepth == 0 && registry.GetDefinition(fieldDefinition.Type.Name)?.Category == "struct")
					{
						for (long index = 0; index < num; index++)
						{
							text.Append("    var ").Append(value).Append('_')
								.Append(index.ToString(CultureInfo.InvariantCulture))
								.Append(' ').Append(text2).AppendLine();
						}
					}
					else
					{
						throw new InvalidDataException($"unsupported fixed-buffer element type {text2} in {item}.{fieldDefinition.Name}");
					}
				}
				else
				{
					text.Append("    var ").Append(value).Append(' ')
						.Append(RenderType(fieldDefinition.Type, registry, selectedTypes, pointerAsNativeInt: false, callbackAlias: false))
						.AppendLine();
				}
			}
			text.AppendLine("}");
			text.AppendLine();
		}
	}

	private static void EmitUnion(StringBuilder text, string name, TypeDefinition definition, Registry registry, HashSet<string> selectedTypes, Dictionary<string, ConstantDefinition> constants)
	{
		long size = name switch
		{
			"VkClearColorValue" => 16L,
			"VkClearValue" => 16L,
			_ => throw new InvalidDataException("unsupported union ABI: " + name)
		};
		List<FieldDefinition> fields = definition.Element.Elements("member").Where(Program.SupportsVulkan).Select(ParseField).ToList();
		foreach (FieldDefinition field in fields.Where(value => value.ArrayExpression != null))
		{
			long length = ResolveArrayLength(field.ArrayExpression!, constants);
			string elementType = RenderType(field.Type with { PointerDepth = 0, ArrayExpression = null }, registry, selectedTypes, pointerAsNativeInt: false, callbackAlias: false);
			if (!IsFixedBufferElement(elementType))
			{
				throw new InvalidDataException($"unsupported fixed-buffer element type {elementType} in {name}.{field.Name}");
			}
			string helperName = name + "_" + EscapeIdentifier(field.Name) + "Array";
			text.AppendLine("@StructLayout(LayoutKind.Sequential)");
			text.Append("unsafe struct ").Append(helperName).AppendLine(" {");
			text.Append("    fixed values [").Append(length.ToString(CultureInfo.InvariantCulture)).Append(']')
				.Append(elementType).AppendLine();
			text.AppendLine("}");
			text.AppendLine();
		}
		text.Append("@StructLayout(LayoutKind.Explicit, Size: ").Append(size.ToString(CultureInfo.InvariantCulture)).AppendLine(")");
		text.Append("unsafe struct ").Append(name).AppendLine(" {");
		foreach (FieldDefinition field in fields)
		{
			string fieldName = EscapeIdentifier(field.Name);
			if (field.ArrayExpression != null)
			{
				string helperName = name + "_" + fieldName + "Array";
				text.Append("    @FieldOffset(0) var ").Append(fieldName).Append(' ').Append(helperName).AppendLine();
			}
			else
			{
				text.Append("    @FieldOffset(0) var ").Append(fieldName).Append(' ')
					.Append(RenderType(field.Type, registry, selectedTypes, pointerAsNativeInt: false, callbackAlias: false))
					.AppendLine();
			}
		}
		text.AppendLine("}");
		text.AppendLine();
	}

	private static bool SupportsVulkan(XElement element)
	{
		string? api = element.Attribute("api")?.Value;
		return string.IsNullOrEmpty(api) || api.Split(',').Contains("vulkan", StringComparer.Ordinal) || api.Split(',').Contains("vulkanbase", StringComparer.Ordinal);
	}

	private static bool IsFixedBufferElement(string typeName)
	{
		switch (typeName)
		{
		case "char":
		case "int8":
		case "int64":
		case "uint8":
		case "int16":
		case "int32":
		case "uint16":
		case "uint32":
		case "uint64":
		case "float32":
		case "float64":
			return true;
		default:
			return false;
		}
	}

	private static long ResolveArrayLength(string expression, Dictionary<string, ConstantDefinition> constants)
	{
		string text = expression.Trim();
		if (constants.TryGetValue(text, out ConstantDefinition value))
		{
			text = RenderConstantValue(value, constants);
		}
		if (!TryParseInteger(text, out var result) || result == 0L || result > long.MaxValue)
		{
			throw new InvalidDataException("unsupported fixed-array length: " + expression);
		}
		return (long)result;
	}

	private static void EmitDispatch(StringBuilder text, Registry registry, IReadOnlyList<string> commandNames, string dispatchName)
	{
		text.AppendLine("@StructLayout(LayoutKind.Sequential)");
		text.Append("unsafe struct ").Append(dispatchName).AppendLine(" {");
		foreach (string commandName in commandNames)
		{
			CommandDefinition function = registry.Commands[commandName];
			text.Append("    var ").Append(commandName).Append(' ')
				.Append(RenderFunctionPointer(function, registry, null, callbackAlias: false))
				.AppendLine();
		}
		text.AppendLine("}");
	}

	private static string RenderFunctionPointer(FunctionDefinition function, Registry registry, HashSet<string>? selectedTypes, bool callbackAlias)
	{
		string[] value = function.Parameters.Select((ParameterDefinition parameter) => RenderType(parameter.Type, registry, selectedTypes, callbackAlias, callbackAlias)).ToArray();
		string text = RenderType(function.ReturnType, registry, selectedTypes, callbackAlias, callbackAlias);
		return "unmanaged[Cdecl] (" + string.Join(", ", value) + ") -> " + text;
	}

	private static string RenderType(TypeSpec type, Registry registry, HashSet<string>? selectedTypes, bool pointerAsNativeInt, bool callbackAlias)
	{
		TypeDefinition definition = registry.GetDefinition(type.Name);
		if (type.PointerDepth == 0 && definition?.Category == "funcpointer")
		{
			return RenderFunctionPointer(ParseFunctionPointer(definition.Element), registry, selectedTypes, callbackAlias: true);
		}
		string text = MapPrimitive(type.Name);
		if (text == null)
		{
			text = ((selectedTypes != null && !selectedTypes.Contains(type.Name) && registry.GetDefinition(type.Name) == null) ? "nint" : type.Name);
		}
		if (type.PointerDepth == 0)
		{
			return text;
		}
		if (!callbackAlias && type.PointerDepth == 2 && string.Equals(type.Name, "void", StringComparison.Ordinal))
		{
			return "*void";
		}
		if (pointerAsNativeInt || callbackAlias)
		{
			return "nint";
		}
		return string.Concat(string.Concat(Enumerable.Repeat("*", type.PointerDepth)), text);
	}

	private static string? MapPrimitive(string name)
	{
		return name switch
		{
			"void" => "void",
			"char" => "int8",
			"signed char" => "int8",
			"unsigned char" => "uint8",
			"int8_t" => "int8",
			"uint8_t" => "uint8",
			"int16_t" => "int16",
			"uint16_t" => "uint16",
			"int32_t" => "int32",
			"uint32_t" => "uint32",
			"int64_t" => "int64",
			"uint64_t" => "uint64",
			"size_t" => "nuint",
			"float" => "float32",
			"double" => "float64",
			_ => null,
		};
	}

	private static bool IsPrimitive(string name)
	{
		return MapPrimitive(name) != null;
	}

	private static string EnumUnderlying(string name)
	{
		if (!name.Contains("FlagBits2", StringComparison.Ordinal) && !name.EndsWith("Flags2", StringComparison.Ordinal))
		{
			return "int32";
		}
		return "uint64";
	}

	private static string RenderConstantValue(ConstantDefinition constant, Dictionary<string, ConstantDefinition> constants)
	{
		if (constant.Alias != null)
		{
			return constant.Alias;
		}
		string text = constant.Value?.Trim();
		if (text == null && constant.BitPosition != null)
		{
			int num = int.Parse(constant.BitPosition, CultureInfo.InvariantCulture);
			text = ((ulong)(1L << num)).ToString(CultureInfo.InvariantCulture);
		}
		if (text == null && constant.Offset != null && constant.ExtensionNumber != null)
		{
			long num2 = long.Parse(constant.Offset, CultureInfo.InvariantCulture);
			long num3 = long.Parse(constant.ExtensionNumber, CultureInfo.InvariantCulture);
			long num4 = 1000000000 + (num3 - 1) * 1000 + num2;
			if (string.Equals(constant.Direction, "-", StringComparison.Ordinal))
			{
				num4 = -num4;
			}
			text = num4.ToString(CultureInfo.InvariantCulture);
		}
		if (text == null)
		{
			throw new InvalidDataException("constant has no value: " + constant.Name);
		}
		if (text.Length >= 2 && text[0] == '"')
		{
			string text2 = text;
			if (text2[text2.Length - 1] == '"')
			{
				string text3 = text;
				return EscapeString(text3.Substring(1, text3.Length - 1 - 1));
			}
		}
		if (TryParseApiVersion(text, out var result))
		{
			return FormatInteger(result, constant.TypeName);
		}
		string text4 = InferLiteralType(constant);
		if (TryParseComplement(text, text4, out var result2))
		{
			return FormatInteger(result2, text4);
		}
		if (TryParseInteger(text, out var result3))
		{
			return FormatInteger(result3, text4);
		}
		if (IsIdentifier(text) && constants.ContainsKey(text))
		{
			return text;
		}
		if (text4 == "float32" && TryParseFloat(text, out string result4))
		{
			return result4;
		}
		throw new InvalidDataException("unsupported Vulkan constant expression: " + constant.Name + " = " + text);
	}

	private static string InferLiteralType(ConstantDefinition constant)
	{
		bool flag;
		switch (constant.TypeName)
		{
		case "uint32":
		case "uint64":
		case "int32":
		case "int64":
		case "float32":
		case "float64":
			flag = true;
			break;
		default:
			flag = false;
			break;
		}
		if (flag)
		{
			return constant.TypeName;
		}
		if (string.Equals(constant.GroupType, "bitmask", StringComparison.Ordinal))
		{
			return EnumUnderlying(constant.GroupName ?? string.Empty);
		}
		return "int32";
	}

	private static string EscapeString(string value)
	{
		return "\"" + value.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("\"", "\\\"", StringComparison.Ordinal) + "\"";
	}

	private static bool TryParseApiVersion(string value, out ulong result)
	{
		Match match = Regex.Match(value, "VK_MAKE_API_VERSION\\s*\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*\\)", RegexOptions.CultureInvariant);
		if (!match.Success)
		{
			result = 0uL;
			return false;
		}
		ulong num = ulong.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
		ulong num2 = ulong.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture);
		ulong num3 = ulong.Parse(match.Groups[3].Value, CultureInfo.InvariantCulture);
		ulong num4 = ulong.Parse(match.Groups[4].Value, CultureInfo.InvariantCulture);
		result = (num << 29) | (num2 << 22) | (num3 << 12) | num4;
		return true;
	}

	private static bool TryParseComplement(string value, string typeName, out ulong result)
	{
		Match match = Regex.Match(value, "^\\(\\s*~\\s*(\\d+)\\s*(?:U|u|ULL|ull|UL|ul|L|l)?\\s*\\)$", RegexOptions.CultureInvariant);
		if (!match.Success)
		{
			result = 0uL;
			return false;
		}
		ulong num = ulong.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
		result = ((typeName == "uint64") ? (ulong.MaxValue - num) : ((uint)(-1 - (int)num)));
		return true;
	}

	private static bool TryParseInteger(string value, out ulong result)
	{
		string text = value.Trim();
		while (true)
		{
			bool flag = text.Length > 0;
			if (flag)
			{
				string text2 = text;
				bool flag2;
				switch (text2[text2.Length - 1])
				{
				case 'L':
				case 'U':
				case 'l':
				case 'u':
					flag2 = true;
					break;
				default:
					flag2 = false;
					break;
				}
				flag = flag2;
			}
			if (!flag)
			{
				break;
			}
			string text3 = text;
			text = text3.Substring(0, text3.Length - 1);
		}
		if (text.StartsWith("0x", StringComparison.OrdinalIgnoreCase))
		{
			string text3 = text;
			return ulong.TryParse(text3.Substring(2, text3.Length - 2), NumberStyles.AllowHexSpecifier, CultureInfo.InvariantCulture, out result);
		}
		if (long.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out var result2))
		{
			result = (ulong)result2;
			return true;
		}
		result = 0uL;
		return false;
	}

	private static bool TryParseFloat(string value, out string result)
	{
		string text = value.Trim();
		if (!text.EndsWith('F') && !text.EndsWith('f'))
		{
			text += "F";
		}
		if (float.TryParse(text.TrimEnd(new char[2] { 'F', 'f' }), NumberStyles.Float, CultureInfo.InvariantCulture, out var _))
		{
			result = text.Replace('f', 'F');
			return true;
		}
		result = string.Empty;
		return false;
	}

	private static string FormatInteger(ulong value, string typeName)
	{
		switch (typeName)
		{
		case "uint32":
			return value.ToString(CultureInfo.InvariantCulture) + "u";
		case "uint64":
			return (value == ulong.MaxValue) ? "uint64.MaxValue" : (value.ToString(CultureInfo.InvariantCulture) + "L");
		case "int32":
			return ((int)value).ToString(CultureInfo.InvariantCulture);
		case "int64":
		{
			long num = (long)value;
			return num.ToString(CultureInfo.InvariantCulture) + "L";
		}
		default:
			return value.ToString(CultureInfo.InvariantCulture);
		}
	}

	private static bool IsIdentifier(string value)
	{
		if (value.Length == 0 || (!char.IsLetter(value[0]) && value[0] != '_'))
		{
			return false;
		}
		return value.Skip(1).All((char character) => char.IsLetterOrDigit(character) || character == '_');
	}

	private static string EscapeIdentifier(string name)
	{
		if (!GsharpKeywordSet.Contains(name))
		{
			return name;
		}
		return "_" + name;
	}

	private static TypeSpec ParseType(XElement element)
	{
		XElement xElement = element.Element("type") ?? throw new InvalidDataException($"declaration has no type: {element}");
		XElement xElement2 = element.Element("name");
		int pointerDepth = CountPointerStars(element, xElement, xElement2);
		return new TypeSpec(xElement.Value.Trim(), pointerDepth, null, xElement2?.Value ?? string.Empty);
	}

	private static FieldDefinition ParseField(XElement element)
	{
		XElement xElement = element.Element("type") ?? throw new InvalidDataException("member has no type");
		XElement xElement2 = element.Element("name") ?? throw new InvalidDataException("member has no name");
		int pointerDepth = CountPointerStars(element, xElement, xElement2);
		string arrayExpression = ReadArrayExpression(xElement2);
		return new FieldDefinition(xElement2.Value.Trim(), new TypeSpec(xElement.Value.Trim(), pointerDepth, arrayExpression, xElement2.Value.Trim()), arrayExpression);
	}

	private static FunctionDefinition ParseFunctionPointer(XElement element)
	{
		TypeSpec returnType = ParseType(element.Element("proto") ?? throw new InvalidDataException("function pointer has no proto"));
		List<ParameterDefinition> parameters = element.Elements("param").Where(SupportsVulkan).Select(ParseParameter).ToList();
		return new FunctionDefinition(returnType, parameters);
	}

	private static CommandDefinition ParseCommand(XElement element)
	{
		XElement? obj = element.Element("proto") ?? throw new InvalidDataException("command has no proto");
		string name = obj.Element("name")?.Value.Trim() ?? throw new InvalidDataException("command has no name");
		TypeSpec returnType = ParseType(obj);
		List<ParameterDefinition> parameters = element.Elements("param").Where(SupportsVulkan).Select(ParseParameter).ToList();
		return new CommandDefinition(name, returnType, parameters);
	}

	private static ParameterDefinition ParseParameter(XElement element)
	{
		XElement xElement = element.Element("type") ?? throw new InvalidDataException("parameter has no type");
		XElement xElement2 = element.Element("name") ?? throw new InvalidDataException("parameter has no name");
		int pointerDepth = CountPointerStars(element, xElement, xElement2);
		return new ParameterDefinition(xElement2.Value.Trim(), new TypeSpec(xElement.Value.Trim(), pointerDepth, null, xElement2.Value.Trim()));
	}

	private static int CountPointerStars(XElement element, XElement typeElement, XElement? nameElement)
	{
		int num = 0;
		bool flag = false;
		foreach (XNode item in element.Nodes())
		{
			if (item == typeElement)
			{
				flag = true;
			}
			else
			{
				if (!flag)
				{
					continue;
				}
				if (nameElement != null && item == nameElement)
				{
					break;
				}
				if (item is XText xText)
				{
					num += xText.Value.Count((char character) => character == '*');
				}
			}
		}
		return num;
	}

	private static string? ReadArrayExpression(XElement nameElement)
	{
		StringBuilder stringBuilder = new StringBuilder();
		foreach (XNode item in nameElement.NodesAfterSelf())
		{
			if (item is XElement xElement && xElement.Name.LocalName == "comment")
			{
				break;
			}
			if (item is XText xText)
			{
				stringBuilder.Append(xText.Value);
			}
			else if (item is XElement xElement2)
			{
				stringBuilder.Append(xElement2.Value);
			}
		}
		Match match = Regex.Match(stringBuilder.ToString(), "\\[\\s*(.*?)\\s*\\]", RegexOptions.CultureInvariant);
		if (!match.Success)
		{
			return null;
		}
		return match.Groups[1].Value;
	}
}
