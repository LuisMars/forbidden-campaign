using ForbiddenPsalmBuilder.Core.Models.Character;

namespace ForbiddenPsalmBuilder.Core.Models.Warband;

public class Warband
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string GameVariant { get; set; } = string.Empty;
    public List<Character.Character> Members { get; set; } = new();
    public int Gold { get; set; } = 50; // Starting budget
    public int Experience { get; set; }
    public List<string> UpgradesPurchased { get; set; } = new();
    public DateTime Created { get; set; } = DateTime.UtcNow;
    public DateTime LastModified { get; set; } = DateTime.UtcNow;

    public Warband() { }

    public Warband(string name, string gameVariant)
    {
        Name = name;
        GameVariant = gameVariant;
    }

    // Validation
    public bool IsValid => Members.Count <= 5 && Members.Count > 0;

    // Get total warband value
    public int TotalValue => Gold + Members.Sum(m => m.TotalEquipmentValue);

    // Check warband composition rules
    public bool CanAddMember => Members.Count < 5;

    public bool CanAddSpellcaster =>
        !Members.Any(m => m.IsSpellcaster) && GameVariant != "last-war";

    public bool CanAddSpecialTrooper =>
        !Members.Any(m => !string.IsNullOrEmpty(m.SpecialTrooperType)) && GameVariant == "last-war";

    public void UpdateLastModified() => LastModified = DateTime.UtcNow;
}