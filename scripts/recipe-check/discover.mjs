// One-off helper: picks one single-recipe URL from each site's sitemap (robots.txt → sitemap index → posts).
// Usage: node discover.mjs https://site-a.com https://site-b.com
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15';
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) }); return r.ok ? r.text() : ''; };
const locs = (xml) => [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?([^<\]]+)/g)].map((m) => m[1].trim());
const single = (u) => /recipe|recette|rezept/i.test(u) && !/recipes-|-recipes\b|\/recipes\/?$|ideas|best-\d|\d+-best|roundup|collection|categor|tag\/|\/g\d+|what-to|how-to-(?!make)/i.test(u) && (new URL(u).pathname.match(/[-_]/g) ?? []).length >= 2;
await Promise.all(process.argv.slice(2).map(async (origin) => {
  try {
    const robots = await get(origin + '/robots.txt').catch(() => '');
    let maps = [...robots.matchAll(/^sitemap:\s*(\S+)/gim)].map((x) => x[1]);
    if (!maps.length) maps = [origin + '/sitemap_index.xml', origin + '/sitemap.xml'];
    for (let depth = 0; depth < 4; depth++) {
      const next = [];
      for (const map of maps.slice(0, 6)) {
        const xml = await get(map).catch(() => '');
        if (/<sitemapindex/i.test(xml)) {
          const kids = locs(xml).filter((k) => !/image|video|categor|tag|author|page-sitemap/i.test(k));
          next.push(...kids.filter((k) => /recipe|recette|rezept/i.test(k)), ...kids.filter((k) => /post|article|sitemap_\d|\d{4}/i.test(k)).slice(-3));
        } else {
          const urls = locs(xml).filter(single);
          if (urls.length > 3) { console.log(urls[Math.floor(urls.length / 2)]); return; }
        }
      }
      if (!next.length) break;
      maps = [...new Set(next)];
    }
    console.log('# none ' + origin);
  } catch { console.log('# fail ' + origin); }
}));
