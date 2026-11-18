import Link from "next/link";
import {
  Mic,
  ArrowRight,
  ArrowUpRight,
  FolderOpen,
  FileCheck2,
  ListChecks,
  Plus,
  Upload,
  MessageSquareText,
  ShieldCheck,
  Clock3,
} from "lucide-react";
import { requireSession } from "../../api/_utils";
import { createContainer } from "../../../infrastructure/di/container";
export default async function DashboardPage() {
  const session = await requireSession();
  const cases = await createContainer().caseService.list(session.userId);
  const evidenceCount = cases.reduce((n, c) => n + c.evidences.length, 0);
  const eventCount = cases.reduce((n, c) => n + c.events.length, 0);
  const recent = cases
    .flatMap((c) =>
      c.events.map((e) => ({
        id: e.id,
        title: e.title,
        date: e.createdAt,
        caseId: c.id,
        caseTitle: c.title,
      })),
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 4);
  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="!mt-0 !mb-2">나의 기록, 나의 근거</p>
          <h1>차근차근, 사실을 이어가요.</h1>
          <p>기록은 간단하게. 원본은 안전하게.</p>
        </div>
        <span className="muted hidden lg:block">
          {new Intl.DateTimeFormat("ko-KR", {
            month: "long",
            day: "numeric",
            weekday: "long",
          }).format(new Date())}
        </span>
      </div>
      <Link href="/life" className="mb-5 flex min-h-16 items-center gap-3 rounded-2xl bg-emerald-800 px-5 py-4 font-semibold text-white"><Mic size={22}/><span className="flex-1">녹음으로 오늘 기록하기</span><ArrowRight size={18}/></Link>
      <div className="stat-grid">
        {[
          [FolderOpen, "정리 중인 사건", cases.length],
          [FileCheck2, "보관한 증거", evidenceCount],
          [ListChecks, "연결한 기록", eventCount],
        ].map(([Icon, label, n]) => {
          const I = Icon as typeof FolderOpen;
          return (
            <div className="stat-card" key={String(label)}>
              <div>
                <p>{String(label)}</p>
                <strong>
                  {String(n)}
                  <span className="ml-1 text-xs font-normal text-slate-500">
                    개
                  </span>
                </strong>
              </div>
              <I size={22} />
            </div>
          );
        })}
      </div>
      <div className="dashboard-grid">
        <section>
          <div className="section-heading !mt-0">
            <h2>내 사건</h2>
            <Link href="/cases">
              모두 보기
              <ArrowUpRight size={14} />
            </Link>
          </div>
          {cases.length ? (
            <div className="case-list">
              {cases.slice(0, 5).map((c) => (
                <Link className="case-row" href={"/cases/" + c.id} key={c.id}>
                  <span className="case-symbol">
                    <FolderOpen size={24} />
                  </span>
                  <div className="min-w-0">
                    <h3>{c.title}</h3>
                    <p>
                      증거 {c.evidences.length} · 기록 {c.events.length}{" "}
                      <span className="mx-1">/</span>{" "}
                      {c.updatedAt.toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <ArrowRight size={17} className="row-arrow" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <FolderOpen size={42} />
              <h2>첫 사건부터 시작해 볼까요?</h2>
              <p>이름만 적으면 자료를 모을 공간이 생겨요.</p>
              <Link className="primary-link" href="/cases/new">
                <Plus size={16} />
                사건 만들기
              </Link>
            </div>
          )}
          <div className="section-heading">
            <h2>최근 연결한 기록</h2>
            <Clock3 size={16} className="text-slate-400" />
          </div>
          {recent.length ? (
            <div className="case-list">
              {recent.map((e) => (
                <Link
                  className="case-row !py-4"
                  key={e.id}
                  href={"/cases/" + e.caseId + "/timeline"}
                >
                  <span className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="line-clamp-1">{e.title}</h3>
                    <p>{e.caseTitle}</p>
                  </div>
                  <ArrowUpRight size={15} className="row-arrow" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted rounded-xl border border-dashed border-stone-200 p-5">
              자료 속 문장을 확인하면 여기에 모입니다.
            </p>
          )}
        </section>
        <aside>
          <div className="section-heading !mt-0">
            <h2>바로 시작</h2>
          </div>
          <div className="quick-list">
            <Link href="/cases/new">
              <Plus size={18} />새 사건 만들기
              <ArrowRight size={15} />
            </Link>
            <Link
              href={
                cases[0] ? "/cases/" + cases[0].id + "/evidence" : "/cases/new"
              }
            >
              <Upload size={18} />
              증거 올리기
              <ArrowRight size={15} />
            </Link>
            <Link href="/integrations">
              <MessageSquareText size={18} />
              대화 가져오기
              <ArrowRight size={15} />
            </Link>
          </div>
          <div className="note-panel">
            <ShieldCheck size={24} className="text-teal-700" />
            <h3>원본과 근거를 함께.</h3>
            <p>
              전용 모델로 자료를 분석합니다.
              <br />
              찾아낸 사실은 원문을 확인한 뒤<br />
              직접 선택해 연결하세요.
            </p>
            <Link
              href="/models"
              className="mt-5 inline-flex gap-2 items-center text-xs text-teal-800 font-semibold"
            >
              내 AI 확인하기
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
