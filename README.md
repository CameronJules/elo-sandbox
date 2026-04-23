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
