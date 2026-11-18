import { DeleteAccount } from "../../../../presentation/components/DeleteAccount";
import { LockKeyhole, ShieldCheck, Trash2 } from "lucide-react";
import { Button, Card } from "../../../../presentation/components/UI";

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">보안 설정</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          계정과 사건 자료의 보호 상태를 관리합니다.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <ShieldCheck className="text-emerald-800" size={20} />
          <h2 className="mt-3 font-bold">민감 정보 암호화</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            기록과 원본 파일, 분석 결과를 AES-256-GCM으로 암호화해
            보관합니다. 웹 배포에서는 비공개 저장소와 서버의 비밀 설정으로, 로컬 실행에서는 기기의 설정 파일로 보호합니다.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">웹에서는 연결된 전용 분석기로 자료를 전송해 분석합니다. 분석기가 꺼지면 원본을 보관한 채 분석을 대기합니다.</p>
        </Card>
        <Card>
          <LockKeyhole className="text-sky-800" size={20} />
          <h2 className="mt-3 font-bold">사건 잠금</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            잠긴 사건은 셀프 기록, 증거, 분석 데이터가 수정되지 않도록
            차단합니다.
          </p>
        </Card>
      </div>
      <Card className="border-rose-200">
        <Trash2 className="text-rose-700" size={20} />
        <h2 className="mt-3 font-bold">계정 삭제</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          내 계정과 보관한 자료를 삭제할 수 있습니다.
        </p>
        <DeleteAccount />
      </Card>
    </div>
  );
}
