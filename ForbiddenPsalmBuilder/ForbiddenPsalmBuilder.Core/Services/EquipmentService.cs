using ForbiddenPsalmBuilder.Core.Models.Selection;
using ForbiddenPsalmBuilder.Core.Models.GameData;
using ForbiddenPsalmBuilder.Data.Services;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace ForbiddenPsalmBuilder.Core.Services;

public class EquipmentService
{
    private readonly IEmbeddedResourceService _resourceService;
    private readonly ILogger<EquipmentService>? _logger;
    private Dictionary<string, List<Weapon>> _weaponCache = new();
    private Dictionary<string, List<Armor>> _armorCache = new();
    private Dictionary<string, List<Item>> _itemCache = new();

    public EquipmentService()
    {
        _resourceService = new EmbeddedResourceService();
    }

    public EquipmentService(IEmbeddedResourceService resourceService, ILogger<EquipmentService>? logger = null)
    {
        _resourceService = resourceService;
        _logger = logger;
    }

    public async Task<List<Weapon>> GetWeaponsAsync(string gameVariant)
    {
        if (string.IsNullOrEmpty(gameVariant))
            return new List<Weapon>();

        // Check cache first
        if (_weaponCache.ContainsKey(gameVariant))
            return _weaponCache[gameVariant];

        try
        {
            var weaponData = await _resourceService.GetGameResourceAsync<WeaponsData>(
                gameVariant,
                "weapons.json"
            );

            if (weaponData == null)
                return new List<Weapon>();

            var weapons = new List<Weapon>();

            // Convert each category
            weapons.AddRange(ConvertWeaponDtos(weaponData.OneHandedMelee, "oneHandedMelee"));
            weapons.AddRange(ConvertWeaponDtos(weaponData.TwoHandedMelee, "twoHandedMelee"));
            weapons.AddRange(ConvertWeaponDtos(weaponData.OneHandedRanged, "oneHandedRanged"));
            weapons.AddRange(ConvertWeaponDtos(weaponData.TwoHandedRanged, "twoHandedRanged"));
            weapons.AddRange(ConvertWeaponDtos(weaponData.Throwables, "throwables"));

            _weaponCache[gameVariant] = weapons;
            return weapons;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error loading weapons for {GameVariant}", gameVariant);
            return new List<Weapon>();
        }
    }

    private List<Weapon> ConvertWeaponDtos(List<WeaponDto> dtos, string category)
    {
        return dtos.Select(dto => new Weapon
        {
            Id = dto.Name.ToLower().Replace(" ", "-"),
            Name = dto.Name,
            DisplayName = dto.Name,
            Description = $"{dto.Name} - {category}",
            Category = category,
            Damage = dto.Damage,
            Properties = dto.Properties,
            Stat = dto.Stat,
            Cost = dto.Cost,
            Slots = dto.Slots,
            TechLevel = dto.TechLevel,
            IconClass = dto.IconClass ?? "ra ra-sword"
        }).ToList();
    }

    public async Task<Weapon?> GetWeaponByIdAsync(string id, string gameVariant)
    {
        if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(gameVariant))
            return null;

