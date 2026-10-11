import React, { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';

export function HtmlEncodeDecode() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!input) {
      setOutput('');
      return;
    }
    
    if (mode === 'encode') {
      const el = document.createElement('div');
      el.innerText = el.textContent = input;
      setOutput(el.innerHTML);
    } else {
      const el = document.createElement('div');
      el.innerHTML = input;
      setOutput(el.textContent || el.innerText || '');
    }
  }, [input, mode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const entities = [
    { char: '&', entity: '&amp;', name: 'Ampersand' },
    { char: '<', entity: '&lt;', name: 'Less than' },
    { char: '>', entity: '&gt;', name: 'Greater than' },
    { char: '"', entity: '&quot;', name: 'Double quote' },
    { char: "'", entity: '&#39;', name: 'Single quote' },
    { char: '©', entity: '&copy;', name: 'Copyright' },
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
          Encode HTML
        </button>
        <button
          onClick={() => setMode('decode')}
          className={`px-8 py-4 font-bold uppercase tracking-[0.08em] text-[13px] transition-colors border-l-2 border-border-color ${
            mode === 'decode' ? 'bg-accent text-white' : 'hover:bg-background'
          }`}
        >
          Decode HTML
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="font-bold text-sm uppercase tracking-[0.08em] text-muted">Input</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'encode' ? "Enter text to HTML encode..." : "Enter HTML entities to decode..."}
            className="w-full h-[250px] resize-none bg-surface brutal-border p-4 text-base outline-none focus:ring-2 focus:ring-accent font-mono"
          />
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="font-bold text-sm uppercase tracking-[0.08em] text-muted">Output</label>
            <button onClick={handleCopy} disabled={!output} className="brutal-btn-secondary px-3 py-1 text-[10px] flex items-center gap-1 disabled:opacity-50">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy
            </button>
          </div>
          <textarea
            readOnly
            value={output}
            className="w-full h-[250px] resize-none bg-background brutal-border p-4 text-base outline-none font-mono"
          />
        </div>
      </div>

      <div className="bg-surface brutal-border p-6 mt-4">
        <h3 className="font-display font-bold text-xl mb-4">Common HTML Entities</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-border-color">
                <th className="py-3 px-4 font-bold uppercase text-[11px] tracking-[0.08em] text-muted">Character</th>
                <th className="py-3 px-4 font-bold uppercase text-[11px] tracking-[0.08em] text-muted">Entity Name</th>
                <th className="py-3 px-4 font-bold uppercase text-[11px] tracking-[0.08em] text-muted">Description</th>
              </tr>
            </thead>
            <tbody>
              {entities.map((item, i) => (
                <tr key={i} className="border-b border-border-color/20 last:border-0">
                  <td className="py-3 px-4 font-bold text-xl">{item.char}</td>
                  <td className="py-3 px-4 font-mono text-accent">{item.entity}</td>
                  <td className="py-3 px-4">{item.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
