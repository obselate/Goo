using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;

internal static class Program
{
    private const string ShaderDirectory = "proofs/Goo.VulkanProof/Shaders";
    private const string GeneratedDirectory = "proofs/Goo.VulkanProof/Generated/Shaders";
    private const string InputManifestName = "shader-manifest.json";
    private const string CompilerVersionMarker = "1:";

    private sealed class Manifest
    {
        [JsonPropertyName("schema")]
        public int Schema { get; set; }

        [JsonPropertyName("toolchain")]
        public Toolchain Toolchain { get; set; } = new();

        [JsonPropertyName("target")]
        public Target Target { get; set; } = new();

        [JsonPropertyName("compileFlags")]
        public List<string> CompileFlags { get; set; } = new();

        [JsonPropertyName("shaders")]
        public List<Shader> Shaders { get; set; } = new();

        [JsonPropertyName("pipelines")]
        public List<Pipeline> Pipelines { get; set; } = new();
    }

    private sealed class Toolchain
    {
        [JsonPropertyName("sdk")]
        public string Sdk { get; set; } = string.Empty;

        [JsonPropertyName("compiler")]
        public Tool Compiler { get; set; } = new();

        [JsonPropertyName("validator")]
        public Tool Validator { get; set; } = new();

        [JsonPropertyName("dependencies")]
        public List<Dependency> Dependencies { get; set; } = new();

        [JsonPropertyName("archives")]
        public List<Archive> Archives { get; set; } = new();

        [JsonPropertyName("registry")]
        public Registry Registry { get; set; } = new();
    }

    private sealed class Tool
    {
        [JsonPropertyName("project")]
        public string Project { get; set; } = string.Empty;

        [JsonPropertyName("version")]
        public string Version { get; set; } = string.Empty;

        [JsonPropertyName("commit")]
        public string Commit { get; set; } = string.Empty;

        [JsonPropertyName("executable")]
        public string Executable { get; set; } = string.Empty;
    }

    private sealed class Dependency
    {
        [JsonPropertyName("project")]
        public string Project { get; set; } = string.Empty;

        [JsonPropertyName("version")]
        public string Version { get; set; } = string.Empty;

        [JsonPropertyName("commit")]
        public string Commit { get; set; } = string.Empty;
    }

    private sealed class Archive
    {
        [JsonPropertyName("rid")]
        public string Rid { get; set; } = string.Empty;

        [JsonPropertyName("file")]
        public string File { get; set; } = string.Empty;

        [JsonPropertyName("url")]
        public string Url { get; set; } = string.Empty;

        [JsonPropertyName("sha256")]
        public string Sha256 { get; set; } = string.Empty;
    }

    private sealed class Registry
    {
        [JsonPropertyName("project")]
        public string Project { get; set; } = string.Empty;

        [JsonPropertyName("version")]
        public string Version { get; set; } = string.Empty;

        [JsonPropertyName("commit")]
        public string Commit { get; set; } = string.Empty;

        [JsonPropertyName("vkXmlSha256")]
        public string VkXmlSha256 { get; set; } = string.Empty;
    }

    private sealed class Target
    {
        [JsonPropertyName("language")]
        public string Language { get; set; } = string.Empty;

        [JsonPropertyName("glslVersion")]
        public string GlslVersion { get; set; } = string.Empty;

        [JsonPropertyName("vulkan")]
        public string Vulkan { get; set; } = string.Empty;

        [JsonPropertyName("spirv")]
        public string Spirv { get; set; } = string.Empty;
    }

