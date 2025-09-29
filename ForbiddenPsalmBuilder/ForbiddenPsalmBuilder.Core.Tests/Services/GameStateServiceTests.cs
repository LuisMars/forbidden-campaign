using ForbiddenPsalmBuilder.Core.Models.GameData;
using ForbiddenPsalmBuilder.Core.Models.Warband;
using ForbiddenPsalmBuilder.Core.Models.Character;
using ForbiddenPsalmBuilder.Core.Repositories;
using ForbiddenPsalmBuilder.Core.Services.State;
using Moq;
using Xunit;

namespace ForbiddenPsalmBuilder.Core.Tests.Services;

public class GameStateServiceTests
{
    private readonly Mock<IWarbandRepository> _mockRepository;
    private readonly GlobalGameState _state;
    private readonly GameStateService _service;

    public GameStateServiceTests()
    {
        _mockRepository = new Mock<IWarbandRepository>();
        _state = new GlobalGameState();
        _service = new GameStateService(_state, _mockRepository.Object);
    }

    [Fact]
    public async Task GetSpecialTrooperTypesAsync_LastWar_ReturnsCorrectTypes()
    {
        // Act
        var result = await _service.GetSpecialTrooperTypesAsync("last-war");

        // Assert
        Assert.Equal(3, result.Count);
        Assert.Contains("Witch", result);
        Assert.Contains("Sniper", result);
        Assert.Contains("Anti-Tank Gunner", result);
    }

    [Fact]
    public async Task GetSpecialTrooperTypesAsync_OtherVariants_ReturnsEmptyList()
    {
        // Act
        var result28Psalms = await _service.GetSpecialTrooperTypesAsync("28-psalms");
        var resultEndTimes = await _service.GetSpecialTrooperTypesAsync("end-times");
        var resultUnknown = await _service.GetSpecialTrooperTypesAsync("unknown");

        // Assert
        Assert.Empty(result28Psalms);
        Assert.Empty(resultEndTimes);
        Assert.Empty(resultUnknown);
    }

    [Fact]
    public async Task GetStatArraysAsync_ReturnsCorrectArrays()
    {
        // Act
        var result = await _service.GetStatArraysAsync();

        // Assert
        Assert.Equal(2, result.Count);

        var specialist = result.FirstOrDefault(a => a.Id == "specialist");
        Assert.NotNull(specialist);
        Assert.Equal("Specialist", specialist.Name);
        Assert.Equal(new[] { 3, 1, 0, -3 }, specialist.Values);
        Assert.Equal("High specialization with major weakness", specialist.Description);

        var balanced = result.FirstOrDefault(a => a.Id == "balanced");
        Assert.NotNull(balanced);
        Assert.Equal("Balanced", balanced.Name);
        Assert.Equal(new[] { 2, 2, -1, -2 }, balanced.Values);
        Assert.Equal("More balanced distribution", balanced.Description);
    }

    [Fact]
    public async Task AddCharacterToWarbandAsync_ShouldAddCharacterAndReturnId()
    {
        // Arrange
        var warband = new Warband("Test Warband", "last-war");
        _state.Warbands[warband.Id] = warband;

        var character = new Character("Test Character")
        {
            Stats = new Stats(2, 1, 3, 2),
            IsSpellcaster = true,
            SpecialTrooperType = "Witch",
            Experience = 15
        };

        // Setup mock repository to return the warband when SaveAsync is called
        _mockRepository.Setup(r => r.SaveAsync(It.IsAny<Warband>()))
                      .ReturnsAsync((Warband w) => w);

        // Act
        var characterId = await _service.AddCharacterToWarbandAsync(warband.Id, character);

        // Assert
        Assert.Equal(character.Id, characterId);
        Assert.Single(warband.Members);
        Assert.Equal(character, warband.Members.First());
        Assert.Equal("Test Character", warband.Members.First().Name);
        Assert.True(warband.Members.First().IsSpellcaster);
        Assert.Equal("Witch", warband.Members.First().SpecialTrooperType);
        Assert.Equal(15, warband.Members.First().Experience);

        // Verify the repository SaveAsync was called
        _mockRepository.Verify(r => r.SaveAsync(warband), Times.Once);
    }

    [Fact]
    public async Task AddCharacterToWarbandAsync_WarbandNotFound_ShouldThrowException()
    {
        // Arrange
        var character = new Character("Test Character");
        var nonExistentWarbandId = "non-existent-id";

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.AddCharacterToWarbandAsync(nonExistentWarbandId, character));

        Assert.Contains("Warband not found", exception.Message);
    }

    [Fact]
    public async Task AddCharacterToWarbandAsync_WarbandAtMaxSize_ShouldThrowException()
    {
        // Arrange
        var warband = new Warband("Test Warband", "last-war");

        // Fill warband to maximum capacity (5 members)
        for (int i = 0; i < 5; i++)
        {
            warband.Members.Add(new Character($"Member {i + 1}"));
        }

        _state.Warbands[warband.Id] = warband;

        var newCharacter = new Character("New Character");

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.AddCharacterToWarbandAsync(warband.Id, newCharacter));

        Assert.Contains("already at maximum size", exception.Message);

        // Verify the repository SaveAsync was NOT called since the operation should fail
        _mockRepository.Verify(r => r.SaveAsync(It.IsAny<Warband>()), Times.Never);
    }

}