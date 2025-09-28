# The Last War: Game Data

This directory contains extracted and organized game data from the Forbidden Psalm: The Last War PDF for use in the warband builder application.

## File Organization

### 📋 [Character Creation](./character-creation.md)
Basic crew creation rules including stats, Special Troopers, and Service Animals.

### ⚔️ [Weapons & Equipment](./weapons-equipment.md)
Complete tables of weapons, armor, items, and equipment with costs and properties.

### 🎯 [Feats & Flaws](./feats-flaws.md)
D20 tables for character traits, both positive (Feats) and negative (Flaws).

### 📜 [Manuscripts & Magic](./manuscripts-magic.md)
Complete magic system including Sanctified/Heathen manuscripts, spellcasting rules, and Calamity Table.

### 🏥 [Injuries & Death Saves](./injuries-death-saves.md)
Injury table, death save mechanics, and medical support rules.

### 📈 [Campaign & Progression](./campaign-progression.md)
Experience point system, between-scenario sequence, and long-term campaign management.

### 🧬 [Mutations](./mutations.md)
Fog-induced mutations table and rules for physical/mental changes.

## Game Overview

**The Last War** is a skirmish wargame set in a post-apocalyptic World War setting where players control crews of 5 scavengers exploring fog-covered battlefields. The game features:

- **Stat System**: Four stats (Agility, Presence, Strength, Toughness) with modifiers from +3 to -3
- **D20 System**: All tests are DR12 (roll D20, add modifiers, reach 12+ to succeed)
- **Health**: HP = 8 + Toughness, models become Downed at 0 HP, Dead if damaged further
- **Equipment Slots**: 5 + Strength slots for carrying gear
- **Magic System**: Any model can read Manuscripts, risk Calamities
- **Campaign Play**: XP system, injuries, death saves, and crew progression
- **Environmental Hazards**: The Fog causes mutations and limits visibility

## Key Differences from Forbidden Psalm

### Setting
- **Post-WWI/WWII apocalypse** instead of medieval fantasy
- **The Fog** replaces supernatural threats
- **Hostiles** instead of Monsters
- **Resources** instead of Gold currency

### Equipment
- **Firearms and explosives** instead of swords and magic
- **Gas masks and medical supplies** for chemical warfare
- **Makeshift weapons** crafted from battlefield debris
- **Military armor** including experimental prototypes

### Magic System
- **Manuscripts** instead of Scrolls
- **Any model can cast** (not just specialists)
- **Calamity Table** for magical mishaps
- **Environmental integration** with Fog and war themes

### Special Features
- **Special Troopers**: 13 specialized roles with unique equipment and abilities
- **Service Animals**: 4 military/survival companions
- **Mutations**: Physical changes from Fog exposure
- **Orders**: Campaign-level advantages (like Omens)

## For Developers

These files are structured as markdown tables and lists for easy parsing into JSON or other data formats for the warband builder application. Each file contains complete, self-contained information for its respective game system.

## Quick Reference

### Starting a Crew
1. Select 5 models and assign names
2. Choose 1 Special Trooper (5 Resources)
3. Allocate stats (+3,+1,0,-3 OR +2,+2,-1,-2 arrays)
4. Roll Flaw and Feat for each model (D20 each)
5. Spend 50 Resources on equipment
6. Optional: Hire Service Animal

### Core Mechanics
- **Movement**: 5 + Agility inches
- **Tests**: D20 + modifier vs DR12
- **Combat**: Melee within 1 inch, ranged up to 12 inches
- **Critical**: Roll 20 on die (max damage, special effects)
- **Fumble**: Roll 1 on die (weapon jams/drops, complications)

### Between Scenarios
1. Gain 10 Resources per surviving member
2. Roll Death Saves for Downed models (DR6 Toughness)
3. Roll Injuries for survivors
4. Spend XP (5 points for improvements)
5. Sell equipment to Quartermaster (half price)
6. Recruit replacements if needed
7. Reallocate equipment

### Conversion from Forbidden Psalm
- 1 Gold = 1 Resource
- Warband = Crew
- Scroll = Manuscript
- Spellcaster = Witch
- Monster = Hostile
- Treasure = Loot
- Can convert existing warbands with some adjustments