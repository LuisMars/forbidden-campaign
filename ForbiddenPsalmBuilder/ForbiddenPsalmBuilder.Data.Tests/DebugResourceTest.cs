using ForbiddenPsalmBuilder.Data.Services;
using System.Reflection;

namespace ForbiddenPsalmBuilder.Data.Tests;

public class DebugResourceTest
{
    [Fact]
    public void ListAllEmbeddedResources()
    {
        var assembly = Assembly.GetAssembly(typeof(EmbeddedResourceService));
        var resourceNames = assembly?.GetManifestResourceNames() ?? [];

        Assert.NotNull(assembly);

        // Print all resource names for debugging
        foreach (var name in resourceNames)
        {
            Console.WriteLine($"Resource: {name}");
        }

        Assert.NotEmpty(resourceNames);
    }

    [Fact]
    public void CheckDataAssemblyResources()
    {
        var service = new EmbeddedResourceService();
        var resources = service.GetAllResourceNames().ToList();

        foreach (var resource in resources)
        {
            Console.WriteLine($"Available resource: {resource}");
        }

        Assert.NotEmpty(resources);
    }
}