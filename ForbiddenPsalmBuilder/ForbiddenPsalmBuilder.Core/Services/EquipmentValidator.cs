using ForbiddenPsalmBuilder.Core.Models.Character;
using ForbiddenPsalmBuilder.Core.Models.Selection;

namespace ForbiddenPsalmBuilder.Core.Services;

public class EquipmentValidator
{
    /// <summary>
    /// Extract stat requirements from armor restrictions
    /// </summary>
    public (int? strength, int? agility, int? presence, int? toughness) ExtractStatRequirements(Armor armor)
    {
        int? requiredStrength = null;
        int? requiredAgility = null;
        int? requiredPresence = null;
        int? requiredToughness = null;

        foreach (var restriction in armor.Restrictions)
        {
            if (restriction.TryGetValue("type", out var typeObj) &&
                typeObj?.ToString() == "stat_requirement" &&
                restriction.TryGetValue("stat", out var statObj) &&
                restriction.TryGetValue("requiredValue", out var valueObj))
            {
                var stat = statObj?.ToString()?.ToLower();
                var value = Convert.ToInt32(valueObj);

                switch (stat)
                {
                    case "strength":
                        requiredStrength = value;
                        break;
                    case "agility":
                        requiredAgility = value;
                        break;
                    case "presence":
                        requiredPresence = value;
                        break;
                    case "toughness":
                        requiredToughness = value;
                        break;
                }
            }
        }

        return (requiredStrength, requiredAgility, requiredPresence, requiredToughness);
    }

    /// <summary>
    /// Check if character can equip armor (only 1 body armor piece allowed, accessories like shields/helmets allowed)
    /// </summary>
    public bool CanEquipArmor(Character character, Equipment armor)
    {
        if (!armor.IsArmor)
            return true;

        // Accessories (shields, helmets, boots) can stack with body armor
        if (armor.ArmorType == "accessory" || armor.ArmorType == "pet")
            return true;

        // Only 1 body armor piece allowed
        return !character.Equipment.Any(e => e.IsArmor && e.ArmorType == "body");
    }

    /// <summary>
    /// Check if character meets stat requirements for equipment
    /// </summary>
    public bool MeetsStatRequirements(Character character, Equipment equipment,
        int? requiredStrength = null,
        int? requiredAgility = null,
        int? requiredPresence = null,
        int? requiredToughness = null)
    {
        if (requiredStrength.HasValue && character.Stats.Strength < requiredStrength.Value)
            return false;

        if (requiredAgility.HasValue && character.Stats.Agility < requiredAgility.Value)
            return false;

        if (requiredPresence.HasValue && character.Stats.Presence < requiredPresence.Value)
            return false;

        if (requiredToughness.HasValue && character.Stats.Toughness < requiredToughness.Value)
            return false;

        return true;
    }

    /// <summary>
    /// Validate equipment and return error message if invalid, null if valid
    /// </summary>
    public string? ValidateEquipment(Character character, Equipment equipment,
        int? requiredStrength = null,
        int? requiredAgility = null,
        int? requiredPresence = null,
        int? requiredToughness = null)
    {
        // Check slot availability
        if (!character.CanEquip(equipment))
        {
            var usedSlots = character.Equipment.Sum(e => e.Slots);
            var totalSlots = character.Stats.EquipmentSlots;
            return $"Not enough equipment slots. Character has {totalSlots} slots, {usedSlots} used, needs {equipment.Slots} more.";
        }

        // Check armor limit
        if (equipment.IsArmor && !CanEquipArmor(character, equipment))
        {
            return "Character can only wear one body armor piece at a time. Accessories like shields and helmets can be worn with body armor.";
        }

        // Check stat requirements
        if (!MeetsStatRequirements(character, equipment, requiredStrength, requiredAgility, requiredPresence, requiredToughness))
        {
            var requirements = new List<string>();

            if (requiredStrength.HasValue && character.Stats.Strength < requiredStrength.Value)
                requirements.Add($"Strength {requiredStrength.Value}+");

            if (requiredAgility.HasValue && character.Stats.Agility < requiredAgility.Value)
                requirements.Add($"Agility {requiredAgility.Value}+");

            if (requiredPresence.HasValue && character.Stats.Presence < requiredPresence.Value)
                requirements.Add($"Presence {requiredPresence.Value}+");

            if (requiredToughness.HasValue && character.Stats.Toughness < requiredToughness.Value)
                requirements.Add($"Toughness {requiredToughness.Value}+");

            return $"Requires {string.Join(", ", requirements)}";
        }

        return null;
    }
}
