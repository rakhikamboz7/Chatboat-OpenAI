import React, { useEffect, useRef } from "react";
import { useChat } from "./hooks/useChat.js";
import Message from "./components/Message.jsx";
import TypingIndicator from "./components/TypingIndicator.jsx";
import styles from "./App.module.css";

// ─── Suggested prompts ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "What SEO services do you offer?",
  "How do you build e-commerce sites?",
  "How does RapidekOps improve traffic?",
  "What makes your web design unique?",
];

export default function App() {
  const {
    messages,
    input,
    isTyping,
    error,
    maxLength,
    handleInputChange,
    handleKeyDown,
    sendMessage,
    clearChat,
  } = useChat();

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSuggestion = (text) => {
    // Simulate typing and sending a suggestion
    handleInputChange({ target: { value: text } });
    setTimeout(() => {
      document.getElementById("chat-send-btn")?.click();
    }, 50);
  };

  const charsLeft = maxLength - input.length;
  const isNearLimit = charsLeft <= 60;

  return (
    <>
      {/* Background layers */}
      <div className="grid-bg" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />

      <div className={styles.shell}>
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className={styles.sidebar} aria-label="Sidebar">
          <div className={styles.brand}>
            <div className={styles.brandIcon} aria-hidden="true">
              <LogoMark />
            </div>
            <div>
              <span className={styles.brandName}>RapidekOps</span>
              <span className={styles.brandTag}>AI Assistant</span>
            </div>
          </div>

          <nav className={styles.sideNav} aria-label="Suggested questions">
            <p className={styles.sideLabel}>Try asking</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className={styles.suggestionBtn}
                onClick={() => handleSuggestion(s)}
                aria-label={`Ask: ${s}`}
              >
                <span className={styles.suggestionIcon} aria-hidden="true">→</span>
                {s}
              </button>
            ))}
          </nav>

          <div className={styles.sideMeta}>
            <div className={styles.statusDot} aria-hidden="true" />
            <span>Powered by Gemini AI</span>
          </div>
        </aside>

        {/* ── Main Chat Panel ──────────────────────────────────────────────── */}
        <main className={styles.chatPanel} aria-label="Chat window">

          {/* Header */}
          <header className={styles.header}>
            <div className={styles.headerInfo}>
              <div className={styles.onlineBadge} aria-hidden="true">
                <span className={styles.pulse} />
              </div>
              <div>
                <h1 className={styles.headerTitle}>RapidBot</h1>
                <p className={styles.headerSub}>SEO & E-commerce Expert</p>
              </div>
            </div>

            <button
              className={styles.clearBtn}
              onClick={clearChat}
              aria-label="Clear chat history"
              title="Clear chat"
            >
              <TrashIcon />
              <span>Clear</span>
            </button>
          </header>

          {/* Messages */}
          <section
            className={styles.messages}
            role="list"
            aria-label="Chat messages"
            aria-live="polite"
            aria-atomic="false"
          >
            {messages.map((msg) => (
              <Message key={msg.id} message={msg} />
            ))}

            {isTyping && <TypingIndicator />}

            <div ref={bottomRef} aria-hidden="true" />
          </section>

          {/* Error banner */}
          {error && (
            <div className={styles.errorBanner} role="alert" aria-live="assertive">
              <WarnIcon />
              <span>{error}</span>
            </div>
          )}

          {/* Input area */}
          <footer className={styles.inputArea}>
            <div className={styles.inputWrap}>
              <textarea
                ref={inputRef}
                id="chat-input"
                className={styles.textarea}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask about SEO, e-commerce, or anything RapidekOps…"
                rows={1}
                maxLength={maxLength}
                aria-label="Type your message"
                aria-describedby={error ? "chat-error" : undefined}
                disabled={isTyping}
                autoComplete="off"
                spellCheck="true"
              />

              {isNearLimit && (
                <span
                  className={`${styles.charCount} ${charsLeft <= 20 ? styles.charDanger : ""}`}
                  aria-live="polite"
                >
                  {charsLeft}
                </span>
              )}
            </div>

            <button
              id="chat-send-btn"
              className={styles.sendBtn}
              onClick={sendMessage}
              disabled={isTyping || !input.trim()}
              aria-label="Send message"
              title="Send (Enter)"
            >
              {isTyping ? <SpinnerIcon /> : <SendIcon />}
            </button>
          </footer>

          <p className={styles.hint}>
            Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
          </p>
        </main>
      </div>
    </>
  );
}

/* ─── Inline SVG icons ─────────────────────────────────────────────────────── */
function LogoMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2L15 22l-4-9-9-4 20-7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="spin">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}