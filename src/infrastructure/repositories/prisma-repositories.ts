import { 
  ICaseRepository, 
  IEventRepository, 
  IEvidenceRepository, 
  IAnalysisRepository, 
  IReportRepository, 
  IUserRepository 
} from "../../domain/repositories";
import { 
  User, 
  Case, 
  IncidentEvent, 
  Evidence, 
  AnalysisResult, 
  Report 
} from "../../domain/entities";
import prisma from "../prisma-client";

export class PrismaUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const data = await prisma.user.findUnique({ where: { id } });
    if (!data) return null;
    return new User(data.id, data.email, data.name, data.createdAt);
  }

  async findByEmail(email: string): Promise<User | null> {
    const data = await prisma.user.findUnique({ where: { email } });
    if (!data) return null;
    return new User(data.id, data.email, data.name, data.createdAt);
  }

  async save(user: any): Promise<User> {
    const data = await prisma.user.upsert({
      where: { id: user.id || "" },
      update: { name: user.name, email: user.email, password: user.password },
      create: { id: user.id, name: user.name, email: user.email, password: user.password },
    });
    return new User(data.id, data.email, data.name, data.createdAt);
  }
}

export class PrismaCaseRepository implements ICaseRepository {
  async findById(id: string): Promise<Case | null> {
    const data = await prisma.case.findUnique({ 
      where: { id },
      include: { events: true, evidences: true }
    });
    if (!data) return null;
    
    return new Case(
      data.id, 
      data.title, 
      data.type, 
      data.status, 
      data.userId,
      data.events.map(e => new IncidentEvent(e.id, e.caseId, e.title, e.description, e.datetime, e.location, e.actor, e.action, e.damage, e.source as any)),
      data.evidences.map(e => new Evidence(e.id, e.caseId, e.name, e.type, e.fileUrl, e.fileHash, e.description)),
      data.isLocked,
      data.createdAt,
      data.updatedAt
    );
  }

  async findAllByUserId(userId: string): Promise<Case[]> {
    const cases = await prisma.case.findMany({ where: { userId } });
    return cases.map(data => new Case(data.id, data.title, data.type, data.status, data.userId, [], [], data.isLocked, data.createdAt, data.updatedAt));
  }

  async save(caseData: Case): Promise<Case> {
    const data = await prisma.case.upsert({
      where: { id: caseData.id || "" },
      update: { 
        title: caseData.title, 
        type: caseData.type, 
        status: caseData.status, 
        isLocked: caseData.isLocked,
        updatedAt: new Date()
      },
      create: { 
        id: caseData.id,
        title: caseData.title, 
        type: caseData.type, 
        status: caseData.status, 
        userId: caseData.userId,
        isLocked: caseData.isLocked
      },
    });
    return caseData;
  }

  async delete(id: string): Promise<void> {
    await prisma.case.delete({ where: { id } });
  }
}

export class PrismaEventRepository implements IEventRepository {
  async findByCaseId(caseId: string): Promise<IncidentEvent[]> {
    const data = await prisma.incidentEvent.findMany({ where: { caseId } });
    return data.map(e => new IncidentEvent(e.id, e.caseId, e.title, e.description, e.datetime, e.location, e.actor, e.action, e.damage, e.source as any));
  }

  async save(event: IncidentEvent): Promise<IncidentEvent> {
    await prisma.incidentEvent.upsert({
      where: { id: event.id || "" },
      update: { 
        title: event.title, 
        description: event.description, 
        datetime: event.datetime, 
        location: event.location, 
        actor: event.actor, 
        action: event.action, 
        damage: event.damage,
        source: event.source
      },
      create: { 
        id: event.id,
        caseId: event.caseId,
        title: event.title, 
        description: event.description, 
        datetime: event.datetime, 
        location: event.location, 
        actor: event.actor, 
        action: event.action, 
        damage: event.damage,
        source: event.source
      }
    });
    return event;
  }

  async delete(id: string): Promise<void> {
    await prisma.incidentEvent.delete({ where: { id } });
  }
}

export class PrismaEvidenceRepository implements IEvidenceRepository {
  async findByCaseId(caseId: string): Promise<Evidence[]> {
    const data = await prisma.evidence.findMany({ where: { caseId } });
    return data.map(e => new Evidence(e.id, e.caseId, e.name, e.type, e.fileUrl, e.fileHash, e.description));
  }

  async save(evidence: Evidence): Promise<Evidence> {
    await prisma.evidence.upsert({
      where: { id: evidence.id || "" },
      update: { 
        name: evidence.name, 
        type: evidence.type, 
        fileUrl: evidence.fileUrl, 
        fileHash: evidence.fileHash, 
        description: evidence.description 
      },
      create: { 
        id: evidence.id,
        caseId: evidence.caseId,
        name: evidence.name, 
        type: evidence.type, 
        fileUrl: evidence.fileUrl, 
        fileHash: evidence.fileHash, 
        description: evidence.description 
      }
    });
    return evidence;
  }

  async delete(id: string): Promise<void> {
    await prisma.evidence.delete({ where: { id } });
  }

  async linkToEvent(evidenceId: string, eventId: string): Promise<void> {
    await prisma.incidentEvent.update({
      where: { id: eventId },
      data: {
        evidences: {
          connect: { id: evidenceId }
        }
      }
    });
  }
}

export class PrismaAnalysisRepository implements IAnalysisRepository {
  async findByCaseId(caseId: string): Promise<AnalysisResult | null> {
    const data = await prisma.analysisResult.findUnique({ where: { caseId } });
    if (!data) return null;
    return new AnalysisResult(
      data.id,
      data.caseId,
      data.riskLevel as any,
      data.risks ? JSON.parse(data.risks) : [],
      data.missingInfo ? JSON.parse(data.missingInfo) : [],
      data.contradictions ? JSON.parse(data.contradictions) : [],
      data.suggestions ? JSON.parse(data.suggestions) : [],
      data.content
    );
  }

  async save(analysis: AnalysisResult): Promise<AnalysisResult> {
    const data = await prisma.analysisResult.upsert({
      where: { caseId: analysis.caseId },
      update: {
        riskLevel: analysis.riskLevel,
        risks: JSON.stringify(analysis.risks),
        missingInfo: JSON.stringify(analysis.missingInfo),
        contradictions: JSON.stringify(analysis.contradictions),
        suggestions: JSON.stringify(analysis.suggestions),
        content: analysis.content
      },
      create: {
        id: analysis.id,
        caseId: analysis.caseId,
        riskLevel: analysis.riskLevel,
        risks: JSON.stringify(analysis.risks),
        missingInfo: JSON.stringify(analysis.missingInfo),
        contradictions: JSON.stringify(analysis.contradictions),
        suggestions: JSON.stringify(analysis.suggestions),
        content: analysis.content
      }
    });
    return analysis;
  }
}

export class PrismaReportRepository implements IReportRepository {
  async findByCaseId(caseId: string): Promise<Report | null> {
    const data = await prisma.report.findUnique({ where: { caseId } });
    if (!data) return null;
    return new Report(data.id, data.caseId, data.content, data.status as any, data.createdAt);
  }

  async save(report: Report): Promise<Report> {
    await prisma.report.upsert({
      where: { caseId: report.caseId },
      update: { content: report.content, status: report.status },
      create: { id: report.id, caseId: report.caseId, content: report.content, status: report.status }
    });
    return report;
  }
}
