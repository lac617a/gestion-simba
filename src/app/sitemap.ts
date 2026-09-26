import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: new URL("/", process.env.SITE_URL || "https://simba.profiya.com").toString(), changeFrequency: "weekly" }];
}
