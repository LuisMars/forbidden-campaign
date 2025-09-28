namespace ForbiddenPsalmBuilder.Core.Models.Character;

public class Character
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public Stats Stats { get; set; } = new();
    public List<string> Feats { get; set; } = new();
    public List<string> Flaws { get; set; } = new();
    public List<Equipment> Equipment { get; set; } = new();
    public int CurrentGold { get; set; }
    public int CurrentHP { get; set; }
    public bool IsSpellcaster { get; set; }
    public string? SpecialTrooperType { get; set; }
    public List<string> Injuries { get; set; } = new();
    public int Experience { get; set; }

    public Character()
    {
        CurrentHP = Stats.HP;
    }

    public Character(string name) : this()
    {
        Name = name;
    }

    // Calculate effective stats including equipment bonuses
    public Stats EffectiveStats => Stats; // TODO: Add equipment modifiers

    // Check if character can equip more items
    public bool CanEquip(Equipment item) =>
        Equipment.Sum(e => e.Slots) + item.Slots <= Stats.EquipmentSlots;

    // Get total equipment value
    public int TotalEquipmentValue => Equipment.Sum(e => e.Cost);
}