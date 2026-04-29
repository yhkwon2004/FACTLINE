import { RISK_PHRASES } from "../constants";
import type { RiskItem } from "../types";

const SUGGESTIONS: Record<string, string> = {
  항상: "확인 가능한 기간과 횟수를 특정해 표현하세요.",
  계속: "반복된 사실이 있다면 날짜 또는 횟수 중심으로 적으세요.",
  매번: "각 발생 시점이나 대표 사례를 나누어 적으세요.",
  모두: "대상 범위를 확인 가능한 자료 기준으로 제한하세요.",
  분명히: "판단 표현 대신 확인 가능한 발언, 문서, 행동을 적으세요.",
  고의로: "의도 단정 대신 관찰된 행동과 근거 자료를 적으세요.",
  악의적으로: "감정 평가 대신 구체적 행위와 그 결과를 적으세요.",
};

export class RiskDetectionService {
  detect(text: string): RiskItem[] {
    const found = RISK_PHRASES
      .map((phrase) => ({ phrase, index: text.indexOf(phrase) }))
      .filter((item) => item.index >= 0)
      .sort((left, right) => left.index - right.index);

    return found.map(({ phrase }) => ({
      phrase,
      riskReason: "단정적이거나 의도 판단으로 읽힐 수 있어 사실관계 정리에서 다툼이 생길 수 있습니다.",
      safeRewriteSuggestion: SUGGESTIONS[phrase] ?? "확인 가능한 사실 중심으로 다시 작성하세요.",
    }));
  }
}
