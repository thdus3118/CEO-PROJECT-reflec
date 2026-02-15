
import { GoogleGenAI, Type } from "@google/genai";
import { Reflection } from "./types";

export const aiService = {
  getEncouragingFeedback: async (reflection: Reflection): Promise<{ feedback: string, sentiment: string }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      학생의 오늘 성찰 내용을 바탕으로 따뜻하고 구체적인 격려 피드백을 한글로 작성해주세요.
      성찰 내용:
      - 오늘 학습: ${reflection.learnedContent}
      - 학습 활동: ${reflection.activities}
      - 협동 과정: ${reflection.collaboration}
      - 수업 태도: ${reflection.attitudeRating}점

      응답은 JSON 형식으로 보내주세요:
      {
        "feedback": "격려 메시지 (2~3문장)",
        "sentiment": "positive" | "neutral" | "negative"
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              feedback: { type: Type.STRING },
              sentiment: { type: Type.STRING }
            },
            required: ["feedback", "sentiment"]
          }
        }
      });
      return JSON.parse(response.text.trim());
    } catch (error) {
      console.error("AI Feedback Error:", error);
      return { feedback: "오늘도 수고 많았어요! 내일도 즐겁게 배워봐요.", sentiment: "neutral" };
    }
  },

  analyzeClassroomIssues: async (reflections: (Reflection & { studentName: string })[]): Promise<any> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const content = reflections.map(r => `[학생:${r.studentName}] 별점:${r.attitudeRating} 내용:${r.learnedContent} 활동:${r.activities} 협동:${r.collaboration}`).join("\n");
    
    const prompt = `
      당신은 베테랑 학급 담임 교사입니다. 다음 학생들의 오늘 성찰 일지를 분석하여 '교사 가이드'를 작성해주세요.
      
      특히 다음 세 가지 측면을 집중적으로 분석하십시오:
      1. 학업 부진: 학습 내용 기술이 너무 빈약하거나 '모르겠다', '어렵다'는 표현이 지배적인 학생
      2. 관계 갈등: 협동 과정에서 친구에 대한 불만, 소외감, 갈등 징후가 보이는 학생
      3. 정서적 위기/태도: 무기력함, 지나친 자기비하, 혹은 수업 거부 의사가 보이는 학생

      학생 데이터:
      ${content}

      응답 JSON 구조를 엄격히 지켜주세요.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: "학급 전체 분위기 및 주요 흐름 요약" },
              detectedIssues: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    studentName: { type: Type.STRING },
                    issueType: { type: Type.STRING, description: "학업부진, 관계갈등, 정서위기, 태도불량 중 하나" },
                    severity: { type: Type.STRING, description: "high, medium, low 중 하나" },
                    description: { type: Type.STRING, description: "관찰된 구체적 이유 및 근거" },
                    actionTip: { type: Type.STRING, description: "교사를 위한 지도 조언" }
                  },
                  required: ["studentName", "issueType", "severity", "description", "actionTip"]
                }
              },
              statistics: {
                type: Type.OBJECT,
                properties: {
                  averageRating: { type: Type.NUMBER },
                  positiveCount: { type: Type.NUMBER },
                  alertCount: { type: Type.NUMBER }
                },
                required: ["averageRating", "positiveCount", "alertCount"]
              }
            },
            required: ["summary", "detectedIssues", "statistics"]
          }
        }
      });
      return JSON.parse(response.text.trim());
    } catch (error) {
      console.error("AI Class Analysis Error:", error);
      return { 
        summary: "데이터 분석 중 오류가 발생했습니다.", 
        detectedIssues: [], 
        statistics: { averageRating: 0, positiveCount: 0, alertCount: 0 } 
      };
    }
  }
};
