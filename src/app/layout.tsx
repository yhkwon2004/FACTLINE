import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "maze_FACTLINE",
  description: "일상 기록을 필요한 순간 사실관계로 정리하는 셀프 기록 도구",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
