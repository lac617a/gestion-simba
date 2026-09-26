import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/public-site";

/** Solo la página pública (la administración está fuera de buscadores). */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 }];
}
