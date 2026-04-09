import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const appUrl = getAppUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app/", "/auth/", "/invite/", "/login"],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
