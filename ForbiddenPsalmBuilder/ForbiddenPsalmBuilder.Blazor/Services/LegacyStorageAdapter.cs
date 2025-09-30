using Blazored.LocalStorage;
using ForbiddenPsalmBuilder.Core.Services.Storage;

namespace ForbiddenPsalmBuilder.Blazor.Services;

/// <summary>
/// Adapter to make Blazored.LocalStorage work with legacy IStorageService interface
/// Used by WarbandRepository which hasn't been migrated to IStateStorageService yet
/// </summary>
public class LegacyStorageAdapter : IStorageService
{
    private readonly ILocalStorageService _localStorage;

    public LegacyStorageAdapter(ILocalStorageService localStorage)
    {
        _localStorage = localStorage;
    }

    public async Task<T?> GetItemAsync<T>(string key)
    {
        return await _localStorage.GetItemAsync<T>(key);
    }

    public async Task SetItemAsync<T>(string key, T value)
    {
        await _localStorage.SetItemAsync(key, value);
    }

    public async Task RemoveItemAsync(string key)
    {
        await _localStorage.RemoveItemAsync(key);
    }

    public async Task<bool> ContainsKeyAsync(string key)
    {
        return await _localStorage.ContainKeyAsync(key);
    }

    public async Task ClearAsync()
    {
        await _localStorage.ClearAsync();
    }
}
