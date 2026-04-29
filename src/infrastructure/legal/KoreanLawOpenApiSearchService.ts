import type { ILegalSearchService } from "../../application/ports";

type LegalReferenceResult = Awaited<ReturnType<ILegalSearchService["searchReferences"]>>[number];

const OFFICIAL_SEARCH_URL = "https://www.law.go.kr/LSW/lsSc.do";
const OPEN_API_GUIDE_URL = "https://open.law.go.kr/LSO/openApi/guideList.do";
const DATA_GO_KR_URL = "https://www.data.go.kr/data/15000115/openapi.do";

function toArray(value: unknown): any[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function makeOfficialSearchLink(query: string) {
  const params = new URLSearchParams({ menuId: "1", query });
  return `${OFFICIAL_SEARCH_URL}?${params.toString()}`;
}

function normalizeSourceUrl(value: string, title: string) {
  if (!value) return makeOfficialSearchLink(title);
  if (value.startsWith("http")) return value;
  if (value.startsWith("/")) return `https://www.law.go.kr${value}`;
  return value;
}

export class KoreanLawOpenApiSearchService implements ILegalSearchService {
  async searchReferences(input: { query: string; incidentType?: string }) {
    const query = input.query.trim() || input.incidentType || "진술서 증거";
    const remote = await this.searchRemote(query);
    if (remote.length > 0) return remote;
    return this.officialFallback(query, input.incidentType);
  }

  private async searchRemote(query: string): Promise<LegalReferenceResult[]> {
    const oc = process.env.LAW_OPEN_API_OC ?? process.env.LAW_API_OC;
    const serviceKey = process.env.LAW_DATA_SERVICE_KEY ?? process.env.DATA_GO_KR_SERVICE_KEY;

    if (oc) return this.searchLawGoKr(query, oc);
    if (serviceKey) return this.searchDataGoKr(query, serviceKey);
    return [];
  }

  private async searchLawGoKr(query: string, oc: string): Promise<LegalReferenceResult[]> {
    const targets = [
      { target: "law", label: "법령" },
      { target: "prec", label: "판례" },
    ];

    const results = await Promise.allSettled(
      targets.map(async ({ target, label }) => {
        const params = new URLSearchParams({ OC: oc, target, type: "JSON", query, display: "5" });
        const response = await fetch(`https://www.law.go.kr/DRF/lawSearch.do?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) return [];
        const payload = await response.json();
        return this.normalizeLawGoKr(payload, label, query);
      }),
    );

    return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  }

  private normalizeLawGoKr(payload: any, label: string, query: string): LegalReferenceResult[] {
    const lawItems = toArray(payload?.LawSearch?.law ?? payload?.law);
    const precItems = toArray(payload?.PrecSearch?.prec ?? payload?.prec);
    const items = lawItems.length > 0 ? lawItems : precItems;

    return items.slice(0, 5).map((item, index) => {
      const title = text(item["법령명한글"]) || text(item["사건명"]) || text(item.title) || `${label} 검색 결과`;
      const citation = text(item["공포번호"]) || text(item["사건번호"]) || text(item["법령ID"]) || null;
      const date = text(item["시행일자"]) || text(item["선고일자"]) || text(item["공포일자"]);
      const sourceUrl = normalizeSourceUrl(text(item["법령상세링크"]) || text(item["판례상세링크"]), title);

      return {
        id: `lawgo-${label}-${text(item["법령일련번호"]) || text(item["판례일련번호"]) || index}`,
        title,
        description: [label, date ? `기준일: ${date}` : null, `검색어: ${query}`].filter(Boolean).join(" / "),
        category: label,
        citation,
        content: "국가법령정보센터 Open API 검색 결과입니다. 구체적 적용 여부는 판단하지 않고 원문 확인용 참고자료로만 제공합니다.",
        sourceUrl,
      };
    });
  }

  private async searchDataGoKr(query: string, serviceKey: string): Promise<LegalReferenceResult[]> {
    const params = new URLSearchParams({
      serviceKey,
      target: "law",
      query,
      numOfRows: "5",
      pageNo: "1",
    });
    const response = await fetch(`http://apis.data.go.kr/1170000/law/lawSearchList.do?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) return [];
    const xml = await response.text();
    const items = [...xml.matchAll(/<law>([\s\S]*?)<\/law>/g)].map((match) => match[1]);

    return items.map((item, index) => {
      const title = item.match(/<법령명한글>([\s\S]*?)<\/법령명한글>/)?.[1]?.trim() ?? `법령 검색 결과 ${index + 1}`;
      const serial = item.match(/<법령일련번호>([\s\S]*?)<\/법령일련번호>/)?.[1]?.trim();
      const date = item.match(/<시행일자>([\s\S]*?)<\/시행일자>/)?.[1]?.trim();
      return {
        id: `datagokr-law-${serial ?? index}`,
        title,
        description: [date ? `시행일자: ${date}` : null, `검색어: ${query}`].filter(Boolean).join(" / "),
        category: "법령",
        citation: serial ? `법령일련번호 ${serial}` : null,
        content: "공공데이터포털 법제처 국가법령정보 공유서비스 검색 결과입니다. 원문 확인을 위한 참고자료로만 제공합니다.",
        sourceUrl: makeOfficialSearchLink(title),
      };
    });
  }

  private officialFallback(query: string, incidentType?: string): LegalReferenceResult[] {
    const keyword = incidentType ? `${query} ${incidentType}` : query;

    return [
      {
        id: `official-search-${encodeURIComponent(keyword)}`,
        title: "국가법령정보센터 통합검색",
        description: `"${keyword}" 관련 법령, 판례, 행정해석을 국가법령정보센터에서 직접 확인합니다.`,
        category: "공식검색",
        citation: "법제처",
        content: "API 인증키가 설정되지 않은 환경에서는 원문 검색 링크를 제공합니다. 앱은 법적 판단 없이 공식 원문 확인 경로만 제공합니다.",
        sourceUrl: makeOfficialSearchLink(keyword),
      },
      {
        id: "law-open-api-guide",
        title: "국가법령정보 공동활용 Open API",
        description: "법령, 판례, 헌재결정례, 법령해석례 등 목록/본문 조회 API 안내입니다.",
        category: "공식API",
        citation: "open.law.go.kr",
        content: "LAW_OPEN_API_OC 또는 LAW_DATA_SERVICE_KEY를 설정하면 FACTLINE에서 실제 검색 결과를 가져올 수 있습니다.",
        sourceUrl: OPEN_API_GUIDE_URL,
      },
      {
        id: "data-go-kr-law-api",
        title: "공공데이터포털 법제처 국가법령정보 공유서비스",
        description: "REST/XML 형식의 법령정보 목록 조회 서비스입니다.",
        category: "공식API",
        citation: "data.go.kr",
        content: "공공데이터포털 인증키를 발급받아 LAW_DATA_SERVICE_KEY로 설정할 수 있습니다.",
        sourceUrl: DATA_GO_KR_URL,
      },
    ];
  }
}
