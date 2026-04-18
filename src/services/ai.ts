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
 * Mendapatkan URL API berdasarkan model yang dikonfigurasi
 */
const getAiUrl = () => `${BASE_URL}/models/${AI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

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

export async function generateAiResponse(prompt: string, history: Message[] = []): Promise<string> {
  try {
    const url = getAiUrl();
    
    // Format history for Gemini API
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText} (${response.status})`);
    }

    const data = await response.json();
    
    // Validasi struktur response dari Gemini
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiText) {
      console.warn("API Return empty response:", data);
      return "Maaf, saya tidak menerima jawaban yang valid dari AI.";
    }

    return aiText;
  } catch (error) {
    console.error(`Error using model ${AI_MODEL}:`, error);
    throw error;
  }
}
