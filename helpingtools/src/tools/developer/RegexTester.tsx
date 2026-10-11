import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, ChevronDown } from 'lucide-react';

const COMMON_PATTERNS = [
  { name: 'Email', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}' },
  { name: 'URL', pattern: 'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)' },
  { name: 'Phone Number', pattern: '\\+?\\d{1,4}?[-.\\s]?\\(?\\d{1,3}?\\)?[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,9}' },
  { name: 'Date (YYYY-MM-DD)', pattern: '\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])' },
  { name: 'IP Address', pattern: '(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)' },
  { name: 'Credit Card', pattern: '(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\\d{3})\\d{11})' },
];

export function RegexTester() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState({ g: true, i: true, m: false, s: false, u: false });
  const [testString, setTestString] = useState('Contact us at support@example.com or sales@example.com.\nVisit https://example.com for more info.');
  const [replaceMode, setReplaceMode] = useState(false);
  const [replaceString, setReplaceString] = useState('');
  
  const [matches, setMatches] = useState<{text: string, index: number}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [highlightedHtml, setHighlightedHtml] = useState<React.ReactNode[]>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (!pattern) {
        setMatches([]);
        setError(null);
        setHighlightedHtml([testString]);
        return;
      }

      let flagStr = '';
      if (flags.g) flagStr += 'g';
      if (flags.i) flagStr += 'i';
      if (flags.m) flagStr += 'm';
      if (flags.s) flagStr += 's';
      if (flags.u) flagStr += 'u';

      const regex = new RegExp(pattern, flagStr);
      
      // Find matches
      const newMatches = [];
      let match;
      
      if (flags.g) {
        // Reset lastIndex just in case
        regex.lastIndex = 0;
        while ((match = regex.exec(testString)) !== null) {
          if (match[0].length === 0) {
            regex.lastIndex++; // Prevent infinite loops with zero-length matches
          }
          newMatches.push({ text: match[0], index: match.index });
        }
      } else {
        match = regex.exec(testString);
        if (match) {
          newMatches.push({ text: match[0], index: match.index });
        }
      }
      
      setMatches(newMatches);
      setError(null);

      // Create highlighted HTML
      if (newMatches.length > 0) {
        const nodes: React.ReactNode[] = [];
        let lastIndex = 0;
        
        newMatches.forEach((m, i) => {
          if (m.index > lastIndex) {
            nodes.push(<span key={`text-${i}`}>{testString.substring(lastIndex, m.index)}</span>);
          }
          nodes.push(
            <mark key={`mark-${i}`} className="bg-accent/30 text-transparent rounded-sm">
              {testString.substring(m.index, m.index + m.text.length)}
            </mark>
          );
          lastIndex = m.index + m.text.length;
        });
        
        if (lastIndex < testString.length) {
          nodes.push(<span key="text-end">{testString.substring(lastIndex)}</span>);
        }
        
        setHighlightedHtml(nodes);
      } else {
        setHighlightedHtml([testString]);
      }

    } catch (e: any) {
      setError(e.message);
      setMatches([]);
      setHighlightedHtml([testString]);
    }
  }, [pattern, flags, testString]);

  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const getReplacedString = () => {
    try {
      if (!pattern) return testString;
      let flagStr = '';
      if (flags.g) flagStr += 'g';
      if (flags.i) flagStr += 'i';
      if (flags.m) flagStr += 'm';
      if (flags.s) flagStr += 's';
      if (flags.u) flagStr += 'u';
      const regex = new RegExp(pattern, flagStr);
      return testString.replace(regex, replaceString);
    } catch (e) {
      return testString;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface brutal-border p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center mb-6">
          <div className="flex-1 w-full relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold text-xl">/</div>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Enter regular expression..."
              className={`w-full bg-background brutal-border py-4 pl-8 pr-4 text-lg font-mono outline-none focus:ring-2 focus:ring-accent ${error ? 'border-red-500' : ''}`}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted font-bold text-xl">/</div>
          </div>
          
          <div className="flex gap-2">
            {(['g', 'i', 'm', 's', 'u'] as const).map(flag => (
              <label key={flag} className={`flex items-center justify-center w-10 h-10 brutal-border cursor-pointer font-mono font-bold transition-colors ${flags[flag] ? 'bg-accent text-white' : 'bg-background hover:bg-surface'}`}>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={flags[flag]}
                  onChange={(e) => setFlags({...flags, [flag]: e.target.checked})}
                />
                {flag}
              </label>
            ))}
          </div>
        </div>

        {error && <div className="text-red-500 font-bold text-sm mb-4">{error}</div>}

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-bold uppercase tracking-[0.08em] text-muted mr-2">Common Patterns:</span>
          {COMMON_PATTERNS.map(p => (
            <button
              key={p.name}
              onClick={() => setPattern(p.pattern)}
              className="brutal-btn-secondary px-3 py-1 text-[10px]"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="font-bold text-sm uppercase tracking-[0.08em] text-muted">Test String</label>
            <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] brutal-border ${matches.length > 0 ? 'bg-accent text-white' : 'bg-surface'}`}>
              {matches.length > 0 ? `${matches.length} match${matches.length > 1 ? 'es' : ''} found` : 'No matches'}
            </div>
          </div>
          
          <div className="relative h-[300px] brutal-border bg-surface overflow-hidden">
            <div 
              ref={highlightRef}
              className="absolute inset-0 p-4 font-mono text-sm whitespace-pre-wrap break-words overflow-auto pointer-events-none text-transparent"
              aria-hidden="true"
            >
              {highlightedHtml}
            </div>
            <textarea
              ref={textareaRef}
              value={testString}
              onChange={(e) => setTestString(e.target.value)}
              onScroll={handleScroll}
              spellCheck={false}
              className="absolute inset-0 w-full h-full bg-transparent p-4 font-mono text-sm whitespace-pre-wrap break-words outline-none focus:ring-2 focus:ring-accent text-foreground resize-none"
            />
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex border-b-2 border-border-color">
            <button
              onClick={() => setReplaceMode(false)}
              className={`px-6 py-3 font-bold uppercase tracking-[0.08em] text-[11px] transition-colors border-r-2 border-border-color ${
                !replaceMode ? 'bg-accent text-white' : 'bg-surface hover:bg-background'
              }`}
            >
              Match Results
            </button>
            <button
              onClick={() => setReplaceMode(true)}
              className={`px-6 py-3 font-bold uppercase tracking-[0.08em] text-[11px] transition-colors ${
                replaceMode ? 'bg-accent text-white' : 'bg-surface hover:bg-background'
              }`}
            >
              Replace
            </button>
          </div>
          
          <div className="h-[300px] bg-surface brutal-border overflow-y-auto">
            {!replaceMode ? (
              <div className="p-4">
                {matches.length > 0 ? (
                  <div className="space-y-2">
                    {matches.map((m, i) => (
                      <div key={i} className="flex gap-4 p-3 bg-background brutal-border items-start">
                        <div className="w-8 shrink-0 text-center font-bold text-muted">{i + 1}</div>
                        <div className="flex-1 font-mono text-sm break-all">{m.text}</div>
                        <div className="text-xs text-muted font-mono mt-0.5">Index: {m.index}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted py-12 font-bold">No matches found</div>
                )}
              </div>
            ) : (
              <div className="p-4 flex flex-col gap-4 h-full">
                <div>
                  <label className="block font-bold text-sm uppercase tracking-[0.08em] mb-2">Replacement String</label>
                  <input
                    type="text"
                    value={replaceString}
                    onChange={(e) => setReplaceString(e.target.value)}
                    placeholder="e.g. $1 or new text"
                    className="w-full bg-background brutal-border p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="font-bold text-sm uppercase tracking-[0.08em] text-muted">Result</label>
                  <div className="flex-1 bg-background brutal-border p-4 font-mono text-sm whitespace-pre-wrap overflow-auto">
                    {getReplacedString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
