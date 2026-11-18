import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EUMLOG · 증거를 잇다",
  description: "원본을 지키고 근거로 정리하는 전용 AI 증거 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
