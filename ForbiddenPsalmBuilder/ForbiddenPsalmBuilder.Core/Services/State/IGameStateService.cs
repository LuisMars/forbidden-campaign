using ForbiddenPsalmBuilder.Core.Models.Character;
using ForbiddenPsalmBuilder.Core.Models.Selection;
using ForbiddenPsalmBuilder.Core.Models.Warband;

namespace ForbiddenPsalmBuilder.Core.Services.State;

public interface IGameStateService
{
    // State access
    GlobalGameState State { get; }

    // Game variant management
    Task SetGameVariantAsync(string variant);
    Task<List<string>> GetAvailableGameVariantsAsync();

    // Warband management
    Task<string> CreateWarbandAsync(string name);
    Task<string> CreateWarbandAsync(string name, string gameVariant);
    Task DeleteWarbandAsync(string warbandId);
    Task SetActiveWarbandAsync(string? warbandId);
    Task<List<Warband>> GetWarbandsAsync();
    Task<List<Warband>> GetWarbandsForGameAsync(string gameVariant);
    Task<Warband?> GetWarbandAsync(string warbandId);
    Task UpdateWarbandAsync(Warband warband);
    Task<string> GenerateWarbandNameAsync();
    Task<string> GenerateCharacterNameAsync(string gameVariant);

    // Character management
    Task<string> AddCharacterToWarbandAsync(string warbandId, Character character);
    Task UpdateCharacterAsync(string warbandId, string characterId, Character character);
    Task RemoveCharacterFromWarbandAsync(string warbandId, string characterId);

    // Character builder state
    Task StartCharacterBuilderAsync(string warbandId);
    Task SetCharacterBeingBuiltAsync(Character character);
    Task FinishCharacterBuilderAsync();
    Task CancelCharacterBuilderAsync();

    // Data loading
    Task LoadGameDataAsync();
    Task RefreshGameDataAsync();
    Task<List<ForbiddenPsalmBuilder.Core.Models.Character.StatArray>> GetStatArraysAsync();

    // Special Classes
    Task<List<SpecialClass>> GetSpecialClassesAsync(string gameVariant);
    Task<SpecialClass?> GetSpecialClassByIdAsync(string specialClassId, string gameVariant);
    Task<bool> CanAddSpecialClassAsync(string warbandId, string specialClassId);
    Task<string?> ValidateSpecialClassSelectionAsync(string warbandId, string? specialClassId, string? characterIdToExclude = null);

    // State persistence
    Task SaveStateAsync();
    Task LoadStateAsync();
    Task ClearStateAsync();

    // Error handling
    Task SetErrorAsync(string? error);
    Task ClearErrorAsync();

    // Events
    event Action? StateChanged;
    event Action<string>? WarbandChanged;
    event Action<string>? GameVariantChanged;
    event Action<string?>? ActiveWarbandChanged;
}