import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/phone",
    name: "Commonplace · Personal Discovery",
    short_name: "Commonplace",
    description:
      "Discover deliberately. Finish one idea. Know when you have enough.",
    start_url: "/phone",
    scope: "/phone",
    display: "standalone",
    background_color: "#f7f6f1",
    theme_color: "#345b42",
    icons: [
      {
        src: "/icons/commonplace-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/commonplace-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/commonplace-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
