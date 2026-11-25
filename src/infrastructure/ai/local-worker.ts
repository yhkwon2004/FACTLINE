import type {SourceRelation} from "../../domain/services/RelationshipGraph";
import { remoteAI } from "./remote-worker";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};
type WorkerState = {
  process: ChildProcessWithoutNullStreams;
  pending: Map<string, Pending>;
};
const globals = globalThis as typeof globalThis & {
  eumlogWorker?: WorkerState;
};
function worker() {
  if (globals.eumlogWorker && !globals.eumlogWorker.process.killed)
    return globals.eumlogWorker;
  const root = process.cwd();
  const python =
    process.env.LOCAL_PYTHON ??
    path.join(
      root,
      ".venv",
      process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
    );
  if (!existsSync(/* turbopackIgnore: true */ python))
    throw new Error(
      "로컬 AI가 설치되지 않았습니다. 설치 안내를 확인해 주세요.",
    );
  const child = spawn(
    /* turbopackIgnore: true */ python,
    ["-u", path.join(root, "ai/worker.py")],
    {
      cwd: root,
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    },
  );
  const state: WorkerState = { process: child, pending: new Map() };
  const rejectAll = () => {
    for (const entry of state.pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(
        new Error("로컬 AI가 종료되었습니다. 설치·학습 상태를 확인해 주세요."),
      );
    }
    state.pending.clear();
    if (globals.eumlogWorker === state) globals.eumlogWorker = undefined;
  };
  child.on("error", rejectAll);
  child.on("exit", rejectAll);
  child.stderr.on("data", (data: Buffer) => {
    if (process.env.AI_DEBUG === "1") console.error(data.toString());
  });
  createInterface({ input: child.stdout }).on("line", (line) => {
    try {
      const message = JSON.parse(line);
      const entry = state.pending.get(message.id);
      if (!entry) return;
      clearTimeout(entry.timer);
      state.pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error));
      else entry.resolve(message.result);
    } catch {
      /* Ignore dependency progress, never use it as an AI response. */
    }
  });
  globals.eumlogWorker = state;
  return state;
}
export async function localAI<T>(
  task: string,
  payload: unknown = {},
): Promise<T> {
  if (process.env.FACTLINE_STORAGE_MODE === "blob") return remoteAI<T>(task,payload);
  const state = worker();
  if (state.pending.size >= 5)
    throw new Error("다른 자료를 분석 중입니다. 잠시 후 다시 시도해 주세요.");
  return new Promise<T>((resolve, reject) => {
    const id = crypto.randomUUID();
    const timer = setTimeout(() => {
      state.pending.delete(id);
      reject(new Error("분석 시간이 초과되었습니다. 자료를 나누어 주세요."));
      state.process.kill();
    }, 240000);
    state.pending.set(id, {
      resolve: (value) => resolve(value as T),
      reject,
      timer,
    });
    state.process.stdin.write(
      JSON.stringify({ id, task, payload }) + "\n",
      (error) => {
        if (error) {
          clearTimeout(timer);
          state.pending.delete(id);
          reject(error);
        }
      },
    );
  });
}
export interface Candidate {
  sourceSpan?: { start: number; end: number };
  dateSource?:string;
  audioRange?:{start:number;end:number;approximate:boolean};
  isApproximateTime?: boolean;
  id: string;
  quote: string;
  title: string;
  datetime: string | null;
  approximateTimeText: string | null;
  location: string | null;
  actor: string | null;
  action: string;
  damage: string | null;
}
export interface LocalReference {
  id: string;
  title: string;
  category: string;
  content: string;
  citation: string;
  sourceUrl: string;
  description: string;
  score: number;
}
export interface Inspection {
  schemaVersion?:number;
  relations?:SourceRelation[];
  detectedLanguages?: Array<{ text: string; language: string; score: number }>;
  text: string;
  tokens: Array<{ text: string; tag: string; start: number; length: number }>;
  keywords: Array<{ text: string; count: number }>;
  languages: Record<string, number>;
  classification: Array<{ label: string; score: number }>;
  uncertain: boolean;
  candidates: Candidate[];
  associations: Array<{
    source: string;
    target: string;
    count: number;
    pmi: number;
  }>;
  references: LocalReference[];
  model: string;
  notice: string;
}
