namespace ForbiddenPsalmBuilder.Core.Services.Storage;

public interface IStorageService
{
    Task<T?> GetItemAsync<T>(string key);
    Task SetItemAsync<T>(string key, T value);
    Task RemoveItemAsync(string key);
    Task<bool> ContainsKeyAsync(string key);
    Task ClearAsync();
}