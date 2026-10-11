import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, AlignLeft, Minimize2, AlertCircle } from 'lucide-react';
import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/github-dark.css';
import { useToast } from '../../components/ToastProvider';

hljs.registerLanguage('xml', xml);

function formatXml(xmlString: string, indent: string) {
  let formatted = '';
  let pad = 0;
  // Remove all newlines and spaces between tags
  const cleanXml = xmlString.replace(/>\s+</g, '><').trim();
  
  cleanXml.replace(/(>)(<)(\/*)/g, '$1\n$2$3').split('\n').forEach((node) => {
    let indentStr = 0;
    if (node.match(/.+<\/\w[^>]*>$/)) {
      indentStr = 0;
    } else if (node.match(/^<\/\w/)) {
      if (pad !== 0) {
        pad -= 1;
      }
    } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
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

function minifyXml(xmlString: string) {
  return xmlString.replace(/>\s+</g, '><').trim();
}

export function XmlFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<{ message: string, line?: number } | null>(null);
  const [indent, setIndent] = useState<number | string>(2);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLPreElement>(null);
  const { toast } = useToast();

  const handleFormat = () => {
    try {
      if (!input.trim()) {
        setOutput('');
        setError(null);
        return;
      }
      
      // Basic validation using DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(input, "application/xml");
      const parseError = doc.querySelector("parsererror");
      
      if (parseError) {
        const errorText = parseError.textContent || 'Invalid XML';
        const match = errorText.match(/line (\d+)/i);
        const line = match ? parseInt(match[1], 10) : undefined;
        throw { message: errorText, line };
      }

      const space = indent === 'tab' ? '\t' : ' '.repeat(Number(indent));
      setOutput(formatXml(input, space));
      setError(null);
    } catch (e: any) {
      setError({ message: e.message || 'Invalid XML', line: e.line });
      setOutput('');
    }
  };

  const handleMinify = () => {
    try {
      if (!input.trim()) return;
      const parser = new DOMParser();
      const doc = parser.parseFromString(input, "application/xml");
      if (doc.querySelector("parsererror")) {
        throw new Error("Invalid XML");
      }
      setOutput(minifyXml(input));
      setError(null);
    } catch (e: any) {
      setError({ message: e.message });
    }
  };

  const handleValidate = () => {
    try {
      if (!input.trim()) return;
      const parser = new DOMParser();
      const doc = parser.parseFromString(input, "application/xml");
      const parseError = doc.querySelector("parsererror");
      
      if (parseError) {
        const errorText = parseError.textContent || 'Invalid XML';
        const match = errorText.match(/line (\d+)/i);
        const line = match ? parseInt(match[1], 10) : undefined;
        throw { message: errorText, line };
      }
      
      setError(null);
      toast('Valid XML!', 'success');
    } catch (e: any) {
      setError({ message: e.message || 'Invalid XML', line: e.line });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    toast('Copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (outputRef.current && output) {
      hljs.highlightElement(outputRef.current);
    }
  }, [output]);

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
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-500 p-4 flex items-start gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Invalid XML</div>
            <div className="text-sm">{error.message}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
        {/* Input Panel */}
        <div className={`flex flex-col border-2 ${error ? 'border-red-500' : 'border-border-color'} bg-surface relative overflow-hidden`}>
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
              placeholder="Paste your XML here..."
            />
          </div>
        </div>

        {/* Output Panel */}
        <div className="flex flex-col border-2 border-border-color bg-surface relative overflow-hidden">
          <div className="bg-background border-b-2 border-border-color px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-muted flex justify-between items-center">
            <span>Output</span>
            <button onClick={handleCopy} disabled={!output} className="hover:text-accent disabled:opacity-50 flex items-center gap-1">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="flex-1 overflow-auto bg-[#0d1117]">
            <div className="flex min-h-full">
              <div className="w-12 shrink-0 bg-[#0d1117] border-r border-gray-800 text-right pr-2 py-4 text-gray-500 font-mono text-sm select-none">
                <pre>{renderLineNumbers(output)}</pre>
              </div>
              <pre className="flex-1 p-4 text-sm font-mono m-0">
                <code ref={outputRef} className="language-xml bg-transparent p-0">{output}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
