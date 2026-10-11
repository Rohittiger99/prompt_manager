import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CaseConverter() {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleConvert = (type: string) => {
    let result = text;
    switch (type) {
      case 'upper':
        result = text.toUpperCase();
        break;
      case 'lower':
        result = text.toLowerCase();
        break;
      case 'title':
        result = text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
        break;
      case 'sentence':
        result = text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());
        break;
      case 'camel':
        result = text.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
          return index === 0 ? word.toLowerCase() : word.toUpperCase();
        }).replace(/\s+/g, '');
        break;
      case 'snake':
        result = text.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
          ?.map(x => x.toLowerCase())
          .join('_') || text;
        break;
    }
    setText(result);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <button onClick={() => handleConvert('upper')} className="brutal-btn-secondary py-3 text-xs">UPPER CASE</button>
        <button onClick={() => handleConvert('lower')} className="brutal-btn-secondary py-3 text-xs lowercase">lower case</button>
        <button onClick={() => handleConvert('title')} className="brutal-btn-secondary py-3 text-xs capitalize">Title Case</button>
        <button onClick={() => handleConvert('sentence')} className="brutal-btn-secondary py-3 text-xs normal-case">Sentence case</button>
        <button onClick={() => handleConvert('camel')} className="brutal-btn-secondary py-3 text-xs normal-case">camelCase</button>
        <button onClick={() => handleConvert('snake')} className="brutal-btn-secondary py-3 text-xs normal-case">snake_case</button>
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
            className="brutal-btn-primary px-4 py-2 text-[11px] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Text'}
          </button>
        </div>
      </div>
    </div>
  );
}
