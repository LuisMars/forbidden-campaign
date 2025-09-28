# Shared Game Components

This folder contains extracted common functionality and data structures that are shared across all game variants (28 Psalms, End Times, Last War).

## Files Overview

### Core Game Data
- **`equipment-rules.json`** - Equipment slot rules, starting budgets, and default weapons
- **`weapon-properties.json`** - Standardized weapon properties (AP, Burn, Cruel, etc.)
- **`weapon-categories.json`** - Common weapon types with damage and cost patterns
- **`armor-types.json`** - Standard armor types and protection rules
- **`base-items.json`** - Common items like bandages, potions, lanterns

### Character Systems
- **`feat-flaw-patterns.json`** - Common feat and flaw patterns across variants
- **`game-mechanics.json`** - Core game mechanics (stats, dice, tests, combat)

## Usage

These files can be used to:
1. **Build generic character sheets** that work across all variants
2. **Create unified equipment databases** with variant-specific costs
3. **Generate random equipment** using shared categories
4. **Implement consistent game rules** across different apps
5. **Validate character builds** against shared constraints

## Design Principles

- **Data-driven**: All game elements defined as JSON for easy parsing
- **Modular**: Each file focuses on a specific aspect of the game
- **Extensible**: Easy to add new variants or modify existing rules
- **Consistent**: Standardized naming and structure across all files

## Integration

Game-specific applications can:
1. Load shared data as base templates
2. Override with variant-specific modifications
3. Extend with additional variant-unique content
4. Use shared validation rules and calculations