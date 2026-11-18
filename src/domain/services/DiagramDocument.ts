import {z} from "zod";
const id=z.string().min(1).max(300).refine(v=>!/[<>\x00-\x1f]/.test(v)&&!["__proto__","constructor","prototype"].includes(v));
const coordinate=z.number().finite().min(-20000).max(20000);
export const diagramColors=["mint","slate","blue","rose","amber","violet"] as const;
const color=z.enum(diagramColors);
const nodePatch=z.object({x:coordinate,y:coordinate,label:z.string().max(80).optional(),subtitle:z.string().max(240).optional(),color:color.optional(),shape:z.enum(["person","organization","note"]).optional(),groupId:id.nullable().optional(),portraitEvidenceId:z.string().uuid().nullable().optional(),hidden:z.boolean().optional()}).strict();
const edgePatch=z.object({label:z.string().max(120).optional(),detail:z.string().max(160).optional(),color:color.optional(),dashed:z.boolean().optional(),route:z.enum(["elbow","straight"]).optional(),labelX:coordinate.optional(),labelY:coordinate.optional(),viaX:coordinate.optional(),viaY:coordinate.optional(),hidden:z.boolean().optional()}).strict();
export const diagramSchema=z.object({schemaVersion:z.literal(1),title:z.string().min(1).max(120),nodes:z.record(id,nodePatch).refine(v=>Object.keys(v).length<=180),edges:z.record(id,edgePatch).refine(v=>Object.keys(v).length<=240),manualNodes:z.array(z.object({id:id.refine(v=>v.startsWith("manual:")),label:z.string().min(1).max(80),kind:z.enum(["person","organization","note"])}).strict()).max(60),manualEdges:z.array(z.object({id:id.refine(v=>v.startsWith("manual:")),source:id,target:id,label:z.string().min(1).max(120),directed:z.boolean()}).strict()).max(120),groups:z.array(z.object({id:id.refine(v=>v.startsWith("group:")),label:z.string().min(1).max(80),x:coordinate,y:coordinate,width:z.number().finite().min(180).max(10000),height:z.number().finite().min(150).max(10000),color:color}).strict()).max(30)}).strict().superRefine((d,ctx)=>{
 for(const values of [d.manualNodes,d.manualEdges,d.groups])if(new Set(values.map(x=>x.id)).size!==values.length)ctx.addIssue({code:z.ZodIssueCode.custom,message:"중복된 요소 ID입니다."});
 if(d.manualEdges.some(e=>e.source===e.target))ctx.addIssue({code:z.ZodIssueCode.custom,message:"다른 인물이나 요소를 연결해 주세요."});
});
export type DiagramDocument=z.infer<typeof diagramSchema>;
export type DiagramNodePatch=DiagramDocument["nodes"][string];
export type DiagramEdgePatch=DiagramDocument["edges"][string];
export type DiagramSnapshot={revision:number;updatedAt:string|null;document:DiagramDocument};
export const emptyDiagram=():DiagramDocument=>({schemaVersion:1,title:"사건 관계도",nodes:{},edges:{},manualNodes:[],manualEdges:[],groups:[]});
export function nextDiagram(current:DiagramSnapshot,revision:number,document:DiagramDocument):DiagramSnapshot{
 if(current.revision!==revision)throw Object.assign(new Error("다른 화면에서 저장한 변경이 있습니다. 새 버전을 불러온 뒤 다시 편집해 주세요."),{code:"DIAGRAM_CONFLICT"});
 return {revision:current.revision+1,updatedAt:new Date().toISOString(),document};
}
