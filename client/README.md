# RapidekOps AI Chatbot

An AI-powered chatbot built for RapidekOps — a digital agency specializing in SEO and e-commerce web development. Built with React (Vite), Node.js, Express, and the Groq API.

---

## Quick Start

### 1. Clone & Install

```bash
# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install
```

### 2. Configure Environment

```bash
cd server
cp .env.example .env
```

Open `server/.env` and fill in your keys:

```env
PORT=5000
CLIENT_URL=http://localhost:5173

# Primary Groq key — required
GROQ_API_KEY_1=your_primary_key_here

# Secondary Groq key — optional fallback if key 1 hits quota
GROQ_API_KEY_2=your_secondary_key_here
```

### 3. Run

```bash
# Terminal 1 — backend (http://localhost:5000)
cd server
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd client
npm run dev
```

---

## Features

### Part 1 — Chat UI + Backend
- Chat interface with visually distinct user and bot message bubbles
- Auto-scroll to the latest message on every new reply
- `POST /chat` endpoint that accepts a user message and returns an AI response

### Part 2 — AI Integration
- Groq API integration via the Groq SDK
- Dual API key support — automatically retries with a secondary key on quota or rate limit errors
- Centralized error handling with a global error middleware and mapped error messages

### Part 3 — Context Handling
- Last 5 message exchanges maintained per conversation
- History enforces Groq's alternating user/model turn requirement
- Context snapshot taken before state updates to avoid stale closure issues

### Part 4 — Enhancements (all 4 implemented)
- **Typing indicator** — animated 3-dot bounce while waiting for a response
- **Rate limiting** — 20 requests per minute via `express-rate-limit`
- **Input validation** — empty message check and 1500 character max, enforced on both client and server
- **Chatbot personality** — friendly and professional tone, scoped to RapidekOps services (SEO, e-commerce, digital marketing)

### Bonus
- Chat history persisted to `localStorage` — survives page refresh
- Clear chat button — wipes history and resets to welcome message
- Quick-prompt suggestion chips for common questions
- Responsive layout — works on mobile and desktop
- Accessible — ARIA roles, live regions, keyboard navigation (Enter to send, Shift+Enter for new line)

---

## API Reference

### `POST /chat`

```json
// Request
{
  "message": "How do you approach SEO for e-commerce sites?",
  "history": [
    { "role": "user", "content": "Hi" },
    { "role": "bot", "content": "Hello! How can I help?" }
  ]
}

// 200 OK
{
  "reply": "For e-commerce SEO, we focus on..."
}

// 400 Bad Request — validation failed
{ "error": "Message cannot be empty." }

// 429 Too Many Requests — rate limit hit
{ "error": "Too many requests — please wait a moment and try again." }

// 503 Service Unavailable — all API keys exhausted
{ "error": "AI service is temporarily unavailable. Please try again shortly." }
```

### `GET /health`

```json
{ "status": "ok" }
```

---

## Design Decisions

**Why `localStorage` over `sessionStorage`?**
Chat history persists across browser sessions without needing authentication — better UX for returning users, and clearing it is a single explicit action via the Clear button.

<!-- **Why dual API keys?**
Free tier Groq keys have per-minute and daily rate limits. If the primary key hits quota, the service automatically retries with the secondary key without the user seeing an error. -->

**Why no IP-based rate limiting?**
Without authentication, IP is an unreliable identifier — shared networks and proxies would unfairly block legitimate users. `express-rate-limit` is kept for general server protection with `validate: { ip: false }`.

**Why strip markdown from responses?**
The system prompt instructs the model to respond in plain text, but AI models occasionally output markdown anyway. The `cleanResponse` function in the service layer strips it server-side so the frontend stays simple with no markdown parser needed.