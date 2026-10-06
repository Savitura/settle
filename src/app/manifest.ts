import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Settle",
    short_name: "Settle",
    start_url: "/",
    display: "standalone",
    background_color: "#F8F2E7",
    theme_color: "#14503C",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
