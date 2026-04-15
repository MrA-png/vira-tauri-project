import { useState, useCallback } from "react";
import { Message, generateAiResponse } from "../services/ai";

export function useAiChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", text: "Halo! Saya VIRA AI. Ada yang bisa saya bantu hari ini?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await generateAiResponse(text);
      const modelMessage: Message = { role: "model", text: response };
      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      const errorMessage: Message = { 
        role: "model", 
        text: "Terjadi kesalahan saat menghubungi server AI." 
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  return {
    messages,
    isLoading,
    sendMessage,
  };
}
