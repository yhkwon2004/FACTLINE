import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { IncidentEvent } from "../entities/IncidentEvent";
import { Evidence } from "../entities/Evidence";
import { RiskDetectionService } from "./RiskDetectionService";
import { TimelineService } from "./TimelineService";
import { ConsistencyCheckService } from "./ConsistencyCheckService";
import { EvidenceLinkService } from "./EvidenceLinkService";
import { MissingInfoService } from "./MissingInfoService";
import { Report } from "../entities/Report";

function event(overrides: Partial<IncidentEvent> = {}) {
  return new IncidentEvent({
    id: overrides.id ?? crypto.randomUUID(),
    caseId: overrides.caseId ?? "case-1",
    title: overrides.title ?? "연락 수신",
    rawStatement: overrides.rawStatement ?? "상대방이 연락했습니다.",
    description: overrides.description ?? "상대방이 연락했습니다.",
    datetime: "datetime" in overrides ? overrides.datetime : new Date("2026-01-01T10:00:00.000Z"),
    isApproximateTime: overrides.isApproximateTime ?? false,
    location: "location" in overrides ? overrides.location : "카카오톡",
    actor: "actor" in overrides ? overrides.actor : "상대방",
    action: "action" in overrides ? overrides.action : "연락",
    damage: "damage" in overrides ? overrides.damage : "확인 필요",
    source: overrides.source ?? "INTERVIEW",
    evidenceIds: overrides.evidenceIds ?? [],
  });
}

describe("FACTLINE domain services", () => {
  it("detects risky absolute phrases and suggests safer factual wording", () => {
    const risks = new RiskDetectionService().detect(
      "상대방은 항상 고의로 연락을 피했고 분명히 악의적으로 행동했습니다.",
    );

    assert.equal(risks.length, 4);
    assert.deepEqual(
      risks.map((risk) => risk.phrase),
      ["항상", "고의로", "분명히", "악의적으로"],
    );
    assert.ok(risks.every((risk) => risk.safeRewriteSuggestion.length > 0));
  });

  it("sorts precise events before approximate events at the same time", () => {
    const timeline = new TimelineService().generate([
      event({ id: "late", datetime: new Date("2026-01-02T09:00:00.000Z") }),
      event({ id: "approx", isApproximateTime: true }),
      event({ id: "precise" }),
    ]);

    assert.deepEqual(
      timeline.map((item) => item.id),
      ["precise", "approx", "late"],
    );
  });

  it("reports missing six-W fields and evidence gaps", () => {
    const missing = new MissingInfoService().check([
      event({
        datetime: null,
        location: null,
        actor: null,
        action: null,
        damage: null,
        evidenceIds: [],
      }),
    ]);

    assert.deepEqual(
      missing.map((item) => item.field),
      ["when", "where", "who", "action", "damage", "evidence"],
    );
  });

  it("flags location conflicts for overlapping events with the same actor", () => {
    const contradictions = new ConsistencyCheckService().check([
      event({ id: "a", actor: "김민수", location: "서울", datetime: new Date("2026-01-01T10:00:00.000Z") }),
      event({ id: "b", actor: "김민수", location: "부산", datetime: new Date("2026-01-01T10:20:00.000Z") }),
    ]);

    assert.equal(contradictions[0]?.type, "LOCATION");
  });

  it("links and unlinks evidence ids without duplicates", () => {
    const service = new EvidenceLinkService();
    const linked = service.link(event({ evidenceIds: ["ev-1"] }), new Evidence({
      id: "ev-1",
      caseId: "case-1",
      name: "대화 캡처",
      type: "image/png",
      fileHash: "hash",
    }));
    const unlinked = service.unlink(linked, "ev-1");

    assert.deepEqual(linked.evidenceIds, ["ev-1"]);
    assert.deepEqual(unlinked.evidenceIds, []);
  });

  it("always includes the legal safety notice in reports", () => {
    const report = new Report({
      id: "report-1",
      caseId: "case-1",
      content: "사건 개요",
    });

    assert.match(report.contentWithNotice(), /본 자료는 법률 자문이 아닙니다/);
  });
});
