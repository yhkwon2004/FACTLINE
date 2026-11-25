# 이음로그 Android 1.0.0 제출 자료

이 패키지는 기기의 기본 브라우저를 통해 이음로그 운영 웹을 여는 Trusted Web Activity입니다. 사건을 입력하려면 인터넷과 로그인 계정이 필요합니다. 설치 전에도 [모바일 수첩 시연](https://eumlog-evidence.vercel.app/demo?view=mobile)을 열 수 있습니다.

| 항목 | 제출 값 |
|---|---|
| 앱 이름 | 이음로그 |
| 패키지 | `io.github.yhkwon2004.eumlog` |
| 버전 | 1.0.0 · 버전 코드 1 · minSdk 24 · targetSdk 36 |
| 짧은 설명 | 녹음과 메모를 날짜순으로 정리하고, 인물 관계를 원문과 함께 확인하세요. |
| 개인정보 처리방침 | https://eumlog-evidence.vercel.app/privacy |
| 계정 삭제 | https://eumlog-evidence.vercel.app/account-deletion |

**스토어용 상세 설명**

하루 동안 있었던 일을 녹음하거나 파일과 메모를 모아 두세요. 기기에서 음성을 글로 옮긴 뒤, 날짜와 이름을 원문에 맞게 고칠 수 있습니다. 확인한 기록은 타임라인에 쌓입니다.

인물 사이의 화살표를 누르면 누가 누구에게 무엇을 했다고 말했는지, 어떤 문장이 근거인지 볼 수 있습니다. 상대방이나 금액이 빠진 기록을 찾아 다음 상담에서 물어볼 내용을 준비하세요. 관계도는 직접 편집해 SVG로 내보낼 수 있습니다.

원본 파일과 실명은 기기의 암호화 보관함에 저장됩니다. AI 분석을 선택하면 가릴 정보를 검토한 뒤 승인한 본문을 전송합니다. 원본을 전달할 때는 원하는 자료를 골라 암호화 파일과 별도 토큰을 만듭니다. 법률 검색 결과에서 공식 자료를 열어볼 수 있습니다. 기록의 사실 여부와 법적 효력은 전문가와 확인해 주세요.

## 제출 파일과 확인 순서

1. 서명한 `EUMLOG-1.0.0-release.aab`의 SHA-256은 `F64860BE1E1C8F539C7C3C3A9ECA180F7E2E79907AD9B855970CDE16856CAAC3`입니다. 재빌드는 JDK와 Android SDK 36이 있는 Windows에서 `android/release.ps1`을 실행합니다. 기존 업로드 키는 현재 Windows 사용자의 로컬 키 보관 경로에서 읽습니다. 다음 배포에서는 버전 코드를 올리세요.
2. 스토어 그래픽은 [아이콘 512×512](../android/store/icon.png), [그래픽 1024×500](../android/store/feature.png), [모바일 타임라인](screenshots/demo-mobile.jpg), [모바일 관계도](screenshots/demo-graph.jpg)입니다. 두 화면은 합성 사건을 모바일 브라우저에서 연 실제 캡처입니다. [Google 스토어 그래픽 안내](https://support.google.com/googleplay/android-developer/answer/9866151)
3. Play Console에서 개발자 연락처와 지원 이메일, 대상 연령, 콘텐츠 등급, 데이터 보안 및 앱 액세스 항목을 운영 주체에 맞게 입력합니다. 리뷰어는 공개 시연을 바로 열 수 있습니다. 회원 전용 기능을 검토할 수 있도록 운영자가 심사용 접근 수단과 기기 보관함 열기 절차를 제공합니다.
4. 데이터 보안 설문에는 Google 로그인 식별 정보, 계정 관리, 선택한 익명 본문·질문의 기기 밖 일시 처리, 인프라 및 SDK 제공자, 보관·삭제 절차를 실제 운영 설정과 대조해 답합니다. 원본 녹음·사진은 기기에서 처리합니다. 제공자가 처리하는 접속 정보와 서버에 보관하는 계정 정보도 함께 검토하세요. [Google 데이터 보안 안내](https://support.google.com/googleplay/android-developer/answer/10787469)
5. 내부 테스트 트랙에 AAB를 올리고 Play 앱 서명 인증서의 SHA-256을 [assetlinks.json](../public/.well-known/assetlinks.json)에 추가해 웹을 재배포합니다. 현재 파일에는 이 빌드의 업로드 인증서 지문이 있습니다. Play에서 설치한 실제 기기로 주소 표시줄 없는 실행, Google 로그인, 마이크 권한·전사, 보관함 재열기를 확인하세요. 로컬 번들 검사는 `android/check-release.ps1 -Bundletool <bundletool-all-1.18.3.jar> -VerifySite`로 반복할 수 있습니다.
6. 개발자 계정 유형에 해당하는 테스트를 마친 뒤 프로덕션 심사를 신청합니다. 2023년 11월 13일 이후 생성된 개인 개발자 계정에는 프로덕션 접근 신청 전 12명 이상의 14일 연속 비공개 테스트 요건이 있습니다. [Google 테스트 요건](https://support.google.com/googleplay/android-developer/answer/14151465)
