using ForbiddenPsalmBuilder.Core.Models.Character;
using ForbiddenPsalmBuilder.Core.Models.Warband;
using ForbiddenPsalmBuilder.Core.Models.GameData;
using ForbiddenPsalmBuilder.Core.Models.NameGeneration;
using ForbiddenPsalmBuilder.Core.Repositories;
using ForbiddenPsalmBuilder.Data.Services;
using System.Text.Json;

namespace ForbiddenPsalmBuilder.Core.Services.State;

public class GameStateService : IGameStateService
{
    private readonly GlobalGameState _state;
    private readonly IWarbandRepository _warbandRepository;
    private readonly IEmbeddedResourceService _resourceService;
    private const string StateStorageKey = "forbidden-psalm-builder-state";
    private static readonly Lazy<WarbandNameGenerator> _nameGenerator = new(LoadNameGenerator);

    public GlobalGameState State => _state;

    // Events
    public event Action? StateChanged
    {
        add => _state.StateChanged += value;
        remove => _state.StateChanged -= value;
    }

    public event Action<string>? WarbandChanged
    {
        add => _state.WarbandChanged += value;
        remove => _state.WarbandChanged -= value;
    }

    public event Action<string>? GameVariantChanged
    {
        add => _state.GameVariantChanged += value;
        remove => _state.GameVariantChanged -= value;
    }

    public event Action<string?>? ActiveWarbandChanged
    {
        add => _state.ActiveWarbandChanged += value;
        remove => _state.ActiveWarbandChanged -= value;
    }

    public GameStateService(GlobalGameState state, IWarbandRepository warbandRepository, IEmbeddedResourceService? resourceService = null)
    {
        _state = state;
        _warbandRepository = warbandRepository;
        _resourceService = resourceService ?? new EmbeddedResourceService();
    }

    // Game variant management
    public async Task SetGameVariantAsync(string variant)
    {
        if (!_state.GameConfigs.ContainsKey(variant))
            throw new ArgumentException($"Unknown game variant: {variant}");

        var oldVariant = _state.SelectedGameVariant;
        _state.SelectedGameVariant = variant;

        // Clear active warband if it doesn't belong to new variant
        if (_state.ActiveWarband?.GameVariant != variant)
        {
            _state.ActiveWarbandId = null;
            _state.NotifyActiveWarbandChanged(null);
        }

        _state.NotifyGameVariantChanged(variant);
        await SaveStateAsync();
    }

    public async Task<List<string>> GetAvailableGameVariantsAsync()
    {
        await Task.CompletedTask;
        return _state.AvailableGameVariants;
    }

    // Warband management
    public async Task<string> CreateWarbandAsync(string name)
    {
        return await CreateWarbandAsync(name, _state.SelectedGameVariant);
    }

    public async Task<string> CreateWarbandAsync(string name, string gameVariant)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Warband name cannot be empty");

        if (!_state.GameConfigs.ContainsKey(gameVariant))
            throw new ArgumentException($"Unknown game variant: {gameVariant}");

        var warband = new Warband(name, gameVariant);
        var savedWarband = await _warbandRepository.SaveAsync(warband);

        // Update in-memory state for UI reactivity
        _state.Warbands[savedWarband.Id] = savedWarband;

        // Set as active if no current active warband for this game
        if (_state.ActiveWarbandId == null || _state.ActiveWarband?.GameVariant != gameVariant)
        {
            _state.ActiveWarbandId = savedWarband.Id;
            _state.NotifyActiveWarbandChanged(savedWarband.Id);
        }

        _state.NotifyWarbandChanged(savedWarband.Id);
        await SaveStateAsync();

