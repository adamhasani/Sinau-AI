import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { StudyPack, HistoricalFigure } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateStudyPack(topic: string, fileData?: { base64: string, mimeType: string }): Promise<StudyPack> {
  const prompt = `Buat paket belajar untuk topik: ${topic}. Hasil bahasa Indonesia santai & edukatif.
    Fokus: Active Recall & Spaced Repetition.
    
    Kriteria:
    1. Roadmap: 3-4 langkah, deskripsi padat.
    2. detailedExplanation: Narasi esensial konsep utama.
    3. summary: 3-4 poin kunci.
    4. flashcards: 5 kartu (konsep penting).
    5. quiz: 4 soal menantang + penjelasan.
    6. eli5: Analogi unik.
    7. MindMapNodes & Edges: Layout 1000x800. Core, Main (roadmap), Sub (poin penting).`;

  const contents: any[] = [{ text: prompt }];
  
  if (fileData) {
    contents.push({
      inlineData: {
        data: fileData.base64,
        mimeType: fileData.mimeType
      }
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          roadmap: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                step: { type: Type.STRING },
                description: { type: Type.STRING },
                content: { type: Type.STRING }
              },
              required: ["step", "description", "content"]
            }
          },
          detailedExplanation: { type: Type.STRING },
          summary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING }
              },
              required: ["title", "content"]
            }
          },
          flashcards: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                front: { type: Type.STRING },
                back: { type: Type.STRING }
              },
              required: ["front", "back"]
            }
          },
          quiz: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                answer: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "answer", "explanation"]
            }
          },
          eli5: { type: Type.STRING },
          mindMapNodes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                type: { type: Type.STRING },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER }
              },
              required: ["id", "label", "type", "x", "y"]
            }
          },
          mindMapEdges: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                from: { type: Type.STRING },
                to: { type: Type.STRING }
              },
              required: ["from", "to"]
            }
          }
        },
        required: ["topic", "roadmap", "detailedExplanation", "summary", "flashcards", "quiz", "eli5", "mindMapNodes", "mindMapEdges"]
      }
    }
  });

  if (!response.text) {
    throw new Error("No response text received from AI");
  }
  
  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse AI response:", response.text);
    throw new Error("AI returned invalid JSON");
  }
}

export async function getStudyCoachResponse(messages: { role: 'user' | 'model'; parts: { text: string }[] }[]) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: messages.map(m => ({
      role: m.role,
      parts: m.parts 
    })),
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      systemInstruction: `ScholarHub Coach. Ahli tips belajar (Active Recall, Spaced Repetition). Motivasi user. Bahasa Indonesia akrab.`
    }
  });

  return response.text || "Maaf, Coach sedang sibuk.";
}

export async function getHistoricalFigureResponse(figure: HistoricalFigure, messages: { role: 'user' | 'model'; parts: { text: string }[] }[]) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: messages.map(m => ({
      role: m.role,
      parts: m.parts 
    })),
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      systemInstruction: `Role: ${figure.name}. Bio: ${figure.bio}. Personality: ${figure.personality}. Bahasa Indonesia sesuai persona.`
    }
  });

  return response.text || "Maaf, saya sedang terganggu.";
}

