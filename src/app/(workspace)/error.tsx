"use client";
import { Button } from "../../presentation/components/UI";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state">
      <h1>잠시 멈췄어요</h1>
      <p>기록은 보관되어 있습니다. 다시 불러와 주세요.</p>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  );
}
