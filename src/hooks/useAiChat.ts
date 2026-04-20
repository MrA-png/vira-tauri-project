import { useState, useCallback } from "react";
import { Message, generateAiResponse, AiModel } from "../services/ai";

import personality from "../assets/personality.json";

export function useAiChat(aiLanguage: string = "en", aiModel: AiModel = "gemini-flash-latest") {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "assistant", 
      text: aiLanguage === "id" 
        ? `Halo! Saya VIRA AI. Saya sudah memuat profil Anda sebagai ${personality.headline.title}. Ada yang bisa saya bantu hari ini?`
        : `Hello! I am VIRA AI. I have loaded your profile as ${personality.headline.title}. How can I assist you today?`
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Add initial empty message for the model
      setMessages((prev) => [...prev, { role: "assistant", text: "" }]);

      await generateAiResponse(text, messages, (chunk) => {
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          if (lastIndex >= 0 && (newMessages[lastIndex].role === "model" || newMessages[lastIndex].role === "assistant")) {
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              text: newMessages[lastIndex].text + chunk
            };
          }
          return newMessages;
        });
      }, aiLanguage, aiModel);
    } catch (error) {
      const errorMessage: Message = { 
        role: "assistant", 
        text: "Terjadi kesalahan saat menghubungi server AI." 
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, aiLanguage, aiModel]);

  return {
    messages,
    isLoading,
    sendMessage,
  };
}
