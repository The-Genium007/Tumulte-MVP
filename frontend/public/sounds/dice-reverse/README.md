# Dice Reverse Sound Effects

This directory contains sound effects for the dice reverse overlay system.

## Required Files

### progress.mp3
- **Usage**: Plays when a contribution is added to the goal bar
- **Recommended**: Short "bip" or "click" sound (< 0.5s)
- **Volume**: Should be subtle, not distracting

### success.mp3
- **Usage**: Plays when the goal is reached (celebration)
- **Recommended**: Celebratory jingle or fanfare (1-2s)
- **Volume**: Can be more prominent

### impact.mp3
- **Usage**: Plays when the action executes (dice inversion, etc.)
- **Recommended**: Impactful "slam" or "thud" sound (< 1s)
- **Volume**: Should feel impactful

## Placeholder Files

Until real sound files are added, the components will silently fail when trying to play audio. This is by design - the overlay will work without sounds.

## Recommended Sources (Free)
- [Freesound.org](https://freesound.org) - Creative Commons sounds
- [Mixkit](https://mixkit.co/free-sound-effects/) - Free sound effects
- [Pixabay](https://pixabay.com/sound-effects/) - Royalty-free sounds

## Volume Levels (in components)
- progress.mp3: 30% volume
- success.mp3: 50% volume
- impact.mp3: 60% volume
