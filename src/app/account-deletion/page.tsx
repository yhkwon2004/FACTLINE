import Link from "next/link";
import { currentSession } from "../api/_utils";
import { DeleteAccount } from "../../presentation/components/DeleteAccount";

export const metadata = { title: "계정 삭제 · 이음로그" };

export default async function AccountDeletionPage() {
  const session = await currentSession();
  return (
    <main className="mx-auto max-w-xl px-6 py-14">
      <Link href="/" className="text-sm text-blue-700">이음로그</Link>
      <h1 className="mt-8 text-3xl">계정 삭제</h1>
      <p className="my-5 leading-7">
        로그인 계정과 남아 있는 서버 사본을 삭제할 수 있습니다. 먼저 보관할 기록을 기기 보관함에서 백업해 주세요.
        이 기기의 암호화 자료와 내려받은 파일은 별도로 지워야 합니다.
      </p>
      {session ? <DeleteAccount localMode /> : <Link href="/login?next=%2Faccount-deletion" className="primary-link">로그인하고 삭제하기</Link>}
      <p className="mt-8 text-sm"><Link href="/privacy" className="text-blue-700">개인정보 처리방침</Link></p>
    </main>
  );
}
