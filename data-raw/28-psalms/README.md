# 28 Psalms: Game Data

This directory contains extracted and organized game data from the 28 Psalms PDF for use in the warband builder application.

## File Organization

### 📋 [Character Creation](./character-creation.md)
Basic warband creation rules including stats, technology levels, and Lords of Chaos.

### ⚔️ [Weapons & Equipment](./weapons-equipment.md)
Complete tables of Past Tech and Future Tech weapons, armor, items, and equipment.

### 🎯 [Feats & Flaws](./feats-flaws.md)
D10 tables for character traits, both positive (Feats) and negative (Flaws).

### 📜 [Magic & Scrolls](./magic-scrolls.md)
Complete magic system including scrolls, spellcasting rules, and Calamity Table.

### 🏥 [Injuries & Death Saves](./injuries-death-saves.md)
Injury table, death save mechanics, and recovery rules.

### 📈 [Campaign & Progression](./campaign-progression.md)
Experience point system, Lords of Chaos campaign, and progression rules.

## Game Overview

**28 Psalms** is a dark twist on Forbidden Psalm set in the bleak gloom of the far future (or distant past) where players control warbands of 5 desperate souls serving Dark Lords. The game features:

- **Dual Technology Levels**: Choose Past Tech (medieval/fantasy) or Future Tech (sci-fi)
- **D20 System**: All tests are DR12 (roll D20, add modifiers, reach 12+ to succeed)
- **Health**: HP = 8 + Toughness, models become Downed at 0 HP, Dead if damaged further
- **Equipment Slots**: 5 + Strength slots for carrying gear
- **Magic System**: Scrolls with Tragedy/Calamity mechanics
- **Campaign Play**: Serve Dark Lords in campaign for dominance
- **Simplified Rules**: Streamlined version of core Forbidden Psalm rules

## Key Features

### Technology Levels
Choose your warband's tech level before play:

#### Past Tech
- **Medieval/Fantasy weapons**: Swords, axes, bows, torches
- **Traditional magic**: Ancient scrolls and mystical powers
- **Fantasy aesthetic**: Knights, cultists, medieval settings

#### Future Tech
- **Sci-fi weapons**: Plasma rifles, space swords, laser weapons
- **Advanced tech**: Hacking decks, cybernetic enhancements
- **Cyberpunk aesthetic**: Corporate overlords, data-scrolls, cyber-warfare

### Lords of Chaos Campaign
Serve one of five Dark Lords:
- **Lords of the Soil**: Agricultural control, fly swarm protection
- **Lords of the Gods of Pandemonium**: Reality manipulation, damage-to-reroll
- **Lords of Avarice**: Wealth accumulation, 50 credits per scenario
- **Lords of the True Death**: Death worship, free molotovs
- **Lords of Pasteurisation**: Cheese production, free cheese

### Simplified Magic
- **10 Scrolls**: Streamlined spell list
- **Tragedy system**: Failures accumulate consequences
- **Calamity Table**: Catastrophic magical mishaps
- **Universal casting**: Any model can use found scrolls

## For Developers

These files are structured as markdown tables and lists for easy parsing into JSON or other data formats for the warband builder application. Each file contains complete, self-contained information for its respective game system.

## Quick Reference

### Starting a Warband
1. Select 5 models and assign names
2. Choose technology level (Past Tech or Future Tech)
3. Allocate stats (+3,+1,0,-3 OR +2,+2,-1,-2 arrays)
4. Roll Flaw and Feat for each model (D10 each)
5. Spend 50 credits on equipment
6. Optional: Hire Witch (5 credits) with 2 random scrolls
7. Choose which Dark Lord to serve

### Core Mechanics
- **Movement**: 5 + Agility inches
- **Tests**: D20 + modifier vs DR12
- **Combat**: Melee within 1 inch, ranged up to 12 inches
- **Critical**: Roll 20 on die (max damage, special effects)
- **Fumble**: Roll 1 on die (weapon drops, complications)
- **Default weapon**: All models have Fists (1 HP damage)

### Magic System
- **Scrolls required**: Must have scroll to cast spell
- **DR12 Presence test**: Success casts spell
- **Failure/Critical**: Mark Tragedy
- **Fumble**: Roll on Calamity Table + Tragedies
- **Range**: 12 inches maximum
- **Restrictions**: No armor AV 2+, no shields, no close combat

### Between Scenarios
1. Roll Death Saves for Downed models (DR6 Toughness)
2. Roll Injuries for survivors (D20)
3. Sell equipment to Scoundrel trader (half price)
4. Spend XP (5 points for improvements)
5. Recruit replacements if needed (free)
6. Optional: Fire and replace one member
7. Reallocate equipment

### Campaign Goals
- **Win campaign**: Help your Lord reach 15 Power
- **Gain Power**: +1 per scenario win, +1 per Effigy of 28 killed
- **Lose Power**: -1 if warband wiped out

## Unique Features vs Other Forbidden Psalm Games

### Streamlined Rules
- **Simpler tables**: D10 instead of D100 for Feats/Flaws
- **Reduced complexity**: Focused on core mechanics
- **Dual tech levels**: Covers both fantasy and sci-fi in one game

### Dark Humor
- **Satirical elements**: IP law violations, hobbyist magazines
- **Self-referential**: "Copy of 28" as loot
- **Absurd calamities**: Reading hobby magazines, eyes bleeding

### Campaign Focus
- **Lord allegiance**: Meaningful campaign choices
- **Power accumulation**: Clear victory conditions
- **Faction benefits**: Mechanical advantages for each Lord