        var weapons = await GetWeaponsAsync(gameVariant);
        return weapons.FirstOrDefault(w => w.Id.Equals(id, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<List<Armor>> GetArmorAsync(string gameVariant)
    {
        if (string.IsNullOrEmpty(gameVariant))
            return new List<Armor>();

        // Check cache first
        if (_armorCache.ContainsKey(gameVariant))
            return _armorCache[gameVariant];

        try
        {
            var armorData = await _resourceService.GetGameResourceAsync<List<object>>(
                gameVariant,
                "armor.json"
            );

            if (armorData == null)
                return new List<Armor>();

            var armorList = new List<Armor>();
            foreach (var armorObj in armorData)
            {
                var armor = ParseArmor(armorObj);
                if (armor != null)
                    armorList.Add(armor);
            }

            _armorCache[gameVariant] = armorList;
            return armorList;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error loading armor for {GameVariant}", gameVariant);
            return new List<Armor>();
        }
    }

    public async Task<Armor?> GetArmorByIdAsync(string id, string gameVariant)
    {
        if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(gameVariant))
            return null;

        var armorList = await GetArmorAsync(gameVariant);
        return armorList.FirstOrDefault(a => a.Id.Equals(id, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<List<Item>> GetItemsAsync(string gameVariant)
    {
        if (string.IsNullOrEmpty(gameVariant))
            return new List<Item>();

        // Check cache first
        if (_itemCache.ContainsKey(gameVariant))
            return _itemCache[gameVariant];

        try
        {
            var equipmentData = await _resourceService.GetGameResourceAsync<Dictionary<string, List<object>>>(
                gameVariant,
                "equipment.json"
            );

            if (equipmentData == null)
                return new List<Item>();

            var items = new List<Item>();

            // Parse items
            if (equipmentData.ContainsKey("items"))
            {
                foreach (var itemObj in equipmentData["items"])
                {
                    var item = ParseItem(itemObj, "item");
                    if (item != null)
                        items.Add(item);
                }
            }

            // Parse ammo
            if (equipmentData.ContainsKey("ammo"))
            {
                foreach (var ammoObj in equipmentData["ammo"])
                {
                    var ammo = ParseItem(ammoObj, "ammo");
                    if (ammo != null)
                        items.Add(ammo);
                }
            }

            _itemCache[gameVariant] = items;
            return items;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error loading items for {GameVariant}", gameVariant);
            return new List<Item>();
        }
    }

    public async Task<Item?> GetItemByIdAsync(string id, string gameVariant)
    {
        if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(gameVariant))
            return null;

        var items = await GetItemsAsync(gameVariant);
        return items.FirstOrDefault(i => i.Id.Equals(id, StringComparison.OrdinalIgnoreCase));
    }


    private Armor? ParseArmor(object armorObj)
    {
        try
        {
            var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(
                JsonSerializer.Serialize(armorObj)
            );

            if (dict == null) return null;

            var name = dict.ContainsKey("name") ? dict["name"].GetString() ?? "" : "";
            var armor = new Armor
            {
                Id = name.ToLower().Replace(" ", "-"),
                Name = name,
                DisplayName = $"{name} Armor",
                Description = $"{name} armor protection",
                ArmorValue = dict.ContainsKey("armorValue") ? dict["armorValue"].GetInt32() : 0,
                Cost = dict.ContainsKey("cost") ? dict["cost"].GetInt32() : 0,
                Slots = dict.ContainsKey("slots") ? dict["slots"].GetInt32() : 1,
                Special = dict.ContainsKey("special") && dict["special"].ValueKind != JsonValueKind.Null
                    ? dict["special"].GetString()
                    : null
            };

            if (dict.ContainsKey("effects"))
            {
                try
                {
                    armor.Effects = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(
                        dict["effects"].GetRawText()
                    ) ?? new List<Dictionary<string, object>>();
                }
                catch { }
            }

            if (dict.ContainsKey("restrictions"))
            {
                try
                {
                    armor.Restrictions = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(
                        dict["restrictions"].GetRawText()
                    ) ?? new List<Dictionary<string, object>>();
                }
                catch { }
            }

            return armor;
        }
        catch
        {
            return null;
        }
    }

    private Item? ParseItem(object itemObj, string type)
    {
        try
        {
            var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(
                JsonSerializer.Serialize(itemObj)
            );

            if (dict == null) return null;

            var name = type == "ammo"
                ? (dict.ContainsKey("type") ? dict["type"].GetString() ?? "" : "")
                : (dict.ContainsKey("name") ? dict["name"].GetString() ?? "" : "");

            var item = new Item
            {
                Id = name.ToLower().Replace(" ", "-"),
                Name = name,
                DisplayName = name,
                Description = type == "ammo" ? $"{name} ammunition" : name,
                Type = type,
                Cost = dict.ContainsKey("cost") ? dict["cost"].GetInt32() : 0,
                Slots = dict.ContainsKey("slots") ? dict["slots"].GetInt32() : 1,
                Effect = dict.ContainsKey("effect") ? dict["effect"].GetString() : null,
                Shots = dict.ContainsKey("shots") ? dict["shots"].GetInt32() : null,
                TechLevel = dict.ContainsKey("techLevel") ? dict["techLevel"].GetString() : null
            };

            return item;
        }
        catch
        {
            return null;
        }
    }
}