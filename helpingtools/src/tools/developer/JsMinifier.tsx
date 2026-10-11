import React, { useState } from 'react';
import { Copy, Check, Download, AlertTriangle } from 'lucide-react';

function minifyJs(js: string) {
  // A very basic JS minifier
  return js
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/\/\/.*/g, '') // Remove single-line comments
    .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
    .replace(/\s*([\{\}\:\;\,=\+\-\*\/\(\)\[\]])\s*/g, '$1') // Remove spaces around delimiters
    .trim();
}

function beautifyJs(js: string) {
  // A very basic JS beautifier
  let formatted = js
    .replace(/\s*([\{\}\:\;\,=\+\-\*\/\(\)\[\]])\s*/g, '$1')
    .replace(/\{/g, ' {\n  ')
    .replace(/\}/g, '\n}\n')
    .replace(/\;/g, ';\n  ')
    .replace(/  \n/g, '\n')
    .replace(/\n\s*\n/g, '\n');
  return formatted.trim();
}

export function JsMinifier() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<'minify' | 'beautify'>('minify');
  const [copied, setCopied] = useState(false);

  const handleProcess = () => {
    if (!input.trim()) return;
    if (mode === 'minify') {
      setOutput(minifyJs(input));
    } else {
      setOutput(beautifyJs(input));
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mode === 'minify' ? 'script.min.js' : 'script.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const originalSize = new Blob([input]).size;
  const newSize = new Blob([output]).size;
  const reduction = originalSize > 0 ? ((originalSize - newSize) / originalSize * 100).toFixed(1) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[#FFF3EE] dark:bg-[#1A110D] border-2 border-accent p-4 flex items-start gap-3 text-accent">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold">Warning</div>
          <div className="text-sm">Minification is basic — for production use, use a build tool like Vite, Webpack, or esbuild.</div>
        </div>
      </div>

      <div className="flex bg-surface brutal-border w-fit">
        <button
          onClick={() => setMode('minify')}
          className={`px-8 py-4 font-bold uppercase tracking-[0.08em] text-[13px] transition-colors ${
            mode === 'minify' ? 'bg-accent text-white' : 'hover:bg-background'
          }`}
        >
          Minify
        </button>
        <button
          onClick={() => setMode('beautify')}
          className={`px-8 py-4 font-bold uppercase tracking-[0.08em] text-[13px] transition-colors border-l-2 border-border-color ${
            mode === 'beautify' ? 'bg-accent text-white' : 'hover:bg-background'
          }`}
        >
          Beautify
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="font-bold text-sm uppercase tracking-[0.08em] text-muted">Input JavaScript</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your JavaScript here..."
            className="w-full h-[400px] resize-none bg-surface brutal-border p-4 text-sm font-mono outline-none focus:ring-2 focus:ring-accent"
            spellCheck={false}
          />
          <button onClick={handleProcess} className="brutal-btn-primary py-3 mt-2">
            {mode === 'minify' ? 'Minify JS' : 'Beautify JS'}
          </button>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="font-bold text-sm uppercase tracking-[0.08em] text-muted">Output</label>
            <div className="flex gap-2">
              <button onClick={handleCopy} disabled={!output} className="brutal-btn-secondary px-3 py-1 text-[10px] flex items-center gap-1 disabled:opacity-50">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy
              </button>
              <button onClick={handleDownload} disabled={!output} className="brutal-btn-secondary px-3 py-1 text-[10px] flex items-center gap-1 disabled:opacity-50">
                <Download className="h-3 w-3" /> Download
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={output}
            className="w-full h-[400px] resize-none bg-background brutal-border p-4 text-sm font-mono outline-none"
          />
          
          {output && (
            <div className="flex items-center justify-between bg-surface brutal-border p-3 mt-2 text-sm font-bold">
              <div>Original: {originalSize} bytes</div>
              <div>New: {newSize} bytes</div>
              <div className="text-accent">Reduction: {reduction}%</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
