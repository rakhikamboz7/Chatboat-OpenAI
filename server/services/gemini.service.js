export const getChatResponse = async (model, message, history, systemInstruction) => {
  const chat = model.startChat({
    history,
    systemInstruction,
  });

  const result = await chat.sendMessage(message);

  const responseText = result?.response?.text?.();

  if (!responseText) {
    throw new Error("Empty response from AI");
  }

  return responseText;
};