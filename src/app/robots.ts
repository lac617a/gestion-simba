import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/public-site";

/** La página pública se indexa; la administración no. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/gestion" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
