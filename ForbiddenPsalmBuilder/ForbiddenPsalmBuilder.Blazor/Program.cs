using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using ForbiddenPsalmBuilder;
using ForbiddenPsalmBuilder.Core.Services.State;
using ForbiddenPsalmBuilder.Core.Repositories;
using ForbiddenPsalmBuilder.Blazor.Services;
using ForbiddenPsalmBuilder.Data.Services;
using Blazored.LocalStorage;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

// HttpClient for data loading
builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });

// Blazored LocalStorage
builder.Services.AddBlazoredLocalStorage();

// Data services
builder.Services.AddSingleton<IEmbeddedResourceService, EmbeddedResourceService>();

// Storage services
builder.Services.AddScoped<IStateStorageService, LocalStorageService>();
builder.Services.AddScoped<IWarbandRepository, WarbandRepository>();

// Global state management - Singleton to persist across the entire app lifetime
builder.Services.AddSingleton<GlobalGameState>();

// State service - Scoped to ensure proper lifecycle management
builder.Services.AddScoped<IGameStateService>(sp =>
{
    var state = sp.GetRequiredService<GlobalGameState>();
    var repository = sp.GetRequiredService<IWarbandRepository>();
    var resourceService = sp.GetRequiredService<IEmbeddedResourceService>();
    var storageService = sp.GetRequiredService<IStateStorageService>();
    return new GameStateService(state, repository, resourceService, storageService);
});

// TODO: Add other services as we build them
// builder.Services.AddScoped<IGameDataService, GameDataService>();

var app = builder.Build();

// Initialize state on startup
var stateService = app.Services.GetRequiredService<IGameStateService>();
await stateService.LoadStateAsync();
await stateService.LoadGameDataAsync();

await app.RunAsync();
