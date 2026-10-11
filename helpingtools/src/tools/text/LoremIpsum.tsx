import React, { useState, useEffect } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';

const LOREM_WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud", "exercitation",
  "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo", "consequat",
  "duis", "aute", "irure", "in", "reprehenderit", "voluptate", "velit", "esse",
  "cillum", "eu", "fugiat", "nulla", "pariatur", "excepteur", "sint", "occaecat",
  "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia", "deserunt",
  "mollit", "anim", "id", "est", "laborum"
];

export function LoremIpsum() {
  const [type, setType] = useState<'paragraphs' | 'sentences' | 'words' | 'lists' | 'html'>('paragraphs');
  const [count, setCount] = useState(3);
  const [startWithLorem, setStartWithLorem] = useState(true);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const generateText = () => {
    let result = '';
    
    const getRandomWord = () => LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)];
    
    const generateSentence = (isFirst = false) => {
      const length = Math.floor(Math.random() * 10) + 5;
      let sentence = [];
      for (let i = 0; i < length; i++) {
        sentence.push(getRandomWord());
      }
      if (isFirst && startWithLorem) {
        sentence = ["lorem", "ipsum", "dolor", "sit", "amet", ...sentence.slice(5)];
      }
      let text = sentence.join(' ');
      return text.charAt(0).toUpperCase() + text.slice(1) + '.';
    };

    const generateParagraph = (isFirst = false) => {
      const length = Math.floor(Math.random() * 5) + 3;
      let paragraph = [];
      for (let i = 0; i < length; i++) {
        paragraph.push(generateSentence(isFirst && i === 0));
      }
      return paragraph.join(' ');
    };

    if (type === 'words') {
      let words = [];
      for (let i = 0; i < count; i++) {
        words.push(getRandomWord());
      }
      if (startWithLorem && count >= 5) {
        words = ["lorem", "ipsum", "dolor", "sit", "amet", ...words.slice(5)];
      }
      result = words.join(' ');
      result = result.charAt(0).toUpperCase() + result.slice(1);
    } 
    else if (type === 'sentences') {
      let sentences = [];
      for (let i = 0; i < count; i++) {
        sentences.push(generateSentence(i === 0));
      }
      result = sentences.join(' ');
    }
    else if (type === 'paragraphs') {
      let paragraphs = [];
      for (let i = 0; i < count; i++) {
        paragraphs.push(generateParagraph(i === 0));
      }
      result = paragraphs.join('\n\n');
    }
    else if (type === 'lists') {
      let lists = [];
      for (let i = 0; i < count; i++) {
        const itemsCount = Math.floor(Math.random() * 4) + 3;
        let items = [];
        for (let j = 0; j < itemsCount; j++) {
          let text = generateSentence(i === 0 && j === 0).replace('.', '');
          items.push(`- ${text}`);
        }
        lists.push(items.join('\n'));
      }
      result = lists.join('\n\n');
    }
    else if (type === 'html') {
      let html = [];
      for (let i = 0; i < count; i++) {
        html.push(`<p>${generateParagraph(i === 0)}</p>`);
      }
      result = html.join('\n');
    }

    setOutput(result);
  };

  // Generate on mount and when options change
  useEffect(() => {
    generateText();
  }, [type, count, startWithLorem]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const setPreset = (presetType: typeof type, presetCount: number) => {
    setType(presetType);
    setCount(presetCount);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface brutal-border p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setPreset('paragraphs', 1)} className="brutal-btn-secondary px-3 py-1 text-xs">1 Para</button>
          <button onClick={() => setPreset('paragraphs', 3)} className="brutal-btn-secondary px-3 py-1 text-xs">3 Paras</button>
          <button onClick={() => setPreset('paragraphs', 5)} className="brutal-btn-secondary px-3 py-1 text-xs">5 Paras</button>
          <button onClick={() => setPreset('sentences', 10)} className="brutal-btn-secondary px-3 py-1 text-xs">10 Sentences</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div>
            <label className="block font-bold text-sm uppercase tracking-[0.08em] mb-2">Output Type</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-background brutal-border p-3 outline-none focus:ring-2 focus:ring-accent font-bold"
            >
              <option value="paragraphs">Paragraphs</option>
              <option value="sentences">Sentences</option>
              <option value="words">Words</option>
              <option value="lists">Lists</option>
              <option value="html">HTML</option>
            </select>
          </div>
          
          <div>
            <label className="block font-bold text-sm uppercase tracking-[0.08em] mb-2">Quantity</label>
            <input 
              type="number" 
              min="1" 
              max="100" 
              value={count} 
              onChange={(e) => setCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full bg-background brutal-border p-3 outline-none focus:ring-2 focus:ring-accent font-bold"
            />
          </div>

          <div className="flex items-center h-[52px]">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={startWithLorem}
                onChange={(e) => setStartWithLorem(e.target.checked)}
                className="w-5 h-5 brutal-border accent-accent"
              />
              <span className="font-bold text-sm">Start with "Lorem ipsum..."</span>
            </label>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t-2 border-border-color flex justify-end">
          <button 
            onClick={generateText}
            className="brutal-btn-primary px-6 py-3 text-[13px] flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Generate New
          </button>
        </div>
      </div>

      <div className="relative">
        <textarea
          readOnly
          value={output}
          className="w-full min-h-[400px] resize-y bg-surface brutal-border p-6 text-lg outline-none focus:ring-2 focus:ring-accent transition-shadow font-serif leading-relaxed"
        />
        
        <div className="absolute bottom-4 right-4">
          <button 
            onClick={handleCopy}
            disabled={!output}
            className="brutal-btn-primary px-4 py-2 text-[11px] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy All'}
          </button>
        </div>
      </div>
    </div>
  );
}
