import React, { useState } from 'react';
import { Copy, Check, Download, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';

export function TextFormatter() {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'align' | 'transform' | 'spacing'>('align');
  
  const [align, setAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [spacing, setSpacing] = useState<'single' | 'double'>('single');
  const [showLineNumbers, setShowLineNumbers] = useState(false);

  const handleTransform = (type: string) => {
    let result = text;
    switch (type) {
      case 'html':
        result = text.replace(/<[^>]*>?/gm, '');
        break;
      case 'numbers':
        result = text.replace(/[0-9]/g, '');
        break;
      case 'punctuation':
        result = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
        break;
      case 'special':
        result = text.replace(/[^a-zA-Z0-9\s]/g, '');
        break;
    }
    setText(result);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formatted-text.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getPreviewStyle = () => {
    return {
      textAlign: align,
      lineHeight: spacing === 'double' ? 2 : 1.5,
    };
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface brutal-border">
        <div className="flex border-b-2 border-border-color overflow-x-auto hide-scrollbar">
          {(['align', 'transform', 'spacing'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-bold uppercase tracking-[0.08em] text-[11px] whitespace-nowrap border-r-2 border-border-color transition-colors ${
                activeTab === tab ? 'bg-accent text-white' : 'hover:bg-background'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <div className="p-6 min-h-[100px] flex items-center">
          {activeTab === 'align' && (
            <div className="flex gap-4">
              <button onClick={() => setAlign('left')} className={`p-3 brutal-border ${align === 'left' ? 'bg-accent text-white' : 'bg-background hover:bg-surface'}`}><AlignLeft className="h-5 w-5" /></button>
              <button onClick={() => setAlign('center')} className={`p-3 brutal-border ${align === 'center' ? 'bg-accent text-white' : 'bg-background hover:bg-surface'}`}><AlignCenter className="h-5 w-5" /></button>
              <button onClick={() => setAlign('right')} className={`p-3 brutal-border ${align === 'right' ? 'bg-accent text-white' : 'bg-background hover:bg-surface'}`}><AlignRight className="h-5 w-5" /></button>
              <button onClick={() => setAlign('justify')} className={`p-3 brutal-border ${align === 'justify' ? 'bg-accent text-white' : 'bg-background hover:bg-surface'}`}><AlignJustify className="h-5 w-5" /></button>
            </div>
          )}
          
          {activeTab === 'transform' && (
            <div className="flex flex-wrap gap-4">
              <button onClick={() => handleTransform('html')} className="brutal-btn-secondary px-4 py-2 text-xs">Remove HTML</button>
              <button onClick={() => handleTransform('numbers')} className="brutal-btn-secondary px-4 py-2 text-xs">Remove Numbers</button>
              <button onClick={() => handleTransform('punctuation')} className="brutal-btn-secondary px-4 py-2 text-xs">Remove Punctuation</button>
              <button onClick={() => handleTransform('special')} className="brutal-btn-secondary px-4 py-2 text-xs">Remove Special Chars</button>
            </div>
          )}
          
          {activeTab === 'spacing' && (
            <div className="flex flex-wrap gap-6 items-center">
              <div className="flex gap-4">
                <button onClick={() => setSpacing('single')} className={`brutal-btn-secondary px-4 py-2 text-xs ${spacing === 'single' ? 'bg-accent text-white border-accent' : ''}`}>Single Space</button>
                <button onClick={() => setSpacing('double')} className={`brutal-btn-secondary px-4 py-2 text-xs ${spacing === 'double' ? 'bg-accent text-white border-accent' : ''}`}>Double Space</button>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showLineNumbers}
                  onChange={(e) => setShowLineNumbers(e.target.checked)}
                  className="w-5 h-5 brutal-border accent-accent"
                />
                <span className="font-bold text-sm">Show Line Numbers</span>
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="font-bold text-sm uppercase tracking-[0.08em] text-muted">Input</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste your text here..."
            className="w-full h-[400px] resize-none bg-surface brutal-border p-4 text-base outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="font-bold text-sm uppercase tracking-[0.08em] text-muted">Live Preview</label>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="brutal-btn-secondary px-3 py-1 text-[10px] flex items-center gap-1">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy
              </button>
              <button onClick={handleDownload} className="brutal-btn-secondary px-3 py-1 text-[10px] flex items-center gap-1">
                <Download className="h-3 w-3" /> Download
              </button>
            </div>
          </div>
          <div 
            className="w-full h-[400px] overflow-y-auto bg-background brutal-border p-4 text-base"
            style={getPreviewStyle()}
          >
            {showLineNumbers ? (
              <div className="flex">
                <div className="flex flex-col text-muted pr-4 border-r-2 border-border-color select-none text-right min-w-[3rem]">
                  {text.split('\n').map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <div className="pl-4 whitespace-pre-wrap flex-1">{text}</div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{text}</div>
            )}
            {!text && <span className="text-muted italic">Preview will appear here...</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
