import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, Upload, FileJson, ListTree, AlignLeft, Minimize2, AlertCircle } from 'lucide-react';
import hljs from 'highlight.js/lib/core';
import json from 'highlight.js/lib/languages/json';
import 'highlight.js/styles/github-dark.css'; // Or another theme
import { useToast } from '../../components/ToastProvider';

hljs.registerLanguage('json', json);

const JsonTree = ({ data, name = 'root' }: { data: any, name?: string }) => {
  const [expanded, setExpanded] = useState(true);
  
  if (typeof data !== 'object' || data === null) {
    return (
      <div className="pl-4 font-mono text-sm">
        <span className="text-accent">{name}: </span>
        <span className={typeof data === 'string' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}>
          {JSON.stringify(data)}
        </span>
      </div>
    );
  }

  const isArray = Array.isArray(data);
  const keys = Object.keys(data);

  return (
    <div className="pl-4 font-mono text-sm">
      <div 
        className="cursor-pointer hover:text-accent flex items-center gap-1 select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="w-4 inline-block text-center text-xs">{expanded ? '▼' : '▶'}</span>
        <span className="text-accent">{name}</span>
        <span>{isArray ? '[' : '{'}</span>
        {!expanded && <span className="text-muted"> {keys.length} items {isArray ? ']' : '}'}</span>}
      </div>
      {expanded && (
        <div>
          {keys.map(key => (
            <JsonTree key={key} name={key} data={(data as any)[key]} />
          ))}
          <div className="pl-5">{isArray ? ']' : '}'}</div>
        </div>
      )}
    </div>
  );
};

export function JsonFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<{ message: string, line?: number } | null>(null);
  const [indent, setIndent] = useState<number | string>(2);
  const [viewMode, setViewMode] = useState<'text' | 'tree'>('text');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLPreElement>(null);
  const { toast } = useToast();

  const handleFormat = () => {
    try {
      if (!input.trim()) {
        setOutput('');
        setParsedData(null);
        setError(null);
        return;
      }
      const parsed = JSON.parse(input);
      setParsedData(parsed);
      const space = indent === 'tab' ? '\t' : Number(indent);
      setOutput(JSON.stringify(parsed, null, space));
      setError(null);
    } catch (e: any) {
      const match = e.message.match(/at position (\d+)/);
      let line = undefined;
      if (match) {
        const pos = parseInt(match[1], 10);
        line = input.substring(0, pos).split('\n').length;
      }
      setError({ message: e.message, line });
      setOutput('');
      setParsedData(null);
    }
  };

  const handleMinify = () => {
    try {
      if (!input.trim()) return;
      const parsed = JSON.parse(input);
      setParsedData(parsed);
      setOutput(JSON.stringify(parsed));
      setError(null);
    } catch (e: any) {
      setError({ message: e.message });
    }
  };

  const handleValidate = () => {
    try {
      if (!input.trim()) return;
      JSON.parse(input);
      setError(null);
      toast('Valid JSON!', 'success');
    } catch (e: any) {
      const match = e.message.match(/at position (\d+)/);
      let line = undefined;
      if (match) {
        const pos = parseInt(match[1], 10);
        line = input.substring(0, pos).split('\n').length;
      }
      setError({ message: e.message, line });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    toast('Copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setInput(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (viewMode === 'text' && outputRef.current && output) {
      hljs.highlightElement(outputRef.current);
    }
  }, [output, viewMode]);

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
          <button onClick={handleValidate} className="brutal-btn-secondary px-4 py-2 text-xs flex items-center gap-2"><Check className="h-4 w-4" /> Validate</button>
          
          <select 
            value={indent} 
            onChange={(e) => setIndent(e.target.value === 'tab' ? 'tab' : parseInt(e.target.value))}
            className="bg-background brutal-border px-3 py-2 text-xs font-bold outline-none"
          >
            <option value={2}>2 Spaces</option>
            <option value={4}>4 Spaces</option>
            <option value="tab">Tab</option>
          </select>
        </div>
        
        <div className="flex gap-2">
          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button onClick={() => fileInputRef.current?.click()} className="brutal-btn-secondary px-4 py-2 text-xs flex items-center gap-2">
            <Upload className="h-4 w-4" /> Upload .json
          </button>
          <button onClick={() => setViewMode(viewMode === 'text' ? 'tree' : 'text')} className="brutal-btn-secondary px-4 py-2 text-xs flex items-center gap-2">
            {viewMode === 'text' ? <ListTree className="h-4 w-4" /> : <FileJson className="h-4 w-4" />}
            {viewMode === 'text' ? 'Tree View' : 'Text View'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-500 p-4 flex items-start gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Invalid JSON</div>
            <div className="text-sm">{error.message} {error.line && `(Line ${error.line})`}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
        {/* Input Panel */}
        <div className={`flex flex-col border-2 ${error ? 'border-red-500' : 'border-border-color'} bg-surface relative overflow-hidden`}>
          <div className="bg-background border-b-2 border-border-color px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-muted">Input</div>
          <div className="flex flex-1 overflow-hidden relative">
            <div className="w-12 shrink-0 bg-background border-r-2 border-border-color text-right pr-2 py-4 text-muted font-mono text-sm select-none overflow-hidden" style={{ transform: 'translateY(0)' }}>
              <pre>{renderLineNumbers(input)}</pre>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full h-full resize-none bg-transparent p-4 text-sm font-mono outline-none whitespace-pre"
              placeholder="Paste your JSON here..."
            />
          </div>
        </div>

        {/* Output Panel */}
        <div className="flex flex-col border-2 border-border-color bg-surface relative overflow-hidden">
          <div className="bg-background border-b-2 border-border-color px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-muted flex justify-between items-center">
            <span>Output</span>
            <button onClick={handleCopy} disabled={!output && !parsedData} className="hover:text-accent disabled:opacity-50 flex items-center gap-1">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="flex-1 overflow-auto bg-[#0d1117]">
            {viewMode === 'text' ? (
              <div className="flex min-h-full">
                <div className="w-12 shrink-0 bg-[#0d1117] border-r border-gray-800 text-right pr-2 py-4 text-gray-500 font-mono text-sm select-none">
                  <pre>{renderLineNumbers(output)}</pre>
                </div>
                <pre className="flex-1 p-4 text-sm font-mono m-0">
                  <code ref={outputRef} className="language-json bg-transparent p-0">{output}</code>
                </pre>
              </div>
            ) : (
              <div className="p-4 bg-surface min-h-full text-foreground">
                {parsedData ? <JsonTree data={parsedData} /> : <div className="text-muted italic">No valid JSON to display</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
