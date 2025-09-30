using ForbiddenPsalmBuilder.Core.Models.Character;

namespace ForbiddenPsalmBuilder.Core.Tests;

public class CharacterTests
{
    [Fact]
    public void Character_ShouldInitializeWithDefaults()
    {
        var character = new Character();

        Assert.NotNull(character.Id);
        Assert.NotEmpty(character.Id);
        Assert.Equal(string.Empty, character.Name);
        Assert.NotNull(character.Stats);
        Assert.NotNull(character.Feats);
        Assert.NotNull(character.Flaws);
        Assert.NotNull(character.Equipment);
        Assert.NotNull(character.Injuries);
        Assert.Equal(0, character.CurrentGold);
        Assert.Null(character.SpecialClassId);
    }

    [Fact]
    public void Character_ShouldInitializeWithName()
    {
        var name = "Test Character";
        var character = new Character(name);

        Assert.Equal(name, character.Name);
        Assert.NotNull(character.Id);
        Assert.NotEmpty(character.Id);
    }

    [Fact]
    public void CanEquip_ShouldReturnTrueWhenSlotsAvailable()
    {
        var character = new Character();
        character.Stats.Strength = 5; // This gives 10 equipment slots (5 + 5)

        var equipment = new Equipment
        {
            Name = "Test Item",
            Slots = 3
        };

        var canEquip = character.CanEquip(equipment);

        Assert.True(canEquip);
    }

    [Fact]
    public void CanEquip_ShouldReturnFalseWhenSlotsExceeded()
    {
        var character = new Character();
        character.Stats.Strength = 0; // This gives 5 equipment slots (5 + 0)
        character.Equipment.Add(new Equipment { Name = "Existing", Slots = 3 });

        var equipment = new Equipment
        {
            Name = "Test Item",
            Slots = 3
        };

        var canEquip = character.CanEquip(equipment);

        Assert.False(canEquip);
    }

    [Fact]
    public void TotalEquipmentValue_ShouldSumEquipmentCosts()
    {
        var character = new Character();
        character.Equipment.Add(new Equipment { Name = "Item1", Cost = 10 });
        character.Equipment.Add(new Equipment { Name = "Item2", Cost = 25 });
        character.Equipment.Add(new Equipment { Name = "Item3", Cost = 5 });

        var totalValue = character.TotalEquipmentValue;

        Assert.Equal(40, totalValue);
    }

    [Fact]
    public void TotalEquipmentValue_ShouldReturnZeroForNoEquipment()
    {
        var character = new Character();

        var totalValue = character.TotalEquipmentValue;

        Assert.Equal(0, totalValue);
    }
}