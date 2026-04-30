import {
  IAnalysisRepository,
  ICaseRepository,
  IConnectedSourceRepository,
  IEvidenceRepository,
  IEventRepository,
  ILegalReferenceRepository,
  ILifeRecordRepository,
  IMemoryRecordRepository,
  IReportRepository,
  IUserRepository,
} from "../../domain/repositories";
import {
  AnalysisResult,
  Case,
  ConnectedSource,
  Evidence,
  IncidentEvent,
  LegalReference,
  LifeRecord,
  MemoryRecord,
  Report,
  User,
} from "../../domain/entities";
import { getPrismaClient } from "../prisma-client";
import type {
  ConnectedSourceStatus,
  IncidentType,
  IntegrationProvider,
  LifeRecordType,
  MemoryRecordDirection,
  MemoryRecordKind,
} from "../../domain/types";

type PrismaCaseWithRelations = Awaited<ReturnType<ReturnType<typeof getPrismaClient>["case"]["findUnique"]>>;

function mapUser(data: { id: string; email: string; name: string; passwordHash: string; createdAt: Date; updatedAt: Date }) {
  return new User({
    id: data.id,
    email: data.email,
    name: data.name,
    passwordHash: data.passwordHash,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
}

function mapEvent(data: any) {
  return new IncidentEvent({
    id: data.id,
    caseId: data.caseId,
    title: data.title,
    rawStatement: data.rawStatement,
    description: data.description,
    datetime: data.datetime,
    isApproximateTime: data.isApproximateTime,
    approximateTimeText: data.approximateTimeText,
    location: data.location,
    actor: data.actor,
    action: data.action,
    damage: data.damage,
    source: data.source,
    evidenceIds: data.evidences?.map((evidence: { id: string }) => evidence.id) ?? [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
}

function mapEvidence(data: any) {
  return new Evidence({
    id: data.id,
    caseId: data.caseId,
    name: data.name,
    type: data.type,
    fileUrl: data.fileUrl,
    fileHash: data.fileHash,
    description: data.description,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
}

function mapCase(data: any) {
  return new Case({
    id: data.id,
    title: data.title,
    type: data.type as IncidentType,
    status: data.status,
    userId: data.userId,
    description: data.description,
    events: data.events?.map(mapEvent) ?? [],
    evidences: data.evidences?.map(mapEvidence) ?? [],
    isLocked: data.isLocked,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
}

function mapLifeRecord(data: any) {
  return new LifeRecord({
    id: data.id,
    userId: data.userId,
    caseId: data.caseId,
    type: data.type as LifeRecordType,
    title: data.title,
    content: data.content,
    occurredAt: data.occurredAt,
    approximateTimeText: data.approximateTimeText,
    location: data.location,
    people: data.people,
    tags: data.tags ? JSON.parse(data.tags) : [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
}

function parseJsonArray(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value?: string | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function mapConnectedSource(data: any) {
  return new ConnectedSource({
    id: data.id,
    userId: data.userId,
    provider: data.provider as IntegrationProvider,
    displayName: data.displayName,
    status: data.status as ConnectedSourceStatus,
    consentScopes: parseJsonArray(data.consentScopes).map(String),
    consentedAt: data.consentedAt,
    lastSyncedAt: data.lastSyncedAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
}

function mapMemoryRecord(data: any) {
  return new MemoryRecord({
    id: data.id,
    userId: data.userId,
    sourceId: data.sourceId,
    provider: data.provider as IntegrationProvider,
    kind: data.kind as MemoryRecordKind,
    externalId: data.externalId,
    participantName: data.participantName,
    participantHandle: data.participantHandle,
    direction: data.direction as MemoryRecordDirection,
    content: data.content,
    occurredAt: data.occurredAt,
    approximateTimeText: data.approximateTimeText,
    location: data.location,
    metadata: parseJsonObject(data.metadata),
    attachmentNames: parseJsonArray(data.attachmentNames).map(String),
    fileHash: data.fileHash,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
}

export class PrismaUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const data = await getPrismaClient().user.findFirst({ where: { id, deletedAt: null } });
    return data ? mapUser(data) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const data = await getPrismaClient().user.findFirst({ where: { email, deletedAt: null } });
    return data ? mapUser(data) : null;
  }

  async save(user: User): Promise<User> {
    const data = await getPrismaClient().user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        name: user.name,
        passwordHash: user.passwordHash ?? "",
      },
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: user.passwordHash ?? "",
      },
    });

    return mapUser(data);
  }

  async delete(id: string): Promise<void> {
    await getPrismaClient().user.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

export class PrismaCaseRepository implements ICaseRepository {
  async findById(id: string): Promise<Case | null> {
    const data = await getPrismaClient().case.findFirst({
      where: { id, deletedAt: null },
      include: { events: { include: { evidences: true } }, evidences: true },
    });
    return data ? mapCase(data) : null;
  }

  async findAllByUserId(userId: string): Promise<Case[]> {
    const data = await getPrismaClient().case.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      include: { events: { include: { evidences: true } }, evidences: true },
    });
    return data.map(mapCase);
  }

  async save(caseData: Case): Promise<Case> {
    const data = await getPrismaClient().case.upsert({
      where: { id: caseData.id },
      update: {
        title: caseData.title,
        type: caseData.type,
        description: caseData.description,
        status: caseData.status,
        isLocked: caseData.isLocked,
      },
      create: {
        id: caseData.id,
        title: caseData.title,
        type: caseData.type,
        description: caseData.description,
        status: caseData.status,
        userId: caseData.userId,
        isLocked: caseData.isLocked,
      },
      include: { events: { include: { evidences: true } }, evidences: true },
    });
    return mapCase(data);
  }

  async lock(id: string): Promise<void> {
    await getPrismaClient().case.update({ where: { id }, data: { isLocked: true } });
  }

  async delete(id: string): Promise<void> {
    await getPrismaClient().case.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

export class PrismaEventRepository implements IEventRepository {
  async findByCaseId(caseId: string): Promise<IncidentEvent[]> {
    const data = await getPrismaClient().incidentEvent.findMany({
      where: { caseId },
      include: { evidences: true },
      orderBy: [{ datetime: "asc" }, { createdAt: "asc" }],
    });
    return data.map(mapEvent);
  }

  async save(event: IncidentEvent): Promise<IncidentEvent> {
    const data = await getPrismaClient().incidentEvent.upsert({
      where: { id: event.id },
      update: {
        title: event.title,
        rawStatement: event.rawStatement,
        description: event.description,
        datetime: event.datetime,
        isApproximateTime: event.isApproximateTime,
        approximateTimeText: event.approximateTimeText,
        location: event.location,
        actor: event.actor,
        action: event.action,
        damage: event.damage,
        source: event.source,
      },
      create: {
        id: event.id,
        caseId: event.caseId,
        title: event.title,
        rawStatement: event.rawStatement,
        description: event.description,
        datetime: event.datetime,
        isApproximateTime: event.isApproximateTime,
        approximateTimeText: event.approximateTimeText,
        location: event.location,
        actor: event.actor,
        action: event.action,
        damage: event.damage,
        source: event.source,
      },
      include: { evidences: true },
    });

    if (event.evidenceIds.length > 0) {
      await getPrismaClient().incidentEvent.update({
        where: { id: event.id },
        data: { evidences: { set: event.evidenceIds.map((id) => ({ id })) } },
      });
    }

    return mapEvent(data);
  }

  async delete(id: string): Promise<void> {
    await getPrismaClient().incidentEvent.delete({ where: { id } });
  }
}

export class PrismaEvidenceRepository implements IEvidenceRepository {
  async findByCaseId(caseId: string): Promise<Evidence[]> {
    const data = await getPrismaClient().evidence.findMany({ where: { caseId }, orderBy: { createdAt: "desc" } });
    return data.map(mapEvidence);
  }

  async save(evidence: Evidence): Promise<Evidence> {
    const data = await getPrismaClient().evidence.upsert({
      where: { id: evidence.id },
      update: {
        name: evidence.name,
        type: evidence.type,
        fileUrl: evidence.fileUrl,
        fileHash: evidence.fileHash,
        description: evidence.description,
      },
      create: {
        id: evidence.id,
        caseId: evidence.caseId,
        name: evidence.name,
        type: evidence.type,
        fileUrl: evidence.fileUrl,
        fileHash: evidence.fileHash,
        description: evidence.description,
      },
    });
    return mapEvidence(data);
  }

  async delete(id: string): Promise<void> {
    await getPrismaClient().evidence.delete({ where: { id } });
  }

  async linkToEvent(evidenceId: string, eventId: string): Promise<void> {
    await getPrismaClient().incidentEvent.update({
      where: { id: eventId },
      data: { evidences: { connect: { id: evidenceId } } },
    });
  }

  async unlinkFromEvent(evidenceId: string, eventId: string): Promise<void> {
    await getPrismaClient().incidentEvent.update({
      where: { id: eventId },
      data: { evidences: { disconnect: { id: evidenceId } } },
    });
  }
}

export class PrismaAnalysisRepository implements IAnalysisRepository {
  async findByCaseId(caseId: string): Promise<AnalysisResult | null> {
    const data = await getPrismaClient().analysisResult.findUnique({ where: { caseId } });
    if (!data) return null;
    return new AnalysisResult({
      id: data.id,
      caseId: data.caseId,
      riskLevel: data.riskLevel as any,
      risks: data.risks ? JSON.parse(data.risks) : [],
      missingInfo: data.missingInfo ? JSON.parse(data.missingInfo) : [],
      contradictions: data.contradictions ? JSON.parse(data.contradictions) : [],
      suggestions: data.suggestions ? JSON.parse(data.suggestions) : [],
      content: data.content,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  async save(analysis: AnalysisResult): Promise<AnalysisResult> {
    const data = await getPrismaClient().analysisResult.upsert({
      where: { caseId: analysis.caseId },
      update: {
        riskLevel: analysis.riskLevel,
        risks: JSON.stringify(analysis.risks),
        missingInfo: JSON.stringify(analysis.missingInfo),
        contradictions: JSON.stringify(analysis.contradictions),
        suggestions: JSON.stringify(analysis.suggestions),
        content: analysis.content,
      },
      create: {
        id: analysis.id,
        caseId: analysis.caseId,
        riskLevel: analysis.riskLevel,
        risks: JSON.stringify(analysis.risks),
        missingInfo: JSON.stringify(analysis.missingInfo),
        contradictions: JSON.stringify(analysis.contradictions),
        suggestions: JSON.stringify(analysis.suggestions),
        content: analysis.content,
      },
    });
    return new AnalysisResult({
      id: data.id,
      caseId: data.caseId,
      riskLevel: data.riskLevel as any,
      risks: data.risks ? JSON.parse(data.risks) : [],
      missingInfo: data.missingInfo ? JSON.parse(data.missingInfo) : [],
      contradictions: data.contradictions ? JSON.parse(data.contradictions) : [],
      suggestions: data.suggestions ? JSON.parse(data.suggestions) : [],
      content: data.content,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}

export class PrismaLegalReferenceRepository implements ILegalReferenceRepository {
  async search(query: string, incidentType?: string): Promise<LegalReference[]> {
    const data = await getPrismaClient().legalReference.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
          incidentType ? { category: { contains: incidentType, mode: "insensitive" } } : {},
        ],
      },
      take: 8,
    });
    return data.map((item) => new LegalReference(item));
  }

  async save(reference: LegalReference): Promise<LegalReference> {
    const data = await getPrismaClient().legalReference.upsert({
      where: { id: reference.id },
      update: {
        title: reference.title,
        description: reference.description,
        category: reference.category,
        citation: reference.citation,
        content: reference.content,
        sourceUrl: reference.sourceUrl,
      },
      create: {
        id: reference.id,
        title: reference.title,
        description: reference.description,
        category: reference.category,
        citation: reference.citation,
        content: reference.content,
        sourceUrl: reference.sourceUrl,
      },
    });
    return new LegalReference(data);
  }
}

export class PrismaReportRepository implements IReportRepository {
  async findByCaseId(caseId: string): Promise<Report | null> {
    const data = await getPrismaClient().report.findUnique({ where: { caseId } });
    return data
      ? new Report({ id: data.id, caseId: data.caseId, content: data.content, status: data.status as any, createdAt: data.createdAt, updatedAt: data.updatedAt })
      : null;
  }

  async save(report: Report): Promise<Report> {
    const data = await getPrismaClient().report.upsert({
      where: { caseId: report.caseId },
      update: { content: report.contentWithNotice(), status: report.status },
      create: { id: report.id, caseId: report.caseId, content: report.contentWithNotice(), status: report.status },
    });
    return new Report({ id: data.id, caseId: data.caseId, content: data.content, status: data.status as any, createdAt: data.createdAt, updatedAt: data.updatedAt });
  }
}

export class PrismaLifeRecordRepository implements ILifeRecordRepository {
  async findById(id: string): Promise<LifeRecord | null> {
    const data = await getPrismaClient().lifeRecord.findUnique({ where: { id } });
    return data ? mapLifeRecord(data) : null;
  }

  async findAllByUserId(userId: string): Promise<LifeRecord[]> {
    const data = await getPrismaClient().lifeRecord.findMany({
      where: { userId },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    });
    return data.map(mapLifeRecord);
  }

  async findByCaseId(caseId: string): Promise<LifeRecord[]> {
    const data = await getPrismaClient().lifeRecord.findMany({
      where: { caseId },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    });
    return data.map(mapLifeRecord);
  }

  async save(record: LifeRecord): Promise<LifeRecord> {
    const data = await getPrismaClient().lifeRecord.upsert({
      where: { id: record.id },
      update: {
        caseId: record.caseId,
        type: record.type,
        title: record.title,
        content: record.content,
        occurredAt: record.occurredAt,
        approximateTimeText: record.approximateTimeText,
        location: record.location,
        people: record.people,
        tags: JSON.stringify(record.tags),
      },
      create: {
        id: record.id,
        userId: record.userId,
        caseId: record.caseId,
        type: record.type,
        title: record.title,
        content: record.content,
        occurredAt: record.occurredAt,
        approximateTimeText: record.approximateTimeText,
        location: record.location,
        people: record.people,
        tags: JSON.stringify(record.tags),
      },
    });
    return mapLifeRecord(data);
  }

  async delete(id: string): Promise<void> {
    await getPrismaClient().lifeRecord.delete({ where: { id } });
  }
}

export class PrismaConnectedSourceRepository implements IConnectedSourceRepository {
  async findByUserId(userId: string): Promise<ConnectedSource[]> {
    const data = await getPrismaClient().connectedSource.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    return data.map(mapConnectedSource);
  }

  async findByUserAndProvider(userId: string, provider: IntegrationProvider): Promise<ConnectedSource | null> {
    const data = await getPrismaClient().connectedSource.findUnique({
      where: { userId_provider: { userId, provider } },
    });
    return data ? mapConnectedSource(data) : null;
  }

  async save(source: ConnectedSource): Promise<ConnectedSource> {
    const data = await getPrismaClient().connectedSource.upsert({
      where: { id: source.id },
      update: {
        provider: source.provider,
        displayName: source.displayName,
        status: source.status,
        consentScopes: JSON.stringify(source.consentScopes),
        consentedAt: source.consentedAt,
        lastSyncedAt: source.lastSyncedAt,
      },
      create: {
        id: source.id,
        userId: source.userId,
        provider: source.provider,
        displayName: source.displayName,
        status: source.status,
        consentScopes: JSON.stringify(source.consentScopes),
        consentedAt: source.consentedAt,
        lastSyncedAt: source.lastSyncedAt,
      },
    });
    return mapConnectedSource(data);
  }
}

export class PrismaMemoryRecordRepository implements IMemoryRecordRepository {
  async findByUserId(userId: string): Promise<MemoryRecord[]> {
    const data = await getPrismaClient().memoryRecord.findMany({
      where: { userId },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: 500,
    });
    return data.map(mapMemoryRecord);
  }

  async findByUserAndParticipant(userId: string, participantName: string): Promise<MemoryRecord[]> {
    const data = await getPrismaClient().memoryRecord.findMany({
      where: { userId, participantName: { contains: participantName, mode: "insensitive" } },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
      take: 300,
    });
    return data.map(mapMemoryRecord);
  }

  async saveMany(records: MemoryRecord[]): Promise<MemoryRecord[]> {
    if (records.length === 0) return [];

    const saved = await getPrismaClient().$transaction(
      records.map((record) =>
        getPrismaClient().memoryRecord.create({
          data: {
            id: record.id,
            userId: record.userId,
            sourceId: record.sourceId,
            provider: record.provider,
            kind: record.kind,
            externalId: record.externalId,
            participantName: record.participantName,
            participantHandle: record.participantHandle,
            direction: record.direction,
            content: record.content,
            occurredAt: record.occurredAt,
            approximateTimeText: record.approximateTimeText,
            location: record.location,
            metadata: JSON.stringify(record.metadata),
            attachmentNames: JSON.stringify(record.attachmentNames),
            fileHash: record.fileHash,
          },
        }),
      ),
    );

    return saved.map(mapMemoryRecord);
  }
}
