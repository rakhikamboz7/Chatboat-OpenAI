import { useState, useCallback, useRef, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const CONTEXT_WINDOW = 5;
const MAX_LENGTH = 1500;
const STORAGE_KEY = "rapidbot_history";

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "bot",
  content:
    "Hey there! I'm RapidBot, your AI assistant. How can I help you today?",
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


function buildContextHistory(messages) {
  const conversational = messages.filter((m) => m.id !== "welcome");

  const cleaned = [];

  for (const msg of conversational) {
    if (!msg.content?.trim()) continue;

    const last = cleaned[cleaned.length - 1];

    // prevent consecutive same roles
    if (last && last.role === msg.role) continue;

    cleaned.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // Must end with bot
  if (cleaned.length && cleaned[cleaned.length - 1].role === "user") {
    cleaned.pop();
  }

  return cleaned.slice(-(CONTEXT_WINDOW * 2));
}

export function useChat() {
  const [messages, setMessages] = useState(loadPersistedMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  const handleInputChange = useCallback((e) => {
    setInput(e.target.value.slice(0, MAX_LENGTH));
    setError(null);
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();

    if (!trimmed) {
      setError("Please type a message.");
      return;
    }

    const currentMessages = messagesRef.current;
    const contextHistory = buildContextHistory(currentMessages);

    const userMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setError(null);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          message: trimmed,
          history: contextHistory,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Something went wrong");

      const botMsg = {
        id: `b-${Date.now()}`,
        role: "bot",
        content: data.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      if (err.name === "AbortError") return;

      setError(err.message || "Failed to reach server.");
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setIsTyping(false);
    }
  }, [input]);

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

    setMessages([
      { ...WELCOME_MESSAGE, timestamp: new Date().toISOString() },
    ]);
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