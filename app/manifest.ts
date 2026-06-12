import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "하루",
    short_name: "하루",
    description: "태스크, 목표, AI 사용까지 — 나를 위한 하루 운영 시스템",
    start_url: "/today",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#fafafa",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Android: 홈 화면 아이콘 길게 누르면 나오는 바로가기
    shortcuts: [
      {
        name: "할 일 추가",
        url: "/today?add=task",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "AI 세션 시작",
        url: "/today?gate=1",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
