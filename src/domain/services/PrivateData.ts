import type { Inspection } from "../../infrastructure/ai/local-worker";
export type Redaction = { original: string; token: string };
const calendarDate = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  Number.isFinite(Date.parse(s + "T00:00:00Z")) &&
  new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;
const patterns = [
  /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g,
  /(?<!\d)(?:01[016789]|0\d{1,2})[- .]?\d{3,4}[- .]?\d{4}(?!\d)/g,
  /(?<!\d)\d{6}\s*[-–]\s*[1-8]\d{6}(?!\d)/g,
  /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충청|전라|경상|제주)[가-힣\s]*(?:로|길|동|읍|면)\s*\d+(?:[- ]\d+)?(?:\s*\d+동\s*\d+호)?/g,
  /(?<!\d)\d{2,6}[- ]\d{2,6}[- ]\d{2,8}(?!\d)/g,
];
export function suspectedNames(text: string) {
  return [
    ...new Set(
      Array.from(
        text.matchAll(
          /([가-힣]{2,4})(?:씨(?:는|가|에게)?|님(?:은|이|께)?|(?=은|는|이가|에게|한테|와|을|를))/g,
        ),
        (m) => m[1],
      ).filter(
        (n) =>
          ![
            "오늘",
            "어제",
            "내용",
            "사건",
            "사실",
            "자료",
            "연락",
            "확인",
            "사람",
            "시간",
            "통화",
            "계좌",
            "학교",
            "회사",
            "친구",
          ].includes(n),
      ),
    ),
  ].slice(0, 40);
}
export function anonymize(text: string, terms: string[]) {
  const found = new Set(terms.map((s) => s.trim()).filter((s) => s.length > 0));
  for (const pattern of patterns)
    for (const m of text.matchAll(pattern))
      if (!calendarDate(m[0])) found.add(m[0]);
  let prefix = "인물";
  while (text.includes(prefix)) prefix += "Q";
  const mappings = [...found]
    .sort((a, b) => b.length - a.length)
    .map((original, i) => ({
      original,
      token:
        prefix +
        String.fromCharCode(65 + (i % 26)) +
        (i >= 26 ? String(Math.floor(i / 26)) : ""),
    }));
  const spans: Array<{ from: number; to: number; start: number; end: number }> =
    [];
  let anonymous = "",
    at = 0;
  while (at < text.length) {
    const replacement = mappings.find((m) => text.startsWith(m.original, at));
    const value = replacement?.token ?? text[at],
      length = replacement?.original.length ?? 1;
    spans.push({
      from: anonymous.length,
      to: anonymous.length + value.length,
      start: at,
      end: at + length,
    });
    anonymous += value;
    at += length;
  }
  return { text: anonymous, mappings, spans };
}
export function residualIdentifiers(text: string) {
  return patterns.flatMap((p) =>
    Array.from(text.matchAll(p), (m) => m[0]).filter((s) => !calendarDate(s)),
  );
}
export function restoreInspection(
  result: Inspection,
  source: string,
  redacted: ReturnType<typeof anonymize>,
): Inspection {
  const replacements = new Map(
    redacted.mappings.map((m) => [m.token, m.original]),
  );
  const restore = (s: string) =>
    s.replace(/인물Q*[A-Z]\d*/g, (token) => replacements.get(token) ?? token);
  const span = (start: number, end: number) => {
    const a = redacted.spans.find((s) => s.from === start),
      b = redacted.spans.find((s) => s.to === end);
    return a && b ? { start: a.start, end: b.end } : null;
  };
  const relations = (result.relations ?? []).flatMap((r) => {
    if (redacted.text.slice(r.sourceSpan.start, r.sourceSpan.end) !== r.quote)
      return [];
    const range = span(r.sourceSpan.start, r.sourceSpan.end);
    if (!range) return [];
    const quote = source.slice(range.start, range.end),
      actor = restore(r.actor),
      target = r.target ? restore(r.target) : null,
      action = restore(r.action);
    if (
      !quote.includes(actor) ||
      (target && !quote.includes(target)) ||
      !quote.includes(action)
    )
      return [];
    return [
      {
        ...r,
        actor,
        target,
        action,
        quote,
        sourceSpan: range,
        mentions: r.mentions.map((m) => ({ ...m, text: restore(m.text) })),
      },
    ];
  });
  return {
    ...result,
    text: source,
    relations,
    candidates: result.candidates.flatMap((c) => {
      const quote = restore(c.quote);
      const range = c.sourceSpan && redacted.text.slice(c.sourceSpan.start, c.sourceSpan.end) === c.quote
        ? span(c.sourceSpan.start, c.sourceSpan.end) : null;
      if (c.sourceSpan && (!range || source.slice(range.start, range.end) !== quote)) return [];
      return source.includes(quote)
        ? [
            {
              ...c,
              sourceSpan: range ?? undefined,
              quote,
              title: quote.slice(0, 45),
              actor: c.actor ? restore(c.actor) : null,
              action: restore(c.action),
              location: c.location ? restore(c.location) : null,
            },
          ]
        : [];
    }),
    tokens: [],
    keywords: result.keywords.map((k) => ({ ...k, text: restore(k.text) })),
    associations: result.associations.map((a) => ({
      ...a,
      source: restore(a.source),
      target: restore(a.target),
    })),
  };
}

export const consentPayload = (
  task: string,
  text: string,
  question?: string,
  referenceDate?: string,
) =>
  JSON.stringify({
    task,
    text,
    question: question ?? null,
    referenceDate: referenceDate ?? null,
  });
