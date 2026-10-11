import React, { useState, useEffect } from 'react';
import { Copy, Check, ArrowRightLeft } from 'lucide-react';

export function UrlEncodeDecode() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [method, setMethod] = useState<'component' | 'uri'>('component');

  useEffect(() => {
    try {
      if (!input) {
        setOutput('');
        return;
      }
      
      if (mode === 'encode') {
        setOutput(method === 'component' ? encodeURIComponent(input) : encodeURI(input));
      } else {
        setOutput(method === 'component' ? decodeURIComponent(input) : decodeURI(input));
      }
    } catch (e) {
      setOutput('Error: Invalid input for decoding');
    }
  }, [input, mode, method]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const examples = mode === 'encode' ? [
    { in: 'Hello World!', out: 'Hello%20World!' },
    { in: 'https://example.com/search?q=test', out: 'https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dtest' },
    { in: 'user@email.com', out: 'user%40email.com' }
  ] : [
    { in: 'Hello%20World!', out: 'Hello World!' },
    { in: 'https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dtest', out: 'https://example.com/search?q=test' },
    { in: 'user%40email.com', out: 'user@email.com' }
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex bg-surface brutal-border w-fit">
        <button
          onClick={() => setMode('encode')}
          className={`px-8 py-4 font-bold uppercase tracking-[0.08em] text-[13px] transition-colors ${
            mode === 'encode' ? 'bg-accent text-white' : 'hover:bg-background'
          }`}
        >
          Encode URL
        </button>
        <button
          onClick={() => setMode('decode')}
          className={`px-8 py-4 font-bold uppercase tracking-[0.08em] text-[13px] transition-colors border-l-2 border-border-color ${
            mode === 'decode' ? 'bg-accent text-white' : 'hover:bg-background'
          }`}
        >
          Decode URL
        </button>
      </div>

      <div className="flex gap-6 items-center">
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="radio" 
            checked={method === 'component'}
            onChange={() => setMethod('component')}
            className="w-5 h-5 accent-accent"
          />
          <span className="font-bold text-sm">encodeURIComponent (Full)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="radio" 
            checked={method === 'uri'}
            onChange={() => setMethod('uri')}
            className="w-5 h-5 accent-accent"
          />
          <span className="font-bold text-sm">encodeURI (Keep structure)</span>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="font-bold text-sm uppercase tracking-[0.08em] text-muted">Input</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'encode' ? "Enter text to URL encode..." : "Enter URL encoded text to decode..."}
            className="w-full h-[250px] resize-none bg-surface brutal-border p-4 text-base outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="font-bold text-sm uppercase tracking-[0.08em] text-muted">Output</label>
            <button onClick={handleCopy} disabled={!output || output.startsWith('Error')} className="brutal-btn-secondary px-3 py-1 text-[10px] flex items-center gap-1 disabled:opacity-50">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy
            </button>
          </div>
          <textarea
            readOnly
            value={output}
            className={`w-full h-[250px] resize-none bg-background brutal-border p-4 text-base outline-none ${output.startsWith('Error') ? 'text-red-500' : ''}`}
          />
        </div>
      </div>

      <div className="bg-surface brutal-border p-6 mt-4">
        <h3 className="font-display font-bold text-xl mb-4">Examples</h3>
        <div className="space-y-4">
          {examples.map((ex, i) => (
            <div key={i} className="flex flex-col md:flex-row gap-2 md:gap-4 items-start md:items-center p-3 bg-background brutal-border">
              <code className="flex-1 text-sm break-all">{ex.in}</code>
              <ArrowRightLeft className="h-4 w-4 text-muted hidden md:block shrink-0" />
              <code className="flex-1 text-sm break-all text-accent">{ex.out}</code>
              <button 
                onClick={() => setInput(ex.in)}
                className="brutal-btn-secondary px-3 py-1 text-[10px] mt-2 md:mt-0 shrink-0"
              >
                Try this
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
