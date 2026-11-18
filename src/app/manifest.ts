import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EUMLOG",
    short_name: "EUMLOG",
    description: "기록을 근거로 연결하는 증거 정리",
    lang: "ko",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f7f9f9",
    theme_color: "#176b65",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
