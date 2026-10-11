import React, { useState } from 'react';
import { Copy, Check, Eraser } from 'lucide-react';

export function RemoveSpaces() {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const [removedCount, setRemovedCount] = useState<number | null>(null);
  
  const [options, setOptions] = useState({
    extraSpaces: true,
    leadingTrailing: true,
    blankLines: false,
    lineBreaks: false,
  });

  const handleClean = () => {
    const originalLength = text.length;
    let result = text;

    if (options.leadingTrailing) {
      result = result.split('\n').map(line => line.trim()).join('\n');
    }
    if (options.extraSpaces) {
      result = result.replace(/[ \t]{2,}/g, ' ');
    }
    if (options.blankLines) {
      result = result.replace(/\n\s*\n/g, '\n');
    }
    if (options.lineBreaks) {
      result = result.replace(/\n/g, ' ');
    }

    setText(result);
    setRemovedCount(originalLength - result.length);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface brutal-border p-6">
        <h3 className="text-sm font-bold uppercase tracking-[0.08em] mb-4">Cleaning Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={options.extraSpaces}
              onChange={(e) => setOptions({...options, extraSpaces: e.target.checked})}
              className="w-5 h-5 brutal-border accent-accent"
            />
            <span className="font-medium">Remove extra spaces between words</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={options.leadingTrailing}
              onChange={(e) => setOptions({...options, leadingTrailing: e.target.checked})}
              className="w-5 h-5 brutal-border accent-accent"
            />
            <span className="font-medium">Remove leading/trailing spaces</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={options.blankLines}
              onChange={(e) => setOptions({...options, blankLines: e.target.checked})}
              className="w-5 h-5 brutal-border accent-accent"
            />
            <span className="font-medium">Remove blank lines</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={options.lineBreaks}
              onChange={(e) => setOptions({...options, lineBreaks: e.target.checked})}
              className="w-5 h-5 brutal-border accent-accent"
            />
            <span className="font-medium">Remove line breaks (make single line)</span>
          </label>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <button 
            onClick={handleClean}
            className="brutal-btn-primary px-6 py-3 text-[13px] flex items-center gap-2"
          >
            <Eraser className="h-4 w-4" /> Clean Text
          </button>
          
          {removedCount !== null && (
            <span className="text-sm font-bold text-accent bg-[#FFF3EE] dark:bg-[#1A110D] brutal-border px-3 py-1">
              Removed {removedCount} characters
            </span>
          )}
        </div>
      </div>

      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste your text here..."
          className="w-full min-h-[300px] resize-y bg-surface brutal-border p-6 text-lg outline-none focus:ring-2 focus:ring-accent transition-shadow"
        />
        
        <div className="absolute bottom-4 right-4">
          <button 
            onClick={handleCopy}
            disabled={!text}
            className="brutal-btn-secondary px-4 py-2 text-[11px] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-background"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Text'}
          </button>
        </div>
      </div>
    </div>
  );
}
