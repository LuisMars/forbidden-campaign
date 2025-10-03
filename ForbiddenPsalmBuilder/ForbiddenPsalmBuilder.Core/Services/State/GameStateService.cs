using ForbiddenPsalmBuilder.Core.Models.Character;
using ForbiddenPsalmBuilder.Core.Models.Warband;
using ForbiddenPsalmBuilder.Core.Models.GameData;
using ForbiddenPsalmBuilder.Core.Models.NameGeneration;
using ForbiddenPsalmBuilder.Core.Models.Selection;
using ForbiddenPsalmBuilder.Core.Repositories;
using ForbiddenPsalmBuilder.Data.Services;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace ForbiddenPsalmBuilder.Core.Services.State;

public class GameStateService : IGameStateService
{
    private readonly GlobalGameState _state;
    private readonly IWarbandRepository _warbandRepository;
    private readonly IEmbeddedResourceService _resourceService;
    private readonly IStateStorageService? _storageService;
    private readonly ILogger<GameStateService>? _logger;
    private readonly SpecialClassService _specialClassService;
    private readonly EquipmentService _equipmentService;
    private readonly EquipmentValidator _equipmentValidator;
    private readonly TraderService _traderService;
    private const string StateStorageKey = "forbidden-psalm-state";
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

    public GameStateService(
        GlobalGameState state,
        IWarbandRepository warbandRepository,
        IEmbeddedResourceService? resourceService = null,
        IStateStorageService? storageService = null,
        ILogger<GameStateService>? logger = null)
    {
        _state = state;
        _warbandRepository = warbandRepository;
        _resourceService = resourceService ?? new EmbeddedResourceService();
        _logger = logger;
        _storageService = storageService;
        _specialClassService = new SpecialClassService(_resourceService);
        _equipmentService = new EquipmentService(_resourceService);
        _equipmentValidator = new EquipmentValidator();
        _traderService = new TraderService(_resourceService);
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

        // Save to repository
        var updatedWarband = await _warbandRepository.SaveAsync(warband);
        _state.Warbands[updatedWarband.Id] = updatedWarband;

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

        // Save to repository
        var updatedWarband = await _warbandRepository.SaveAsync(warband);
        _state.Warbands[updatedWarband.Id] = updatedWarband;

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
            _logger?.LogError(ex, "Failed to load game data");
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
            if (_storageService == null)
                return; // No storage service configured, skip persistence

            await _storageService.SetItemAsync(StateStorageKey, _state);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to save state");
            _state.SetError($"Failed to save state: {ex.Message}");
        }
    }

    public async Task LoadStateAsync()
    {
        try
        {
            if (_storageService == null)
                return; // No storage service configured, skip persistence

            var savedState = await _storageService.GetItemAsync<GlobalGameState>(StateStorageKey);
            if (savedState != null)
            {
                // Restore warbands
                _state.Warbands = savedState.Warbands;
                _state.ActiveWarbandId = savedState.ActiveWarbandId;
                _state.SelectedGameVariant = savedState.SelectedGameVariant;
                _state.CharacterBeingBuilt = savedState.CharacterBeingBuilt;
                _state.CharacterBuilderWarbandId = savedState.CharacterBuilderWarbandId;

                _state.NotifyStateChanged();
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to load state");
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

        // Remove persisted state
        if (_storageService != null)
        {
            await _storageService.RemoveItemAsync(StateStorageKey);
        }
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

    // Special Classes
    public async Task<List<SpecialClass>> GetSpecialClassesAsync(string gameVariant)
    {
        return await _specialClassService.GetSpecialClassesAsync(gameVariant);
    }

    public async Task<SpecialClass?> GetSpecialClassByIdAsync(string specialClassId, string gameVariant)
    {
        return await _specialClassService.GetSpecialClassByIdAsync(specialClassId, gameVariant);
    }

    public async Task<bool> CanAddSpecialClassAsync(string warbandId, string specialClassId)
    {
        var error = await ValidateSpecialClassSelectionAsync(warbandId, specialClassId);
        return error == null;
    }

    public async Task<string?> ValidateSpecialClassSelectionAsync(string warbandId, string? specialClassId, string? characterIdToExclude = null)
    {
        // Null or empty special class is always valid (no special class selected)
        if (string.IsNullOrEmpty(specialClassId))
            return null;

        var warband = await GetWarbandAsync(warbandId);
        if (warband == null)
            return "Warband not found";

        // Get the special class definition
        var specialClass = await GetSpecialClassByIdAsync(specialClassId, warband.GameVariant);
        if (specialClass == null)
            return $"Special class '{specialClassId}' not found for game variant '{warband.GameVariant}'";

        // Check if this special class has a limit
        if (!specialClass.Metadata.ContainsKey("limit"))
            return null; // No limit defined, always valid

        var limitValue = specialClass.Metadata["limit"];

        // Handle null limit (unlimited)
        if (limitValue == null)
            return null;

        // Check for canSelectMultiple flag (like Civilian)
        if (specialClass.Metadata.ContainsKey("canSelectMultiple"))
        {
            var canSelectMultiple = specialClass.Metadata["canSelectMultiple"];
            if (canSelectMultiple is bool boolValue && boolValue)
                return null; // Can select multiple, no limit
            if (canSelectMultiple is JsonElement jsonElement && jsonElement.ValueKind == JsonValueKind.True)
                return null; // Can select multiple, no limit
        }

        // Parse limit value (handle JsonElement from JSON deserialization)
        int limit;
        if (limitValue is JsonElement jsonLimitElement)
        {
            if (jsonLimitElement.ValueKind == JsonValueKind.Number)
                limit = jsonLimitElement.GetInt32();
            else
                return null; // Invalid limit format, skip validation
        }
        else if (limitValue is int intValue)
        {
            limit = intValue;
        }
        else
        {
            return null; // Invalid limit format, skip validation
        }

        // Count existing characters with this special class (excluding the character being edited)
        var existingCount = warband.Members
            .Where(m => m.SpecialClassId == specialClassId && m.Id != characterIdToExclude)
            .Count();

        if (existingCount >= limit)
        {
            return $"Warband already has the maximum number ({limit}) of '{specialClass.DisplayName}' special class members";
        }

        return null; // Validation passed
    }

    // Equipment Management

    public async Task AddEquipmentToCharacterAsync(string warbandId, string characterId, string equipmentId, string equipmentType)
    {
        var warband = await GetWarbandAsync(warbandId);
        if (warband == null)
            throw new ArgumentException($"Warband not found: {warbandId}");

        var character = warband.Members.FirstOrDefault(m => m.Id == characterId);
        if (character == null)
            throw new ArgumentException($"Character not found: {characterId}");

        // Load equipment from service based on type
        Equipment? equipment = null;

        switch (equipmentType.ToLower())
        {
            case "weapon":
                var weapon = await _equipmentService.GetWeaponByIdAsync(equipmentId, warband.GameVariant);
                if (weapon != null)
                {
                    equipment = new Equipment
                    {
                        Id = Guid.NewGuid().ToString(),
                        Name = weapon.Name,
                        Type = "weapon",
                        Damage = weapon.Damage,
                        Properties = weapon.Properties,
                        Stat = weapon.Stat,
                        Cost = weapon.Cost ?? 0,
                        Slots = weapon.Slots,
                        IconClass = weapon.IconClass
                    };
                }
                break;

            case "armor":
                var armor = await _equipmentService.GetArmorByIdAsync(equipmentId, warband.GameVariant);
                if (armor != null)
                {
                    equipment = new Equipment
                    {
                        Id = Guid.NewGuid().ToString(),
                        Name = armor.Name,
                        Type = "armor",
                        Cost = armor.Cost ?? 0,
                        Slots = armor.Slots,
                        ArmorValue = armor.ArmorValue,
                        ArmorType = armor.ArmorType,
                        Special = armor.Special,
                        IconClass = armor.IconClass
                    };
                }
                break;

            case "item":
                var item = await _equipmentService.GetItemByIdAsync(equipmentId, warband.GameVariant);
                if (item != null)
                {
                    equipment = new Equipment
                    {
                        Id = Guid.NewGuid().ToString(),
                        Name = item.Name,
                        Type = "item",
                        Cost = item.Cost ?? 0,
                        Slots = item.Slots,
                        Effect = item.Effect,
                        IconClass = item.IconClass
                    };
                }
                break;

            default:
                throw new ArgumentException($"Unknown equipment type: {equipmentType}");
        }

        if (equipment == null)
            throw new ArgumentException($"Equipment not found: {equipmentId}");

        // Extract stat requirements for armor
        int? reqStr = null, reqAgl = null, reqPrs = null, reqTgh = null;
        if (equipmentType.ToLower() == "armor")
        {
            var armorData = await _equipmentService.GetArmorByIdAsync(equipmentId, warband.GameVariant);
            if (armorData != null)
            {
                var requirements = _equipmentValidator.ExtractStatRequirements(armorData);
                reqStr = requirements.strength;
                reqAgl = requirements.agility;
                reqPrs = requirements.presence;
                reqTgh = requirements.toughness;
            }
        }

        // Validate equipment using the validator
        var validationError = _equipmentValidator.ValidateEquipment(character, equipment, reqStr, reqAgl, reqPrs, reqTgh);
        if (validationError != null)
            throw new InvalidOperationException(validationError);

        // Add equipment
        character.Equipment.Add(equipment);

        // Save warband
        await _warbandRepository.SaveAsync(warband);
        _state.NotifyWarbandChanged(warbandId);
    }

    public async Task RemoveEquipmentFromCharacterAsync(string warbandId, string characterId, string equipmentId)
    {
        var warband = await GetWarbandAsync(warbandId);
        if (warband == null)
            throw new ArgumentException($"Warband not found: {warbandId}");

        var character = warband.Members.FirstOrDefault(m => m.Id == characterId);
        if (character == null)
            throw new ArgumentException($"Character not found: {characterId}");

        var equipment = character.Equipment.FirstOrDefault(e => e.Id == equipmentId);
        if (equipment == null)
            throw new ArgumentException($"Equipment not found: {equipmentId}");

        character.Equipment.Remove(equipment);

        await _warbandRepository.SaveAsync(warband);
        _state.NotifyWarbandChanged(warbandId);
    }

    public bool CanCharacterEquip(string warbandId, string characterId, Equipment equipment)
    {
        if (!_state.Warbands.ContainsKey(warbandId))
            return false;

        var warband = _state.Warbands[warbandId];
        var character = warband.Members.FirstOrDefault(m => m.Id == characterId);

        if (character == null)
            return false;

        return character.CanEquip(equipment);
    }

    public async Task<List<Equipment>> GetAvailableEquipmentForCharacterAsync(string warbandId, string characterId)
    {
        var warband = await GetWarbandAsync(warbandId);
        if (warband == null)
            return new List<Equipment>();

        var character = warband.Members.FirstOrDefault(m => m.Id == characterId);
        if (character == null)
            return new List<Equipment>();

        // Return all equipment from warband stash (not filtered by CanEquip)
        // The UI will show errors if items can't be equipped
        return warband.Stash.ToList();
    }

    public async Task BuyEquipmentAsync(string warbandId, string equipmentId, string equipmentType, string? traderId = null)
    {
        _logger?.LogInformation("BuyEquipmentAsync called: WarbandId={WarbandId}, EquipmentId={EquipmentId}, Type={Type}, TraderId={TraderId}",
            warbandId, equipmentId, equipmentType, traderId);

        var warband = await GetWarbandAsync(warbandId);
        if (warband == null)
        {
            _logger?.LogError("Warband not found: {WarbandId}", warbandId);
            throw new InvalidOperationException("Warband not found");
        }

        _logger?.LogInformation("Warband found: {WarbandName}, Gold={Gold}", warband.Name, warband.Gold);

        // Load trader if specified
        Trader? trader = null;
        if (!string.IsNullOrEmpty(traderId))
        {
            trader = await _traderService.GetTraderByIdAsync(traderId, warband.GameVariant);
            if (trader == null)
            {
                _logger?.LogError("Trader not found: {TraderId}", traderId);
                throw new InvalidOperationException("Trader not found");
            }
            _logger?.LogInformation("Trader loaded: {TraderName}", trader.Name);
        }

        // Load equipment from service
        Equipment? newEquipment = null;
        int buyPrice = 0;

        switch (equipmentType.ToLower())
        {
            case "weapon":
                var weapon = await _equipmentService.GetWeaponByIdAsync(equipmentId, warband.GameVariant);
                if (weapon == null)
                    throw new InvalidOperationException("Weapon not found");

                if (weapon.Cost == null)
                    throw new InvalidOperationException("This weapon cannot be purchased");

                // Calculate buy price with trader or use base cost
                buyPrice = trader != null
                    ? trader.CalculateBuyPrice(weapon.Cost.Value)
                    : weapon.Cost.Value;

                if (!warband.CanAfford(buyPrice))
                    throw new InvalidOperationException($"Not enough gold. Need {buyPrice}, have {warband.Gold}");

                newEquipment = new Equipment
                {
                    Name = weapon.Name,
                    Type = "weapon",
                    Damage = weapon.Damage,
                    Properties = weapon.Properties,
                    Stat = weapon.Stat,
                    Cost = weapon.Cost.Value,
                    Slots = weapon.Slots,
                    IconClass = weapon.IconClass
                };
                break;

            case "armor":
                var armor = await _equipmentService.GetArmorByIdAsync(equipmentId, warband.GameVariant);
                if (armor == null)
                    throw new InvalidOperationException("Armor not found");

                if (armor.Cost == null)
                    throw new InvalidOperationException("This armor cannot be purchased");

                // Calculate buy price with trader or use base cost
                buyPrice = trader != null
                    ? trader.CalculateBuyPrice(armor.Cost.Value)
                    : armor.Cost.Value;

                if (!warband.CanAfford(buyPrice))
                    throw new InvalidOperationException($"Not enough gold. Need {buyPrice}, have {warband.Gold}");

                newEquipment = new Equipment
                {
                    Name = armor.Name,
                    Type = "armor",
                    ArmorValue = armor.ArmorValue,
                    ArmorType = armor.ArmorType,
                    Special = armor.Special,
                    Cost = armor.Cost.Value,
                    Slots = armor.Slots,
                    IconClass = armor.IconClass
                };
                break;

            case "item":
                var item = await _equipmentService.GetItemByIdAsync(equipmentId, warband.GameVariant);
                if (item == null)
                    throw new InvalidOperationException("Item not found");

                if (item.Cost == null)
                    throw new InvalidOperationException("This item cannot be purchased");

                // Calculate buy price with trader or use base cost
                buyPrice = trader != null
                    ? trader.CalculateBuyPrice(item.Cost.Value)
                    : item.Cost.Value;

                if (!warband.CanAfford(buyPrice))
                    throw new InvalidOperationException($"Not enough gold. Need {buyPrice}, have {warband.Gold}");

                newEquipment = new Equipment
                {
                    Name = item.Name,
                    Type = "item",
                    Effect = item.Effect,
                    Cost = item.Cost.Value,
                    Slots = item.Slots,
                    IconClass = item.IconClass
                };
                break;

            default:
                throw new InvalidOperationException($"Unknown equipment type: {equipmentType}");
        }

        // Deduct gold and add to stash
        _logger?.LogInformation("Buying {EquipmentName} for {Price} gold. Gold before: {GoldBefore}", newEquipment.Name, buyPrice, warband.Gold);
        warband.Gold -= buyPrice;
        warband.Stash.Add(newEquipment);
        warband.UpdateLastModified();
        _logger?.LogInformation("Gold after purchase: {GoldAfter}, Stash count: {StashCount}", warband.Gold, warband.Stash.Count);

        await _warbandRepository.SaveAsync(warband);
        _logger?.LogInformation("Warband saved to repository");

        _state.NotifyStateChanged();
        _state.NotifyWarbandChanged(warbandId);
        _logger?.LogInformation("State change notifications sent");
    }

    public async Task SellEquipmentAsync(string warbandId, string equipmentId, string? traderId = null)
    {
        var warband = await GetWarbandAsync(warbandId);
        if (warband == null)
            throw new InvalidOperationException("Warband not found");

        var equipment = warband.Stash.FirstOrDefault(e => e.Id == equipmentId);
        if (equipment == null)
            throw new InvalidOperationException("Equipment not found in stash");

        // Load trader if specified
        Trader? trader = null;
        if (!string.IsNullOrEmpty(traderId))
        {
            trader = await _traderService.GetTraderByIdAsync(traderId, warband.GameVariant);
            if (trader == null)
                throw new InvalidOperationException("Trader not found");
        }

        // Calculate sell price with trader or use base cost
        int sellPrice = trader != null
            ? trader.CalculateSellPrice(equipment.Cost)
            : equipment.Cost;

        // Add gold and remove from stash
        warband.Gold += sellPrice;
        warband.Stash.Remove(equipment);
        warband.UpdateLastModified();

        await _warbandRepository.SaveAsync(warband);
        _state.NotifyStateChanged();
        _state.NotifyWarbandChanged(warbandId);
    }

    public async Task TransferEquipmentToCharacterAsync(string warbandId, string characterId, string equipmentId)
    {
        var warband = await GetWarbandAsync(warbandId);
        if (warband == null)
            throw new InvalidOperationException("Warband not found");

        var character = warband.Members.FirstOrDefault(m => m.Id == characterId);
        if (character == null)
            throw new InvalidOperationException("Character not found");

        var equipment = warband.Stash.FirstOrDefault(e => e.Id == equipmentId);
        if (equipment == null)
            throw new InvalidOperationException("Equipment not found in stash");

        // Validate equipment using the validator
        var validationError = _equipmentValidator.ValidateEquipment(character, equipment);
        if (validationError != null)
            throw new InvalidOperationException(validationError);

        // Transfer equipment
        warband.Stash.Remove(equipment);
        character.Equipment.Add(equipment);
        warband.UpdateLastModified();

        await _warbandRepository.SaveAsync(warband);
        _state.NotifyStateChanged();
        _state.NotifyWarbandChanged(warbandId);
    }

    public async Task TransferEquipmentToStashAsync(string warbandId, string characterId, string equipmentId)
    {
        var warband = await GetWarbandAsync(warbandId);
        if (warband == null)
            throw new InvalidOperationException("Warband not found");

        var character = warband.Members.FirstOrDefault(m => m.Id == characterId);
        if (character == null)
            throw new InvalidOperationException("Character not found");

        var equipment = character.Equipment.FirstOrDefault(e => e.Id == equipmentId);
        if (equipment == null)
            throw new InvalidOperationException("Equipment not found on character");

        // Transfer equipment
        character.Equipment.Remove(equipment);
        warband.Stash.Add(equipment);
        warband.UpdateLastModified();

        await _warbandRepository.SaveAsync(warband);
        _state.NotifyStateChanged();
        _state.NotifyWarbandChanged(warbandId);
    }
}