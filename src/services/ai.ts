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

const getSystemInstruction = () => {
  return `
You are VIRA AI, a personal job interview assistant acting as a "source person" or "coach" to help the user answer interview questions.
You have access to the following candidate's full profile:

${JSON.stringify(personality, null, 2)}

Your Tasks:
1. Help the candidate answer interview questions with confidence.
2. Answer AS IF YOU ARE the candidate (use the first-person pronoun "I").
3. Provide responses that are SHORT, CONCISE, and EASY TO READ ALOUD (maximum 3-4 sentences per response to sound natural).
4. Use data from the candidate's career history, tech stack, and achievements above to strengthen the answers.
5. If an interview question appears in the transcript, provide the best suggested answer using the STAR (Situation, Task, Action, Result) method where possible.
6. Provide answers in Indonesian unless the interview context is in English.

Current Context: Someone is conducting an interview with the user. Use the latest transcript to provide immediate answering assistance.
`;
};

export async function generateAiResponse(
  prompt: string, 
  history: Message[] = [], 
  onChunk?: (text: string) => void
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
        parts: [{ text: `${getSystemInstruction()}\n\nLATEST QUESTION/TRANSCRIPT:\n${prompt}` }]
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
