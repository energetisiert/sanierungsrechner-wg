import type { MetadataRoute } from 'next';

/**
 * Landingpage bleibt für Google indexierbar, alle Schnittstellen sind für
 * Crawler gesperrt (SEO Protection aus dem Security-Briefing).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/_next/'],
    },
  };
}
