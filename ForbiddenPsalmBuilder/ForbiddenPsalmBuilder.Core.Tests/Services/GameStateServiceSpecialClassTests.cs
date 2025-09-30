using ForbiddenPsalmBuilder.Core.Models.Character;
using ForbiddenPsalmBuilder.Core.Models.Warband;
using ForbiddenPsalmBuilder.Core.Repositories;
using ForbiddenPsalmBuilder.Core.Services.State;
using ForbiddenPsalmBuilder.Core.Tests.Repositories;
using ForbiddenPsalmBuilder.Data.Services;
using Moq;
using Xunit;

namespace ForbiddenPsalmBuilder.Core.Tests.Services;

public class GameStateServiceSpecialClassTests
{
    private readonly GameStateService _service;
    private readonly GlobalGameState _state;
    private readonly InMemoryWarbandRepository _repository;

    public GameStateServiceSpecialClassTests()
    {
        _state = new GlobalGameState();
        _repository = new InMemoryWarbandRepository();
        var resourceService = new EmbeddedResourceService();
        _service = new GameStateService(_state, _repository, resourceService);

        // Load game data synchronously for tests
        _service.LoadGameDataAsync().GetAwaiter().GetResult();
    }

    [Fact]
    public async Task GetSpecialClassesAsync_ShouldReturnListForGameVariant()
    {
        // Act
        var specialClasses = await _service.GetSpecialClassesAsync("28-psalms");

        // Assert
        Assert.NotNull(specialClasses);
        Assert.NotEmpty(specialClasses);
        Assert.Contains(specialClasses, sc => sc.Id == "witch");
    }

    [Fact]
    public async Task GetSpecialClassByIdAsync_WithValidId_ShouldReturnSpecialClass()
    {
        // Act
        var witch = await _service.GetSpecialClassByIdAsync("witch", "28-psalms");

        // Assert
        Assert.NotNull(witch);
        Assert.Equal("witch", witch.Id);
        Assert.Equal("Witch", witch.Name);
    }

    [Fact]
    public async Task ValidateSpecialClassSelectionAsync_WithNoSelection_ShouldReturnNull()
    {
        // Arrange
        var warbandId = await _service.CreateWarbandAsync("Test Warband", "28-psalms");

        // Act
        var error = await _service.ValidateSpecialClassSelectionAsync(warbandId, null);

        // Assert
        Assert.Null(error); // No selection is valid
    }

    [Fact]
    public async Task ValidateSpecialClassSelectionAsync_WithWitchAndNoOtherWitch_ShouldReturnNull()
    {
        // Arrange
        var warbandId = await _service.CreateWarbandAsync("Test Warband", "28-psalms");

        // Act
        var error = await _service.ValidateSpecialClassSelectionAsync(warbandId, "witch");

        // Assert
        Assert.Null(error); // Should be valid - no other witch in warband
    }

    [Fact]
    public async Task ValidateSpecialClassSelectionAsync_WithSecondWitch_ShouldReturnError()
    {
        // Arrange
        var warbandId = await _service.CreateWarbandAsync("Test Warband", "28-psalms");

        // Add first witch
        var witch1 = new Character("Witch 1") { SpecialClassId = "witch" };
        await _service.AddCharacterToWarbandAsync(warbandId, witch1);

        // Act - Try to add second witch
        var error = await _service.ValidateSpecialClassSelectionAsync(warbandId, "witch");

        // Assert
        Assert.NotNull(error);
        Assert.Contains("maximum", error, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("witch", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ValidateSpecialClassSelectionAsync_EditingExistingWitch_ShouldBeValid()
    {
        // Arrange
        var warbandId = await _service.CreateWarbandAsync("Test Warband", "28-psalms");

        // Add witch
        var witch = new Character("Witch 1") { SpecialClassId = "witch" };
        var witchId = await _service.AddCharacterToWarbandAsync(warbandId, witch);

        // Act - Edit the existing witch (should exclude self from validation)
        var error = await _service.ValidateSpecialClassSelectionAsync(warbandId, "witch", witchId);

        // Assert
        Assert.Null(error); // Should be valid - editing existing witch, not adding new one
    }

    [Fact]
    public async Task ValidateSpecialClassSelectionAsync_WithMultipleCivilians_ShouldBeValid()
    {
        // Arrange
        var warbandId = await _service.CreateWarbandAsync("Test Warband", "last-war");

        // Add first civilian
        var civilian1 = new Character("Civilian 1") { SpecialClassId = "civilian" };
        await _service.AddCharacterToWarbandAsync(warbandId, civilian1);

        // Act - Try to add second civilian
        var error = await _service.ValidateSpecialClassSelectionAsync(warbandId, "civilian");

        // Assert
        Assert.Null(error); // Should be valid - civilian has canSelectMultiple: true
    }

    [Fact]
    public async Task ValidateSpecialClassSelectionAsync_WithSecondSniper_ShouldReturnError()
    {
        // Arrange
        var warbandId = await _service.CreateWarbandAsync("Test Warband", "last-war");

        // Add first sniper
        var sniper1 = new Character("Sniper 1") { SpecialClassId = "sniper" };
        await _service.AddCharacterToWarbandAsync(warbandId, sniper1);

        // Act - Try to add second sniper
        var error = await _service.ValidateSpecialClassSelectionAsync(warbandId, "sniper");

        // Assert
        Assert.NotNull(error);
        Assert.Contains("maximum", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CanAddSpecialClassAsync_WithAvailableSlot_ShouldReturnTrue()
    {
        // Arrange
        var warbandId = await _service.CreateWarbandAsync("Test Warband", "28-psalms");

        // Act
        var canAdd = await _service.CanAddSpecialClassAsync(warbandId, "witch");

        // Assert
        Assert.True(canAdd);
    }

    [Fact]
    public async Task CanAddSpecialClassAsync_WithLimitReached_ShouldReturnFalse()
    {
        // Arrange
        var warbandId = await _service.CreateWarbandAsync("Test Warband", "28-psalms");

        // Add witch
        var witch = new Character("Witch 1") { SpecialClassId = "witch" };
        await _service.AddCharacterToWarbandAsync(warbandId, witch);

        // Act
        var canAdd = await _service.CanAddSpecialClassAsync(warbandId, "witch");

        // Assert
        Assert.False(canAdd);
    }

    [Fact]
    public async Task CanAddSpecialClassAsync_WithNoLimit_ShouldReturnTrue()
    {
        // Arrange
        var warbandId = await _service.CreateWarbandAsync("Test Warband", "last-war");

        // Add civilian
        var civilian1 = new Character("Civilian 1") { SpecialClassId = "civilian" };
        await _service.AddCharacterToWarbandAsync(warbandId, civilian1);

        // Act
        var canAdd = await _service.CanAddSpecialClassAsync(warbandId, "civilian");

        // Assert
        Assert.True(canAdd); // Civilian has no limit
    }
}