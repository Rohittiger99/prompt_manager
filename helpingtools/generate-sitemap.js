import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We need to read the tools from src/data/tools.ts
// Since it's TS and uses lucide-react, we can't easily import it directly in a simple Node script without transpilation.
// Let's just parse it with regex.

const toolsFile = fs.readFileSync(path.join(__dirname, 'src/data/tools.ts'), 'utf-8');
const toolIds = [];
const regex = /id:\s*'([^']+)'/g;
let match;
while ((match = regex.exec(toolsFile)) !== null) {
  if (match[1] !== 'image' && match[1] !== 'pdf' && match[1] !== 'text' && match[1] !== 'developer' && match[1] !== 'converter') {
    toolIds.push(match[1]);
  }
}

const categories = ['image', 'pdf', 'text', 'developer', 'converter'];

const baseUrl = 'https://helpingtools.com';
const date = new Date().toISOString().split('T')[0];

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${date}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;

categories.forEach(cat => {
  sitemap += `  <url>
    <loc>${baseUrl}/category/${cat}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
});

toolIds.forEach(id => {
  sitemap += `  <url>
    <loc>${baseUrl}/tool/${id}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
});

sitemap += `</urlset>`;

fs.writeFileSync(path.join(__dirname, 'public', 'sitemap.xml'), sitemap);
console.log('Generated sitemap.xml');

const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;

fs.writeFileSync(path.join(__dirname, 'public', 'robots.txt'), robotsTxt);
console.log('Generated robots.txt');
