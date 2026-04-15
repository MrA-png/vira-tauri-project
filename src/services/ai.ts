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

export async function generateAiResponse(prompt: string): Promise<string> {
  try {
    const url = getAiUrl();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
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
