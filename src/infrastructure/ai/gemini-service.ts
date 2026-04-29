import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, RiskItem, ContradictionItem } from "../../domain/entities";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_PROMPT = `당신은 사건 구조화 및 법률 상담 준비를 돕는 AI 어시스턴트 "FACTLINE"입니다.
귀하의 임무는 사용자가 제공한 사실 관계를 정리하고, 누락되거나 위험한 진술을 탐지하며, 타임라인을 생성하는 것입니다.

지침:
1. 사용자가 제공한 사실만을 사용하십시오. 지어내거나 추측하지 마십시오.
2. 법적 판단(유무죄, 형량 예측 등)을 내리지 마십시오.
3. 감정적이거나 과장된 표현을 제거하고 객관적인 사실 위주로 정리하십시오.
4. 6하원칙(누가, 언제, 어디서, 무엇을, 어떻게, 왜)에 따라 구조화하십시오.
5. 출력은 반드시 한국어로 하십시오.
6. 모든 출력에는 다음 문구를 포함해야 합니다: "본 자료는 법률 자문이 아닙니다. 참고용으로 제공되며 최종 판단은 전문가 상담이 필요합니다."`;

export class AnalysisAIService {
  private model = "gemini-3-flash-preview";

  async analyzeCase(caseTitle: string, events: any[]): Promise<Partial<AnalysisResult>> {
    const eventsText = events.map(e => `[${e.datetime}] ${e.title}: ${e.description}`).join("\n");
    
    const prompt = `다음 사건 데이터를 분석하여 구조화된 보고서를 작성하십시오.
사건명: ${caseTitle}
사건 기록:
${eventsText}

다음 형식의 JSON으로 응답하십시오:
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "risks": [{"phrase": "내용", "reason": "이유", "suggestion": "수정 제안"}],
  "missingInfo": ["확인이 필요한 정보 1", ...],
  "contradictions": [{"type": "TIME" | "LOCATION" | "ACTOR" | "SEQUENCE", "description": "설명"}],
  "suggestions": ["상담 전 준비하면 좋을 항목 1", ...],
  "content": "전체 요약 및 분석 텍스트"
}`;

    try {
      const response = await ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskLevel: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
              risks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    phrase: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    suggestion: { type: Type.STRING }
                  },
                  required: ["phrase", "reason", "suggestion"]
                }
              },
              missingInfo: { type: Type.ARRAY, items: { type: Type.STRING } },
              contradictions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ["TIME", "LOCATION", "ACTOR", "SEQUENCE"] },
                    description: { type: Type.STRING }
                  },
                  required: ["type", "description"]
                }
              },
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              content: { type: Type.STRING }
            },
            required: ["riskLevel", "risks", "missingInfo", "contradictions", "suggestions", "content"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      return result;
    } catch (error) {
      console.error("AI Analysis Error:", error);
      throw error;
    }
  }
}
