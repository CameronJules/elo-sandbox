# Rive Face Tracking Editor

A Figma-like editor for a Rive robot-eye animation driven by live face tracking and an OpenAI Realtime LLM.

## Setup

```bash
cp .env.example .env
# Add your OPENAI_API_KEY to .env
npm install
npm run dev
```

Open http://localhost:5173

## Quick Start

1. Drop `ees.riv` into `public/` (already configured)
2. **Rive layer** → Properties panel → set state machine + input bindings (`lookX`, `lookY`, `emotion`)
3. **LLM layer** → set Provider to `Mock` for offline testing, or `OpenAI Realtime` with your API key
4. Click **Start Session** to begin

## CHOP Transforms

CHOP feeds are numeric sources that can be mapped into Rive numeric variables. The current built-in feeds come from face telemetry (`face.position.x` and `face.position.y`).

The **Transform Code** field is a JavaScript function body with a single input named `value`. It must return a valid number.

Examples:

```js
return value
return value * 100
return Math.max(-1, Math.min(1, value))
return value < 0 ? 0 : value
const scaled = value * 0.5
return scaled + 10
```

That means CHOP transforms can use normal JavaScript numeric operations such as:

- arithmetic like `+`, `-`, `*`, `/`, `%`
- comparisons and conditionals like `<`, `>`, `===`, ternaries, and `if`
- local variables and intermediate calculations
- `Math` helpers like `Math.min`, `Math.max`, `Math.abs`, `Math.round`, and `Math.trunc`

If a transform returns anything other than a valid number, the CHOP will show an error and will not emit an output value.

Any module that wants to expose values through a CHOP reference should publish those values into telemetry first. CHOP feeds read from the shared telemetry store, so new CHOP-compatible module outputs should be written to telemetry and then registered in `src/lib/modules/chop/chopFeedRegistry.ts`.

## Architecture

```
services → modules → viewmodel → view
                         ↕
                   observability
```

- `src/lib/services/` — webcam + microphone raw access
- `src/lib/modules/` — face tracking (MediaPipe) + LLM realtime (OpenAI / Mock)
- `src/lib/viewmodels/` — animation controller + zustand store
- `src/lib/observability/` — logger + telemetry
- `src/components/` — React UI (shadcn/ui)
- `server/token.ts` — ephemeral token server for OpenAI Realtime WebRTC