    private sealed class Shader
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("stage")]
        public string Stage { get; set; } = string.Empty;

        [JsonPropertyName("source")]
        public string Source { get; set; } = string.Empty;

        [JsonPropertyName("output")]
        public string Output { get; set; } = string.Empty;

        [JsonPropertyName("entryPoint")]
        public string EntryPoint { get; set; } = string.Empty;

        [JsonPropertyName("sourceSha256")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? SourceSha256 { get; set; }

        [JsonPropertyName("outputSha256")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? OutputSha256 { get; set; }

        [JsonPropertyName("outputBytes")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public long? OutputBytes { get; set; }

        [JsonPropertyName("capabilities")]
        public List<uint> Capabilities { get; set; } = new();
    }

    private sealed class HostPacking
    {
        [JsonPropertyName("path")]
        public string Path { get; set; } = string.Empty;

        [JsonPropertyName("typeName")]
        public string TypeName { get; set; } = string.Empty;

        [JsonPropertyName("sha256")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Sha256 { get; set; }

        [JsonPropertyName("bytes")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public long? Bytes { get; set; }
    }

    private sealed class Pipeline
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("topology")]
        public string Topology { get; set; } = string.Empty;

        [JsonPropertyName("vertexInput")]
        public string VertexInput { get; set; } = string.Empty;

        [JsonPropertyName("pushConstants")]
        public PushConstants PushConstants { get; set; } = new();

        [JsonPropertyName("descriptorCount")]
        public int DescriptorCount { get; set; }

        [JsonPropertyName("descriptors")]
        public List<Descriptor> Descriptors { get; set; } = new();

        [JsonPropertyName("stages")]
        public List<PipelineStage> Stages { get; set; } = new();

        [JsonPropertyName("colorFormat")]
        public string ColorFormat { get; set; } = string.Empty;

        [JsonPropertyName("sampleCount")]
        public int SampleCount { get; set; }

        [JsonPropertyName("blend")]
        public string Blend { get; set; } = string.Empty;

        [JsonPropertyName("colorPacking")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ColorPacking { get; set; }

        [JsonPropertyName("depthStencil")]
        public string DepthStencil { get; set; } = string.Empty;

        [JsonPropertyName("cullMode")]
        public string CullMode { get; set; } = string.Empty;

        [JsonPropertyName("frontFace")]
        public string FrontFace { get; set; } = string.Empty;

        [JsonPropertyName("hostPacking")]
        public HostPacking HostPacking { get; set; } = new();
    }

    private sealed class Descriptor
    {
        [JsonPropertyName("set")]
        public int Set { get; set; }

        [JsonPropertyName("binding")]
        public int Binding { get; set; }

        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("count")]
        public int Count { get; set; }

        [JsonPropertyName("stages")]
        public List<string> Stages { get; set; } = new();
    }

    private sealed class PushConstants
    {
        [JsonPropertyName("offset")]
        public int Offset { get; set; }

        [JsonPropertyName("size")]
        public int Size { get; set; }

        [JsonPropertyName("stages")]
        public List<string> Stages { get; set; } = new();

        [JsonPropertyName("members")]
        public List<PushConstantMember> Members { get; set; } = new();
    }

    private sealed class PushConstantMember
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("offset")]
        public int Offset { get; set; }

        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;
    }

    private sealed class PipelineStage
    {
        [JsonPropertyName("shader")]
        public string Shader { get; set; } = string.Empty;

        [JsonPropertyName("stage")]
        public string Stage { get; set; } = string.Empty;

        [JsonPropertyName("entryPoint")]
        public string EntryPoint { get; set; } = string.Empty;

        [JsonPropertyName("inputs")]
        public List<InterfaceLocation> Inputs { get; set; } = new();

        [JsonPropertyName("outputs")]
        public List<InterfaceLocation> Outputs { get; set; } = new();
    }

    private sealed class InterfaceLocation
    {
        [JsonPropertyName("location")]
        public int Location { get; set; }

        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
    }

    private sealed class BuiltShader
    {
        public Shader Spec { get; }

        public string TemporaryOutput { get; }

        public byte[] Source { get; }

        public byte[] Output { get; }

        public SpirvModuleReflection Reflection { get; }

        public BuiltShader(Shader spec, string temporaryOutput, byte[] source, byte[] output, SpirvModuleReflection reflection)
        {
            Spec = spec;
            TemporaryOutput = temporaryOutput;
            Source = source;
            Output = output;
            Reflection = reflection;
        }
    }

    private sealed class HostPackingArtifact
    {
        public Pipeline Pipeline { get; }

        public byte[] Bytes { get; }

        public HostPackingArtifact(Pipeline pipeline, byte[] bytes)
        {
            Pipeline = pipeline;
            Bytes = bytes;
        }
    }

    private sealed class ToolResult
    {
        public int ExitCode { get; }

        public string StandardOutput { get; }

        public string StandardError { get; }

        public ToolResult(int exitCode, string standardOutput, string standardError)
        {
            ExitCode = exitCode;
            StandardOutput = standardOutput;
            StandardError = standardError;
        }
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Encoder = JavaScriptEncoder.Default,
        WriteIndented = true
    };

    private static int Main(string[] args)
    {
        try
        {
            if (args.Length != 1 || (args[0] != "generate" && args[0] != "check"))
            {
                Console.Error.WriteLine("Usage: Goo.ShaderGen generate|check");
                return 2;
            }

            return Execute(args[0]);
        }
        catch (Exception exception)
        {
            Console.Error.WriteLine(exception.Message);
            return 1;
        }
    }

    private static int Execute(string mode)
    {
        string repositoryRoot = FindRepositoryRoot();
        string shaderRoot = Path.Combine(repositoryRoot, ShaderDirectory.Replace('/', Path.DirectorySeparatorChar));
        string generatedRoot = Path.Combine(repositoryRoot, GeneratedDirectory.Replace('/', Path.DirectorySeparatorChar));
        string inputManifestPath = Path.Combine(shaderRoot, InputManifestName);
        string generatedManifestPath = Path.Combine(generatedRoot, InputManifestName);
        byte[] inputManifestBytes = File.ReadAllBytes(inputManifestPath);
        EnsureLf(inputManifestPath, inputManifestBytes);
        Manifest manifest = DeserializeManifest(inputManifestPath, inputManifestBytes);
        ValidateManifest(manifest);
        string canonicalInput = SerializeManifest(manifest);
        if (!inputManifestBytes.AsSpan().SequenceEqual(Encoding.UTF8.GetBytes(canonicalInput)))
        {
            throw new InvalidOperationException($"Manifest is not canonical: {inputManifestPath}");
        }

        string compilerPath = FindTool(manifest.Toolchain.Compiler.Executable);
        string validatorPath = FindTool(manifest.Toolchain.Validator.Executable);
        RequireCompilerVersion(compilerPath, manifest);
        RequireValidatorVersion(validatorPath, manifest);
        string temporaryRoot = Path.Combine(Path.GetTempPath(), "goo-shader-gen-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(temporaryRoot);
        try
        {
            List<BuiltShader> builtShaders = BuildShaders(manifest, shaderRoot, temporaryRoot, compilerPath, validatorPath);
            List<HostPackingArtifact> hostPackings = BuildHostPackings(manifest, builtShaders);
            string generatedManifest = BuildGeneratedManifest(manifest, builtShaders, hostPackings);
            byte[] generatedManifestBytes = Encoding.UTF8.GetBytes(generatedManifest);
            if (mode == "generate")
            {
                WriteGenerated(generatedRoot, builtShaders, hostPackings, generatedManifestBytes);
                Console.WriteLine($"Generated {builtShaders.Count} shaders and {generatedManifestPath}");
                return 0;
            }

            CheckGenerated(generatedRoot, generatedManifestPath, builtShaders, hostPackings, generatedManifestBytes, validatorPath);
            Console.WriteLine($"Checked {builtShaders.Count} shaders and {generatedManifestPath}");
            return 0;
        }
        finally
        {
            if (Directory.Exists(temporaryRoot))
            {
                Directory.Delete(temporaryRoot, true);
            }
        }
    }

    private static Manifest DeserializeManifest(string path, byte[] bytes)
    {
        Manifest? manifest = JsonSerializer.Deserialize<Manifest>(bytes, JsonOptions);
        return manifest ?? throw new InvalidOperationException($"Manifest is empty: {path}");
    }

    private static string SerializeManifest(Manifest manifest)
    {
        return JsonSerializer.Serialize(manifest, JsonOptions) + "\n";
    }

    private static string BuildGeneratedManifest(Manifest manifest, IReadOnlyList<BuiltShader> builtShaders, IReadOnlyList<HostPackingArtifact> hostPackings)
    {
        foreach (BuiltShader builtShader in builtShaders)
        {
            builtShader.Spec.SourceSha256 = HashBytes(builtShader.Source);
            builtShader.Spec.OutputSha256 = HashBytes(builtShader.Output);
            builtShader.Spec.OutputBytes = builtShader.Output.LongLength;
        }
        foreach (HostPackingArtifact hostPacking in hostPackings)
        {
            hostPacking.Pipeline.HostPacking.Sha256 = HashBytes(hostPacking.Bytes);
            hostPacking.Pipeline.HostPacking.Bytes = hostPacking.Bytes.LongLength;
        }
        return SerializeManifest(manifest);
    }

    private static List<BuiltShader> BuildShaders(Manifest manifest, string shaderRoot, string temporaryRoot, string compilerPath, string validatorPath)
    {
        List<BuiltShader> builtShaders = new();
        foreach (Shader shader in manifest.Shaders)
        {
            string sourcePath = ResolveChildPath(shaderRoot, shader.Source, "source");
            byte[] sourceBytes = File.ReadAllBytes(sourcePath);
            EnsureLf(sourcePath, sourceBytes);
            string temporaryOutput = Path.Combine(temporaryRoot, shader.Output);
            List<string> compilerArguments = new(manifest.CompileFlags)
            {
                $"-fshader-stage={shader.Stage}",
                "-o",
                temporaryOutput,
                sourcePath
            };
            ToolResult compilerResult = RunTool(compilerPath, compilerArguments);
            RequireSuccess(compilerPath, compilerResult);
            if (!File.Exists(temporaryOutput))
            {
                throw new InvalidOperationException($"Compiler produced no output: {shader.Id}");
            }
            ToolResult validatorResult = RunTool(validatorPath, new[] { "--target-env", "vulkan1.3", temporaryOutput });
            RequireSuccess(validatorPath, validatorResult);
            byte[] outputBytes = File.ReadAllBytes(temporaryOutput);
            SpirvModuleReflection reflection = SpirvReflection.Read(outputBytes);
            ValidateShaderReflection(manifest, shader, reflection);
            builtShaders.Add(new BuiltShader(shader, temporaryOutput, sourceBytes, outputBytes, reflection));
        }
        return builtShaders;
    }

    private static List<HostPackingArtifact> BuildHostPackings(Manifest manifest, IReadOnlyList<BuiltShader> builtShaders)
    {
        List<HostPackingArtifact> artifacts = new();
        foreach (Pipeline pipeline in manifest.Pipelines)
        {
            BuiltShader vertexShader = builtShaders.Single(value => value.Spec.Id == pipeline.Stages.Single(stage => stage.Stage == "vertex").Shader);
            SpirvPushConstant pushConstant = vertexShader.Reflection.PushConstant
                ?? throw new InvalidOperationException($"Vertex shader has no reflected push constants: {pipeline.Id}");
            PushConstants expected = pipeline.PushConstants;
            Require(pushConstant.Size == expected.Size, $"pipeline[{pipeline.Id}].hostPacking.size", expected.Size.ToString());
            StringBuilder text = new();
            AppendLf(text, "package Goo.Vulkan.Generated");
            AppendLf(text);
            AppendLf(text, "import System.Runtime.InteropServices");
            AppendLf(text);
            text.Append("@StructLayout(LayoutKind.Explicit, Size: ").Append(pushConstant.Size).Append(")\n");
            text.Append("unsafe struct ").Append(pipeline.HostPacking.TypeName).Append(" {\n");
            for (int index = 0; index < pushConstant.Members.Count; index++)
            {
                AppendHostMember(text, expected.Members[index].Name, pushConstant.Members[index]);
            }
            AppendLf(text, "}");
            artifacts.Add(new HostPackingArtifact(pipeline, Encoding.UTF8.GetBytes(text.ToString())));
        }
        return artifacts;
    }

    private static void AppendHostMember(StringBuilder text, string name, SpirvPushConstantMember member)
    {
        (string scalarType, string[] suffixes) = member.Type switch
        {
            "float" => ("float32", new[] { string.Empty }),
            "vec2" => ("float32", new[] { "_x", "_y" }),
            "vec3" => ("float32", new[] { "_x", "_y", "_z" }),
            "vec4" => ("float32", new[] { "_x", "_y", "_z", "_w" }),
            "int" => ("int32", new[] { string.Empty }),
            "ivec2" => ("int32", new[] { "_x", "_y" }),
            "ivec3" => ("int32", new[] { "_x", "_y", "_z" }),
            "ivec4" => ("int32", new[] { "_x", "_y", "_z", "_w" }),
            "uint" => ("uint32", new[] { string.Empty }),
            "uvec2" => ("uint32", new[] { "_x", "_y" }),
            "uvec3" => ("uint32", new[] { "_x", "_y", "_z" }),
            "uvec4" => ("uint32", new[] { "_x", "_y", "_z", "_w" }),
            _ => throw new InvalidOperationException($"Unsupported host push-constant type: {member.Type}")
        };
        for (int index = 0; index < suffixes.Length; index++)
        {
            text.Append("    @FieldOffset(").Append(member.Offset + index * 4).Append(") var ")
                .Append(name).Append(suffixes[index]).Append(' ').Append(scalarType).Append('\n');
        }
    }

    private static void AppendLf(StringBuilder text, string value = "")
    {
        text.Append(value).Append('\n');
    }

    private static void WriteGenerated(string generatedRoot, IReadOnlyList<BuiltShader> builtShaders, IReadOnlyList<HostPackingArtifact> hostPackings, byte[] generatedManifestBytes)
    {
        string parent = Directory.GetParent(generatedRoot)?.FullName
            ?? throw new InvalidOperationException($"Generated directory has no parent: {generatedRoot}");
        Directory.CreateDirectory(parent);
        string publicationRoot = generatedRoot + ".publish-" + Guid.NewGuid().ToString("N");
        string previousRoot = generatedRoot + ".previous-" + Guid.NewGuid().ToString("N");
        Directory.CreateDirectory(publicationRoot);
        try
        {
            foreach (BuiltShader builtShader in builtShaders)
            {
                string outputPath = ResolveChildPath(publicationRoot, builtShader.Spec.Output, "output");
                Directory.CreateDirectory(Path.GetDirectoryName(outputPath)!);
                File.WriteAllBytes(outputPath, builtShader.Output);
            }
            foreach (HostPackingArtifact hostPacking in hostPackings)
            {
                File.WriteAllBytes(ResolveChildPath(publicationRoot, hostPacking.Pipeline.HostPacking.Path, "host packing"), hostPacking.Bytes);
            }
            File.WriteAllBytes(Path.Combine(publicationRoot, InputManifestName), generatedManifestBytes);

            bool movedPrevious = false;
            if (Directory.Exists(generatedRoot))
            {
                Directory.Move(generatedRoot, previousRoot);
                movedPrevious = true;
            }
            try
            {
                Directory.Move(publicationRoot, generatedRoot);
            }
            catch
            {
                if (movedPrevious && !Directory.Exists(generatedRoot))
                {
                    Directory.Move(previousRoot, generatedRoot);
                }
                throw;
            }
            if (movedPrevious)
            {
                Directory.Delete(previousRoot, true);
            }
        }
        finally
        {
            if (Directory.Exists(publicationRoot))
            {
                Directory.Delete(publicationRoot, true);
            }
            if (Directory.Exists(previousRoot) && Directory.Exists(generatedRoot))
            {
                Directory.Delete(previousRoot, true);
            }
        }
    }

    private static void CheckGenerated(string generatedRoot, string generatedManifestPath, IReadOnlyList<BuiltShader> builtShaders, IReadOnlyList<HostPackingArtifact> hostPackings, byte[] generatedManifestBytes, string validatorPath)
    {
        if (!File.Exists(generatedManifestPath))
        {
            throw new InvalidOperationException($"Missing generated manifest: {generatedManifestPath}");
        }
        HashSet<string> expectedFiles = new(StringComparer.Ordinal)
        {
            InputManifestName
        };
        foreach (BuiltShader builtShader in builtShaders)
        {
            expectedFiles.Add(NormalizeRelativePath(builtShader.Spec.Output));
        }
        foreach (HostPackingArtifact hostPacking in hostPackings)
        {
            expectedFiles.Add(NormalizeRelativePath(hostPacking.Pipeline.HostPacking.Path));
        }
        if (!Directory.Exists(generatedRoot))
        {
            throw new InvalidOperationException($"Missing generated directory: {generatedRoot}");
        }
        foreach (string actualPath in Directory.EnumerateFiles(generatedRoot, "*", SearchOption.AllDirectories))
        {
            string relativePath = NormalizeRelativePath(Path.GetRelativePath(generatedRoot, actualPath));
            if (!expectedFiles.Contains(relativePath))
            {
                throw new InvalidOperationException($"Unexpected generated file: {actualPath}");
            }
        }
        byte[] checkedManifestBytes = File.ReadAllBytes(generatedManifestPath);
        EnsureLf(generatedManifestPath, checkedManifestBytes);
        if (!checkedManifestBytes.AsSpan().SequenceEqual(generatedManifestBytes))
        {
            throw new InvalidOperationException($"Generated manifest differs: {generatedManifestPath}");
        }
        foreach (HostPackingArtifact hostPacking in hostPackings)
        {
            string hostPackingPath = ResolveChildPath(generatedRoot, hostPacking.Pipeline.HostPacking.Path, "host packing");
            if (!File.Exists(hostPackingPath))
            {
                throw new InvalidOperationException($"Missing generated host packing: {hostPackingPath}");
            }
            byte[] checkedHostPackingBytes = File.ReadAllBytes(hostPackingPath);
            EnsureLf(hostPackingPath, checkedHostPackingBytes);
            if (!checkedHostPackingBytes.AsSpan().SequenceEqual(hostPacking.Bytes))
            {
                throw new InvalidOperationException($"Generated host packing differs: {hostPackingPath}");
            }
        }

        foreach (BuiltShader builtShader in builtShaders)
        {
            string outputPath = ResolveChildPath(generatedRoot, builtShader.Spec.Output, "output");
            if (!File.Exists(outputPath))
            {
                throw new InvalidOperationException($"Missing generated shader: {outputPath}");
            }
            byte[] checkedOutput = File.ReadAllBytes(outputPath);
            if (!checkedOutput.AsSpan().SequenceEqual(builtShader.Output))
            {
                throw new InvalidOperationException($"Generated shader differs: {outputPath}");
            }
            ToolResult validatorResult = RunTool(validatorPath, new[] { "--target-env", "vulkan1.3", outputPath });
            RequireSuccess(validatorPath, validatorResult);
        }
    }

    private static string NormalizeRelativePath(string path)
    {
        return path.Replace(Path.DirectorySeparatorChar, '/').Replace(Path.AltDirectorySeparatorChar, '/');
    }

    private static void ValidateManifest(Manifest manifest)
    {
        Require(manifest.Schema == 2, "schema", "2");
        Require(manifest.Toolchain.Sdk == "1.4.357.0", "toolchain.sdk", "1.4.357.0");
        RequireTool(manifest.Toolchain.Compiler, "google/shaderc", "2026.3", "ef2c68b4871a3c399a0808321b51379847a54673", "glslc", "toolchain.compiler");
        RequireTool(manifest.Toolchain.Validator, "KhronosGroup/SPIRV-Tools", "2026.3", "b707790a898e44038547df54580022fc1cf89c3d", "spirv-val", "toolchain.validator");
        Require(manifest.Target.Language == "glsl", "target.language", "glsl");
        Require(manifest.Target.GlslVersion == "450core", "target.glslVersion", "450core");
        Require(manifest.Target.Vulkan == "1.3", "target.vulkan", "1.3");
        Require(manifest.Target.Spirv == "1.6", "target.spirv", "1.6");
        RequireSequence(manifest.CompileFlags, new[] { "--target-env=vulkan1.3", "--target-spv=spv1.6", "-std=450core", "-O", "-Werror" }, "compileFlags");
        RequireDependency(manifest.Toolchain.Dependencies, "KhronosGroup/glslang", "16.4.0", "168d452a4f460d24b588fed08477a81c44ee27a1");
        RequireDependency(manifest.Toolchain.Dependencies, "KhronosGroup/SPIRV-Headers", "1.4.357.0", "29981f65241605e08b0ede4cfeb999fe3b723c6a");
        RequireArchive(manifest.Toolchain.Archives, "linux-x64", "vulkansdk-linux-x86_64-1.4.357.0.tar.xz", "https://sdk.lunarg.com/sdk/download/1.4.357.0/linux/vulkansdk-linux-x86_64-1.4.357.0.tar.xz", "0f09bf6a0625e346bf004be70b92907e934a4c76606b323441b2baf3a5a0e66d");
        RequireArchive(manifest.Toolchain.Archives, "win-x64", "vulkansdk-windows-X64-1.4.357.0.exe", "https://sdk.lunarg.com/sdk/download/1.4.357.0/windows/vulkansdk-windows-X64-1.4.357.0.exe", "81f474711e9042f4cd22b31b2f7a8870db2e428b21586fb43dd80150be97310d");
        Require(manifest.Toolchain.Registry.Project == "KhronosGroup/Vulkan-Headers", "toolchain.registry.project", "KhronosGroup/Vulkan-Headers");
        Require(manifest.Toolchain.Registry.Version == "1.4.357.0", "toolchain.registry.version", "1.4.357.0");
        Require(manifest.Toolchain.Registry.Commit == "e3b1eec08173d6b825cd3ac88c885a63b621504a1", "toolchain.registry.commit", "e3b1eec08173d6b825cd3ac88c885a63b621504a1");
        Require(manifest.Toolchain.Registry.VkXmlSha256 == "264d0d7350e37d70c82407fb430d085040fc01a9a961d43dec8c2d6ed1dfd183", "toolchain.registry.vkXmlSha256", "264d0d7350e37d70c82407fb430d085040fc01a9a961d43dec8c2d6ed1dfd183");
        if (manifest.Shaders.Count != 7)
        {
            throw new InvalidOperationException("shaders must contain exactly seven entries");
        }
        RequireShader(manifest.Shaders[0], "solid_quad_vertex", "vertex", "solid_quad.vert.glsl", "solid_quad.vert.spv");
        RequireShader(manifest.Shaders[1], "solid_quad_fragment", "fragment", "solid_quad.frag.glsl", "solid_quad.frag.spv");
        RequireShader(manifest.Shaders[2], "analytic_vertex", "vertex", "analytic.vert.glsl", "analytic.vert.spv");
        RequireShader(manifest.Shaders[3], "analytic_solid_fragment", "fragment", "analytic_solid.frag.glsl", "analytic_solid.frag.spv");
        RequireShader(manifest.Shaders[4], "analytic_linear3_fragment", "fragment", "analytic_linear3.frag.glsl", "analytic_linear3.frag.spv");
        RequireShader(manifest.Shaders[5], "analytic_radial3_fragment", "fragment", "analytic_radial3.frag.glsl", "analytic_radial3.frag.spv");
        RequireShader(manifest.Shaders[6], "analytic_sampled_image_fragment", "fragment", "analytic_sampled_image.frag.glsl", "analytic_sampled_image.frag.spv");
        foreach (Shader shader in manifest.Shaders)
        {
            if (shader.SourceSha256 is not null || shader.OutputSha256 is not null || shader.OutputBytes is not null)
            {
                throw new InvalidOperationException($"Source manifest contains generated hashes: {shader.Id}");
            }
        }
        if (manifest.Pipelines.Count != 5)
        {
            throw new InvalidOperationException("pipelines must contain exactly five entries");
        }
        RequirePipeline(manifest.Pipelines[0], "solid_quad", "SolidQuadPushConstants.Generated.gs", "SolidQuadPushConstants", 32, new[]
        {
            new PushConstantMember { Name = "rect", Offset = 0, Type = "vec4" },
            new PushConstantMember { Name = "color", Offset = 16, Type = "vec4" }
        }, new[] { "vertex" }, "disabled", null, "solid_quad_vertex", "solid_quad_fragment", "vec4", "color", Array.Empty<Descriptor>());
        RequirePipeline(manifest.Pipelines[1], "analytic_solid", "AnalyticSolidPushConstants.Generated.gs", "AnalyticSolidPushConstants", 112, new[]
        {
            new PushConstantMember { Name = "rect", Offset = 0, Type = "vec4" },
            new PushConstantMember { Name = "transform0", Offset = 16, Type = "vec4" },
            new PushConstantMember { Name = "transform1", Offset = 32, Type = "vec4" },
            new PushConstantMember { Name = "radii", Offset = 48, Type = "vec4" },
            new PushConstantMember { Name = "params", Offset = 64, Type = "vec4" },
            new PushConstantMember { Name = "stopPositions", Offset = 80, Type = "vec4" },
            new PushConstantMember { Name = "packedColors", Offset = 96, Type = "uvec4" }
        }, new[] { "vertex", "fragment" }, "source-over-premultiplied-linear", "rgb11-11-10-alpha10-premultiplied-linear", "analytic_vertex", "analytic_solid_fragment", "vec2", "uv", Array.Empty<Descriptor>());
        RequirePipeline(manifest.Pipelines[2], "analytic_linear3", "AnalyticLinear3PushConstants.Generated.gs", "AnalyticLinear3PushConstants", 112, new[]
        {
            new PushConstantMember { Name = "rect", Offset = 0, Type = "vec4" },
            new PushConstantMember { Name = "transform0", Offset = 16, Type = "vec4" },
            new PushConstantMember { Name = "transform1", Offset = 32, Type = "vec4" },
            new PushConstantMember { Name = "radii", Offset = 48, Type = "vec4" },
            new PushConstantMember { Name = "params", Offset = 64, Type = "vec4" },
            new PushConstantMember { Name = "stopPositions", Offset = 80, Type = "vec4" },
            new PushConstantMember { Name = "packedColors", Offset = 96, Type = "uvec4" }
        }, new[] { "vertex", "fragment" }, "source-over-premultiplied-linear", "rgb11-11-10-alpha10-premultiplied-linear", "analytic_vertex", "analytic_linear3_fragment", "vec2", "uv", Array.Empty<Descriptor>());
        RequirePipeline(manifest.Pipelines[3], "analytic_radial3", "AnalyticRadial3PushConstants.Generated.gs", "AnalyticRadial3PushConstants", 112, new[]
        {
            new PushConstantMember { Name = "rect", Offset = 0, Type = "vec4" },
            new PushConstantMember { Name = "transform0", Offset = 16, Type = "vec4" },
            new PushConstantMember { Name = "transform1", Offset = 32, Type = "vec4" },
            new PushConstantMember { Name = "radii", Offset = 48, Type = "vec4" },
            new PushConstantMember { Name = "params", Offset = 64, Type = "vec4" },
            new PushConstantMember { Name = "stopPositions", Offset = 80, Type = "vec4" },
            new PushConstantMember { Name = "packedColors", Offset = 96, Type = "uvec4" }
        }, new[] { "vertex", "fragment" }, "source-over-premultiplied-linear", "rgb11-11-10-alpha10-premultiplied-linear", "analytic_vertex", "analytic_radial3_fragment", "vec2", "uv", Array.Empty<Descriptor>());
        RequirePipeline(manifest.Pipelines[4], "analytic_sampled_image", "SampledImagePushConstants.Generated.gs", "SampledImagePushConstants", 112, new[]
        {
            new PushConstantMember { Name = "rect", Offset = 0, Type = "vec4" },
            new PushConstantMember { Name = "transform0", Offset = 16, Type = "vec4" },
            new PushConstantMember { Name = "transform1", Offset = 32, Type = "vec4" },
            new PushConstantMember { Name = "radii", Offset = 48, Type = "vec4" },
            new PushConstantMember { Name = "params", Offset = 64, Type = "vec4" },
            new PushConstantMember { Name = "stopPositions", Offset = 80, Type = "vec4" },
            new PushConstantMember { Name = "packedColors", Offset = 96, Type = "uvec4" }
        }, new[] { "vertex", "fragment" }, "source-over-premultiplied-linear", "straight-srgb-rgba8-sampled-to-premultiplied-linear", "analytic_vertex", "analytic_sampled_image_fragment", "vec2", "uv", new[]
        {
            new Descriptor { Set = 0, Binding = 0, Type = "combined-image-sampler", Count = 1, Stages = new List<string> { "fragment" } }
        });
    }

    private static void RequirePipeline(Pipeline pipeline, string id, string hostPackingPath, string hostPackingTypeName, int pushConstantSize, IReadOnlyList<PushConstantMember> members, IReadOnlyList<string> pushStages, string blend, string? colorPacking, string vertexShader, string fragmentShader, string interfaceType, string interfaceName, IReadOnlyList<Descriptor> descriptors)
    {
        Require(pipeline.Id == id, $"pipeline[{id}].id", id);
        Require(pipeline.Topology == "triangle-list", $"pipeline[{id}].topology", "triangle-list");
        Require(pipeline.VertexInput == "none", $"pipeline[{id}].vertexInput", "none");
        Require(pipeline.DescriptorCount == descriptors.Count, $"pipeline[{id}].descriptorCount", descriptors.Count.ToString());
        RequireDescriptors(pipeline.Descriptors, descriptors, $"pipeline[{id}].descriptors");
        Require(pipeline.ColorFormat == "swapchain-sRGB", $"pipeline[{id}].colorFormat", "swapchain-sRGB");
        Require(pipeline.SampleCount == 1, $"pipeline[{id}].sampleCount", "1");
        Require(pipeline.Blend == blend, $"pipeline[{id}].blend", blend);
        if (colorPacking is null)
        {
            if (pipeline.ColorPacking is not null)
            {
                throw new InvalidOperationException($"Unexpected color packing metadata: {id}");
            }
        }
        else
        {
            Require(pipeline.ColorPacking == colorPacking, $"pipeline[{id}].colorPacking", colorPacking);
        }
        Require(pipeline.DepthStencil == "disabled", $"pipeline[{id}].depthStencil", "disabled");
        Require(pipeline.CullMode == "none", $"pipeline[{id}].cullMode", "none");
        Require(pipeline.FrontFace == "counter-clockwise", $"pipeline[{id}].frontFace", "counter-clockwise");
        Require(pipeline.HostPacking.Path == hostPackingPath, $"pipeline[{id}].hostPacking.path", hostPackingPath);
        Require(pipeline.HostPacking.TypeName == hostPackingTypeName, $"pipeline[{id}].hostPacking.typeName", hostPackingTypeName);
        if (pipeline.HostPacking.Path.Contains('/') || pipeline.HostPacking.Path.Contains('\\'))
        {
            throw new InvalidOperationException($"Host packing paths must be file names: {id}");
        }
        if (pipeline.HostPacking.Sha256 is not null || pipeline.HostPacking.Bytes is not null)
        {
            throw new InvalidOperationException($"Source manifest contains generated host packing metadata: {id}");
        }
        Require(pipeline.PushConstants.Offset == 0, $"pipeline[{id}].pushConstants.offset", "0");
        Require(pipeline.PushConstants.Size == pushConstantSize, $"pipeline[{id}].pushConstants.size", pushConstantSize.ToString());
        RequireSequence(pipeline.PushConstants.Stages, pushStages, $"pipeline[{id}].pushConstants.stages");
        if (pipeline.PushConstants.Members.Count != members.Count)
        {
            throw new InvalidOperationException($"pipeline[{id}].pushConstants.members must contain exactly {members.Count} entries");
        }
        for (int index = 0; index < members.Count; index++)
        {
            RequireMember(pipeline.PushConstants.Members[index], members[index].Name, members[index].Offset, members[index].Type);
        }
        if (pipeline.Stages.Count != 2)
        {
            throw new InvalidOperationException($"pipeline[{id}].stages must contain exactly two entries");
        }
        RequirePipelineStage(pipeline.Stages[0], vertexShader, "vertex", Array.Empty<InterfaceLocation>(), new[] { new InterfaceLocation { Location = 0, Type = interfaceType, Name = interfaceName } });
        RequirePipelineStage(pipeline.Stages[1], fragmentShader, "fragment", new[] { new InterfaceLocation { Location = 0, Type = interfaceType, Name = interfaceName } }, new[] { new InterfaceLocation { Location = 0, Type = "vec4", Name = "outColor" } });
    }

    private static void RequireDescriptors(IReadOnlyList<Descriptor> actual, IReadOnlyList<Descriptor> expected, string path)
    {
        if (actual.Count != expected.Count)
        {
            throw new InvalidOperationException($"{path} count must be {expected.Count}");
        }
        for (int index = 0; index < expected.Count; index++)
        {
            Descriptor actualDescriptor = actual[index];
            Descriptor expectedDescriptor = expected[index];
            Require(actualDescriptor.Set == expectedDescriptor.Set, $"{path}[{index}].set", expectedDescriptor.Set.ToString());
            Require(actualDescriptor.Binding == expectedDescriptor.Binding, $"{path}[{index}].binding", expectedDescriptor.Binding.ToString());
            Require(actualDescriptor.Type == expectedDescriptor.Type, $"{path}[{index}].type", expectedDescriptor.Type);
            Require(actualDescriptor.Count == expectedDescriptor.Count, $"{path}[{index}].count", expectedDescriptor.Count.ToString());
            RequireSequence(actualDescriptor.Stages, expectedDescriptor.Stages, $"{path}[{index}].stages");
        }
    }

    private static void RequireTool(Tool tool, string project, string version, string commit, string executable, string path)
    {
        Require(tool.Project == project, path + ".project", project);
        Require(tool.Version == version, path + ".version", version);
        Require(tool.Commit == commit, path + ".commit", commit);
        Require(tool.Executable == executable, path + ".executable", executable);
    }

    private static void RequireDependency(IReadOnlyList<Dependency> dependencies, string project, string version, string commit)
    {
        Dependency? dependency = dependencies.FirstOrDefault(candidate => candidate.Project == project);
        if (dependency is null)
        {
            throw new InvalidOperationException($"Missing dependency: {project}");
        }
        Require(dependency.Version == version, $"dependency[{project}].version", version);
        Require(dependency.Commit == commit, $"dependency[{project}].commit", commit);
    }

    private static void RequireArchive(IReadOnlyList<Archive> archives, string rid, string file, string url, string sha256)
    {
        Archive? archive = archives.FirstOrDefault(candidate => candidate.Rid == rid);
        if (archive is null)
        {
            throw new InvalidOperationException($"Missing archive: {rid}");
        }
        Require(archive.File == file, $"archive[{rid}].file", file);
        Require(archive.Url == url, $"archive[{rid}].url", url);
        Require(archive.Sha256 == sha256, $"archive[{rid}].sha256", sha256);
    }

    private static void RequireShader(Shader shader, string id, string stage, string source, string output)
    {
        Require(shader.Id == id, $"shader[{id}].id", id);
        Require(shader.Stage == stage, $"shader[{id}].stage", stage);
        Require(shader.Source == source, $"shader[{id}].source", source);
        Require(shader.Output == output, $"shader[{id}].output", output);
        Require(shader.EntryPoint == "main", $"shader[{id}].entryPoint", "main");
        RequireCapabilities(shader.Capabilities, new uint[] { 1 }, $"shader[{id}].capabilities");
        if (shader.Source.Contains('\\') || shader.Output.Contains('\\') || shader.Source.Contains('/') || shader.Output.Contains('/'))
        {
            throw new InvalidOperationException($"Shader paths must be file names: {id}");
        }
    }

    private static void RequireMember(PushConstantMember member, string name, int offset, string type)
    {
        Require(member.Name == name, $"pushConstant[{name}].name", name);
        Require(member.Offset == offset, $"pushConstant[{name}].offset", offset.ToString());
        Require(member.Type == type, $"pushConstant[{name}].type", type);
    }

    private static void RequirePipelineStage(PipelineStage actual, string shader, string stage, IReadOnlyList<InterfaceLocation> inputs, IReadOnlyList<InterfaceLocation> outputs)
    {
        Require(actual.Shader == shader, $"pipeline.stage[{shader}].shader", shader);
        Require(actual.Stage == stage, $"pipeline.stage[{shader}].stage", stage);
        Require(actual.EntryPoint == "main", $"pipeline.stage[{shader}].entryPoint", "main");
        RequireLocations(actual.Inputs, inputs, $"pipeline.stage[{shader}].inputs");
        RequireLocations(actual.Outputs, outputs, $"pipeline.stage[{shader}].outputs");
    }

    private static void RequireLocations(IReadOnlyList<InterfaceLocation> actual, IReadOnlyList<InterfaceLocation> expected, string path)
    {
        if (actual.Count != expected.Count)
        {
            throw new InvalidOperationException($"{path} count must be {expected.Count}");
        }
        for (int index = 0; index < expected.Count; index++)
        {
            Require(actual[index].Location == expected[index].Location, $"{path}[{index}].location", expected[index].Location.ToString());
            Require(actual[index].Type == expected[index].Type, $"{path}[{index}].type", expected[index].Type);
            Require(actual[index].Name == expected[index].Name, $"{path}[{index}].name", expected[index].Name);
        }
    }

    private static void ValidateShaderReflection(Manifest manifest, Shader shader, SpirvModuleReflection reflection)
    {
        Require(reflection.Stage == shader.Stage, $"shader[{shader.Id}].reflection.stage", shader.Stage);
        Require(reflection.EntryPoint == shader.EntryPoint, $"shader[{shader.Id}].reflection.entryPoint", shader.EntryPoint);
        RequireCapabilities(reflection.Capabilities, shader.Capabilities, $"shader[{shader.Id}].reflection.capabilities");
        List<Pipeline> pipelines = manifest.Pipelines.Where(value => value.Stages.Any(stage => stage.Shader == shader.Id)).ToList();
        if (pipelines.Count == 0)
        {
            throw new InvalidOperationException($"Missing pipeline stage for shader: {shader.Id}");
        }
        foreach (Pipeline pipeline in pipelines)
        {
            PipelineStage stage = pipeline.Stages.Single(value => value.Shader == shader.Id);
            RequireReflectedLocations(reflection.Inputs, stage.Inputs, $"shader[{shader.Id}].reflection.inputs");
            RequireReflectedLocations(reflection.Outputs, stage.Outputs, $"shader[{shader.Id}].reflection.outputs");
            List<Descriptor> expectedDescriptors = pipeline.Descriptors
                .Where(value => value.Stages.Contains(shader.Stage, StringComparer.Ordinal))
                .ToList();
            Require(reflection.DescriptorCount == expectedDescriptors.Count, $"shader[{shader.Id}].reflection.descriptorCount", expectedDescriptors.Count.ToString());
            RequireReflectedDescriptors(reflection.Descriptors, expectedDescriptors, $"shader[{shader.Id}].reflection.descriptors");
            bool hasPushConstants = pipeline.PushConstants.Stages.Contains(shader.Stage, StringComparer.Ordinal);
            if (!hasPushConstants)
            {
                if (reflection.PushConstant is not null)
                {
                    throw new InvalidOperationException($"Shader has unexpected push constants: {shader.Id}");
                }
                continue;
            }
            SpirvPushConstant reflected = reflection.PushConstant
                ?? throw new InvalidOperationException($"Shader has no reflected push constants: {shader.Id}");
            PushConstants expected = pipeline.PushConstants;
            Require(reflected.Size == expected.Size, $"shader[{shader.Id}].reflection.pushConstants.size", expected.Size.ToString());
            if (reflected.Members.Count != expected.Members.Count)
            {
                throw new InvalidOperationException($"shader[{shader.Id}].reflection.pushConstants.members count must be {expected.Members.Count}");
            }
            for (int index = 0; index < expected.Members.Count; index++)
            {
                SpirvPushConstantMember actual = reflected.Members[index];
                PushConstantMember member = expected.Members[index];
                Require(actual.Offset == member.Offset, $"shader[{shader.Id}].reflection.pushConstants.members[{index}].offset", member.Offset.ToString());
                Require(actual.Type == member.Type, $"shader[{shader.Id}].reflection.pushConstants.members[{index}].type", member.Type);
            }
        }
    }

    private static void RequireReflectedLocations(IReadOnlyList<SpirvInterface> actual, IReadOnlyList<InterfaceLocation> expected, string path)
    {
        if (actual.Select(value => value.Location).Distinct().Count() != actual.Count)
        {
            throw new InvalidOperationException($"{path} contains duplicate locations");
        }
        if (actual.Count != expected.Count)
        {
            throw new InvalidOperationException($"{path} count must be {expected.Count}");
        }
        for (int index = 0; index < expected.Count; index++)
        {
            Require(actual[index].Location == expected[index].Location, $"{path}[{index}].location", expected[index].Location.ToString());
            Require(actual[index].Type == expected[index].Type, $"{path}[{index}].type", expected[index].Type);
        }
    }

    private static void RequireReflectedDescriptors(IReadOnlyList<SpirvDescriptor> actual, IReadOnlyList<Descriptor> expected, string path)
    {
        if (actual.Count != expected.Count)
        {
            throw new InvalidOperationException($"{path} count must be {expected.Count}");
        }
        for (int index = 0; index < expected.Count; index++)
        {
            SpirvDescriptor actualDescriptor = actual[index];
            Descriptor expectedDescriptor = expected[index];
            Require(actualDescriptor.Set == expectedDescriptor.Set, $"{path}[{index}].set", expectedDescriptor.Set.ToString());
            Require(actualDescriptor.Binding == expectedDescriptor.Binding, $"{path}[{index}].binding", expectedDescriptor.Binding.ToString());
            Require(actualDescriptor.Type == expectedDescriptor.Type, $"{path}[{index}].type", expectedDescriptor.Type);
            Require(actualDescriptor.Count == expectedDescriptor.Count, $"{path}[{index}].count", expectedDescriptor.Count.ToString());
        }
    }

    private static void RequireCapabilities(IReadOnlyList<uint> actual, IReadOnlyList<uint> expected, string path)
    {
        if (actual.Count != expected.Count)
        {
            throw new InvalidOperationException($"{path} count must be {expected.Count}");
        }
        for (int index = 0; index < expected.Count; index++)
        {
            Require(actual[index] == expected[index], $"{path}[{index}]", expected[index].ToString());
        }
    }

    private static void RequireSequence(IReadOnlyList<string> actual, IReadOnlyList<string> expected, string path)
    {
        if (actual.Count != expected.Count)
        {
            throw new InvalidOperationException($"{path} count must be {expected.Count}");
        }
        for (int index = 0; index < expected.Count; index++)
        {
            Require(actual[index] == expected[index], $"{path}[{index}]", expected[index]);
        }
    }

    private static void Require(bool condition, string path, string expected)
    {
        if (!condition)
        {
            throw new InvalidOperationException($"Invalid {path}, expected {expected}");
        }
    }

    private static string FindRepositoryRoot()
    {
        string[] starts = { Directory.GetCurrentDirectory(), AppContext.BaseDirectory };
        foreach (string start in starts)
        {
            DirectoryInfo? current = new DirectoryInfo(Path.GetFullPath(start));
            while (current is not null)
            {
                string manifestPath = Path.Combine(current.FullName, ShaderDirectory.Replace('/', Path.DirectorySeparatorChar), InputManifestName);
                if (File.Exists(manifestPath))
                {
                    return current.FullName;
                }
                current = current.Parent;
            }
        }
        throw new InvalidOperationException("Could not find the goo-gsharp repository root");
    }

    private static string FindTool(string executable)
    {
        string[] names = OperatingSystem.IsWindows() ? new[] { executable, executable + ".exe" } : new[] { executable };
        string? sdk = Environment.GetEnvironmentVariable("VULKAN_SDK");
        if (!string.IsNullOrWhiteSpace(sdk))
        {
            foreach (string bin in new[] { "bin", "Bin" })
            {
                foreach (string name in names)
                {
                    string candidate = Path.Combine(sdk, bin, name);
                    if (File.Exists(candidate))
                    {
                        return candidate;
                    }
                }
            }
        }

        string? path = Environment.GetEnvironmentVariable("PATH");
        if (!string.IsNullOrWhiteSpace(path))
        {
            foreach (string directory in path.Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries))
            {
                foreach (string name in names)
                {
                    string candidate = Path.Combine(directory, name);
                    if (File.Exists(candidate))
                    {
                        return candidate;
                    }
                }
            }
        }
        throw new InvalidOperationException($"Could not find {executable} in VULKAN_SDK or PATH");
    }

    private static void RequireCompilerVersion(string compilerPath, Manifest manifest)
    {
        ToolResult result = RunTool(compilerPath, new[] { "--version" });
        RequireSuccess(compilerPath, result);
        string[] lines = result.StandardOutput.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
        Require(lines.Length > 0 && lines[0].Trim() == manifest.Toolchain.Compiler.Version, "glslc.version", manifest.Toolchain.Compiler.Version);
        Require(lines.Any(line => line.Trim() == CompilerVersionMarker + manifest.Toolchain.Sdk), "glslc.sdk", manifest.Toolchain.Sdk);
    }

    private static void RequireValidatorVersion(string validatorPath, Manifest manifest)
    {
        ToolResult result = RunTool(validatorPath, new[] { "--version" });
        RequireSuccess(validatorPath, result);
        string output = result.StandardOutput + result.StandardError;
        Require(output.Contains($"SPIRV-Tools v{manifest.Toolchain.Validator.Version}", StringComparison.Ordinal), "spirv-val.version", manifest.Toolchain.Validator.Version);
        Require(output.Contains($"vulkan-sdk-{manifest.Toolchain.Sdk}", StringComparison.Ordinal), "spirv-val.sdk", manifest.Toolchain.Sdk);
    }

    private static ToolResult RunTool(string path, IEnumerable<string> arguments)
    {
        ProcessStartInfo startInfo = new()
        {
            FileName = path,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };
        foreach (string argument in arguments)
        {
            startInfo.ArgumentList.Add(argument);
        }
        using Process process = Process.Start(startInfo) ?? throw new InvalidOperationException($"Could not start {path}");
        Task<string> outputTask = process.StandardOutput.ReadToEndAsync();
        Task<string> errorTask = process.StandardError.ReadToEndAsync();
        process.WaitForExit();
        Task.WaitAll(outputTask, errorTask);
        return new ToolResult(process.ExitCode, outputTask.Result, errorTask.Result);
    }

    private static void RequireSuccess(string path, ToolResult result)
    {
        if (result.ExitCode != 0)
        {
            string details = (result.StandardError + Environment.NewLine + result.StandardOutput).Trim();
            throw new InvalidOperationException($"{path} failed with exit code {result.ExitCode}: {details}");
        }
    }

    private static string ResolveChildPath(string root, string child, string kind)
    {
        string fullPath = Path.GetFullPath(Path.Combine(root, child.Replace('/', Path.DirectorySeparatorChar)));
        string relative = Path.GetRelativePath(root, fullPath);
        if (Path.IsPathRooted(relative) || relative == ".." || relative.StartsWith(".." + Path.DirectorySeparatorChar, StringComparison.Ordinal))
        {
            throw new InvalidOperationException($"{kind} path escapes its directory: {child}");
        }
        return fullPath;
    }

    private static void EnsureLf(string path, ReadOnlySpan<byte> bytes)
    {
        if (bytes.IndexOf((byte)'\r') >= 0)
        {
            throw new InvalidOperationException($"Source must use LF line endings: {path}");
        }
    }

    private static string HashBytes(byte[] bytes)
    {
        return Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
    }
}
