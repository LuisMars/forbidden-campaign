# Forbidden Campaign Toolkit

A collection of web-based tools for running **Forbidden Psalm** campaigns and managing warbands.

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [File Structure](#file-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

### Warband Builder
- **Character Creation**: Build custom characters with stats, traits, and equipment
- **Warband Management**: Track gold, stash items, and warband upgrades
- **Print-Ready Cards**: Generate formatted character cards for table play
- **Data Persistence**: All data saves locally in your browser

### Warband Upgrades
- **Hogs Head Inn**: Purchase warband-wide upgrades and character enhancements
- **Better Grub**: Add HP bonuses to specific characters
- **Upgrade Tracking**: Monitor purchased upgrades and their effects

## Installation

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No server setup required - runs entirely in the browser

### Quick Start
```bash
# Clone the repository
git clone https://github.com/luismars/forbidden-campaign-toolkit.git

# Navigate to the project directory
cd forbidden-campaign-toolkit

# Open in browser
open index.html
```

## Usage

### Getting Started
1. Open `index.html` in your browser to access the main toolkit
2. Click **"Warband Builder"** to start creating characters
3. Build your warband by adding characters, equipment, and upgrades
4. Use **"Export JSON"** to save your warband data
5. Use **"Print roster"** to generate printable character cards

### Creating Characters
1. Click **"Add Character"** in the warband section
2. Customize stats, traits, and equipment
3. Purchase upgrades from the Hogs Head Inn
4. Track experience and level progression

### Data Management
- All data is saved automatically in your browser
- Export/import JSON files to backup or share warbands
- Print-ready cards for physical gameplay

## File Structure

```
├── index.html          # Main toolkit homepage
├── generator/          # Warband builder application
│   ├── index.html      # Builder interface
│   ├── app.js          # Core application logic
│   └── style.css       # Builder-specific styles
├── main.css            # Global styles and design system
└── data/               # Game data (weapons, traits, upgrades)
```

## Game Data

Includes comprehensive data for:
- **Weapons & Equipment**: Complete item catalog with costs and effects
- **Character Traits**: Abilities, curses, and special rules
- **Warband Upgrades**: Inn improvements and character enhancements

## Status

**Beta**: This toolkit is in development. Features may change.

## Contributing

Contributions are welcome! Whether you're reporting bugs, suggesting features, or submitting code improvements.

### How to Contribute
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Reporting Issues
- Use GitHub Issues to report bugs or request features
- Include steps to reproduce for bug reports
- Provide clear descriptions and context

### Development Guidelines
- Follow existing code style and conventions
- Test your changes across different browsers
- Update documentation for new features

## License

This code is free to use, modify, and share for personal and non-commercial purposes. You may not sell this software or any derivative works.

Independent production by [luismars](https://github.com/luismars), not affiliated with Ockult Örtmästare Games, Stockholm Kartell, or KRD Designs; published under the [MÖRK BORG Third Party License](https://morkborg.com/license/). "[Forbidden Psalm](https://www.forbiddenpsalm.com/)" referenced for compatibility only; no endorsement implied.