import type { MetadataRoute } from "next";

/** La página pública se indexa; la administración no. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/gestion" },
    sitemap: new URL("/sitemap.xml", process.env.SITE_URL || "https://simba.profiya.com").toString(),
  };
}
