# mytutor

An AI tutor that explains on paper. Ask "how do linked lists work?" and it talks and draws at the same time, like a good YouTube explainer. Interrupt it ("wait, why does that happen?") and it stops, adjusts the drawing, and answers. Draw on the board yourself and it takes your sketch into account.

Starting with data structures & algorithms (linked lists first).

## Run

```bash
# backend
cd server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
uvicorn app:api --reload --port 8000

# frontend (new terminal)
cd web
npm install
npm run dev   # http://localhost:5173
```

## Layout

```
web/      Vite + React + TS — paper board, renderer, voice, pen
server/   FastAPI — WebSocket orchestrator, Meta + ElevenLabs clients
lessons/  Per-topic lesson skeletons (beats, misconceptions, canonical drawings)
```
