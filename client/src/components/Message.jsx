import React from "react";
import styles from "./Message.module.css";

/**
 * Message — renders a single chat bubble for user or bot.
 */
const Message = React.memo(function Message({ message }) {
  const { role, content, timestamp } = message;
  const isBot = role === "bot";

  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div
      className={`${styles.wrapper} ${isBot ? styles.bot : styles.user}`}
      role="listitem"
      aria-label={`${isBot ? "Bot" : "You"}: ${content}`}
    >
      {isBot && (
        <div className={styles.avatar} aria-hidden="true">
          <BotIcon />
        </div>
      )}

      <div className={styles.bubble}>
        <p className={styles.content}>{content}</p>
        <span className={styles.time} aria-label={`Sent at ${time}`}>
          {time}
        </span>
      </div>
    </div>
  );
});

function BotIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2a2 2 0 0 1 2 2v1h3a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h3V4a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="13" r="1.5" fill="currentColor" />
      <circle cx="15" cy="13" r="1.5" fill="currentColor" />
      <path d="M9 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default Message;