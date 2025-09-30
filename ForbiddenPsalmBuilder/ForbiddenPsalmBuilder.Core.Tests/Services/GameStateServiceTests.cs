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
            SpecialClassId = "witch"
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
        Assert.Equal("witch", warband.Members.First().SpecialClassId);

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

    [Fact]
    public async Task GenerateWarbandNameAsync_ShouldReturnValidName()
    {
        // Act
        var result = await _service.GenerateWarbandNameAsync();

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);
        Assert.DoesNotContain("[", result); // Should not contain unprocessed tokens
        Assert.DoesNotContain("]", result);
    }

    [Fact]
    public async Task GenerateWarbandNameAsync_MultipleCalls_ShouldProduceDifferentResults()
    {
        // Act
        var names = new HashSet<string>();
        for (int i = 0; i < 20; i++)
        {
            var name = await _service.GenerateWarbandNameAsync();
            names.Add(name);
        }

        // Assert
        Assert.True(names.Count > 1, "Should generate varied names");
    }

    [Fact]
    public async Task GenerateCharacterNameAsync_28Psalms_ShouldReturnValidName()
    {
        // Act
        var result = await _service.GenerateCharacterNameAsync("28-psalms");

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);
        Assert.NotEqual("Unnamed", result); // Should not be default fallback
    }

    [Fact]
    public async Task GenerateCharacterNameAsync_EndTimes_ShouldReturnValidName()
    {
        // Act
        var result = await _service.GenerateCharacterNameAsync("end-times");

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);
        Assert.NotEqual("Unnamed", result); // Should not be default fallback
        // End times can return either "FirstName Title" or a complete name
    }

    [Fact]
    public async Task GenerateCharacterNameAsync_LastWar_ShouldReturnValidName()
    {
        // Act
        var result = await _service.GenerateCharacterNameAsync("last-war");

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);
        Assert.NotEqual("Unnamed", result); // Should not be default fallback
        // Last war can return "FirstName Suffix", "Prefix FirstName", or "Prefix FirstName Suffix"
    }

    [Fact]
    public async Task GenerateCharacterNameAsync_MultipleCalls_ShouldProduceDifferentResults()
    {
        // Act
        var names = new HashSet<string>();
        for (int i = 0; i < 20; i++)
        {
            var name = await _service.GenerateCharacterNameAsync("end-times");
            names.Add(name);
        }

        // Assert
        Assert.True(names.Count > 1, "Should generate varied character names");
    }

    [Fact]
    public async Task GenerateCharacterNameAsync_UnknownVariant_ShouldReturnDefaultName()
    {
        // Act
        var result = await _service.GenerateCharacterNameAsync("unknown-variant");

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);
    }

    [Fact]
    public async Task GenerateCharacterNameAsync_28Psalms_ShouldPickFrom28PsalmsData()
    {
        // Known names from 28-psalms data (expanded list from names.json)
        var known28PsalmsNames = new HashSet<string>
        {
            "Rex", "Gridotus", "Mister Quimper", "Inquisitor Lucius", "David C. Moore",
            "Ophelia", "Alex Goode", "John R. Young", "Merlin", "Filthor",
            "Zachary Knippel", "Capitald", "Matthias Mencel", "William B", "Zac Mazey",
            "The Dour Kin", "Gabe Benavides", "Robert Lee", "Paul Wilson", "Abby",
            "Cecil", "George Kaldis", "Shawn Turpin", "Kiral", "Charles Chapman",
            "Dennis McGeen", "ElDavePhoto", "Fenrikson", "Nick", "shawn hakl",
            "Alexander", "(_><)", "DerOlfork", "Devon Tackett", "Christopher Moses"
        };

        // Act - Generate 50 names to get good coverage
        var generated = new HashSet<string>();
        for (int i = 0; i < 50; i++)
        {
            var name = await _service.GenerateCharacterNameAsync("28-psalms");
            generated.Add(name);
        }

        // Assert - At least some should match known 28-psalms names
        var matchCount = generated.Intersect(known28PsalmsNames).Count();
        Assert.True(matchCount > 0,
            $"Should generate at least some names from 28-psalms data. Found {matchCount} matches out of {generated.Count} generated names.");
    }

    [Fact]
    public async Task GenerateCharacterNameAsync_EndTimes_ShouldPickFromEndTimesData()
    {
        // Known first names and complete names from end-times data
        var knownEndTimesFirstNames = new HashSet<string>
        {
            "Nohr", "Ash", "Darkest", "Saint", "Mother", "Hugo", "Ryan", "Willnox"
        };

        var knownEndTimesCompleteNames = new HashSet<string>
        {
            "Hugo Stieglitz", "Ryan R", "Willnox", "Danny The Deströyer", "Ymön"
        };

        // Act - Generate 50 names
        var generated = new HashSet<string>();
        for (int i = 0; i < 50; i++)
        {
            var name = await _service.GenerateCharacterNameAsync("end-times");
            generated.Add(name);
        }

        // Assert - Should find either complete names or names starting with known first names
        var completeMatches = generated.Intersect(knownEndTimesCompleteNames).Count();
        var firstNameMatches = generated.Count(name =>
            knownEndTimesFirstNames.Any(fn => name.StartsWith(fn)));

        Assert.True(completeMatches > 0 || firstNameMatches > 0,
            $"Should generate names from end-times data. Complete matches: {completeMatches}, First name matches: {firstNameMatches}");
    }

    [Fact]
    public async Task GenerateCharacterNameAsync_EndTimes_ShouldAlwaysHaveEitherCompleteNameOrFirstNameWithTitle()
    {
        // Known first names that should NOT appear alone
        var knownFirstNamesOnly = new HashSet<string>
        {
            "Nohr", "Ash", "Darkest", "Saint", "Mother", "Dire", "Dre", "Lemon", "Steven",
            "Beca", "Jherek", "Carys", "Owain", "Marc", "Tomos", "Nadia", "Pete", "Bruce"
        };

        // Act - Generate 100 names
        var generated = new HashSet<string>();
        for (int i = 0; i < 100; i++)
        {
            var name = await _service.GenerateCharacterNameAsync("end-times");
            generated.Add(name);
        }

        // Assert - No names should be JUST a single first name from the knownFirstNamesOnly list
        // They should either be:
        // 1. A complete name (from completeNames list), OR
        // 2. A firstName combined with a title (containing "The ")
        var justFirstNames = generated.Where(name =>
            knownFirstNamesOnly.Contains(name)
        ).ToList();

        Assert.Empty(justFirstNames);
    }

    [Fact]
    public async Task GenerateCharacterNameAsync_LastWar_ShouldPickFromLastWarData()
    {
        // Known first names and title components from last-war data
        var knownLastWarFirstNames = new HashSet<string>
        {
            "Wilhelm", "René", "Edward", "Tommy", "Mary", "Kaiser", "General", "Ghost"
        };

        var knownLastWarPrefixes = new HashSet<string>
        {
            "Private 1st. class", "Captain", "Lieutenant", "Major", "Baron", "Nurse"
        };

        var knownLastWarSuffixes = new HashSet<string>
        {
            "Jr", "The Hellfighter", "the Tommy", "the Baron", "the Wolf", "the Ace"
        };

        // Act - Generate 100 names (more because of prefix/suffix combinations)
        var generated = new List<string>();
        for (int i = 0; i < 100; i++)
        {
            var name = await _service.GenerateCharacterNameAsync("last-war");
            generated.Add(name);
        }

        // Assert - Should find names with known first names, and possibly prefixes/suffixes
        var firstNameMatches = generated.Count(name =>
            knownLastWarFirstNames.Any(fn => name.Contains(fn)));

        var prefixMatches = generated.Count(name =>
            knownLastWarPrefixes.Any(p => name.StartsWith(p)));

        var suffixMatches = generated.Count(name =>
            knownLastWarSuffixes.Any(s => name.EndsWith(s)));

        Assert.True(firstNameMatches > 0,
            $"Should generate names containing last-war first names. Found {firstNameMatches} matches.");

        // Some names should have prefixes or suffixes (33% chance each)
        Assert.True(prefixMatches > 0 || suffixMatches > 0,
            $"Should generate names with last-war titles. Prefix matches: {prefixMatches}, Suffix matches: {suffixMatches}");
    }

    [Fact]
    public async Task GenerateCharacterNameAsync_28Psalms_ShouldNotUsEndTimesData()
    {
        // Known end-times complete names that should NOT appear in 28-psalms
        var endTimesOnlyNames = new HashSet<string>
        {
            "Hugo Stieglitz", "Ryan R", "Willnox", "Danny The Deströyer", "Soupbone"
        };

        // Act - Generate 100 names
        var generated = new HashSet<string>();
        for (int i = 0; i < 100; i++)
        {
            var name = await _service.GenerateCharacterNameAsync("28-psalms");
            generated.Add(name);
        }

        // Assert - Should not contain any end-times-only names
        var wrongDataMatches = generated.Intersect(endTimesOnlyNames).ToList();
        Assert.Empty(wrongDataMatches);
    }

    [Fact]
    public async Task GenerateCharacterNameAsync_LastWar_ShouldNotUse28PsalmsData()
    {
        // Known 28-psalms names that should NOT appear in last-war
        var psalmsOnlyNames = new HashSet<string>
        {
            "Gridotus", "Inquisitor Lucius", "Capitald", "Matthias Mencel"
        };

        // Act - Generate 100 names
        var generated = new HashSet<string>();
        for (int i = 0; i < 100; i++)
        {
            var name = await _service.GenerateCharacterNameAsync("last-war");
            generated.Add(name);
        }

        // Assert - Should not contain any 28-psalms-only names
        var wrongDataMatches = generated.Intersect(psalmsOnlyNames).ToList();
        Assert.Empty(wrongDataMatches);
    }

    [Fact]
    public async Task UpdateCharacterAsync_ShouldUpdateCharacterAndSaveToRepository()
    {
        // Arrange
        var warband = new Warband("Test Warband", "last-war");
        var character = new Character("Original Name")
        {
            Stats = new Stats(1, 1, 1, 1)
        };
        warband.Members.Add(character);
        _state.Warbands[warband.Id] = warband;

        var updatedCharacter = new Character("Updated Name")
        {
            Stats = new Stats(2, 2, 2, 2),
            SpecialClassId = "witch"
        };

        // Setup mock repository to return the warband when SaveAsync is called
        _mockRepository.Setup(r => r.SaveAsync(It.IsAny<Warband>()))
                      .ReturnsAsync((Warband w) => w);

        // Act
        await _service.UpdateCharacterAsync(warband.Id, character.Id, updatedCharacter);

        // Assert
        Assert.Single(warband.Members);
        Assert.Equal("Updated Name", warband.Members.First().Name);
        Assert.Equal(2, warband.Members.First().Stats.Agility);
        Assert.Equal("witch", warband.Members.First().SpecialClassId);

        // Verify the repository SaveAsync was called
        _mockRepository.Verify(r => r.SaveAsync(warband), Times.Once);
    }

    [Fact]
    public async Task UpdateCharacterAsync_CharacterNotFound_ShouldThrowException()
    {
        // Arrange
        var warband = new Warband("Test Warband", "last-war");
        _state.Warbands[warband.Id] = warband;

        var updatedCharacter = new Character("Updated Name")
        {
            Stats = new Stats(2, 2, 2, 2)
        };

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.UpdateCharacterAsync(warband.Id, "non-existent-id", updatedCharacter));

        Assert.Contains("Character not found", exception.Message);

        // Verify the repository SaveAsync was NOT called since the operation should fail
        _mockRepository.Verify(r => r.SaveAsync(It.IsAny<Warband>()), Times.Never);
    }

    [Fact]
    public async Task RemoveCharacterFromWarbandAsync_ShouldRemoveCharacterAndSaveToRepository()
    {
        // Arrange
        var warband = new Warband("Test Warband", "last-war");
        var character1 = new Character("Character 1");
        var character2 = new Character("Character 2");
        warband.Members.Add(character1);
        warband.Members.Add(character2);
        _state.Warbands[warband.Id] = warband;

        // Setup mock repository to return the warband when SaveAsync is called
        _mockRepository.Setup(r => r.SaveAsync(It.IsAny<Warband>()))
                      .ReturnsAsync((Warband w) => w);

        // Act
        await _service.RemoveCharacterFromWarbandAsync(warband.Id, character1.Id);

        // Assert
        Assert.Single(warband.Members);
        Assert.Equal("Character 2", warband.Members.First().Name);

        // Verify the repository SaveAsync was called
        _mockRepository.Verify(r => r.SaveAsync(warband), Times.Once);
    }

    [Fact]
    public async Task RemoveCharacterFromWarbandAsync_CharacterNotFound_ShouldThrowException()
    {
        // Arrange
        var warband = new Warband("Test Warband", "last-war");
        _state.Warbands[warband.Id] = warband;

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.RemoveCharacterFromWarbandAsync(warband.Id, "non-existent-id"));

        Assert.Contains("Character not found", exception.Message);

        // Verify the repository SaveAsync was NOT called since the operation should fail
        _mockRepository.Verify(r => r.SaveAsync(It.IsAny<Warband>()), Times.Never);
    }

    [Fact]
    public async Task CreateWarbandAsync_ShouldSaveToRepository()
    {
        // Arrange
        await _service.LoadGameDataAsync(); // Ensure game configs are loaded
        var warbandName = "New Warband";
        var gameVariant = "last-war";

        _mockRepository.Setup(r => r.SaveAsync(It.IsAny<Warband>()))
                      .ReturnsAsync((Warband w) => w);

        // Act
        var warbandId = await _service.CreateWarbandAsync(warbandName, gameVariant);

        // Assert
        Assert.NotNull(warbandId);

        // Verify the repository SaveAsync was called
        _mockRepository.Verify(r => r.SaveAsync(It.Is<Warband>(w =>
            w.Name == warbandName && w.GameVariant == gameVariant)), Times.Once);
    }

    [Fact]
    public async Task DeleteWarbandAsync_ShouldCallRepositoryDelete()
    {
        // Arrange
        var warband = new Warband("Test Warband", "last-war");
        _state.Warbands[warband.Id] = warband;

        _mockRepository.Setup(r => r.DeleteAsync(warband.Id))
                      .ReturnsAsync(true);

        // Act
        await _service.DeleteWarbandAsync(warband.Id);

        // Assert
        // Verify the repository DeleteAsync was called
        _mockRepository.Verify(r => r.DeleteAsync(warband.Id), Times.Once);
    }

    [Fact]
    public async Task UpdateWarbandAsync_ShouldSaveToRepository()
    {
        // Arrange
        var warband = new Warband("Original Name", "last-war");
        _state.Warbands[warband.Id] = warband;

        _mockRepository.Setup(r => r.ExistsAsync(warband.Id))
                      .ReturnsAsync(true);
        _mockRepository.Setup(r => r.SaveAsync(It.IsAny<Warband>()))
                      .ReturnsAsync((Warband w) => w);

        // Modify warband
        warband.Name = "Updated Name";

        // Act
        await _service.UpdateWarbandAsync(warband);

        // Assert
        // Verify the repository SaveAsync was called
        _mockRepository.Verify(r => r.SaveAsync(It.Is<Warband>(w =>
            w.Id == warband.Id && w.Name == "Updated Name")), Times.Once);
    }

    /// <summary>
    /// This test ensures all state-modifying methods persist changes to the repository.
    /// If you add a new method that modifies warband state, add a test case here.
    /// This prevents bugs where in-memory state is updated but not persisted.
    /// </summary>
    [Theory]
    [InlineData("CreateWarband")]
    [InlineData("UpdateWarband")]
    [InlineData("DeleteWarband")]
    [InlineData("AddCharacter")]
    [InlineData("UpdateCharacter")]
    [InlineData("RemoveCharacter")]
    public async Task AllStateModifyingMethods_ShouldPersistToRepository(string operation)
    {
        // This test serves as documentation and a reminder that all operations
        // that modify warband state MUST persist changes to the repository.
        //
        // When adding new state-modifying methods to GameStateService:
        // 1. Add a new test case to this Theory with the method name
        // 2. Implement the actual test in the switch statement below
        // 3. Verify the repository Save/Delete method is called
        //
        // This pattern ensures we don't forget to persist changes in the future.

        await _service.LoadGameDataAsync(); // Ensure game configs are loaded

        _mockRepository.Setup(r => r.SaveAsync(It.IsAny<Warband>()))
                      .ReturnsAsync((Warband w) => w);
        _mockRepository.Setup(r => r.DeleteAsync(It.IsAny<string>()))
                      .ReturnsAsync(true);
        _mockRepository.Setup(r => r.ExistsAsync(It.IsAny<string>()))
                      .ReturnsAsync(true);

        switch (operation)
        {
            case "CreateWarband":
                await _service.CreateWarbandAsync("Test", "last-war");
                _mockRepository.Verify(r => r.SaveAsync(It.IsAny<Warband>()), Times.Once);
                break;

            case "UpdateWarband":
                var warband1 = new Warband("Test", "last-war");
                _state.Warbands[warband1.Id] = warband1;
                await _service.UpdateWarbandAsync(warband1);
                _mockRepository.Verify(r => r.SaveAsync(It.IsAny<Warband>()), Times.Once);
                break;

            case "DeleteWarband":
                var warband2 = new Warband("Test", "last-war");
                _state.Warbands[warband2.Id] = warband2;
                await _service.DeleteWarbandAsync(warband2.Id);
                _mockRepository.Verify(r => r.DeleteAsync(warband2.Id), Times.Once);
                break;

            case "AddCharacter":
                var warband3 = new Warband("Test", "last-war");
                _state.Warbands[warband3.Id] = warband3;
                await _service.AddCharacterToWarbandAsync(warband3.Id, new Character("Test"));
                _mockRepository.Verify(r => r.SaveAsync(It.IsAny<Warband>()), Times.Once);
                break;

            case "UpdateCharacter":
                var warband4 = new Warband("Test", "last-war");
                var character = new Character("Original");
                warband4.Members.Add(character);
                _state.Warbands[warband4.Id] = warband4;
                await _service.UpdateCharacterAsync(warband4.Id, character.Id, new Character("Updated"));
                _mockRepository.Verify(r => r.SaveAsync(It.IsAny<Warband>()), Times.Once);
                break;

            case "RemoveCharacter":
                var warband5 = new Warband("Test", "last-war");
                var character2 = new Character("Test");
                warband5.Members.Add(character2);
                _state.Warbands[warband5.Id] = warband5;
                await _service.RemoveCharacterFromWarbandAsync(warband5.Id, character2.Id);
                _mockRepository.Verify(r => r.SaveAsync(It.IsAny<Warband>()), Times.Once);
                break;

            default:
                throw new ArgumentException($"Unknown operation: {operation}. Please implement the test case.");
        }
    }

}