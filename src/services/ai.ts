import personality from "../assets/personality.json";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// Ganti AI_MODEL di sini jika ingin menggunakan model lain (misal: gemini-1.5-pro)
const AI_MODEL = "gemini-flash-latest";

export interface Message {
  role: "user" | "model";
  text: string;
}

/**
 * Mendapatkan URL API berdasarkan model dan apakah menggunakan streaming
 */
const getAiUrl = (stream = false) => {
  const method = stream ? "streamGenerateContent" : "generateContent";
  return `${BASE_URL}/models/${AI_MODEL}:${method}?key=${GEMINI_API_KEY}`;
};

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
  language: string = "en"
): Promise<string> {
  try {
    const url = getAiUrl(!!onChunk);
    
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
      throw new Error(`API Error: ${response.statusText} (${response.status})`);
    }

    if (onChunk && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // Gemini stream format is a series of JSON objects in an array starting with [ and separated by ,
        // However, the readable stream can contain partial JSON. 
        // A simple trick for Gemini: search for the text parts in the raw chunk.
        try {
          // Clean the chunk from [ or , if it's at the start or end
          const cleanedChunk = chunk.replace(/^\[/, "").replace(/,$/, "").replace(/\]$/, "");
          
          // There might be multiple JSON objects in one chunk
          const jsonObjects = cleanedChunk.split(/\r?\n/).filter(line => line.trim());
          
          for (const jsonStr of jsonObjects) {
            try {
              const data = JSON.parse(jsonStr);
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                fullText += text;
                onChunk(text);
              }
            } catch (e) {
              // Partial JSON, wait for next chunk (not perfect but works for many simple cases)
            }
          }
        } catch (e) {
          console.error("Stream parsing error:", e);
        }
      }
      return fullText;
    } else {
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, saya tidak menerima jawaban yang valid.";
    }
  } catch (error) {
    console.error(`Error using model ${AI_MODEL}:`, error);
    throw error;
  }
}
