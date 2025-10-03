using ForbiddenPsalmBuilder.Core.Services;
using ForbiddenPsalmBuilder.Core.Models.Selection;
using ForbiddenPsalmBuilder.Core.Models.GameData;
using ForbiddenPsalmBuilder.Data.Services;
using Moq;
using Xunit;

namespace ForbiddenPsalmBuilder.Core.Tests.Services;

public class EquipmentServiceTests
{
    private readonly Mock<IEmbeddedResourceService> _mockResourceService;
    private readonly EquipmentService _service;

    public EquipmentServiceTests()
    {
        _mockResourceService = new Mock<IEmbeddedResourceService>();
        _service = new EquipmentService(_mockResourceService.Object);
    }

    [Fact]
    public async Task GetWeaponsAsync_ShouldReturnEmptyList_WhenGameVariantIsEmpty()
    {
        // Act
        var result = await _service.GetWeaponsAsync("");

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetWeaponsAsync_ShouldLoadAndCacheWeapons()
    {
        // Arrange
        var weaponData = new WeaponsData
        {
            OneHandedMelee = new List<WeaponDto>
            {
                new WeaponDto
                {
                    Name = "Dagger",
                    Damage = "D4",
                    Stat = "Agility",
                    Cost = 1,
                    Slots = 1,
                    Properties = new List<string> { "Thrown" }
                }
            }
        };

        _mockResourceService
            .Setup(x => x.GetGameResourceAsync<WeaponsData>("28-psalms", "weapons.json"))
            .ReturnsAsync(weaponData);

        // Act
        var weapons = await _service.GetWeaponsAsync("28-psalms");

        // Assert
        Assert.NotEmpty(weapons);
        Assert.Contains(weapons, w => w.Name == "Dagger");

        // Verify caching - should not call resource service again
        await _service.GetWeaponsAsync("28-psalms");
        _mockResourceService.Verify(
            x => x.GetGameResourceAsync<WeaponsData>("28-psalms", "weapons.json"),
            Times.Once
        );
    }

    [Fact]
    public async Task GetWeaponByIdAsync_ShouldReturnWeapon_WhenExists()
    {
        // Arrange
        var weaponData = new WeaponsData
        {
            OneHandedMelee = new List<WeaponDto>
            {
                new WeaponDto
                {
                    Name = "Sword",
                    Damage = "D6",
                    Stat = "Strength",
                    Cost = 3,
                    Slots = 1,
                    Properties = new List<string>()
                }
            }
        };

        _mockResourceService
            .Setup(x => x.GetGameResourceAsync<WeaponsData>("28-psalms", "weapons.json"))
            .ReturnsAsync(weaponData);

        // Act
        var weapon = await _service.GetWeaponByIdAsync("sword", "28-psalms");

        // Assert
        Assert.NotNull(weapon);
        Assert.Equal("Sword", weapon.Name);
    }

    [Fact]
    public async Task GetArmorAsync_ShouldReturnEmptyList_WhenGameVariantIsEmpty()
    {
        // Act
        var result = await _service.GetArmorAsync("");

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetArmorAsync_ShouldLoadAndCacheArmor()
    {
        // Arrange
        var armorData = new List<object>
        {
            new Dictionary<string, object>
            {
                ["name"] = "Light",
                ["armorValue"] = 1,
                ["cost"] = 2,
                ["slots"] = 1
            }
        };

        _mockResourceService
            .Setup(x => x.GetGameResourceAsync<List<object>>("28-psalms", "armor.json"))
            .ReturnsAsync(armorData);

        // Act
        var armor = await _service.GetArmorAsync("28-psalms");

        // Assert
        Assert.NotEmpty(armor);
        Assert.Contains(armor, a => a.Name == "Light");

        // Verify caching
        await _service.GetArmorAsync("28-psalms");
        _mockResourceService.Verify(
            x => x.GetGameResourceAsync<List<object>>("28-psalms", "armor.json"),
            Times.Once
        );
    }

    [Fact]
    public async Task GetItemsAsync_ShouldReturnEmptyList_WhenGameVariantIsEmpty()
    {
        // Act
        var result = await _service.GetItemsAsync("");

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetItemsAsync_ShouldLoadAndCacheItems()
    {
        // Arrange
        var itemData = new Dictionary<string, List<object>>
        {
            ["items"] = new List<object>
            {
                new Dictionary<string, object>
                {
                    ["name"] = "Cheese",
                    ["effect"] = "Heals 1 HP",
                    ["cost"] = 3,
                    ["slots"] = 1
                }
            },
            ["ammo"] = new List<object>
            {
                new Dictionary<string, object>
                {
                    ["type"] = "Arrows",
                    ["shots"] = 5,
                    ["cost"] = 2,
                    ["slots"] = 1
                }
            }
        };

        _mockResourceService
            .Setup(x => x.GetGameResourceAsync<Dictionary<string, List<object>>>("28-psalms", "equipment.json"))
            .ReturnsAsync(itemData);

        // Act
        var items = await _service.GetItemsAsync("28-psalms");

        // Assert
        Assert.NotEmpty(items);
        Assert.Contains(items, i => i.Name == "Cheese");
        Assert.Contains(items, i => i.Name == "Arrows" && i.Type == "ammo");

        // Verify caching
        await _service.GetItemsAsync("28-psalms");
        _mockResourceService.Verify(
            x => x.GetGameResourceAsync<Dictionary<string, List<object>>>("28-psalms", "equipment.json"),
            Times.Once
        );
    }

    [Fact]
    public async Task GetWeaponsAsync_ShouldHandleErrors_AndReturnEmptyList()
    {
        // Arrange
        _mockResourceService
            .Setup(x => x.GetGameResourceAsync<WeaponsData>("invalid", "weapons.json"))
            .ThrowsAsync(new Exception("File not found"));

        // Act
        var weapons = await _service.GetWeaponsAsync("invalid");

        // Assert
        Assert.Empty(weapons);
    }

    [Fact]
    public async Task GetWeaponsAsync_ShouldAssignCategoryToWeapons()
    {
        // Arrange
        var weaponData = new WeaponsData
        {
            OneHandedMelee = new List<WeaponDto>
            {
                new WeaponDto
                {
                    Name = "Dagger",
                    Damage = "D4",
                    Stat = "Agility",
                    Cost = 1,
                    Slots = 1,
                    Properties = new List<string>()
                }
            },
            TwoHandedRanged = new List<WeaponDto>
            {
                new WeaponDto
                {
                    Name = "Bow",
                    Damage = "D6",
                    Stat = "Presence",
                    Cost = 5,
                    Slots = 2,
                    Properties = new List<string> { "Ranged" }
                }
            }
        };

        _mockResourceService
            .Setup(x => x.GetGameResourceAsync<WeaponsData>("28-psalms", "weapons.json"))
            .ReturnsAsync(weaponData);

        // Act
        var weapons = await _service.GetWeaponsAsync("28-psalms");

        // Assert
        var dagger = weapons.First(w => w.Name == "Dagger");
        var bow = weapons.First(w => w.Name == "Bow");
        Assert.Equal("oneHandedMelee", dagger.Category);
        Assert.Equal("twoHandedRanged", bow.Category);
    }

    [Fact]
    public async Task GetItemsAsync_EndTimes_ShouldLoadAmmoWithTypeField()
    {
        // Arrange - end-times equipment structure with separate ammo array
        var equipmentData = new Dictionary<string, List<object>>
        {
            ["items"] = new List<object>
            {
                new Dictionary<string, object>
                {
                    ["name"] = "Bandages",
                    ["effect"] = "Cures Bleeding",
                    ["cost"] = 1,
                    ["slots"] = 1,
                    ["roll"] = 1
                }
            },
            ["ammo"] = new List<object>
            {
                new Dictionary<string, object>
                {
                    ["type"] = "Ammo",
                    ["effect"] = "Five shots per stack of Ammo",
                    ["shots"] = 5,
                    ["cost"] = 1,
                    ["slots"] = 1
                },
                new Dictionary<string, object>
                {
                    ["type"] = "Cannonball",
                    ["effect"] = "One shot of Cannon Ammo",
                    ["shots"] = 1,
                    ["cost"] = 2,
                    ["slots"] = 1
                }
            }
        };

        _mockResourceService
            .Setup(x => x.GetGameResourceAsync<Dictionary<string, List<object>>>("end-times", "equipment.json"))
            .ReturnsAsync(equipmentData);

        // Act
        var items = await _service.GetItemsAsync("end-times");

        // Assert
        Assert.NotEmpty(items);

        // Verify regular items
        Assert.Contains(items, i => i.Name == "Bandages" && i.Type == "item");

        // Verify ammo items use "type" field and have Type = "ammo"
        var ammo = items.FirstOrDefault(i => i.Name == "Ammo");
        Assert.NotNull(ammo);
        Assert.Equal("ammo", ammo.Type);

        var cannonball = items.FirstOrDefault(i => i.Name == "Cannonball");
        Assert.NotNull(cannonball);
        Assert.Equal("ammo", cannonball.Type);
    }

    [Fact]
    public async Task GetWeaponsAsync_ShouldLoadAmmoType_ForRangedWeapons()
    {
        // Arrange - end-times ranged weapons with ammoType
        var weaponData = new WeaponsData
        {
            OneHandedRanged = new List<WeaponDto>
            {
                new WeaponDto
                {
                    Name = "Flintlock Pistol",
                    Damage = "D8",
                    Stat = "Presence",
                    Cost = 15,
                    Slots = 1,
                    Properties = new List<string> { "Ranged", "Explode", "Reload" },
                    AmmoType = "Ammo"
                }
            },
            TwoHandedRanged = new List<WeaponDto>
            {
                new WeaponDto
                {
                    Name = "Cannon",
                    Damage = "D20",
                    Stat = "Strength",
                    Cost = 100,
                    Slots = 2,
                    Properties = new List<string> { "Ranged", "Explode", "Reload" },
                    AmmoType = "Cannonball"
                }
            }
        };

        _mockResourceService
            .Setup(x => x.GetGameResourceAsync<WeaponsData>("end-times", "weapons.json"))
            .ReturnsAsync(weaponData);

        // Act
        var weapons = await _service.GetWeaponsAsync("end-times");

        // Assert
        var pistol = weapons.FirstOrDefault(w => w.Name == "Flintlock Pistol");
        Assert.NotNull(pistol);
        Assert.Equal("Ammo", pistol.AmmoType);
        Assert.True(pistol.RequiresAmmo);

        var cannon = weapons.FirstOrDefault(w => w.Name == "Cannon");
        Assert.NotNull(cannon);
        Assert.Equal("Cannonball", cannon.AmmoType);
        Assert.True(cannon.RequiresAmmo);
    }

    [Fact]
    public async Task GetCompatibleAmmo_ShouldReturnOnlyMatchingAmmoType()
    {
        // Arrange - setup weapon data
        var weaponData = new WeaponsData
        {
            OneHandedRanged = new List<WeaponDto>
            {
                new WeaponDto
                {
                    Name = "Flintlock Pistol",
                    Damage = "D8",
                    Stat = "Presence",
                    Cost = 15,
                    Slots = 1,
                    Properties = new List<string> { "Ranged", "Explode", "Reload" },
                    AmmoType = "Ammo"
                }
            }
        };

        // Setup ammo data
        var equipmentData = new Dictionary<string, List<object>>
        {
            ["items"] = new List<object>(),
            ["ammo"] = new List<object>
            {
                new Dictionary<string, object>
                {
                    ["type"] = "Ammo",
                    ["effect"] = "Five shots per stack of Ammo",
                    ["shots"] = 5,
                    ["cost"] = 1,
                    ["slots"] = 1
                },
                new Dictionary<string, object>
                {
                    ["type"] = "Cannonball",
                    ["effect"] = "One shot of Cannon Ammo",
                    ["shots"] = 1,
                    ["cost"] = 2,
                    ["slots"] = 1
                },
                new Dictionary<string, object>
                {
                    ["type"] = "Arrows",
                    ["effect"] = "Five arrows",
                    ["shots"] = 5,
                    ["cost"] = 2,
                    ["slots"] = 1
                }
            }
        };

        _mockResourceService
            .Setup(x => x.GetGameResourceAsync<WeaponsData>("end-times", "weapons.json"))
            .ReturnsAsync(weaponData);

        _mockResourceService
            .Setup(x => x.GetGameResourceAsync<Dictionary<string, List<object>>>("end-times", "equipment.json"))
            .ReturnsAsync(equipmentData);

        // Get the weapon
        var weapons = await _service.GetWeaponsAsync("end-times");
        var pistol = weapons.First(w => w.Name == "Flintlock Pistol");

        // Act
        var compatibleAmmo = await _service.GetCompatibleAmmo(pistol, "end-times");

        // Assert
        Assert.NotEmpty(compatibleAmmo);
        Assert.Single(compatibleAmmo);
        Assert.Equal("Ammo", compatibleAmmo.First().Name);
    }

    [Fact]
    public async Task GetCompatibleAmmo_ShouldReturnEmpty_WhenWeaponDoesNotRequireAmmo()
    {
        // Arrange - setup weapon data with no ammoType
        var weaponData = new WeaponsData
        {
            OneHandedMelee = new List<WeaponDto>
            {
                new WeaponDto
                {
                    Name = "Sword",
                    Damage = "D6",
                    Stat = "Strength",
                    Cost = 3,
                    Slots = 1,
                    Properties = new List<string>()
                }
            }
        };

        _mockResourceService
            .Setup(x => x.GetGameResourceAsync<WeaponsData>("28-psalms", "weapons.json"))
            .ReturnsAsync(weaponData);

        // Get the weapon
        var weapons = await _service.GetWeaponsAsync("28-psalms");
        var sword = weapons.First(w => w.Name == "Sword");

        // Act
        var compatibleAmmo = await _service.GetCompatibleAmmo(sword, "28-psalms");

        // Assert
        Assert.Empty(compatibleAmmo);
    }

    [Fact]
    public async Task GetCompatibleAmmo_ShouldReturnEmpty_WhenNoMatchingAmmoExists()
    {
        // Arrange - weapon needs "Plasma Cell" but only "Ammo" is available
        var weaponData = new WeaponsData
        {
            TwoHandedRanged = new List<WeaponDto>
            {
                new WeaponDto
                {
                    Name = "Plas-mar",
                    Damage = "D10",
                    Stat = "Presence",
                    Cost = 25,
                    Slots = 2,
                    Properties = new List<string> { "Reload 2", "Explode", "Ranged", "AP" },
                    AmmoType = "Plasma Cell"
                }
            }
        };

        var equipmentData = new Dictionary<string, List<object>>
        {
            ["items"] = new List<object>(),
            ["ammo"] = new List<object>
            {
                new Dictionary<string, object>
                {
                    ["type"] = "Ammo",
                    ["effect"] = "Five shots per stack of Ammo",
                    ["shots"] = 5,
                    ["cost"] = 1,
                    ["slots"] = 1
                }
            }
        };

        _mockResourceService
            .Setup(x => x.GetGameResourceAsync<WeaponsData>("28-psalms", "weapons.json"))
            .ReturnsAsync(weaponData);

        _mockResourceService
            .Setup(x => x.GetGameResourceAsync<Dictionary<string, List<object>>>("28-psalms", "equipment.json"))
            .ReturnsAsync(equipmentData);

        // Get the weapon
        var weapons = await _service.GetWeaponsAsync("28-psalms");
        var plasmar = weapons.First(w => w.Name == "Plas-mar");

        // Act
        var compatibleAmmo = await _service.GetCompatibleAmmo(plasmar, "28-psalms");

        // Assert
        Assert.Empty(compatibleAmmo);
    }
}