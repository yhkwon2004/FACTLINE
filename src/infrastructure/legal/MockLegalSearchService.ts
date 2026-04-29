import type { ILegalSearchService } from "../../application/ports";

export class MockLegalSearchService implements ILegalSearchService {
  async searchReferences(input: { query: string; incidentType?: string }) {
    return [
      {
        id: "ref-civil-evidence",
        title: "증거 정리 일반 원칙",
        description: "사건 자료의 작성 시점, 작성자, 원본성 확인에 관한 일반 참고 항목입니다.",
        category: input.incidentType ?? "GENERAL",
        citation: "참고자료",
        content: "법률 적용 판단 없이 상담 전 증거 목록을 정리하기 위한 참고 설명입니다.",
        sourceUrl: null,
      },
      {
        id: "ref-statement-safety",
        title: "진술서 표현 점검",
        description: "단정적 표현과 추측 표현을 사실 중심 문장으로 바꾸기 위한 참고 항목입니다.",
        category: "STATEMENT",
        citation: "참고자료",
        content: "직접 본 사실, 들은 말, 추정 내용을 분리해 기록하는 것이 상담 준비에 도움이 됩니다.",
        sourceUrl: null,
      },
    ].filter((reference) => `${reference.title} ${reference.description} ${reference.content}`.includes(input.query) || input.query.length === 0);
  }
}

