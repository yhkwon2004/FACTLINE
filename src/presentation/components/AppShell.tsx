"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {FolderOpen,Home,NotebookPen,Settings,Plus,ShieldCheck,BrainCircuit,MessagesSquare,UserRound} from "lucide-react";
import {cn} from "./UI";
import { changeWorkspaceSurface } from "../workspace-surface";
const links=[
 {href:"/dashboard",label:"홈",icon:Home},
 {href:"/cases",label:"내 사건",icon:FolderOpen},
 {href:"/life",label:"기록",icon:NotebookPen},
 {href:"/mypage",label:"내 정보",icon:Settings},
];
export function AppShell({children,surface}:{children:React.ReactNode;surface:"mobile"|"desktop"}){
 const pathname=usePathname();
 const pagePath=pathname.startsWith("/vault")?(pathname.slice(6)||"/dashboard"):pathname;
 const route=(href:string)=>href==="/models"?href:"/vault"+(href==="/dashboard"?"":href);
 const active=(href:string)=>href==="/cases"?pagePath.startsWith("/cases"):pagePath===href;
 const title=pagePath.startsWith("/cases")?"내 사건":links.find(l=>active(l.href))?.label??(pagePath==="/models"?"AI 정보":pagePath==="/integrations"?"대화 가져오기":"설정");
 const chooser=<form action={changeWorkspaceSurface}><button className="surface-choice" name="view" value={surface==="mobile"?"desktop":"mobile"}>{surface==="mobile"?"웹 작업대":"모바일 수첩"}로 전환</button></form>;
 if(surface==="mobile") return <div className="phone-frame" data-surface="mobile">
 <a className="skip-link" href="#workspace">본문으로 이동</a>
 <header className="phone-top"><Link href="/vault" aria-label="이음로그 수첩 홈">이음로그<span>.</span></Link>{chooser}</header>
 <main className="phone-main" id="workspace">{children}</main>
 <nav className="phone-dock" aria-label="모바일 수첩 메뉴">{links.map(item=><Link key={item.href} href={route(item.href)} aria-current={active(item.href)?"page":undefined}><item.icon size={21}/>{item.label}</Link>)}</nav>
 </div>;
 return <div className="app-frame desktop-workbench" data-surface="desktop">
 <a className="skip-link" href="#workspace">본문으로 이동</a>
 <aside className="app-sidebar">
  <Link className="brand" href="/vault"><span className="brand-mark" aria-hidden="true"><span/><span/><span/></span>EUMLOG<span className="brand-dot">.</span></Link>
  <nav aria-label="주 메뉴">{links.map(item=><Link key={item.href} href={route(item.href)} aria-current={active(item.href)?"page":undefined} className={cn("nav-link",active(item.href)&&"active")}><item.icon size={20}/>{item.label}</Link>)}</nav>
  <div className="sidebar-bottom">
   <Link href="/vault/integrations" className="subtle-link"><MessagesSquare size={17}/>대화 가져오기</Link>
   <Link href="/models" className="subtle-link"><BrainCircuit size={17}/>AI 정보</Link>
   <Link href="/vault/settings/security" className="subtle-link"><ShieldCheck size={17}/>보관 및 보안</Link>
   {chooser}
  </div>
 </aside>
 <div className="app-body"><header className="app-header">
  <Link className="mobile-brand" href="/vault">EUMLOG<span>.</span></Link><span className="desktop-crumb">{title}</span>
  <div className="header-actions"><Link href="/vault/cases/new" className="header-create"><Plus size={18}/><span>새 사건</span></Link><Link href="/vault/mypage" className="profile-link" aria-label="내 정보"><UserRound size={20}/></Link></div>
 </header><main id="workspace" className="workspace">{children}</main></div>
 </div>;
}
