# Cliporo AI — Documentation

**New here? Start with [GETTING-STARTED.md](./GETTING-STARTED.md)** — the full
first-run guide (install → env → migrations → run → render → deploy).

## Product specs
| Doc | What it covers |
|---|---|
| [PRD.md](./PRD.md) | Master PRD — vision, scope, data model, architecture, roadmap |
| [PRD-navigation-theming.md](./PRD-navigation-theming.md) | Bottom-tab nav + light/dark glassmorphism |
| [PRD-editor.md](./PRD-editor.md) | The clip editor (captions, transitions, render) |
| [design-reference/](./design-reference/) | Original UI mockups (HTML) |

## Setup guides (by build phase)
| Doc | Phase |
|---|---|
| [GETTING-STARTED.md](./GETTING-STARTED.md) | **Everything, in order** |
| [SETUP.md](./SETUP.md) | Phase 0 — auth, Supabase, Google login, Vercel |
| [PHASE-1-SETUP.md](./PHASE-1-SETUP.md) | Upload + transcription (AssemblyAI) |
| [PHASE-2-SETUP.md](./PHASE-2-SETUP.md) | AI clip detection (Claude) |
| [PHASE-3-EDITOR.md](./PHASE-3-EDITOR.md) | In-browser clip editor |
| [PHASE-3B-RENDER.md](./PHASE-3B-RENDER.md) | Render to MP4 (local FFmpeg worker) |
| [PHASE-5-BILLING.md](./PHASE-5-BILLING.md) | Credits + Stripe billing |

## Build status
Phases 0, 1, 2, 3, 3b, and 5 are implemented. Next candidates: a hosted render
queue, bulk render, and more caption presets.