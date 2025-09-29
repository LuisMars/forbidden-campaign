using System.Reflection;
using System.Text.Json;

namespace ForbiddenPsalmBuilder.Data.Services;

public class EmbeddedResourceService : IEmbeddedResourceService
{
    private readonly Assembly _assembly;
    private readonly string _baseNamespace;

    public EmbeddedResourceService()
    {
        // Load resources from the Data assembly where they are embedded
        _assembly = Assembly.GetExecutingAssembly();
        _baseNamespace = "ForbiddenPsalmBuilder.Data";

        // Debug: Log available resources
        var resources = _assembly.GetManifestResourceNames();
        Console.WriteLine($"[EmbeddedResourceService] Assembly: {_assembly.GetName().Name}");
        Console.WriteLine($"[EmbeddedResourceService] Total resources: {resources.Length}");
        var nameResources = resources.Where(r => r.Contains("names")).ToList();
        Console.WriteLine($"[EmbeddedResourceService] Name resources: {nameResources.Count}");
        foreach (var res in nameResources)
        {
            Console.WriteLine($"  - {res}");
        }
    }

    public async Task<string> GetResourceAsStringAsync(string resourcePath)
    {
        var fullResourceName = $"{_baseNamespace}.{resourcePath.Replace('/', '.').Replace('\\', '.')}";

        using var stream = _assembly.GetManifestResourceStream(fullResourceName);
        if (stream == null)
            throw new FileNotFoundException($"Embedded resource not found: {fullResourceName}");

        using var reader = new StreamReader(stream);
        return await reader.ReadToEndAsync();
    }

    public async Task<T?> GetResourceAsJsonAsync<T>(string resourcePath)
    {
        var jsonContent = await GetResourceAsStringAsync(resourcePath);
        return JsonSerializer.Deserialize<T>(jsonContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }

    public async Task<T?> GetGameResourceAsync<T>(string gameVariant, string fileName)
    {
        // Convert hyphens to underscores for embedded resource naming
        var resourceGameVariant = gameVariant.Replace("-", "_");
        var resourceFileName = fileName.Replace("-", "-"); // Keep hyphens in filenames as they are

        // .NET adds underscore prefix if folder name starts with a number
        var resourcePath = char.IsDigit(resourceGameVariant[0])
            ? $"data._{resourceGameVariant}.{resourceFileName}"
            : $"data.{resourceGameVariant}.{resourceFileName}";

        Console.WriteLine($"[EmbeddedResourceService] Loading game resource: {gameVariant}/{fileName} -> {resourcePath}");
        var result = await GetResourceAsJsonAsync<T>(resourcePath);
        Console.WriteLine($"[EmbeddedResourceService] Loaded: {result != null}");
        return result;
    }

    public async Task<T?> GetSharedResourceAsync<T>(string fileName)
    {
        var resourceFileName = fileName.Replace("-", "-"); // Keep hyphens in filenames as they are
        var resourcePath = $"data.shared.{resourceFileName}";
        return await GetResourceAsJsonAsync<T>(resourcePath);
    }

    public IEnumerable<string> GetAllResourceNames()
    {
        return _assembly.GetManifestResourceNames()
            .Where(name => name.StartsWith(_baseNamespace) && name.EndsWith(".json"))
            .Select(name => name.Substring(_baseNamespace.Length + 1));
    }

    public bool ResourceExists(string resourcePath)
    {
        var fullResourceName = $"{_baseNamespace}.{resourcePath.Replace('/', '.').Replace('\\', '.')}";
        return _assembly.GetManifestResourceStream(fullResourceName) != null;
    }
}