        return savedWarband.Id;
    }

    public async Task DeleteWarbandAsync(string warbandId)
    {
        var deleted = await _warbandRepository.DeleteAsync(warbandId);
        if (!deleted)
            throw new ArgumentException($"Warband not found: {warbandId}");

        // Update in-memory state for UI reactivity
        _state.Warbands.Remove(warbandId);

        // Clear active warband if it was deleted
        if (_state.ActiveWarbandId == warbandId)
        {
            _state.ActiveWarbandId = null;
            _state.NotifyActiveWarbandChanged(null);
        }

        _state.NotifyWarbandChanged(warbandId);
        await SaveStateAsync();
    }

    public async Task SetActiveWarbandAsync(string? warbandId)
    {
        if (warbandId != null && !_state.Warbands.ContainsKey(warbandId))
            throw new ArgumentException($"Warband not found: {warbandId}");

        _state.ActiveWarbandId = warbandId;
        _state.NotifyActiveWarbandChanged(warbandId);
        await SaveStateAsync();
    }

    public async Task<List<Warband>> GetWarbandsAsync()
    {
        var warbands = await _warbandRepository.GetAllAsync();
        var warbandList = warbands.ToList();

        // Update in-memory state for UI reactivity
        _state.Warbands.Clear();
        foreach (var warband in warbandList)
        {
            _state.Warbands[warband.Id] = warband;
        }

        return warbandList;
    }

    public async Task<List<Warband>> GetWarbandsForGameAsync(string gameVariant)
    {
        var allWarbands = await GetWarbandsAsync();
        return allWarbands.Where(w => w.GameVariant == gameVariant).ToList();
    }

    public async Task<Warband?> GetWarbandAsync(string warbandId)
    {
        var warband = await _warbandRepository.GetByIdAsync(warbandId);
        if (warband != null)
        {
            // Update in-memory state for UI reactivity
            _state.Warbands[warband.Id] = warband;
        }
        return warband;
    }

    public async Task UpdateWarbandAsync(Warband warband)
    {
        var exists = await _warbandRepository.ExistsAsync(warband.Id);
        if (!exists)
            throw new ArgumentException($"Warband not found: {warband.Id}");

        warband.UpdateLastModified();
        var updatedWarband = await _warbandRepository.SaveAsync(warband);

        // Update in-memory state for UI reactivity
        _state.Warbands[updatedWarband.Id] = updatedWarband;
        _state.NotifyWarbandChanged(updatedWarband.Id);
        await SaveStateAsync();
    }

    // Character management
    public async Task<string> AddCharacterToWarbandAsync(string warbandId, Character character)
    {
        if (!_state.Warbands.TryGetValue(warbandId, out var warband))
            throw new ArgumentException($"Warband not found: {warbandId}");

        if (!warband.CanAddMember)
            throw new InvalidOperationException("Warband is already at maximum size");

        warband.Members.Add(character);
        warband.UpdateLastModified();

        // Save to repository
        var updatedWarband = await _warbandRepository.SaveAsync(warband);
        _state.Warbands[updatedWarband.Id] = updatedWarband;

        _state.NotifyWarbandChanged(warbandId);
        await SaveStateAsync();

        return character.Id;
    }

    public async Task UpdateCharacterAsync(string warbandId, string characterId, Character character)
    {
        if (!_state.Warbands.TryGetValue(warbandId, out var warband))
            throw new ArgumentException($"Warband not found: {warbandId}");

        var existingCharacter = warband.Members.FirstOrDefault(c => c.Id == characterId);
        if (existingCharacter == null)
            throw new ArgumentException($"Character not found: {characterId}");

        var index = warband.Members.IndexOf(existingCharacter);
        character.Id = characterId; // Preserve ID
        warband.Members[index] = character;
        warband.UpdateLastModified();
        _state.NotifyWarbandChanged(warbandId);
        await SaveStateAsync();
    }

    public async Task RemoveCharacterFromWarbandAsync(string warbandId, string characterId)
    {
        if (!_state.Warbands.TryGetValue(warbandId, out var warband))
            throw new ArgumentException($"Warband not found: {warbandId}");

        var character = warband.Members.FirstOrDefault(c => c.Id == characterId);
        if (character == null)
            throw new ArgumentException($"Character not found: {characterId}");

        warband.Members.Remove(character);
        warband.UpdateLastModified();
        _state.NotifyWarbandChanged(warbandId);
        await SaveStateAsync();
    }

    // Character builder state
    public async Task StartCharacterBuilderAsync(string warbandId)
    {
        if (!_state.Warbands.ContainsKey(warbandId))
            throw new ArgumentException($"Warband not found: {warbandId}");

        _state.CharacterBuilderWarbandId = warbandId;
        _state.CharacterBeingBuilt = new Character();
        _state.NotifyStateChanged();
        await Task.CompletedTask;
    }

    public async Task SetCharacterBeingBuiltAsync(Character character)
    {
        _state.CharacterBeingBuilt = character;
        _state.NotifyStateChanged();
        await Task.CompletedTask;
    }

    public async Task FinishCharacterBuilderAsync()
    {
        if (_state.CharacterBeingBuilt == null || _state.CharacterBuilderWarbandId == null)
            throw new InvalidOperationException("No character being built");

        await AddCharacterToWarbandAsync(_state.CharacterBuilderWarbandId, _state.CharacterBeingBuilt);

        _state.CharacterBeingBuilt = null;
        _state.CharacterBuilderWarbandId = null;
        _state.NotifyStateChanged();
    }

    public async Task CancelCharacterBuilderAsync()
    {
        _state.CharacterBeingBuilt = null;
        _state.CharacterBuilderWarbandId = null;
        _state.NotifyStateChanged();
        await Task.CompletedTask;
    }

    // Data loading (placeholder - will implement with actual data service)
    public async Task LoadGameDataAsync()
    {
        _state.SetLoading(true);
        try
        {
            // For now, populate with hardcoded game configs based on known variants
            // This will be replaced with actual JSON loading later
            var gameConfigs = new Dictionary<string, GameConfig>
            {
                ["28-psalms"] = new GameConfig
                {
                    GameName = "28 Psalms",
                    Currency = new Currency { Name = "Credits", Symbol = "C", StartingBudget = 50 }
                },
                ["end-times"] = new GameConfig
                {
                    GameName = "Forbidden Psalm: End Times",
                    Currency = new Currency { Name = "Gold", Symbol = "G", StartingBudget = 50 }
                },
                ["last-war"] = new GameConfig
                {
                    GameName = "The Last War",
                    Currency = new Currency { Name = "Resources", Symbol = "R", StartingBudget = 50 }
                }
            };

            _state.GameConfigs.Clear();
            foreach (var config in gameConfigs)
            {
                _state.GameConfigs[config.Key] = config.Value;
            }

            await Task.Delay(100); // Simulate loading
            _state.ClearError();
        }
        catch (Exception ex)
        {
            _state.SetError($"Failed to load game data: {ex.Message}");
        }
        finally
        {
            _state.SetLoading(false);
        }
    }

    public async Task RefreshGameDataAsync()
    {
        await LoadGameDataAsync();
    }

    public async Task<List<string>> GetSpecialTrooperTypesAsync(string gameVariant)
    {
        await Task.CompletedTask; // For async consistency

        return gameVariant switch
        {
            "last-war" => new List<string> { "Witch", "Sniper", "Anti-Tank Gunner" },
            _ => new List<string>() // Other game variants don't have special trooper types
        };
    }

    public async Task<List<ForbiddenPsalmBuilder.Core.Models.Character.StatArray>> GetStatArraysAsync()
    {
        await Task.CompletedTask; // For async consistency

        // Based on character-creation.json data
        return new List<ForbiddenPsalmBuilder.Core.Models.Character.StatArray>
        {
            new ForbiddenPsalmBuilder.Core.Models.Character.StatArray
            {
                Id = "specialist",
                Name = "Specialist",
                Values = new[] { 3, 1, 0, -3 },
                Description = "High specialization with major weakness"
            },
            new ForbiddenPsalmBuilder.Core.Models.Character.StatArray
            {
                Id = "balanced",
                Name = "Balanced",
                Values = new[] { 2, 2, -1, -2 },
                Description = "More balanced distribution"
            }
        };
    }

    // State persistence (placeholder - will implement with localStorage)
    public async Task SaveStateAsync()
    {
        try
        {
            // TODO: Save to localStorage
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _state.SetError($"Failed to save state: {ex.Message}");
        }
    }

    public async Task LoadStateAsync()
    {
        try
        {
            // TODO: Load from localStorage
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _state.SetError($"Failed to load state: {ex.Message}");
        }
    }

    public async Task ClearStateAsync()
    {
        _state.Warbands.Clear();
        _state.ActiveWarbandId = null;
        _state.CharacterBeingBuilt = null;
        _state.CharacterBuilderWarbandId = null;
        _state.ClearError();
        _state.NotifyStateChanged();
        await SaveStateAsync();
    }

    // Name generation
    public async Task<string> GenerateWarbandNameAsync()
    {
        return await Task.FromResult(_nameGenerator.Value.GenerateName());
    }

    public async Task<string> GenerateCharacterNameAsync(string gameVariant)
    {
        var generator = new CharacterNameGenerator(_resourceService);
        return await generator.GenerateNameAsync(gameVariant);
    }

    private static WarbandNameGenerator LoadNameGenerator()
    {
        try
        {
            // Try to load from the JSON file
            var dataPath = Path.Combine("data", "shared", "warband-names.json");
            if (File.Exists(dataPath))
            {
                return WarbandNameGenerator.LoadFromFileAsync(dataPath).GetAwaiter().GetResult();
            }
        }
        catch
        {
            // Fall back to hardcoded data if file loading fails
        }

        // Fallback to basic hardcoded data
        var basicData = new WarbandNameData
        {
            Patterns = new List<string>
            {
                "[group] of [adjective] [occupation]",
                "the [adjective] [group]",
                "the [occupation]",
                "the [adjective] [occupation]"
            },
            Group = new List<string> { "Band", "Guild", "Order", "Circle", "Crew", "Pack", "Legion" },
            Occupation = new List<string> { "Seekers", "Wanderers", "Guardians", "Hunters", "Defenders", "Knights", "Scribes" },
            Adjective = new List<string> { "Dark", "Ancient", "Wild", "Lost", "Iron", "Silent", "Forgotten", "Desperate" },
            Location = new List<string> { "of the Woods", "of the Hills", "of the Void" },
            LocationTemplates = new List<string>(),
            Shape = new List<string>(),
            Atmosphere = new List<string>(),
            Color = new List<string>(),
            Animal = new List<string>()
        };

        return new WarbandNameGenerator(basicData);
    }

    // Error handling
    public async Task SetErrorAsync(string? error)
    {
        _state.SetError(error);
        await Task.CompletedTask;
    }

    public async Task ClearErrorAsync()
    {
        _state.ClearError();
        await Task.CompletedTask;
    }
}