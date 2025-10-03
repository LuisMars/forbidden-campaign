namespace ForbiddenPsalmBuilder.Core.Models.Character;

public class Equipment
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // weapon, armor, item
    public string? Category { get; set; } // oneHandedMelee, twoHandedMelee, oneHandedRanged, twoHandedRanged, throwables, etc.
    public string? Damage { get; set; }
    public List<string> Properties { get; set; } = new();
    public string? Stat { get; set; } // What stat this uses
    public int Cost { get; set; }
    public int Slots { get; set; } = 1;
    public int ArmorValue { get; set; }
    public string? ArmorType { get; set; } // body, accessory, pet (for armor only)
    public string? Special { get; set; }
    public string? Effect { get; set; }
    public string? RollRange { get; set; }
    public string? IconClass { get; set; } // Icon class for displaying in UI
    public string? AmmoType { get; set; } // Type of ammo this weapon requires (e.g., "Ammo", "Cannonball", "Arrows")

    public bool IsWeapon => Type.Equals("weapon", StringComparison.OrdinalIgnoreCase);
    public bool IsArmor => Type.Equals("armor", StringComparison.OrdinalIgnoreCase);
    public bool IsItem => Type.Equals("item", StringComparison.OrdinalIgnoreCase);
    public bool RequiresAmmo => !string.IsNullOrEmpty(AmmoType);
}