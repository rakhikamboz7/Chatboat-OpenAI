import { useState, useCallback, useRef } from "react";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const CONTEXT_WINDOW = 5; // keep last 5 messages for context
const MAX_LENGTH = 1500;

/**
 * useChat — encapsulates all chat state and logic.
 * Returns everything the UI needs.
 */
export function useChat() {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "bot",
      content:
        "Hey there! 👋 I'm RapidBot, your AI assistant for RapidekOps. Whether you're curious about SEO strategies or building a powerful e-commerce platform — I'm here to help. What's on your mind?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);

  // keep a ref to the history for context — avoids stale closure in sendMessage
  const historyRef = useRef([]);

  // ─── Input change handler ──────────────────────────────────────────────────
  const handleInputChange = useCallback((e) => {
    setInput(e.target.value.slice(0, MAX_LENGTH));
    setError(null);
  }, []);

  // ─── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();

    // Client-side validation
    if (!trimmed) {
      setError("Please type a message before sending.");
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      setError(`Message too long. Max ${MAX_LENGTH} characters.`);
      return;
    }

    const userMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    // Optimistically add user message
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setError(null);
    setIsTyping(true);

    // Build context: last N messages from history (excluding welcome)
    const contextHistory = historyRef.current.slice(-CONTEXT_WINDOW);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: contextHistory,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      const botMsg = {
        id: `b-${Date.now()}`,
        role: "bot",
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);

      // Update history ref with user + bot message
      historyRef.current = [
        ...historyRef.current,
        { role: "user", content: trimmed },
        { role: "bot", content: data.reply },
      ].slice(-CONTEXT_WINDOW * 2); // keep last 10 entries (5 exchanges)
    } catch (err) {
      setError(err.message || "Failed to reach the server. Please try again.");
      // Remove optimistic user message on hard failure
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setIsTyping(false);
    }
  }, [input]);

  // ─── Submit on Enter 
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  // ─── Clear chat ────────────────────────────────────────────────────────────
  const clearChat = useCallback(() => {
    historyRef.current = [];
    setMessages([
      {
        id: "welcome",
        role: "bot",
        content:
          "Chat cleared! Fresh start — what would you like to know about RapidekOps?",
        timestamp: new Date(),
      },
    ]);
    setError(null);
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