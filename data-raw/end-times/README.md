# Forbidden Psalm: End Times Edition - Game Data

This directory contains extracted and organized game data from the Forbidden Psalm: End Times Edition PDF for use in the warband builder application.

## File Organization

### 📋 [Character Creation](../forbidden_psalm_character_creation.md)
Basic character and warband creation rules including stats, spellcasters, and pets.

### ⚔️ [Weapons & Equipment](./weapons-equipment.md)
Complete tables of weapons, armor, items, and equipment with costs and properties.

### 🎯 [Feats & Flaws](./feats-flaws.md)
D100 tables for character traits, both positive (Feats) and negative (Flaws).

### 📜 [Scrolls & Magic](./scrolls-magic.md)
Complete magic system including Clean/Unclean scrolls, spellcasting rules, and Calamity Table.

### 🏥 [Injuries & Death Saves](./injuries-death-saves.md)
Injury table, death save mechanics, and character recovery rules.

### 📈 [XP & Campaign Progression](./xp-campaign-progression.md)
Experience point system, leveling, and long-term campaign management.

### 🐕 [Pets & Companions](./pets-companions.md)
Available pets, taming rules, and companion management.

## Game Overview

**Forbidden Psalm** is a skirmish wargame where players control warbands of 5 desperate souls exploring the ruins of Kergüs. The game features:

- **Stat System**: Four stats (Agility, Presence, Strength, Toughness) with modifiers from +3 to -3
- **D20 System**: All tests are DR12 (roll D20, add modifiers, reach 12+ to succeed)
- **Health**: HP = 8 + Toughness, models become Downed at 0 HP, Dead if damaged further
- **Equipment Slots**: 5 + Strength slots for carrying gear
- **Magic System**: Spellcasters read Scrolls, risk Tragedies and Calamities
- **Campaign Play**: XP system, injuries, death saves, and warband progression

## For Developers

These files are structured as markdown tables and lists for easy parsing into JSON or other data formats for the warband builder application. Each file contains complete, self-contained information for its respective game system.

## Quick Reference

### Starting a Warband
1. Select 5 models and assign names
2. Allocate stats (+3,+1,0,-3 OR +2,+2,-1,-2 arrays)
3. Roll Flaw and Feat for each model (D100 each)
4. Spend 50 Gold on equipment
5. Optional: Hire Spellcaster (5 Gold) and/or Pet

### Core Mechanics
- **Movement**: 5 + Agility inches
- **Tests**: D20 + modifier vs DR12
- **Combat**: Melee within 1 inch, ranged up to 12 inches
- **Critical**: Roll 20 on die (max damage, special effects)
- **Fumble**: Roll 1 on die (drop weapon, take damage)

### Between Scenarios
1. Gain 10 Gold per surviving member
2. Roll Death Saves for Downed models
3. Roll Injuries for survivors
4. Spend XP (5 points for improvements)
5. Recruit replacements if needed
6. Reallocate equipment