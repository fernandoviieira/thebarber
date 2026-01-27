
import { GoogleGenAI } from "@google/genai";

// Strictly follow initialization guidelines using process.env.API_KEY directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getDailyBriefing = async (appointmentsCount: number, revenue: number) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Gere um breve resumo motivacional para um barbeiro que tem ${appointmentsCount} agendamentos hoje, com faturamento previsto de R$ ${revenue}. Fale em português, seja encorajador e profissional.`,
    });
    // response.text is a property, not a method
    return response.text;
  } catch (error) {
    console.error("Gemini briefing failed", error);
    return "Tenha um ótimo dia de trabalho!";
  }
};

export const getServiceRecommendations = async (history: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Com base no histórico de cortes: "${history}", sugira um novo estilo de corte de cabelo masculino para o cliente experimentar. Seja breve e convincente.`,
    });
    // response.text is a property, not a method
    return response.text;
  } catch (error) {
    return null;
  }
};
