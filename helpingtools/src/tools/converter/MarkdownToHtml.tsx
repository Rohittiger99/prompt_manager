import React, { useState, useEffect } from 'react';
import { useConverterLibs } from './useConverterLibs';
import { Download, Loader2, Copy, Check, FileText } from 'lucide-react';

export function MarkdownToHtml() {
  const libsLoaded = useConverterLibs();
  const [markdown, setMarkdown] = useState('# Hello World\n\nThis is **markdown**.\n\n- Item 1\n- Item 2');
  const [html, setHtml] = useState('');
  const [tab, setTab] = useState<'raw' | 'preview'>('preview');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (libsLoaded && window.marked) {
      setHtml(window.marked.parse(markdown));
    }
  }, [markdown, libsLoaded]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setMarkdown(ev.target.result as string);
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadHtml = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!libsLoaded) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-[#8B5CF6]" /></div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface brutal-border p-4 flex flex-col h-[600px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-lg">Markdown Input</h3>
            <label className="brutal-btn-secondary py-1 px-3 text-xs flex items-center gap-1 cursor-pointer">
              <input type="file" accept=".md,.txt" className="hidden" onChange={handleFileUpload} />
              <FileText className="h-3 w-3" /> Upload .md
            </label>
          </div>
          <textarea 
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="w-full flex-1 brutal-border p-4 bg-background font-mono text-sm resize-none"
            placeholder="Type markdown here..."
          />
        </div>

        <div className="bg-surface brutal-border p-4 flex flex-col h-[600px]">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <button 
                onClick={() => setTab('preview')}
                className={`px-3 py-1 text-xs font-bold ${tab === 'preview' ? 'bg-[#8B5CF6] text-white' : 'bg-background brutal-border'}`}
              >
                Preview
              </button>
              <button 
                onClick={() => setTab('raw')}
                className={`px-3 py-1 text-xs font-bold ${tab === 'raw' ? 'bg-[#8B5CF6] text-white' : 'bg-background brutal-border'}`}
              >
                Raw HTML
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={copyToClipboard} className="brutal-btn-secondary py-1 px-2 text-xs flex items-center gap-1">
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={downloadHtml} className="brutal-btn-primary bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-1 px-2 text-xs flex items-center gap-1">
                <Download className="h-3 w-3" /> Save
              </button>
            </div>
          </div>
          
          <div className="flex-1 brutal-border bg-background overflow-auto">
            {tab === 'preview' ? (
              <div 
                className="p-4 prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <textarea 
                value={html}
                readOnly
                className="w-full h-full p-4 bg-background font-mono text-sm resize-none outline-none"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
