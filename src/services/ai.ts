import personality from "../assets/personality.json";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const BASE_URL_GEMINI = "https://generativelanguage.googleapis.com/v1beta";
const BASE_URL_OPENROUTER = "https://openrouter.ai/api/v1";

export type AiModel = "gemini-flash-latest" | "openai/gpt-oss-120b:free";

export interface Message {
  role: "user" | "model" | "assistant";
  text: string;
  reasoning_details?: string;
}

const getSystemInstruction = (language: string = "en") => {
  return `
You are VIRA AI, a personal job interview assistant acting as a "source person" or "coach" to help the user answer interview questions.
You have access to the following candidate's full profile:

${JSON.stringify(personality, null, 2)}

Your Personality & Tone:
1. TONE: Human-like, direct, and conversational. Avoid a "robotic" or overly formal AI assistant voice.
2. LANGUAGE: You MUST respond in ${language === "id" ? "Indonesian" : "English"}.
3. PERSONA: You ARE the candidate. Speak in the first person ("I").
4. BE CONCISE: Get straight to the point. Most people speak in short chunks (2-3 sentences). Don't give long-winded explanations unless specifically asked for a deep dive.
5. NO PLACEHOLDERS: Don't say "[Nama Perusahaan]" or "[Tahun]". If the data isn't in the persona, use the "Honest Learning" philosophy: be honest that you're currently learning/adapting to it.

Guidelines:
1. Don't sound like a textbook. Sound like a senior developer talking to a colleague or an interviewer.
2. Use specific data (Mertani, Pubmedia, Siber Integrasi) naturally. Instead of "I have experience in X," say "During my time at Siber Integrasi, I handled X..."
3. If the transcript contains a question, focus entirely on providing a ready-to-use answer that the user can read aloud naturally.
`;
};

export async function generateAiResponse(
  prompt: string, 
  history: Message[] = [], 
  onChunk?: (text: string) => void,
  language: string = "en",
  model: AiModel = "gemini-flash-latest"
): Promise<string> {
  const isOpenRouter = model.includes("openai/") || model.includes("openrouter");

  if (isOpenRouter) {
    return generateOpenRouterResponse(prompt, history, onChunk, language, model);
  } else {
    return generateGeminiResponse(prompt, history, onChunk, language, model);
  }
}

async function generateGeminiResponse(
  prompt: string,
  history: Message[],
  onChunk?: (text: string) => void,
  language: string = "en",
  model: string = "gemini-flash-latest"
): Promise<string> {
  try {
    const method = onChunk ? "streamGenerateContent" : "generateContent";
    const url = `${BASE_URL_GEMINI}/models/${model}:${method}?key=${GEMINI_API_KEY}`;
    
    const contents = [
      ...history.map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      })),
      {
        role: "user",
        parts: [{ text: `${getSystemInstruction(language)}\n\nLATEST QUESTION/TRANSCRIPT:\n${prompt}` }]
      }
    ];

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      throw new Error(`Gemini Error: ${response.statusText} (${response.status})`);
    }

    if (onChunk && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        try {
          const cleanedChunk = chunk.replace(/^\[/, "").replace(/,$/, "").replace(/\]$/, "");
          const jsonObjects = cleanedChunk.split(/\r?\n/).filter(line => line.trim());
          
          for (const jsonStr of jsonObjects) {
            try {
              const data = JSON.parse(jsonStr);
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                fullText += text;
                onChunk(text);
              }
            } catch (e) {}
          }
        } catch (e) {
          console.error("Gemini stream parsing error:", e);
        }
      }
      return fullText;
    } else {
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, saya tidak menerima jawaban yang valid.";
    }
  } catch (error) {
    console.error("Gemini error:", error);
    throw error;
  }
}

async function generateOpenRouterResponse(
  prompt: string,
  history: Message[],
  onChunk?: (text: string) => void,
  language: string = "en",
  model: string = "openai/gpt-oss-120b:free"
): Promise<string> {
  try {
    const url = `${BASE_URL_OPENROUTER}/chat/completions`;
    
    const messages = [
      { role: "system", content: getSystemInstruction(language) },
      ...history.map(msg => ({
        role: msg.role === "model" ? "assistant" : msg.role,
        content: msg.text,
        ...(msg.reasoning_details ? { reasoning_details: msg.reasoning_details } : {})
      })),
      { role: "user", content: prompt }
    ];

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: !!onChunk,
        reasoning: { enabled: true }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter Error: ${response.statusText} (${response.status})`);
    }

    if (onChunk && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(line => line.trim() !== "");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "");
            if (dataStr === "[DONE]") break;
            
            try {
              const data = JSON.parse(dataStr);
              const content = data.choices?.[0]?.delta?.content;
              // OpenRouter stream might also include reasoning in some formats, 
              // but standard OpenAI stream uses 'content'.
              if (content) {
                fullText += content;
                onChunk(content);
              }
            } catch (e) {}
          }
        }
      }
      return fullText;
    } else {
      const data = await response.json();
      const message = data.choices?.[0]?.message;
      // You might want to store reasoning_details somewhere if needed, 
      // but for simple response return we just use content.
      return message?.content || "Maaf, saya tidak menerima jawaban yang valid.";
    }
  } catch (error) {
    console.error("OpenRouter error:", error);
    throw error;
  }
}
