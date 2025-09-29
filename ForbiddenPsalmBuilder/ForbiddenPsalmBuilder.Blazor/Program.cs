using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using ForbiddenPsalmBuilder;
using ForbiddenPsalmBuilder.Core.Services.State;
using ForbiddenPsalmBuilder.Core.Services.Storage;
using ForbiddenPsalmBuilder.Core.Repositories;
using ForbiddenPsalmBuilder.Blazor.Services;
using ForbiddenPsalmBuilder.Data.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

// HttpClient for data loading
builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });

// Data services
builder.Services.AddSingleton<IEmbeddedResourceService, EmbeddedResourceService>();

// Storage services
builder.Services.AddScoped<IStorageService, LocalStorageService>();
builder.Services.AddScoped<IWarbandRepository, WarbandRepository>();

// Global state management - Singleton to persist across the entire app lifetime
builder.Services.AddSingleton<GlobalGameState>();

// State service - Scoped to ensure proper lifecycle management
builder.Services.AddScoped<IGameStateService, GameStateService>();

// TODO: Add other services as we build them
// builder.Services.AddScoped<IGameDataService, GameDataService>();

var app = builder.Build();

// Initialize state on startup
var stateService = app.Services.GetRequiredService<IGameStateService>();
await stateService.LoadStateAsync();
await stateService.LoadGameDataAsync();

await app.RunAsync();
