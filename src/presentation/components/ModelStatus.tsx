"use client";
import { useState, useEffect } from "react";
import { Cpu, ArrowUpRight, RefreshCw } from "lucide-react";
import { TrainingReport } from "./TrainingReport";
import { Card, Button } from "./UI";
type Status = {
  ready: boolean;
  device: string;
  offline: boolean;
  metrics: {
    trainingExamples: number;
    heldOutExamples: number;
    accuracy: number;
    lexicalAccuracy?: number;
    corpusChunks: number;
    limitation: string;
    classifier?: string;
    llm?: {
      base: string;
      steps: number;
      finalMeanTrainingLoss: number;
      seconds: number;
      device: string;
    };
  };
  sources: Array<{
    id: string;
    title: string;
    category: string;
    url: string;
    characters: number;
    retrievedAt: string;
  }>;
};
export function ModelStatus() {
  const [status, setStatus] = useState<Status | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/ai/status");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setStatus(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "상태 확인 실패");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div>
          <h1>내 AI</h1>
          <p>무엇을 학습했고, 어떻게 동작하는지 확인하세요.</p>
        </div>
        <Button variant="outline" disabled={busy} onClick={load}>
          <RefreshCw size={15} />
          새로고침
        </Button>
      </div>
      <TrainingReport />
      {error ? (
        <p role="alert" className="notice error">
          {error}
        </p>
      ) : null}
      {busy ? (
        <p className="notice" role="status">
          <progress aria-label="모델 확인 중" className="w-20 mr-3" />
          전용 분석기를 확인하고 있어요.
        </p>
      ) : null}
      {status ? (
        <>
          <Card>
            <h2 className="flex items-center gap-2">
              <Cpu size={20} />
              {status.ready ? "전용 모델 준비 완료" : "학습이 필요합니다"}
            </h2>
            <p className="muted mt-3">{status.device} · 외부 추론 호출 없음</p>
            <table className="model-table mt-5">
              <tbody>
                <tr>
                  <th scope="row">문장 의미</th>
                  <td>Multilingual E5 small · 다국어 사전학습 모델</td>
                </tr>
                <tr>
                  <th scope="row">한국어 분리</th>
                  <td>Kiwi · 형태소·품사·문장 분리</td>
                </tr>
                <tr>
                  <th scope="row">분류 학습</th>
                  <td>
                    자체 합성 예시 {status.metrics.trainingExamples}개 · E5 +
                    학습 분류기
                  </td>
                </tr>
                <tr>
                  <th scope="row">내부 평가</th>
                  <td>
                    표현군을 분리한 {status.metrics.heldOutExamples}개 중{" "}
                    {Math.round(status.metrics.accuracy * 100)}% 분류 일치
                  </td>
                </tr>
                <tr>
                  <th scope="row">LLM</th>
                  <td>
                    {status.metrics.llm?.base} · 구조화 전용 LoRA{" "}
                    {status.metrics.llm?.steps}회 최적화
                  </td>
                </tr>
                <tr>
                  <th scope="row">원문 검색</th>
                  <td>
                    {status.metrics.corpusChunks}개 구간 · 의미 + 형태소 검색
                  </td>
                </tr>
                <tr>
                  <th scope="row">녹음 인식</th>
                  <td>기기 내 Whisper tiny 또는 small</td>
                </tr>
                <tr>
                  <th scope="row">이미지 인식</th>
                  <td>기기 내 Tesseract · 한국어·영어</td>
                </tr>
              </tbody>
            </table>
            <p className="notice">
              {status.metrics.limitation} LLM의 학습 loss는 실제 답변 정확도를
              의미하지 않습니다. 법적 판단 성능은 검증되지 않았습니다.
            </p>
          </Card>
          <Card>
            <h2>수집한 공식 원문</h2>
            <p className="muted mt-2">
              법령의 시행일과 사건 당시 법령은 원문에서 확인해 주세요.
            </p>
            {status.sources.map((s) => (
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                key={s.id}
                className="source-link"
              >
                {s.title}
                <ArrowUpRight size={13} className="inline ml-2" />
                <span>
                  {s.category} · {s.characters.toLocaleString()}자 · 수집{" "}
                  {new Date(s.retrievedAt).toLocaleDateString("ko-KR")}
                </span>
              </a>
            ))}
          </Card>
          <Card>
            <h2>학습과 개인정보</h2>
            <p className="muted mt-3 leading-7">
              학습에 사용한 상담 예시는 직접 작성한 합성 데이터입니다. 실제
              상담기록을 수집하거나 사용자의 자료를 자동으로 재학습하지
              않습니다. 음성과 사진은 사용자 기기에서 읽고, 확인한 익명 본문만 연결된 분석기로 보냅니다.
            </p>
          </Card>
        </>
      ) : null}
    </div>
  );
}
