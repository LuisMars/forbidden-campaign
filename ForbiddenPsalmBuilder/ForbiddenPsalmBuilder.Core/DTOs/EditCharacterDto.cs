using System.ComponentModel.DataAnnotations;
using ForbiddenPsalmBuilder.Core.Models.Character;

namespace ForbiddenPsalmBuilder.Core.DTOs;

public class EditCharacterDto
{
    public string Id { get; set; } = string.Empty;

    [Required(ErrorMessage = "Character name is required")]
    [StringLength(50, ErrorMessage = "Character name cannot exceed 50 characters")]
    public string Name { get; set; } = string.Empty;

    [Range(0, 10, ErrorMessage = "Agility must be between 0 and 10")]
    public int Agility { get; set; }

    [Range(0, 10, ErrorMessage = "Presence must be between 0 and 10")]
    public int Presence { get; set; }

    [Range(0, 10, ErrorMessage = "Strength must be between 0 and 10")]
    public int Strength { get; set; }

    [Range(0, 10, ErrorMessage = "Toughness must be between 0 and 10")]
    public int Toughness { get; set; }

    [Range(0, 1000, ErrorMessage = "Experience must be between 0 and 1000")]
    public int Experience { get; set; }

    public bool IsSpellcaster { get; set; }

    [StringLength(50, ErrorMessage = "Special trooper type cannot exceed 50 characters")]
    public string? SpecialTrooperType { get; set; }

    // Calculated properties for display
    public int Movement => 5 + Agility;
    public int HP => 8 + Toughness;
    public int EquipmentSlots => 5 + Strength;
}