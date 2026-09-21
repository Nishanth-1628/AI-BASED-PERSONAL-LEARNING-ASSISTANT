# LearnMate — AI-Based Personal Learning Assistant

Your Personal AI-Powered Learning Companion. A complete, deployable, mobile-responsive study platform in **HTML + CSS + vanilla JS**.

## Features (all working, no placeholders)
- 🤖 AI Tutor chat (patient-tutor format, simple mode, copy/regenerate, voice in/out)
- 📚 Learn-a-topic lessons + Explain Simpler
- 📝 Notes generator (Short/Detailed/Exam/Revision) + copy/download/save
- 🎯 Quiz generator (Easy/Med/Hard, scoring, explanations, weak-topic saving)
- 🗓️ Study planner (exam date + hours → daily plan, edit/done/delete, % bar)
- 🃏 Flashcards (flip, easy/difficult, keyboard nav, from notes/materials)
- 📂 Materials upload (.txt/.md always; .pdf via PDF.js CDN; .docx via Mammoth CDN) with honest errors for unsupported files
- 📊 Progress dashboard + weakness analyzer + recommended next steps
- 🔁 Revision mode (wrong answers, difficult cards, notes, lessons)
- 🌐 English / Tamil / Tanglish explanations
- 🌙 Dark mode (persisted), responsive sidebar → bottom nav, LocalStorage history/search

## Run locally
Just open `index.html` — or serve statically:
```powershell
cd "A-5 AI-BASED PERSONAL LEARNING ASSISTANT"
python -m http.server 8000
# open http://localhost:8000
```

## AI architecture (secure — no keys in frontend)
- Default: **offline SmartTutor engine** in `js/ai.js` — real deterministic tutoring (definitions, analogies, examples, code, quizzes, flashcards, plans). No fake loading, no fake results.
- Optional cloud: deploy `server/` (Node example) which holds the provider key in env vars, then paste its URL in **Settings → Cloud AI**.
  - Frontend → `POST {endpoint}` `{messages:[...], mode}` → `{reply:"…"}`
  - If the backend fails/timeout, the UI shows a real error, never fabricated output.

## Cloud AI backend (optional)
```powershell
cd server; npm install; $env:AI_API_KEY="sk-..."; $env:AI_API_URL="https://api.openai.com/v1/chat/completions"; npm start
```
See `server/README.md`. Deploy `server/` to Render/Railway/Fly + this folder to Netlify/Vercel/GitHub Pages, then set the endpoint in Settings.

## Deploy frontend (any static host)
- **Netlify:** drag-drop this folder (publish dir = folder root).
- **Vercel:** `vercel --prod` in this folder.
- **GitHub Pages:** push folder, enable Pages.

## Quality checks done
Navigation links, all buttons/forms, LocalStorage, quiz scoring, dark mode, mobile (no horizontal scroll), voice fallback, API error states, no console errors on happy paths.
