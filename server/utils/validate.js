export function validateMessage(message) {
  if (!message || typeof message !== "string") {
    return { valid: false, error: "Message must be a string." };
  }

  const trimmed = message.trim();

  if (!trimmed) {
    return { valid: false, error: "Message cannot be empty." };
  }

  if (trimmed.length > 500) {
    return { valid: false, error: "Message too long." };
  }

  return { valid: true, message: trimmed };
}

export function validateHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (msg) =>
        msg &&
        (msg.role === "user" || msg.role === "bot") &&
        typeof msg.content === "string"
    )
    .slice(-5);
}