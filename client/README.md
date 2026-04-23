A production-ready AI-powered chatbot built with React + Node.js + Gemini AI, matching Rapidekops' brand aesthetic.

Quick Start

1. Clone & Install
Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
2. Configure Environment
bash# In /server directory
cp .env.example .env
# Add your Gemini API key to .env
GEMINI_API_KEY=your_actual_key_here
3. Run
bash# Terminal 1 — start backend
cd server
npm run dev        # uses nodemon for hot reload
# Server runs on http://localhost:5000

# Terminal 2 — start frontend
cd client
npm start
# App runs on http://localhost:3000

✅ Features Implemented
Part 1: Chat UI + Backend

 Clean chat interface with user/bot message distinction
 Auto-scroll to latest message
 /chat POST endpoint accepting user messages
 AI-generated responses returned as JSON

Part 2: AI Integration

 Gemini 1.5 Flash model via @google/generative-ai SDK
 Graceful API error handling (429, 400, 500)
 Environment variable for API key

Part 3: Context Handling

 Last 5 messages maintained per session
 Session ID persisted via sessionStorage
 Stale session cleanup (30-minute TTL)
 History formatted correctly for Gemini multi-turn chat

Part 4: Enhancements (All 4 implemented)

 Typing indicator — animated 3-dot bounce
 Rate limiting — 20 requests/minute per IP via express-rate-limit
 Input validation — empty check + 500 char max (client + server)
 Chatbot personality — friendly & professional, Rapidekops-branded system prompt

Bonus Features

 Quick-prompt chips — one-click common questions
 Clear chat — resets session and history
 Inline bold text parser — renders **text** as <strong>
 Character counter with warning at 85% capacity
 Accessible — ARIA roles, live regions, keyboard nav
 Responsive design — mobile-optimized layout

Design Decisions
The UI matches Rapidekops' website aesthetic:

Grid background — subtle dot/line grid matching their brand
Syne + DM Sans — editorial display font paired with clean body font
Black & white — strict monochrome palette matching their minimal brand
Arc decorations — geometric accents replicating the website's style


🔒 API Design
POST /chat
Content-Type: application/json

{
  "message": "Tell me about your SEO services",
  "sessionId": "uuid-string"
}

→ 200 OK
{
  "reply": "...",
  "sessionId": "uuid-string"
}

→ 400 Bad Request  (validation error)
→ 429 Too Many Requests (rate limit)
→ 500 Internal Server Error
GET /health
→ { "status": "ok", "service": "Rapidekops Chat API" }

