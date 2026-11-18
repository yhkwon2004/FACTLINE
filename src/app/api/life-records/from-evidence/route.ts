import {NextResponse,type NextRequest} from "next/server";
import {requireSession,requireCaseAccess,parseRequestBody,jsonError} from "../../_utils";
import {createContainer} from "../../../../infrastructure/di/container";
import {evidenceProgress} from "../../../../infrastructure/ai/evidence-pipeline";
export async function POST(request:NextRequest){
 try {
  const session=await requireSession(),body=await parseRequestBody(request),caseId=String(body.caseId??""),evidenceId=String(body.evidenceId??"");
  const item=await requireCaseAccess(caseId,true),source=item.evidences.find(e=>e.id===evidenceId);if(!source)throw new Error("녹음 원본을 찾을 수 없습니다.");
  const progress=await evidenceProgress(evidenceId);if(!progress.analysis || !progress.extraction?.method.startsWith("Whisper"))throw new Error("녹음 변환이 끝난 후 저장해 주세요.");
  const date=String(body.date??progress.referenceDate??"");if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new Error("녹음 기준일을 확인해 주세요.");
  if(progress.referenceDate && progress.referenceDate!==date)throw new Error("분석에 사용한 녹음 기준일과 일치해야 합니다.");
  if(!Array.isArray(body.candidateIds)||!body.candidateIds.length||body.candidateIds.length>90)throw new Error("보관할 문장을 선택해 주세요.");
  const selected=progress.analysis.candidates.filter(c=>body.candidateIds.includes(c.id));if(selected.length!==new Set(body.candidateIds).size)throw new Error("실제 변환된 문장만 보관할 수 있습니다.");
  const record=await createContainer().lifeRecordService.create({userId:session.userId,caseId,sourceEvidenceId:evidenceId,type:"NOTE",title:date+" 음성 기록",content:selected.map(c=>c.quote).join("\n"),occurredAt:date+"T00:00:00+09:00",approximateTimeText:date+" · 사용자 선택 기준일, 발생 시각 미확인",people:[...new Set(selected.map(c=>c.actor).filter(Boolean))].join(", "),tags:["음성 기록"]});
  return NextResponse.json({record});
 }catch(error){return jsonError(error);}
}
