import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Search, Globe } from 'lucide-react';
import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/github-dark.css';

export function MetaTagGenerator() {
  const [tags, setTags] = useState({
    title: 'My Awesome Website',
    description: 'This is a description of my awesome website. It should be between 50 and 160 characters for optimal SEO.',
    keywords: 'website, awesome, seo, tools',
    author: 'John Doe',
    robots: 'index, follow',
    viewport: 'width=device-width, initial-scale=1.0',
    ogTitle: '',
    ogDescription: '',
    ogImage: 'https://example.com/image.jpg',
    twitterCard: 'summary_large_image',
  });

  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const title = tags.title || 'Title';
    const desc = tags.description || 'Description';
    const ogTitle = tags.ogTitle || tags.title;
    const ogDesc = tags.ogDescription || tags.description;

    const html = `<!-- Primary Meta Tags -->
<title>${title}</title>
<meta name="title" content="${title}">
<meta name="description" content="${desc}">
${tags.keywords ? `\n<meta name="keywords" content="${tags.keywords}">` : ''}
${tags.author ? `<meta name="author" content="${tags.author}">\n` : ''}
<meta name="robots" content="${tags.robots}">
<meta name="viewport" content="${tags.viewport}">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${ogDesc}">
${tags.ogImage ? `<meta property="og:image" content="${tags.ogImage}">\n` : ''}
<!-- Twitter -->
<meta property="twitter:card" content="${tags.twitterCard}">
<meta property="twitter:title" content="${ogTitle}">
<meta property="twitter:description" content="${ogDesc}">
${tags.ogImage ? `<meta property="twitter:image" content="${tags.ogImage}">` : ''}`;

    setOutput(html.trim());
  }, [tags]);

  useEffect(() => {
    if (outputRef.current && output) {
      hljs.highlightElement(outputRef.current);
    }
  }, [output]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const titleLength = tags.title.length;
  const descLength = tags.description.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Panel */}
        <div className="bg-surface brutal-border p-6 flex flex-col gap-4">
          <h3 className="font-display font-bold text-xl mb-2">Basic Meta Tags</h3>
          
          <div>
            <div className="flex justify-between mb-1">
              <label className="font-bold text-sm uppercase tracking-[0.08em] text-muted">Title</label>
              <span className={`text-xs font-bold ${titleLength > 60 ? 'text-red-500' : 'text-green-500'}`}>{titleLength}/60</span>
            </div>
            <input
              type="text"
              value={tags.title}
              onChange={(e) => setTags({...tags, title: e.target.value})}
              className={`w-full bg-background brutal-border p-3 outline-none focus:ring-2 focus:ring-accent ${titleLength > 60 ? 'border-red-500' : ''}`}
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="font-bold text-sm uppercase tracking-[0.08em] text-muted">Description</label>
              <span className={`text-xs font-bold ${descLength > 160 ? 'text-red-500' : 'text-green-500'}`}>{descLength}/160</span>
            </div>
            <textarea
              value={tags.description}
              onChange={(e) => setTags({...tags, description: e.target.value})}
              className={`w-full h-24 resize-none bg-background brutal-border p-3 outline-none focus:ring-2 focus:ring-accent ${descLength > 160 ? 'border-red-500' : ''}`}
            />
          </div>

          <div>
            <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted mb-1">Keywords (comma separated)</label>
            <input
              type="text"
              value={tags.keywords}
              onChange={(e) => setTags({...tags, keywords: e.target.value})}
              className="w-full bg-background brutal-border p-3 outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted mb-1">Author</label>
              <input
                type="text"
                value={tags.author}
                onChange={(e) => setTags({...tags, author: e.target.value})}
                className="w-full bg-background brutal-border p-3 outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted mb-1">Robots</label>
              <select
                value={tags.robots}
                onChange={(e) => setTags({...tags, robots: e.target.value})}
                className="w-full bg-background brutal-border p-3 outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="index, follow">Index, Follow</option>
                <option value="noindex, follow">No Index, Follow</option>
                <option value="index, nofollow">Index, No Follow</option>
                <option value="noindex, nofollow">No Index, No Follow</option>
              </select>
            </div>
          </div>

          <h3 className="font-display font-bold text-xl mt-4 mb-2">Social / Open Graph</h3>
          
          <div>
            <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted mb-1">OG Image URL</label>
            <input
              type="text"
              value={tags.ogImage}
              onChange={(e) => setTags({...tags, ogImage: e.target.value})}
              className="w-full bg-background brutal-border p-3 outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted mb-1">Twitter Card Type</label>
            <select
              value={tags.twitterCard}
              onChange={(e) => setTags({...tags, twitterCard: e.target.value})}
              className="w-full bg-background brutal-border p-3 outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="summary">Summary</option>
              <option value="summary_large_image">Summary Large Image</option>
              <option value="app">App</option>
              <option value="player">Player</option>
            </select>
          </div>
        </div>

        {/* Preview & Output Panel */}
        <div className="flex flex-col gap-6">
          {/* SERP Preview */}
          <div className="bg-surface brutal-border p-6">
            <h3 className="font-bold text-sm uppercase tracking-[0.08em] text-muted mb-4 flex items-center gap-2">
              <Search className="h-4 w-4" /> Google Search Preview
            </h3>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 font-sans">
              <div className="flex items-center gap-2 text-sm text-[#202124] mb-1">
                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center"><Globe className="h-3 w-3 text-gray-500" /></div>
                <div>
                  <span className="block leading-tight">example.com</span>
                  <span className="text-xs text-[#4d5156] leading-tight">https://www.example.com</span>
                </div>
              </div>
              <h3 className="text-xl text-[#1a0dab] hover:underline cursor-pointer mb-1 truncate">
                {tags.title || 'Your Page Title'}
              </h3>
              <p className="text-sm text-[#4d5156] line-clamp-2 leading-snug">
                {tags.description || 'Your page description will appear here in search results.'}
              </p>
            </div>
          </div>

          {/* Code Output */}
          <div className="flex-1 flex flex-col border-2 border-border-color bg-surface relative overflow-hidden min-h-[300px]">
            <div className="bg-background border-b-2 border-border-color px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-muted flex justify-between items-center">
              <span>Generated HTML</span>
              <button onClick={handleCopy} className="hover:text-accent flex items-center gap-1">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? 'Copied' : 'Copy All'}
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-[#0d1117]">
              <pre className="p-4 text-sm font-mono m-0 h-full">
                <code ref={outputRef} className="language-html bg-transparent p-0">{output}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
