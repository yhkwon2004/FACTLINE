import { LockKeyhole, ShieldCheck, Trash2 } from "lucide-react";
import { Button, Card } from "../../../../presentation/components/UI";

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">보안 설정</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">계정과 사건 자료의 보호 상태를 관리합니다.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <ShieldCheck className="text-emerald-800" size={20} />
          <h2 className="mt-3 font-bold">민감 정보 암호화</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">사건 제목과 설명 등 민감 필드는 서버 저장 전 AES 계층을 거치도록 설계되어 있습니다.</p>
        </Card>
        <Card>
          <LockKeyhole className="text-sky-800" size={20} />
          <h2 className="mt-3 font-bold">사건 잠금</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">잠긴 사건은 셀프 기록, 증거, 분석 데이터가 수정되지 않도록 차단합니다.</p>
        </Card>
      </div>
      <Card className="border-rose-200">
        <Trash2 className="text-rose-700" size={20} />
        <h2 className="mt-3 font-bold">계정 삭제</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">계정 삭제 요청 시 사용자와 사건 데이터는 분리된 삭제 흐름으로 처리됩니다.</p>
        <Button type="button" variant="danger" className="mt-4">삭제 요청</Button>
      </Card>
    </div>
  );
}
