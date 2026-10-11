import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Download, Plus, Trash2 } from 'lucide-react';
import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/github-dark.css';

type SitemapUrl = {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
};

export function SitemapGenerator() {
  const [urls, setUrls] = useState<SitemapUrl[]>([
    { loc: 'https://example.com/', lastmod: new Date().toISOString().split('T')[0], changefreq: 'daily', priority: '1.0' },
    { loc: 'https://example.com/about', lastmod: new Date().toISOString().split('T')[0], changefreq: 'monthly', priority: '0.8' }
  ]);
  const [bulkInput, setBulkInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    let xmlStr = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    urls.forEach(url => {
      if (!url.loc) return;
      xmlStr += `  <url>\n`;
      xmlStr += `    <loc>${url.loc}</loc>\n`;
      if (url.lastmod) xmlStr += `    <lastmod>${url.lastmod}</lastmod>\n`;
      if (url.changefreq) xmlStr += `    <changefreq>${url.changefreq}</changefreq>\n`;
      if (url.priority) xmlStr += `    <priority>${url.priority}</priority>\n`;
      xmlStr += `  </url>\n`;
    });
    
    xmlStr += `</urlset>`;
    setOutput(xmlStr);
  }, [urls]);

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

  const handleDownload = () => {
    const blob = new Blob([output], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const addUrl = () => {
    setUrls([...urls, { loc: '', lastmod: new Date().toISOString().split('T')[0], changefreq: 'monthly', priority: '0.5' }]);
  };

  const removeUrl = (index: number) => {
    const newUrls = [...urls];
    newUrls.splice(index, 1);
    setUrls(newUrls);
  };

  const updateUrl = (index: number, field: keyof SitemapUrl, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = { ...newUrls[index], [field]: value };
    setUrls(newUrls);
  };

  const handleBulkAdd = () => {
    const lines = bulkInput.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return;
    
    const newUrls = lines.map(line => ({
      loc: line.startsWith('http') ? line : `https://${line}`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: '0.5'
    }));
    
    setUrls([...urls, ...newUrls]);
    setBulkInput('');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Panel */}
        <div className="bg-surface brutal-border p-6 flex flex-col gap-6">
          
          <div>
            <h3 className="font-display font-bold text-xl mb-2">Bulk Add URLs</h3>
            <div className="flex gap-2">
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder="Paste URLs here (one per line)..."
                className="flex-1 h-24 resize-none bg-background brutal-border p-3 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
              <button onClick={handleBulkAdd} className="brutal-btn-primary px-4 py-2 text-xs h-24">
                Add
              </button>
            </div>
          </div>

          <div className="border-t-2 border-border-color pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-bold text-xl">Sitemap URLs</h3>
              <button onClick={addUrl} className="brutal-btn-secondary px-3 py-1 text-[10px] flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add Row
              </button>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {urls.map((url, index) => (
                <div key={index} className="bg-background brutal-border p-4 relative">
                  <button onClick={() => removeUrl(index)} className="absolute top-2 right-2 text-muted hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  
                  <div className="mb-3 pr-6">
                    <label className="block font-bold text-xs uppercase tracking-[0.08em] text-muted mb-1">URL</label>
                    <input
                      type="text"
                      value={url.loc}
                      onChange={(e) => updateUrl(index, 'loc', e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-surface brutal-border p-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-bold text-xs uppercase tracking-[0.08em] text-muted mb-1">Last Mod</label>
                      <input
                        type="date"
                        value={url.lastmod}
                        onChange={(e) => updateUrl(index, 'lastmod', e.target.value)}
                        className="w-full bg-surface brutal-border p-2 text-xs outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-xs uppercase tracking-[0.08em] text-muted mb-1">Freq</label>
                      <select
                        value={url.changefreq}
                        onChange={(e) => updateUrl(index, 'changefreq', e.target.value)}
                        className="w-full bg-surface brutal-border p-2 text-xs outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="">None</option>
                        <option value="always">Always</option>
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                        <option value="never">Never</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-xs uppercase tracking-[0.08em] text-muted mb-1">Priority</label>
                      <select
                        value={url.priority}
                        onChange={(e) => updateUrl(index, 'priority', e.target.value)}
                        className="w-full bg-surface brutal-border p-2 text-xs outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="">None</option>
                        <option value="1.0">1.0</option>
                        <option value="0.9">0.9</option>
                        <option value="0.8">0.8</option>
                        <option value="0.7">0.7</option>
                        <option value="0.6">0.6</option>
                        <option value="0.5">0.5</option>
                        <option value="0.4">0.4</option>
                        <option value="0.3">0.3</option>
                        <option value="0.2">0.2</option>
                        <option value="0.1">0.1</option>
                        <option value="0.0">0.0</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Output Panel */}
        <div className="flex flex-col border-2 border-border-color bg-surface relative overflow-hidden h-[600px]">
          <div className="bg-background border-b-2 border-border-color px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-muted flex justify-between items-center">
            <span>Generated XML</span>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="hover:text-accent flex items-center gap-1">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={handleDownload} className="hover:text-accent flex items-center gap-1 ml-2">
                <Download className="h-3 w-3" /> Download
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-[#0d1117]">
            <pre className="p-4 text-sm font-mono m-0 h-full">
              <code ref={outputRef} className="language-xml bg-transparent p-0">{output}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
