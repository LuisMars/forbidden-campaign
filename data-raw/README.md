# Forbidden Psalm: Complete Game Data

This directory contains extracted and organized game data from all Forbidden Psalm PDFs for use in the warband builder application.

## Game Systems

### 📚 [End Times](./end-times/)
**Forbidden Psalm: End Times Edition** - Medieval fantasy apocalypse
- Dark fantasy setting with traditional magic
- Scrolls, Feats/Flaws, Weapons, Pets, and XP progression
- Based on MÖRK BORG system

### 🔫 [Last War](./last-war/)
**The Last War** - Post-WWI/WWII military horror
- Fog-covered battlefields with scavenging crews
- Manuscripts, Special Troopers, Service Animals, and Mutations
- WWI/WWII inspired weapons and equipment

### 🤖 [28 Psalms](./28-psalms/)
**28 Psalms** - Dual technology dark humor
- Choose Past Tech (medieval) or Future Tech (sci-fi)
- Lords of Chaos campaign system
- Streamlined rules with dark satirical elements

## Common Core Mechanics

All three games share the same foundational system:

### Stats System
- **Four Stats**: Agility, Presence, Strength, Toughness
- **Stat Arrays**: +3,+1,0,-3 OR +2,+2,-1,-2
- **Health**: HP = 8 + Toughness
- **Movement**: 5 + Agility inches
- **Equipment Slots**: 5 + Strength slots

### Core Rules
- **Tests**: D20 + modifier vs DR12
- **Criticals**: Roll 20 (max damage, special effects)
- **Fumbles**: Roll 1 (weapons drop, complications)
- **Combat**: Melee within 1", ranged up to 12"
- **Death States**: Downed at 0 HP, Dead if damaged further

### Campaign Progression
- **XP System**: 5 XP for improvements
- **Death Saves**: DR6 Toughness test
- **Injuries**: Permanent effects from failed saves
- **Fresh Blood**: Free recruitment if under 5 members

## File Structure

Each game directory contains:
- **README.md** - Game overview and quick reference
- **character-creation.md** - Warband creation rules
- **weapons-equipment.md** - Complete equipment tables
- **feats-flaws.md** - Character trait tables
- **magic/scrolls system** - Spellcasting mechanics
- **injuries-death-saves.md** - Injury and recovery rules
- **campaign-progression.md** - XP and long-term play

## For Developers

All data is structured as:
- **Markdown tables** for easy parsing
- **Consistent formatting** across games
- **Cross-referenced systems** with mechanical details
- **JSON-ready structure** for database import

## Key Differences Between Games

| Feature | End Times | Last War | 28 Psalms |
|---------|-----------|----------|-----------|
| **Setting** | Medieval fantasy | WWI/WWII horror | Dual tech (past/future) |
| **Magic** | Scrolls (D44) | Manuscripts (D20) | Scrolls (D10) |
| **Traits** | Feats/Flaws (D100) | Feats/Flaws (D20) | Feats/Flaws (D10) |
| **Specialists** | Spellcasters | Special Troopers | Witches |
| **Companions** | Pets | Service Animals | None |
| **Currency** | Gold | Resources | Credits |
| **Unique** | Pets, Relics | Mutations, Orders | Lords of Chaos, Hacking |

## Universal Equipment Categories

### Weapons
- **Melee**: One-handed, Two-handed, Makeshift
- **Ranged**: Bows, Firearms, Thrown weapons
- **Properties**: AP, Explode, Reload, Cruel, etc.

### Armor
- **Light** (AV 1), **Medium** (AV 2), **Heavy** (AV 3+)
- **Special properties** and Strength requirements
- **Magic restrictions** for higher AV values

### Items
- **Healing**: Potions, bandages, medical supplies
- **Utility**: Lanterns, tools, special equipment
- **Ammo**: Various types per weapon system

This comprehensive data set enables building a universal warband builder that can handle all three Forbidden Psalm variants while maintaining their unique characteristics and mechanics.