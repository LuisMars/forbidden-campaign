using ForbiddenPsalmBuilder.Core.Services.Storage;
using Microsoft.JSInterop;
using System.Text.Json;

namespace ForbiddenPsalmBuilder.Blazor.Services;

public class LocalStorageService : IStorageService
{
    private readonly IJSRuntime _jsRuntime;

    public LocalStorageService(IJSRuntime jsRuntime)
    {
        _jsRuntime = jsRuntime;
    }

    public async Task<T?> GetItemAsync<T>(string key)
    {
        try
        {
            var json = await _jsRuntime.InvokeAsync<string>("localStorage.getItem", key);
            if (string.IsNullOrEmpty(json))
                return default;

            return JsonSerializer.Deserialize<T>(json);
        }
        catch (JSException)
        {
            // LocalStorage might not be available (e.g., in prerender mode)
            return default;
        }
    }

    public async Task SetItemAsync<T>(string key, T value)
    {
        try
        {
            var json = JsonSerializer.Serialize(value);
            await _jsRuntime.InvokeVoidAsync("localStorage.setItem", key, json);
        }
        catch (JSException)
        {
            // LocalStorage might not be available (e.g., in prerender mode)
            // Silently fail to avoid breaking the app
        }
    }

    public async Task RemoveItemAsync(string key)
    {
        try
        {
            await _jsRuntime.InvokeVoidAsync("localStorage.removeItem", key);
        }
        catch (JSException)
        {
            // LocalStorage might not be available (e.g., in prerender mode)
            // Silently fail to avoid breaking the app
        }
    }

    public async Task<bool> ContainsKeyAsync(string key)
    {
        try
        {
            var value = await _jsRuntime.InvokeAsync<string>("localStorage.getItem", key);
            return !string.IsNullOrEmpty(value);
        }
        catch (JSException)
        {
            // LocalStorage might not be available (e.g., in prerender mode)
            return false;
        }
    }

    public async Task ClearAsync()
    {
        try
        {
            await _jsRuntime.InvokeVoidAsync("localStorage.clear");
        }
        catch (JSException)
        {
            // LocalStorage might not be available (e.g., in prerender mode)
            // Silently fail to avoid breaking the app
        }
    }
}