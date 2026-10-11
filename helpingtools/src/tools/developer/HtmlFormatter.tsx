import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, AlignLeft, Minimize2, Eye, Code } from 'lucide-react';
import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/github-dark.css';

// We use the same xml highlighter for HTML
hljs.registerLanguage('html', xml);

function formatHtml(html: string, indentSize: number) {
  // A simple HTML formatter
  let formatted = '';
  let pad = 0;
  const indent = ' '.repeat(indentSize);
  
  // Remove all newlines and spaces between tags
  const cleanHtml = html.replace(/>\s+</g, '><').trim();
  
  cleanHtml.replace(/(>)(<)(\/*)/g, '$1\n$2$3').split('\n').forEach((node) => {
    let indentStr = 0;
    if (node.match(/.+<\/\w[^>]*>$/)) {
      indentStr = 0;
    } else if (node.match(/^<\/\w/)) {
      if (pad !== 0) {
        pad -= 1;
      }
    } else if (node.match(/^<\w[^>]*[^\/]>.*$/) && !node.match(/<input|<img|<br|<hr|<meta|<link/i)) {
      indentStr = 1;
    } else {
      indentStr = 0;
    }

    let padding = '';
    for (let i = 0; i < pad; i++) {
      padding += indent;
    }

    formatted += padding + node + '\n';
    pad += indentStr;
  });

  return formatted.trim();
}

function minifyHtml(html: string) {
  return html
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/<!--.*?-->/g, '')
    .trim();
}

export function HtmlFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [indent, setIndent] = useState<number>(2);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const outputRef = useRef<HTMLPreElement>(null);

  const handleFormat = () => {
    if (!input.trim()) return;
    setOutput(formatHtml(input, indent));
  };

  const handleMinify = () => {
    if (!input.trim()) return;
    setOutput(minifyHtml(input));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (activeTab === 'code' && outputRef.current && output) {
      hljs.highlightElement(outputRef.current);
    }
  }, [output, activeTab]);

  const renderLineNumbers = (text: string) => {
    const lines = text.split('\n').length;
    return Array.from({ length: lines || 1 }, (_, i) => i + 1).join('\n');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface brutal-border p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button onClick={handleFormat} className="brutal-btn-secondary px-4 py-2 text-xs flex items-center gap-2"><AlignLeft className="h-4 w-4" /> Format</button>
          <button onClick={handleMinify} className="brutal-btn-secondary px-4 py-2 text-xs flex items-center gap-2"><Minimize2 className="h-4 w-4" /> Minify</button>
          
          <select 
            value={indent} 
            onChange={(e) => setIndent(parseInt(e.target.value))}
            className="bg-background brutal-border px-3 py-2 text-xs font-bold outline-none"
          >
            <option value={2}>2 Spaces</option>
            <option value={4}>4 Spaces</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
        {/* Input Panel */}
        <div className="flex flex-col border-2 border-border-color bg-surface relative overflow-hidden">
          <div className="bg-background border-b-2 border-border-color px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-muted">Input</div>
          <div className="flex flex-1 overflow-hidden relative">
            <div className="w-12 shrink-0 bg-background border-r-2 border-border-color text-right pr-2 py-4 text-muted font-mono text-sm select-none overflow-hidden">
              <pre>{renderLineNumbers(input)}</pre>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full h-full resize-none bg-transparent p-4 text-sm font-mono outline-none whitespace-pre"
              placeholder="Paste your HTML here..."
            />
          </div>
        </div>

        {/* Output Panel */}
        <div className="flex flex-col border-2 border-border-color bg-surface relative overflow-hidden">
          <div className="bg-background border-b-2 border-border-color flex justify-between items-center">
            <div className="flex">
              <button 
                onClick={() => setActiveTab('code')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] flex items-center gap-2 border-r-2 border-border-color ${activeTab === 'code' ? 'bg-accent text-white' : 'text-muted hover:bg-surface'}`}
              >
                <Code className="h-4 w-4" /> Code
              </button>
              <button 
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] flex items-center gap-2 border-r-2 border-border-color ${activeTab === 'preview' ? 'bg-accent text-white' : 'text-muted hover:bg-surface'}`}
              >
                <Eye className="h-4 w-4" /> Preview
              </button>
            </div>
            <div className="px-4">
              <button onClick={handleCopy} disabled={!output} className="text-xs font-bold uppercase tracking-[0.08em] text-muted hover:text-accent disabled:opacity-50 flex items-center gap-1">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto bg-[#0d1117] relative">
            {activeTab === 'code' ? (
              <div className="flex min-h-full">
                <div className="w-12 shrink-0 bg-[#0d1117] border-r border-gray-800 text-right pr-2 py-4 text-gray-500 font-mono text-sm select-none">
                  <pre>{renderLineNumbers(output)}</pre>
                </div>
                <pre className="flex-1 p-4 text-sm font-mono m-0">
                  <code ref={outputRef} className="language-html bg-transparent p-0">{output}</code>
                </pre>
              </div>
            ) : (
              <iframe 
                srcDoc={output || input} 
                title="HTML Preview"
                sandbox="allow-scripts"
                className="w-full h-full bg-white"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
