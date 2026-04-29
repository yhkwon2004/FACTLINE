import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AnalysisResult,
  Case,
  Evidence,
  IncidentEvent,
  LegalReference,
  LifeRecord,
  Report,
  User,
} from "../../domain/entities";
import type {
  IAnalysisRepository,
  ICaseRepository,
  IEvidenceRepository,
  IEventRepository,
  ILegalReferenceRepository,
  ILifeRecordRepository,
  IReportRepository,
  IUserRepository,
} from "../../domain/repositories";
import type { IncidentType, LifeRecordType } from "../../domain/types";

type StoredUser = {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

type StoredCase = {
  id: string;
  title: string;
  type: IncidentType;
  status: string;
  userId: string;
  description?: string | null;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

type StoredEvent = {
  id: string;
  caseId: string;
  title: string;
  rawStatement: string;
  description: string;
  datetime?: string | null;
  isApproximateTime: boolean;
  approximateTimeText?: string | null;
  location?: string | null;
  actor?: string | null;
  action?: string | null;
  damage?: string | null;
  source: string;
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
};

type StoredEvidence = {
  id: string;
  caseId: string;
  name: string;
  type: string;
  fileUrl?: string | null;
  fileHash?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
};

type StoredAnalysis = {
  id: string;
  caseId: string;
  riskLevel?: string | null;
  risks: unknown[];
  missingInfo: unknown[];
  contradictions: unknown[];
  suggestions: string[];
  content?: string | null;
  createdAt: string;
  updatedAt: string;
};

type StoredLegalReference = {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  citation?: string | null;
  content: string;
  sourceUrl?: string | null;
  createdAt: string;
};

type StoredReport = {
  id: string;
  caseId: string;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type StoredLifeRecord = {
  id: string;
  userId: string;
  caseId?: string | null;
  type: LifeRecordType;
  title: string;
  content: string;
  occurredAt?: string | null;
  approximateTimeText?: string | null;
  location?: string | null;
  people?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type LocalStore = {
  users: StoredUser[];
  cases: StoredCase[];
  events: StoredEvent[];
  evidences: StoredEvidence[];
  analyses: StoredAnalysis[];
  legalReferences: StoredLegalReference[];
  reports: StoredReport[];
  lifeRecords: StoredLifeRecord[];
};

const storePath =
  process.env.FACTLINE_LOCAL_STORE_PATH ??
  (process.env.VERCEL
    ? join(tmpdir(), ".factline-local-store.json")
    : join(/* turbopackIgnore: true */ process.cwd(), ".factline-local-store.json"));

function emptyStore(): LocalStore {
  return {
    users: [],
    cases: [],
    events: [],
    evidences: [],
    analyses: [],
    legalReferences: [],
    reports: [],
    lifeRecords: [],
  };
}

function readStore(): LocalStore {
  if (!existsSync(storePath)) return emptyStore();
  return { ...emptyStore(), ...JSON.parse(readFileSync(storePath, "utf8")) };
}

function writeStore(store: LocalStore) {
  const tmpPath = `${storePath}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(store, null, 2));
  renameSync(tmpPath, storePath);
}

function updateStore<T>(mutate: (store: LocalStore) => T): T {
  const store = readStore();
  const result = mutate(store);
  writeStore(store);
  return result;
}

function toDate(value?: string | null) {
  return value ? new Date(value) : undefined;
}

function toNullableDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function iso(value?: Date | null) {
  return value ? value.toISOString() : null;
}

function mapUser(data: StoredUser) {
  return new User({
    id: data.id,
    email: data.email,
    name: data.name,
    passwordHash: data.passwordHash,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  });
}

function mapEvidence(data: StoredEvidence) {
  return new Evidence({
    ...data,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  });
}

function mapEvent(data: StoredEvent) {
  return new IncidentEvent({
    ...data,
    datetime: toNullableDate(data.datetime),
    source: data.source as any,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  });
}

function mapCase(data: StoredCase, store: LocalStore) {
  return new Case({
    ...data,
    type: data.type,
    status: data.status as any,
    events: store.events.filter((event) => event.caseId === data.id).map(mapEvent),
    evidences: store.evidences.filter((evidence) => evidence.caseId === data.id).map(mapEvidence),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  });
}

function mapLifeRecord(data: StoredLifeRecord) {
  return new LifeRecord({
    ...data,
    occurredAt: toNullableDate(data.occurredAt),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  });
}

function storeUser(user: User): StoredUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt.toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function storeCase(caseData: Case): StoredCase {
  return {
    id: caseData.id,
    title: caseData.title,
    type: caseData.type,
    status: caseData.status,
    userId: caseData.userId,
    description: caseData.description,
    isLocked: caseData.isLocked,
    createdAt: caseData.createdAt.toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function storeEvent(event: IncidentEvent): StoredEvent {
  return {
    id: event.id,
    caseId: event.caseId,
    title: event.title,
    rawStatement: event.rawStatement,
    description: event.description,
    datetime: iso(event.datetime),
    isApproximateTime: event.isApproximateTime,
    approximateTimeText: event.approximateTimeText,
    location: event.location,
    actor: event.actor,
    action: event.action,
    damage: event.damage,
    source: event.source,
    evidenceIds: event.evidenceIds,
    createdAt: event.createdAt.toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function storeEvidence(evidence: Evidence): StoredEvidence {
  return {
    id: evidence.id,
    caseId: evidence.caseId,
    name: evidence.name,
    type: evidence.type,
    fileUrl: evidence.fileUrl,
    fileHash: evidence.fileHash,
    description: evidence.description,
    createdAt: evidence.createdAt.toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function storeLifeRecord(record: LifeRecord): StoredLifeRecord {
  return {
    id: record.id,
    userId: record.userId,
    caseId: record.caseId,
    type: record.type,
    title: record.title,
    content: record.content,
    occurredAt: iso(record.occurredAt),
    approximateTimeText: record.approximateTimeText,
    location: record.location,
    people: record.people,
    tags: record.tags,
    createdAt: record.createdAt.toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function upsertById<T extends { id: string }>(items: T[], item: T) {
  const index = items.findIndex((current) => current.id === item.id);
  if (index >= 0) items[index] = { ...items[index], ...item };
  else items.push(item);
}

export class LocalJsonUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const data = readStore().users.find((user) => user.id === id && !user.deletedAt);
    return data ? mapUser(data) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase();
    const data = readStore().users.find((user) => user.email.toLowerCase() === normalized && !user.deletedAt);
    return data ? mapUser(data) : null;
  }

  async save(user: User): Promise<User> {
    return updateStore((store) => {
      const data = storeUser(user);
      upsertById(store.users, data);
      return mapUser(data);
    });
  }

  async delete(id: string): Promise<void> {
    updateStore((store) => {
      const user = store.users.find((item) => item.id === id);
      if (user) user.deletedAt = new Date().toISOString();
    });
  }
}

export class LocalJsonCaseRepository implements ICaseRepository {
  async findById(id: string): Promise<Case | null> {
    const store = readStore();
    const data = store.cases.find((caseData) => caseData.id === id && !caseData.deletedAt);
    return data ? mapCase(data, store) : null;
  }

  async findAllByUserId(userId: string): Promise<Case[]> {
    const store = readStore();
    return store.cases
      .filter((caseData) => caseData.userId === userId && !caseData.deletedAt)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((caseData) => mapCase(caseData, store));
  }

  async save(caseData: Case): Promise<Case> {
    return updateStore((store) => {
      const data = storeCase(caseData);
      upsertById(store.cases, data);
      return mapCase(data, store);
    });
  }

  async lock(id: string): Promise<void> {
    updateStore((store) => {
      const caseData = store.cases.find((item) => item.id === id);
      if (caseData) {
        caseData.isLocked = true;
        caseData.updatedAt = new Date().toISOString();
      }
    });
  }

  async delete(id: string): Promise<void> {
    updateStore((store) => {
      const caseData = store.cases.find((item) => item.id === id);
      if (caseData) caseData.deletedAt = new Date().toISOString();
    });
  }
}

export class LocalJsonEventRepository implements IEventRepository {
  async findByCaseId(caseId: string): Promise<IncidentEvent[]> {
    return readStore()
      .events.filter((event) => event.caseId === caseId)
      .sort((a, b) => (a.datetime ?? a.createdAt).localeCompare(b.datetime ?? b.createdAt))
      .map(mapEvent);
  }

  async save(event: IncidentEvent): Promise<IncidentEvent> {
    return updateStore((store) => {
      const data = storeEvent(event);
      upsertById(store.events, data);
      return mapEvent(data);
    });
  }

  async delete(id: string): Promise<void> {
    updateStore((store) => {
      store.events = store.events.filter((event) => event.id !== id);
    });
  }
}

export class LocalJsonEvidenceRepository implements IEvidenceRepository {
  async findByCaseId(caseId: string): Promise<Evidence[]> {
    return readStore()
      .evidences.filter((evidence) => evidence.caseId === caseId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(mapEvidence);
  }

  async save(evidence: Evidence): Promise<Evidence> {
    return updateStore((store) => {
      const data = storeEvidence(evidence);
      upsertById(store.evidences, data);
      return mapEvidence(data);
    });
  }

  async delete(id: string): Promise<void> {
    updateStore((store) => {
      store.evidences = store.evidences.filter((evidence) => evidence.id !== id);
      store.events.forEach((event) => {
        event.evidenceIds = event.evidenceIds.filter((evidenceId) => evidenceId !== id);
      });
    });
  }

  async linkToEvent(evidenceId: string, eventId: string): Promise<void> {
    updateStore((store) => {
      const event = store.events.find((item) => item.id === eventId);
      if (event && !event.evidenceIds.includes(evidenceId)) event.evidenceIds.push(evidenceId);
    });
  }

  async unlinkFromEvent(evidenceId: string, eventId: string): Promise<void> {
    updateStore((store) => {
      const event = store.events.find((item) => item.id === eventId);
      if (event) event.evidenceIds = event.evidenceIds.filter((id) => id !== evidenceId);
    });
  }
}

export class LocalJsonAnalysisRepository implements IAnalysisRepository {
  async findByCaseId(caseId: string): Promise<AnalysisResult | null> {
    const data = readStore().analyses.find((analysis) => analysis.caseId === caseId);
    return data
      ? new AnalysisResult({
          ...data,
          riskLevel: data.riskLevel as any,
          risks: data.risks as any,
          missingInfo: data.missingInfo as any,
          contradictions: data.contradictions as any,
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        })
      : null;
  }

  async save(analysis: AnalysisResult): Promise<AnalysisResult> {
    return updateStore((store) => {
      const data: StoredAnalysis = {
        id: analysis.id,
        caseId: analysis.caseId,
        riskLevel: analysis.riskLevel,
        risks: analysis.risks,
        missingInfo: analysis.missingInfo,
        contradictions: analysis.contradictions,
        suggestions: analysis.suggestions,
        content: analysis.content,
        createdAt: analysis.createdAt.toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const index = store.analyses.findIndex((item) => item.caseId === analysis.caseId);
      if (index >= 0) store.analyses[index] = { ...store.analyses[index], ...data };
      else store.analyses.push(data);
      return new AnalysisResult({
        ...data,
        riskLevel: data.riskLevel as any,
        risks: data.risks as any,
        missingInfo: data.missingInfo as any,
        contradictions: data.contradictions as any,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      });
    });
  }
}

export class LocalJsonLegalReferenceRepository implements ILegalReferenceRepository {
  async search(query: string, incidentType?: string): Promise<LegalReference[]> {
    const normalizedQuery = query.toLowerCase();
    const normalizedType = incidentType?.toLowerCase();
    return readStore()
      .legalReferences.filter((reference) => {
        const haystack = [reference.title, reference.description, reference.content, reference.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
        const matchesType = !normalizedType || reference.category?.toLowerCase().includes(normalizedType);
        return matchesQuery && matchesType;
      })
      .slice(0, 8)
      .map((reference) => new LegalReference({ ...reference, createdAt: toDate(reference.createdAt) }));
  }

  async save(reference: LegalReference): Promise<LegalReference> {
    return updateStore((store) => {
      const data: StoredLegalReference = {
        id: reference.id,
        title: reference.title,
        description: reference.description,
        category: reference.category,
        citation: reference.citation,
        content: reference.content,
        sourceUrl: reference.sourceUrl,
        createdAt: reference.createdAt.toISOString(),
      };
      upsertById(store.legalReferences, data);
      return new LegalReference({ ...data, createdAt: toDate(data.createdAt) });
    });
  }
}

export class LocalJsonReportRepository implements IReportRepository {
  async findByCaseId(caseId: string): Promise<Report | null> {
    const data = readStore().reports.find((report) => report.caseId === caseId);
    return data
      ? new Report({
          ...data,
          status: data.status as any,
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        })
      : null;
  }

  async save(report: Report): Promise<Report> {
    return updateStore((store) => {
      const data: StoredReport = {
        id: report.id,
        caseId: report.caseId,
        content: report.contentWithNotice(),
        status: report.status,
        createdAt: report.createdAt.toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const index = store.reports.findIndex((item) => item.caseId === report.caseId);
      if (index >= 0) store.reports[index] = { ...store.reports[index], ...data };
      else store.reports.push(data);
      return new Report({
        ...data,
        status: data.status as any,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      });
    });
  }
}

export class LocalJsonLifeRecordRepository implements ILifeRecordRepository {
  async findById(id: string): Promise<LifeRecord | null> {
    const data = readStore().lifeRecords.find((record) => record.id === id);
    return data ? mapLifeRecord(data) : null;
  }

  async findAllByUserId(userId: string): Promise<LifeRecord[]> {
    return readStore()
      .lifeRecords.filter((record) => record.userId === userId)
      .sort((a, b) => (b.occurredAt ?? b.createdAt).localeCompare(a.occurredAt ?? a.createdAt))
      .map(mapLifeRecord);
  }

  async findByCaseId(caseId: string): Promise<LifeRecord[]> {
    return readStore()
      .lifeRecords.filter((record) => record.caseId === caseId)
      .sort((a, b) => (a.occurredAt ?? a.createdAt).localeCompare(b.occurredAt ?? b.createdAt))
      .map(mapLifeRecord);
  }

  async save(record: LifeRecord): Promise<LifeRecord> {
    return updateStore((store) => {
      const data = storeLifeRecord(record);
      upsertById(store.lifeRecords, data);
      return mapLifeRecord(data);
    });
  }

  async delete(id: string): Promise<void> {
    updateStore((store) => {
      store.lifeRecords = store.lifeRecords.filter((record) => record.id !== id);
    });
  }
}
