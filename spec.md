# Emoji Garden

## Current State
- Full-stack game with Motoko backend and React frontend
- Internet Identity login required before playing
- 12 garden plots in a 4x3 grid
- 6 plant types: sunflower, rose, cactus, mushroom, cherry, tulip
- Plants grow through 4 stages via watering (stages 0-3)
- Right-click to remove a plant from a plot
- Stats panel shows total blooms and waters
- Clicking a fully-bloomed (stage 3) plant only triggers sparkle effects but does NOT harvest

## Requested Changes (Diff)

### Add
- **Harvest mechanic**: When a plant reaches stage 3 (fully bloomed), clicking it harvests it — removes from the plot and adds it to a basket
- **Basket UI**: A basket panel shows all harvested plants with their emoji, name, and count
- **More plant types**: Add at least 6 new plant types for a total of ~12 varieties (e.g. watermelon, corn, strawberry, grape, pumpkin, bamboo, coconut, blueberry)
- **Backend harvest support**: `harvestPlant(plotIndex)` removes a fully grown plant and adds it to the player's basket; `getBasket()` returns the basket contents

### Modify
- **Remove login requirement**: The app should work without authentication — use a shared/anonymous garden state. Remove the login screen, Internet Identity hook, logout button, and user-pill from the UI.
- **Backend**: Remove authorization checks so all functions work for anonymous callers. The garden is global/shared (single garden state, not per-user). Basket is also global.
- **Tip bar**: Update copy to mention harvesting bloomed plants

### Remove
- Login screen component
- Internet Identity references (`useInternetIdentity`, login/logout buttons, user pill)
- `isAuthenticated` guards on plant/water/harvest actions

## Implementation Plan
1. Generate new Motoko backend with: global (anonymous) garden state, `harvestPlant`, `getBasket`, no authorization checks, 12+ plant types supported
2. Update frontend:
   - Remove all login/auth code
   - Add 6+ new seed types to the SEEDS array
   - Change `handleBloom` to call `harvestPlant` backend mutation
   - Add basket panel showing collected plants grouped by type with counts
   - Update tip bar copy
   - Wire up basket query and harvest mutation via hooks
