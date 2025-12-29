# Valorant Assets Checklist

This document lists all the image assets needed to complete the Valorant rank card integration.

## Required Assets

### 1. Valorant Logo (Background Watermark)
- **File**: `assets/images/valorant-logo.png`
- **Purpose**: Background watermark for Valorant rank cards (similar to the LoL logo)
- **Recommended Size**: 302x302px
- **Format**: PNG with transparency
- **Usage**: Displays as a subtle watermark on the rank card background

### 2. Valorant Icon (Small)
- **File**: `assets/images/valorant.png`
- **Purpose**: Small icon used in game stats hero section and navigation
- **Recommended Size**: 60x60px
- **Format**: PNG with transparency
- **Usage**: Displays in the game stats hero section when not using centered logo

### 3. Rank Icons
**Location**: `assets/images/valorantranks/`

All rank icons should be PNG files with transparency:

- [ ] `iron.png`
- [ ] `bronze.png`
- [ ] `silver.png`
- [ ] `gold.png`
- [ ] `platinum.png`
- [ ] `diamond.png`
- [ ] `ascendant.png`
- [ ] `immortal.png`
- [ ] `radiant.png`
- [ ] `unranked.png`

**Specifications**:
- Format: PNG with alpha channel
- Recommended Size: 100x100px
- Style: Official Valorant rank badge designs

## Where to Find Assets

### Official Sources
- [Riot Games Press](https://www.riotgames.com/en/press) - Official brand assets
- [Valorant Media Assets](https://playvalorant.com/en-us/media-kit/) - Official media kit

### Community Resources
- [Valorant API](https://valorant-api.com/) - Community-maintained API with rank images
- Search for "Valorant rank icons PNG" for high-quality recreations

## Implementation Status

- [x] Code updated to support Valorant rank icons
- [x] Directory structure created
- [x] Placeholder Valorant card added to rank card wallet
- [ ] Valorant logo added (**CRITICAL - App will crash without this**)
- [ ] Valorant icon added (**CRITICAL - App will crash without this**)
- [ ] Rank icons added (0/10)

## ⚠️ IMPORTANT - App Will Crash Without These Images

The app is now trying to load the following images. You **MUST** add them or the app will crash:

1. `assets/images/valorant.png` - Required for rank card wallet
2. `assets/images/valorant-logo.png` - Required when viewing Valorant cards

## Next Steps

1. Download or create the Valorant logo and place it at `assets/images/valorant-logo.png`
2. Download all 10 rank icons and place them in `assets/images/valorantranks/`
3. Test the rank card display with Valorant data
4. Adjust styling if needed to match Valorant's aesthetic

## Notes

- The rank card component has been updated to automatically detect Valorant games and use the appropriate rank icons
- The card background color is set to dark Valorant red (#B2313B)
- The theme matches Valorant's official branding with red accent colors
