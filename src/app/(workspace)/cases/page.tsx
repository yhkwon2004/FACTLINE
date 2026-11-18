import Link from "next/link";
import { FolderOpen, ArrowRight } from "lucide-react";
import { requireSession } from "../../api/_utils";
import { createContainer } from "../../../infrastructure/di/container";
export default async function Cases() {
  const s = await requireSession();
  const cases = await createContainer().caseService.list(s.userId);
  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>내 사건</h1>
          <p>자료와 기록을 사건별로 모아두세요.</p>
        </div>
        <Link className="primary-link" href="/cases/new">
          새 사건
        </Link>
      </div>
      <div className="case-list">
        {cases.map((c) => (
          <Link className="case-row" key={c.id} href={"/cases/" + c.id}>
            <span className="case-symbol">
              <FolderOpen size={22} />
            </span>
            <div>
              <h3>{c.title}</h3>
              <p>
                증거 {c.evidences.length} · 기록 {c.events.length}
              </p>
            </div>
            <ArrowRight className="row-arrow" size={17} />
          </Link>
        ))}
      </div>
      {!cases.length ? (
        <div className="empty-state">
          <FolderOpen size={36} />
          <h2>새로운 기록 공간</h2>
          <p>사건을 만들고 원본 자료를 모아보세요.</p>
        </div>
      ) : null}
    </div>
  );
}
