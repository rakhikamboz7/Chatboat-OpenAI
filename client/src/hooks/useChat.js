import { useState, useCallback, useRef, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const CONTEXT_WINDOW = 5;
const MAX_LENGTH = 1500;
const STORAGE_KEY = "rapidbot_history";

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "bot",
  content:
    "Hey there! 👋 I'm RapidBot, your AI assistant for RapidekOps. Whether you're curious about SEO strategies or building a powerful e-commerce platform — I'm here to help. What's on your mind?",
  timestamp: new Date().toISOString(),
};

function loadPersistedMessages() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [WELCOME_MESSAGE];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [WELCOME_MESSAGE];
  } catch {
    return [WELCOME_MESSAGE];
  }
}

// Gemini requires strictly alternating user → model turns.
// This ensures we never send consecutive same-role messages.
function buildContextHistory(messages) {
  const conversational = messages.filter((m) => m.id !== "welcome");

  const cleaned = [];
  for (const msg of conversational) {
    const last = cleaned[cleaned.length - 1];
    if (last && last.role === msg.role) continue;
    cleaned.push({ role: msg.role, content: msg.content });
  }

  return cleaned.slice(-(CONTEXT_WINDOW * 2));
}

export function useChat() {
  const [messages, setMessages] = useState(loadPersistedMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);

  // Persist messages on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Storage full — non-critical, silently skip
    }
  }, [messages]);

  const handleInputChange = useCallback((e) => {
    setInput(e.target.value.slice(0, MAX_LENGTH));
    setError(null);
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();

    if (!trimmed) {
      setError("Please type a message before sending.");
      return;
    }

    const userMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setError(null);
    setIsTyping(true);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      // Build history from current messages + the new one, then send as context
      const contextHistory = buildContextHistory([...messages, userMsg]);

      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({ message: trimmed, history: contextHistory }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      const botMsg = {
        id: `b-${Date.now()}`,
        role: "bot",
        content: data.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      if (err.name === "AbortError") return;

      setError(err.message || "Failed to reach the server. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setIsTyping(false);
    }
  }, [input, messages]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    localStorage.removeItem(STORAGE_KEY);
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date().toISOString() }]);
    setError(null);
    setIsTyping(false);
  }, []);

  return {
    messages,
    input,
    isTyping,
    error,
    maxLength: MAX_LENGTH,
    handleInputChange,
    handleKeyDown,
    sendMessage,
    clearChat,
  };
}