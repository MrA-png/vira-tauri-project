import { useState, useCallback } from "react";
import { Message, generateAiResponse } from "../services/ai";

import personality from "../assets/personality.json";

export function useAiChat(aiLanguage: string = "en") {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "model", 
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
      setMessages((prev) => [...prev, { role: "model", text: "" }]);

      await generateAiResponse(text, messages, (chunk) => {
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          if (lastIndex >= 0 && newMessages[lastIndex].role === "model") {
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              text: newMessages[lastIndex].text + chunk
            };
          }
          return newMessages;
        });
      }, aiLanguage);
    } catch (error) {
      const errorMessage: Message = { 
        role: "model", 
        text: "Terjadi kesalahan saat menghubungi server AI." 
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages]);

  return {
    messages,
    isLoading,
    sendMessage,
  };
}
