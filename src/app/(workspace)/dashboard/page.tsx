import Link from "next/link";
import {Mic,ArrowRight,FolderOpen,Upload,MessagesSquare,Plus,Clock3} from "lucide-react";
import {requireSession} from "../../api/_utils";
import {createContainer} from "../../../infrastructure/di/container";
export default async function DashboardPage(){
 const session=await requireSession(),cases=await createContainer().caseService.list(session.userId);
 const evidenceCount=cases.reduce((n,c)=>n+c.evidences.length,0);
 const recent=cases.flatMap(c=>c.events.map(e=>({id:e.id,title:e.title,date:e.createdAt,caseId:c.id,caseTitle:c.title}))).sort((a,b)=>b.date.getTime()-a.date.getTime()).slice(0,3);
 const actions=[
  {href:"/life",label:"음성 기록",hint:"녹음으로 하루 정리",icon:Mic,tone:"blue"},
  {href:cases[0]?"/cases/"+cases[0].id+"/evidence":"/cases/new",label:"자료 추가",hint:"사진·문서·녹음",icon:Upload,tone:"neutral"},
  {href:"/integrations",label:"대화 가져오기",hint:"메시지에서 연결",icon:MessagesSquare,tone:"neutral"},
 ];
 return <div className="home-page">
 <div className="home-hero"><span className="home-date">{new Intl.DateTimeFormat("ko-KR",{month:"long",day:"numeric",weekday:"long",timeZone:"Asia/Seoul"}).format(new Date())}</span><h1>어떤 기록을 남길까요?</h1><p>사건 {cases.length} · 보관한 자료 {evidenceCount}</p></div>
 <div className="home-actions">{actions.map(a=><Link key={a.label} href={a.href} className={"home-action "+a.tone}><span className="home-action-icon"><a.icon size={25}/></span><ArrowRight className="home-action-arrow" size={19}/><h2>{a.label}</h2><p>{a.hint}</p></Link>)}</div>
 <section className="home-recent"><div className="section-heading"><h2>최근 사건</h2><Link href="/cases">모두 보기 <ArrowRight size={15}/></Link></div>
 {cases.length?<div className="case-list">{cases.slice(0,4).map(c=><Link className="case-row" key={c.id} href={"/cases/"+c.id}><span className="case-symbol"><FolderOpen size={22}/></span><div className="min-w-0"><h3>{c.title}</h3><p>자료 {c.evidences.length} · 기록 {c.events.length}</p></div><ArrowRight className="row-arrow" size={18}/></Link>)}</div>:<div className="home-empty"><FolderOpen size={32}/><h2>첫 기록을 시작해 보세요</h2><Link href="/cases/new" className="primary-link"><Plus size={17}/>새 사건</Link></div>}
 </section>
 {recent.length>0&&<section className="home-recent"><div className="section-heading"><h2>최근 기록</h2><Clock3 size={17}/></div><div className="case-list">{recent.map(e=><Link className="case-row" key={e.id} href={"/cases/"+e.caseId+"/timeline"}><span className="record-dot"/><div className="min-w-0"><h3>{e.title}</h3><p>{e.caseTitle}</p></div><ArrowRight className="row-arrow" size={17}/></Link>)}</div></section>}
 </div>;
}
