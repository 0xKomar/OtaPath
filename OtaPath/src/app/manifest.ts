import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OtaPath — step outside, feel brighter",
    short_name: "OtaPath",
    description:
      "A warm, playful walking companion for recovery after TMS therapy. Peel back the golden fog, collect places, tuck away little memories.",
    start_url: "/app",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FDF8EE",
    theme_color: "#FBE8A6",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
