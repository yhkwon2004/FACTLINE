import Link from "next/link";

export const metadata = { title: "개인정보 처리방침 · 이음로그" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-14 leading-7">
      <Link href="/" className="text-sm text-blue-700">이음로그</Link>
      <h1 className="mt-8 text-3xl">개인정보 처리방침</h1>
      <p className="mt-3">이음로그(EUMLOG) · TEAM MAZE / FACTLINE · 기기 보관 방식 버전 1.0</p>
      <section className="mt-8"><h2>계정과 로그인</h2>
        <p>Google 가입·로그인을 선택하면 Google에서 발급한 인증 정보를 받아 계정을 확인합니다. 서버에는 계정 식별자와 비밀 키로 변환한 이메일·Google 식별자를 보관합니다. 이메일 가입을 사용한 경우 비밀번호 검증값도 보관합니다. 브라우저는 로그인 상태를 유지하는 쿠키를 사용합니다.</p>
      </section>
      <section className="mt-8"><h2>사건 원본과 분석</h2>
        <p>실명, 원본 파일, 녹음, 전사문, 실명과 가명 대응표, 관계도와 확인 기록은 사용 기기의 브라우저 보관함에 암호화해 저장합니다. 사용자가 본문을 검토하고 분석을 선택하면, 승인한 본문·질문·기준일을 Vercel과 연결된 분석 PC로 보내 요청을 처리합니다. 사용자가 남겨 둔 문맥이나 고유 표현으로도 사람을 알아볼 수 있습니다. 분석 요청과 결과를 앱의 서버 데이터베이스에 저장하거나 사용자 자료로 모델을 추가 학습하지 않습니다.</p>
      </section>
      <section className="mt-8"><h2>외부 서비스와 전달</h2>
        <p>Google은 인증을, Vercel은 웹과 계정 저장을, Cloudflare는 분석기 연결을 제공합니다. 음성·문자 변환은 공개 모델을 처음 내려받은 뒤 기기에서 실행합니다. 호스팅·모델 배포 서비스에는 접속 IP 등 통신 정보가 전달될 수 있습니다. 선택한 자료를 공유하면 기기에서 암호화 파일과 별도 토큰이 만들어집니다. 사용자가 두 가지를 전달한 상대방은 원문을 열 수 있습니다.</p>
      </section>
      <section className="mt-8"><h2>보관과 삭제</h2>
        <p>계정 정보는 탈퇴할 때까지 보관합니다. 이전 버전에 서버 자료가 남아 있다면 기기 가져오기 후 서버 사본 삭제를 선택할 수 있습니다. 계정을 삭제하면 계정과 남은 서버 사본의 삭제를 요청합니다. 기기 원본은 해당 브라우저의 사이트 저장 공간을 지우면 삭제됩니다. 백업·전달 파일과 받은 사람이 보관하는 사본은 각 보관자가 관리합니다.</p>
        <Link href="/account-deletion" className="mt-3 inline-block text-blue-700">계정 및 서버 자료 삭제</Link>
      </section>
      <section className="mt-8"><h2>문의</h2>
        <p>서비스 운영 문의는 프로젝트 문의 창구에서 접수합니다. 공개 게시물에는 실명, 이메일, 사건 내용, 파일, 토큰을 적지 마세요.</p>
        <a href="https://github.com/yhkwon2004/FACTLINE/issues" className="text-blue-700">이음로그 운영 문의</a>
      </section>
    </main>
  );
}
