# Emoji Garden

## Current State
The project exists as "Emoji Garden" but the draft has expired. Rebuilding from scratch.

## Requested Changes (Diff)

### Add
- A cozy emoji garden game where users plant and grow emoji plants
- Seed selector panel with multiple seed types (sunflower, rose, cactus, mushroom, tree, etc.)
- Garden grid with multiple soil plots the user can interact with
- Click-to-plant mechanic: select a seed, click an empty plot to plant it
- Click-to-water mechanic: click a planted plot to water it and progress growth
- Growth stages: seed -> sprout -> growing -> bloomed (4 stages per plant)
- Visual feedback for each growth stage using progressively larger/different emoji
- Plant counter showing how many plants are fully bloomed
- Garden persists in backend (save feature)
- Cheerful, colorful UI with animations

### Modify
- Nothing (fresh build)

### Remove
- Nothing (fresh build)

## Implementation Plan
1. Backend: store garden state (plots, plant type, growth stage, water count per plot) per user principal
2. Backend: methods to plant a seed in a plot, water a plot, get garden state, reset a plot
3. Frontend: seed selector with emoji icons for each seed type
4. Frontend: garden grid (3x3 or 4x4) showing each plot's current state with emoji
5. Frontend: click handlers for planting and watering
6. Frontend: growth stage animations (scale/bounce on water)
7. Frontend: bloom celebration (confetti or sparkle effect) when a plant fully blooms
8. Frontend: stats bar showing bloomed count and total watered
