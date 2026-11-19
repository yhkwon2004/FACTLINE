"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {FolderOpen,Home,NotebookPen,Settings,Plus,ShieldCheck,BrainCircuit,MessagesSquare,UserRound} from "lucide-react";
import {cn} from "./UI";
const links=[
 {href:"/dashboard",label:"홈",icon:Home},
 {href:"/cases",label:"내 사건",icon:FolderOpen},
 {href:"/life",label:"기록",icon:NotebookPen},
 {href:"/mypage",label:"내 정보",icon:Settings},
];
export function AppShell({children}:{children:React.ReactNode}){
 const pathname=usePathname();
 const active=(href:string)=>href==="/cases"?pathname.startsWith("/cases"):pathname===href;
 const title=pathname.startsWith("/cases")?"내 사건":links.find(l=>active(l.href))?.label??(pathname==="/models"?"AI 정보":pathname==="/integrations"?"대화 가져오기":"설정");
 return <div className="app-frame">
 <a className="skip-link" href="#workspace">본문으로 이동</a>
 <aside className="app-sidebar">
  <Link className="brand" href="/dashboard"><span className="brand-mark" aria-hidden="true"><span/><span/><span/></span>EUMLOG<span className="brand-dot">.</span></Link>
  <nav aria-label="주 메뉴">{links.map(item=><Link key={item.href} href={item.href} aria-current={active(item.href)?"page":undefined} className={cn("nav-link",active(item.href)&&"active")}><item.icon size={20}/>{item.label}</Link>)}</nav>
  <div className="sidebar-bottom">
   <Link href="/integrations" className="subtle-link"><MessagesSquare size={17}/>대화 가져오기</Link>
   <Link href="/models" className="subtle-link"><BrainCircuit size={17}/>AI 정보</Link>
   <Link href="/settings/security" className="subtle-link"><ShieldCheck size={17}/>보관 및 보안</Link>
  </div>
 </aside>
 <div className="app-body"><header className="app-header">
  <Link className="mobile-brand" href="/dashboard">EUMLOG<span>.</span></Link><span className="desktop-crumb">{title}</span>
  <div className="header-actions"><Link href="/cases/new" className="header-create"><Plus size={18}/><span>새 사건</span></Link><Link href="/mypage" className="profile-link" aria-label="내 정보"><UserRound size={20}/></Link></div>
 </header><main id="workspace" className="workspace">{children}</main></div>
 <nav className="mobile-nav" aria-label="모바일 주 메뉴">{links.map(item=><Link key={item.href} href={item.href} aria-current={active(item.href)?"page":undefined}><item.icon size={21}/><span>{item.label}</span></Link>)}</nav>
 </div>;
}
