# Neon Peg VR

A Peggle-style peg-bouncing arcade game built with IWSDK — aim and shoot balls from a launcher at the top, watch them cascade through a field of glowing pegs with physics-based bouncing. Clear all orange pegs to win!

**Play live:** https://ellyz2426.github.io/neon-peg/

## Gameplay

- Aim the launcher with mouse/thumbstick
- Shoot balls that bounce off pegs with realistic physics
- **Orange pegs** must all be cleared to win
- **Blue pegs** give bonus points
- **Green pegs** activate power-ups (Multiball, Space Blast, Guide Ball, Zen Ball)
- **Purple pegs** give 3x score multiplier
- Catch the ball in the **Fever Bucket** at the bottom for bonus points
- Fewer orange pegs remaining = higher score per hit

## Controls

### Browser
- **A/D or Arrow Keys**: Aim launcher
- **Space**: Shoot ball
- **ESC/P**: Pause

### VR
- **Right Thumbstick**: Aim launcher
- **Right Trigger**: Shoot ball
- **B Button**: Pause

## Features

- 8 game modes: Campaign, Quick Play, Time Attack, Zen, Daily Challenge, Fever Frenzy, Precision, Endless
- 3 difficulty levels (15/10/7 balls)
- 40 achievements with XP/Level progression (50 levels)
- 8 ball skins with unlock conditions
- 5 holodeck arena themes
- Physics-based ball bouncing with wall/peg collisions
- Moving fever bucket for bonus catches
- 4 power-ups: Multiball, Space Blast, Guide Ball, Zen Ball
- Aim guide trajectory preview (30-dot arc)
- Combo scoring system (up to x10)
- Star rating system (1-3 stars)
- Leaderboard (top 20)
- Career statistics tracking
- Procedural audio (15+ SFX + ambient drone)
- Particle effects (peg hit bursts, fever catch)
- Ball trail visualization
- Seeded daily challenge (deterministic PRNG)
- 16 PanelUI spatial panels (zero HTML DOM)
- Dual runtime VR + browser

## Tech Stack

- IWSDK 0.4.1 (Immersive Web SDK)
- PanelUI with `.uikitml` templates
- Dual runtime (XR + browser-first)
- Procedural Web Audio API
- localStorage persistence
