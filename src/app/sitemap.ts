import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = getAppUrl();
  const lastModified = new Date();

  return [
    {
      url: appUrl,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
