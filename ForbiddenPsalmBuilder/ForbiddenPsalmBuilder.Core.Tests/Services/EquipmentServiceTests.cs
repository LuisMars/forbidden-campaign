using ForbiddenPsalmBuilder.Core.Services;
using ForbiddenPsalmBuilder.Core.Models.Selection;
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
        var weaponData = new Dictionary<string, List<object>>
        {
            ["oneHandedMelee"] = new List<object>
            {
                new Dictionary<string, object>
                {
                    ["name"] = "Dagger",
                    ["damage"] = "D4",
                    ["stat"] = "Agility",
                    ["cost"] = 1,
                    ["slots"] = 1,
                    ["properties"] = new List<string> { "Thrown" }
                }
            }
        };

        _mockResourceService
            .Setup(x => x.GetGameResourceAsync<Dictionary<string, List<object>>>("28-psalms", "weapons.json"))
            .ReturnsAsync(weaponData);

        // Act
        var weapons = await _service.GetWeaponsAsync("28-psalms");

        // Assert
        Assert.NotEmpty(weapons);
        Assert.Contains(weapons, w => w.Name == "Dagger");

        // Verify caching - should not call resource service again
        await _service.GetWeaponsAsync("28-psalms");
        _mockResourceService.Verify(
            x => x.GetGameResourceAsync<Dictionary<string, List<object>>>("28-psalms", "weapons.json"),
            Times.Once
        );
    }

    [Fact]
    public async Task GetWeaponByIdAsync_ShouldReturnWeapon_WhenExists()
    {
        // Arrange
        var weaponData = new Dictionary<string, List<object>>
        {
            ["oneHandedMelee"] = new List<object>
            {
                new Dictionary<string, object>
                {
                    ["name"] = "Sword",
                    ["damage"] = "D6",
                    ["stat"] = "Strength",
                    ["cost"] = 3,
                    ["slots"] = 1,
                    ["properties"] = new List<string>()
                }
            }
        };

        _mockResourceService
            .Setup(x => x.GetGameResourceAsync<Dictionary<string, List<object>>>("28-psalms", "weapons.json"))
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
            .Setup(x => x.GetGameResourceAsync<Dictionary<string, List<object>>>("invalid", "weapons.json"))
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
        var weaponData = new Dictionary<string, List<object>>
        {
            ["oneHandedMelee"] = new List<object>
            {
                new Dictionary<string, object>
                {
                    ["name"] = "Dagger",
                    ["damage"] = "D4",
                    ["stat"] = "Agility",
                    ["cost"] = 1,
                    ["slots"] = 1,
                    ["properties"] = new List<string>()
                }
            },
            ["twoHandedRanged"] = new List<object>
            {
                new Dictionary<string, object>
                {
                    ["name"] = "Bow",
                    ["damage"] = "D6",
                    ["stat"] = "Presence",
                    ["cost"] = 5,
                    ["slots"] = 2,
                    ["properties"] = new List<string> { "Ranged" }
                }
            }
        };

        _mockResourceService
            .Setup(x => x.GetGameResourceAsync<Dictionary<string, List<object>>>("28-psalms", "weapons.json"))
            .ReturnsAsync(weaponData);

        // Act
        var weapons = await _service.GetWeaponsAsync("28-psalms");

        // Assert
        var dagger = weapons.First(w => w.Name == "Dagger");
        var bow = weapons.First(w => w.Name == "Bow");
        Assert.Equal("oneHandedMelee", dagger.Category);
        Assert.Equal("twoHandedRanged", bow.Category);
    }
}