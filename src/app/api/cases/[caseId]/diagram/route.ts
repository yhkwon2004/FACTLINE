import {NextResponse,type NextRequest} from "next/server";
import {requireCaseAccess,parseRequestBody,jsonError} from "../../../_utils";
import {readEncrypted,updateEncrypted} from "../../../../../infrastructure/storage/LocalEvidenceStorage";
import {diagramSchema,emptyDiagram,nextDiagram,type DiagramSnapshot} from "../../../../../domain/services/DiagramDocument";
type Context={params:Promise<{caseId:string}>};
export async function GET(_r:NextRequest,c:Context){try{
 const {caseId}=await c.params,item=await requireCaseAccess(caseId);
 let snapshot:DiagramSnapshot={revision:0,updatedAt:null,document:emptyDiagram()};
 try{snapshot=JSON.parse((await readEncrypted(caseId+".diagram")).toString());}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}
 return NextResponse.json({...snapshot,isLocked:item.isLocked},{headers:{"cache-control":"private, no-store"}});
 }catch(e){return jsonError(e);}}
export async function PUT(r:NextRequest,c:Context){try{
 const {caseId}=await c.params,item=await requireCaseAccess(caseId,true),body=await parseRequestBody(r);
 if(!Number.isSafeInteger(body.revision)||body.revision<0)throw new Error("관계도 버전을 확인해 주세요.");
 const parsed=diagramSchema.safeParse(body.document);if(!parsed.success)throw new Error("관계도의 글자 수·요소 수·좌표를 확인해 주세요.");
 for(const node of Object.values(parsed.data.nodes))if(node.portraitEvidenceId&&!item.evidences.some(e=>e.id===node.portraitEvidenceId))throw new Error("이 사건의 사진만 사용할 수 있습니다.");
 const result=await updateEncrypted<DiagramSnapshot>(caseId+".diagram",{revision:0,updatedAt:null,document:emptyDiagram()},current=>nextDiagram(current,body.revision,parsed.data));
 return NextResponse.json(result,{headers:{"cache-control":"no-store"}});
 }catch(e){return jsonError(e,(e as {code?:string}).code==="DIAGRAM_CONFLICT"?409:400);}}
