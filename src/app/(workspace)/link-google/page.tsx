import Link from "next/link";
import { requireSession } from "../../api/_utils";
import { createContainer } from "../../../infrastructure/di/container";
import { GoogleSignIn } from "../../../presentation/components/GoogleSignIn";
import { Card } from "../../../presentation/components/UI";
export default async function Page() {
  const session = await requireSession(),
    user = await createContainer().authService.activeUser(session.userId);
  return (
    <Card className="auth-card mx-auto max-w-md">
      <h1>Google 계정 연결</h1>
      {user?.googleConnected ? (
        <>
          <p className="device-help">이미 Google 계정이 연결되어 있어요.</p>
          <Link className="primary-link mt-5" href="/vault/mypage">
            보관함으로 돌아가기
          </Link>
        </>
      ) : (
        <>
          <p className="device-help">
            기존 비밀번호로 확인한 뒤 같은 이메일의 Google 계정을 연결합니다.
            개인정보 보관함은 이 화면에서 열지 않습니다.
          </p>
          <GoogleSignIn link next="/vault/mypage" />
        </>
      )}
    </Card>
  );
}
