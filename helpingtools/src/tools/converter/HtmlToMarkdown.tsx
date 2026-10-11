import React, { useState, useEffect } from 'react';
import { useConverterLibs } from './useConverterLibs';
import { Download, Loader2, Copy, Check, Code } from 'lucide-react';

export function HtmlToMarkdown() {
  const libsLoaded = useConverterLibs();
  const [html, setHtml] = useState('<h1>Hello World</h1>\n<p>This is <strong>HTML</strong>.</p>\n<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>');
  const [markdown, setMarkdown] = useState('');
  const [headingStyle, setHeadingStyle] = useState<'atx' | 'setext'>('atx');
  const [codeBlockStyle, setCodeBlockStyle] = useState<'indented' | 'fenced'>('fenced');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (libsLoaded && window.TurndownService) {
      try {
        const turndownService = new window.TurndownService({
          headingStyle,
          codeBlockStyle
        });
        setMarkdown(turndownService.turndown(html));
      } catch (e) {
        setMarkdown("Error parsing HTML");
      }
    }
  }, [html, headingStyle, codeBlockStyle, libsLoaded]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMd = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!libsLoaded) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-[#8B5CF6]" /></div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-surface brutal-border p-4 flex gap-4 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold">Heading Style:</label>
          <select 
            value={headingStyle} 
            onChange={(e) => setHeadingStyle(e.target.value as any)}
            className="brutal-border p-1 text-sm bg-background"
          >
            <option value="atx">ATX (# Heading)</option>
            <option value="setext">Setext (Underline)</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold">Code Block Style:</label>
          <select 
            value={codeBlockStyle} 
            onChange={(e) => setCodeBlockStyle(e.target.value as any)}
            className="brutal-border p-1 text-sm bg-background"
          >
            <option value="fenced">Fenced (```)</option>
            <option value="indented">Indented</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface brutal-border p-4 flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-lg">HTML Input</h3>
          </div>
          <textarea 
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            className="w-full flex-1 brutal-border p-4 bg-background font-mono text-sm resize-none"
            placeholder="Type or paste HTML here..."
          />
        </div>

        <div className="bg-surface brutal-border p-4 flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-lg">Markdown Output</h3>
            <div className="flex gap-2">
              <button onClick={copyToClipboard} className="brutal-btn-secondary py-1 px-2 text-xs flex items-center gap-1">
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={downloadMd} className="brutal-btn-primary bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-1 px-2 text-xs flex items-center gap-1">
                <Download className="h-3 w-3" /> Save .md
              </button>
            </div>
          </div>
          
          <textarea 
            value={markdown}
            readOnly
            className="w-full flex-1 brutal-border p-4 bg-background font-mono text-sm resize-none outline-none"
          />
        </div>
      </div>
    </div>
  );
}
