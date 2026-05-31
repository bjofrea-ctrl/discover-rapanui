import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'fotos');
const METADATA_FILE = path.join(__dirname, 'perfil_metadata.json');
const POSTS_FILE = path.join(__dirname, 'posts_data.json');
const PROFILE_URL = 'https://www.instagram.com/discover.rapanui/';

async function downloadImage(url, filename) {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filename, Buffer.from(buffer));
    console.log(`  Descargado: ${path.basename(filename)}`);
    return true;
  } catch (e) {
    console.error(`  Error descargando ${url}: ${e.message}`);
    return false;
  }
}

function sanitizeFilename(text, maxLen = 50) {
  return text
    .replace(/[^a-zA-Z0-9áéíóúñü\s_-]/g, '')
    .trim()
    .slice(0, maxLen)
    .replace(/\s+/g, '_') || 'post';
}

(async () => {
  console.log('=== Scrapeando Instagram: discover.rapanui ===\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'es-CL',
  });

  const page = await context.newPage();

  const profileData = { url: PROFILE_URL, scrapedAt: new Date().toISOString(), posts: [] };

  try {
    console.log('1. Navegando al perfil...');
    await page.goto(PROFILE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Try to extract profile metadata from JSON-LD or meta tags
    try {
      const jsonLd = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        return scripts.length > 0 ? JSON.parse(scripts[0].textContent) : null;
      });
      if (jsonLd) {
        profileData.jsonLd = jsonLd;
        console.log('  JSON-LD encontrado');
      }
    } catch (e) {
      console.log('  (sin JSON-LD)');
    }

    // Extract meta description
    try {
      const metaDesc = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="description"]');
        return meta ? meta.content : null;
      });
      if (metaDesc) {
        profileData.metaDescription = metaDesc;
        console.log(`  Meta desc: ${metaDesc.slice(0, 100)}...`);
      }
    } catch (e) {}

    // Extract profile info from shared data (Instagram embeds data in __NEXT_DATA__ or window._sharedData)
    let sharedData = null;
    try {
      sharedData = await page.evaluate(() => {
        try {
          const data = JSON.parse(document.getElementById('__NEXT_DATA__')?.textContent || '{}');
          return data?.props?.pageProps?.seo_category_info || null;
        } catch (e) { return null; }
      });
    } catch (e) {}

    // Try to extract images and post links from the page
    console.log('\n2. Extrayendo contenido visual...');

    // Get all post links and images visible on the profile
    const posts = await page.evaluate(() => {
      const items = [];
      // Instagram profile grid: each post is an <a> with href /p/...
      const links = document.querySelectorAll('a[href*="/p/"]');
      links.forEach((link, idx) => {
        const href = link.getAttribute('href');
        const img = link.querySelector('img');
        items.push({
          index: idx,
          url: href.startsWith('http') ? href : `https://www.instagram.com${href}`,
          thumbnail: img ? img.src : null,
          alt: img ? img.alt : '',
        });
      });
      return items;
    });

    console.log(`  Encontrados ${posts.length} enlaces a posts`);

    // Scroll to load more posts
    if (posts.length > 0) {
      for (let scroll = 0; scroll < 5; scroll++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(2000);
        const morePosts = await page.evaluate(() => {
          const links = document.querySelectorAll('a[href*="/p/"]');
          return links.length;
        });
        console.log(`  Posts visibles tras scroll ${scroll + 1}: ${morePosts}`);
        if (morePosts === posts.length && scroll > 2) break;
      }
    }

    // Re-extract after scrolling
    const allPosts = await page.evaluate(() => {
      const items = [];
      const links = document.querySelectorAll('a[href*="/p/"]');
      const seen = new Set();
      links.forEach((link) => {
        const href = link.getAttribute('href');
        if (seen.has(href)) return;
        seen.add(href);
        const img = link.querySelector('img');
        items.push({
          url: href.startsWith('http') ? href : `https://www.instagram.com${href}`,
          thumbnail: img ? img.src : null,
          alt: img ? img.alt : '',
        });
      });
      return items;
    });

    console.log(`  Posts únicos totales: ${allPosts.length}`);

    // Visit each post to get full-size image and caption
    let downloaded = 0;
    for (let i = 0; i < Math.min(allPosts.length, 20); i++) {
      const post = allPosts[i];
      try {
        console.log(`\n3.${i + 1}. Visitando post: ${post.url}`);
        await page.goto(post.url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);

        const postData = await page.evaluate(() => {
          // Get the main image (article img or main img)
          const imgs = document.querySelectorAll('article img[style*="object-fit"], div._aagv img, img[alt*="photo"], img.x5yr21d');
          const images = [];
          imgs.forEach((img) => {
            const src = img.src || img.getAttribute('data-src');
            if (src && src.startsWith('http')) images.push(src);
          });

          // Get caption
          const captionEl = document.querySelector('h1._aacl, span._aacl, div._a9zr, h1');
          const caption = captionEl ? captionEl.textContent.trim() : '';

          // Get timestamp
          const timeEl = document.querySelector('time');
          const timestamp = timeEl ? timeEl.getAttribute('datetime') : '';

          // Get likes
          const likeEl = document.querySelector('section span');
          const likes = likeEl ? likeEl.textContent : '';

          return { images: [...new Set(images)], caption, timestamp, likes };
        });

        post.extracted = postData;
        console.log(`  Caption: ${postData.caption.slice(0, 80)}...`);
        console.log(`  Likes: ${postData.likes}`);
        console.log(`  Imágenes: ${postData.images.length}`);

        // Download images
        for (let j = 0; j < postData.images.length; j++) {
          const imgUrl = postData.images[j];
          const shortCode = post.url.split('/p/')[1]?.split('/')[0] || `post_${i}`;
          const ext = imgUrl.includes('.jpg') ? '.jpg' : '.png';
          const captionPart = sanitizeFilename(postData.caption);
          const fname = `${shortCode}_${j}${captionPart ? '_' + captionPart : ''}${ext}`;
          const fpath = path.join(OUTPUT_DIR, fname);
          if (await downloadImage(imgUrl, fpath)) {
            downloaded++;
          }
        }

        profileData.posts.push({
          url: post.url,
          caption: postData.caption,
          timestamp: postData.timestamp,
          likes: postData.likes,
          images: postData.images,
          thumbnail: post.thumbnail,
        });

      } catch (e) {
        console.error(`  Error en post ${i}: ${e.message}`);
      }

      // Be gentle with Instagram
      await page.waitForTimeout(1500);
    }

    console.log(`\n=== Resumen ===`);
    console.log(`Posts analizados: ${profileData.posts.length}`);
    console.log(`Imágenes descargadas: ${downloaded}`);
    console.log(`Directorio: ${OUTPUT_DIR}`);

    // Save metadata
    fs.writeFileSync(METADATA_FILE, JSON.stringify(profileData, null, 2));
    console.log(`Metadata guardada: ${METADATA_FILE}`);

    // Save simplified posts data
    const postsSummary = profileData.posts.map((p) => ({
      url: p.url,
      caption: p.caption?.slice(0, 200),
      timestamp: p.timestamp,
      likes: p.likes,
      imageCount: p.images?.length || 0,
      thumbnail: p.thumbnail,
    }));
    fs.writeFileSync(POSTS_FILE, JSON.stringify(postsSummary, null, 2));
    console.log(`Posts data guardada: ${POSTS_FILE}`);

  } catch (e) {
    console.error(`\nError general: ${e.message}`);
    // Take screenshot for debugging
    try {
      await page.screenshot({ path: path.join(__dirname, 'error_screenshot.png'), fullPage: true });
      console.log('Screenshot de error guardado');
    } catch (ssErr) {}
  } finally {
    await browser.close();
    console.log('\nBrowser cerrado.');
  }
})();
