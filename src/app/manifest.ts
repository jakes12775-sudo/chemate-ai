import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chemate AI",
    short_name: "Chemate",
    description:
      "Industrial chemistry study companion with grounded answers, revision tools, lab reports, and exam prediction.",
    start_url: "/",
    display: "standalone",
    background_color: "#08111a",
    theme_color: "#0bb7f4",
    icons: [
      {
        src: "/icon?size=192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon?size=512",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
