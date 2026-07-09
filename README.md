# Neon Rush VR

A side-scrolling shoot-em-up (shmup) inspired by Gradius and R-Type, built with IWSDK for browser and VR.

## Play

**Live:** [https://ellyz2426.github.io/neon-rush/](https://ellyz2426.github.io/neon-rush/)

## Features

### Combat
- **11 enemy types**: Straight, Sine, Dive, Circle, Formation, Turret, Tank, Sniper, Swarm, Carrier, Boss
- **Carriers** spawn smaller enemies on death
- **Boss fights** with 4 attack phases: spread fire, aimed volleys, spirals, and enraged ring bursts
- **Mini-boss encounters** every 7 waves
- **Graze system** — near-miss bullet scoring with streak tracking
- **Charge shot** mechanic with 3 power tiers
- **Orbiting drones** (up to 4) that auto-fire
- **Environmental asteroids** — destructible for score and power-ups

### Weapons & Power-Ups
- 3 weapon types with 3 upgrade tiers each: Spread, Laser, Missile
- 7 power-up types: Spread, Laser, Missile, Shield, Speed, Magnet, Bomb
- Screen-clearing bomb with slow-motion aftermath
- Magnet attracts nearby power-ups
- Shield-to-drone conversion on duplicate pickup

### Game Modes
- **Campaign** — progress through stages with boss fights
- **Quickplay** — jump right into action
- **Timed** — 2-minute score attack
- **Zen** — infinite lives, relaxed play
- **Daily** — seeded daily challenge
- **Fever** — scaling combo multiplier (2x to 8x)
- **Precision** — one life, slow fire rate
- **Endless** — infinite stages, ever-increasing difficulty

### Customization
- 4 difficulty levels: Easy, Normal, Hard, Insane
- 8 ship skins with unlock conditions
- 5 visual themes (Neon Holodeck, Crimson Grid, Toxic Neon, Ultra Violet, Solar Blaze)
- SFX, particles, and screen shake toggles

### Progression
- 67+ achievements across combat, scoring, modes, and mechanics
- XP/leveling system
- Persistent high scores and statistics
- localStorage save system

### VR Support
- Full XR controller input (dual controllers)
- Left stick: movement, Right stick: movement
- Triggers: fire, A: charge shot, B: pause, Y: bomb
- PanelUI spatial interface — all 16 panels work in VR

### Visual Polish
- Multi-layer parallax star field with colored stars
- Background floating debris with rotation
- Screen shake on explosions, deaths, and boss defeats
- Engine trail particles
- Stage environment transitions
- Warning indicators for incoming threats
- Critical health visual feedback (pulsing boundaries)
- Bullet-time slow motion on boss kills

## Controls

### Keyboard
| Key | Action |
|-----|--------|
| WASD / Arrows | Move |
| Space / Z | Shoot |
| X / C (hold) | Charge shot |
| B | Deploy bomb |
| Escape / P | Pause |

### XR Controllers
| Input | Action |
|-------|--------|
| Left/Right Thumbstick | Move |
| Either Trigger | Shoot |
| A Button (hold) | Charge shot |
| Y Button | Deploy bomb |
| B Button | Pause |

## Tech Stack
- [IWSDK](https://iwsdk.dev) v0.4.x (Immersive Web SDK)
- Three.js (super-three r185)
- EliCS (Entity Component System)
- PanelUI with uikitml templates
- TypeScript + Vite 7
- Procedural audio engine (10+ synthesized sounds)

## Development
```bash
npm install
npm run dev     # Start dev server
npm run build   # Production build
```

## License
MIT
