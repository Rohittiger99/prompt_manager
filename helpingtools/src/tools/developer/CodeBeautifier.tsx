import React, { useState } from 'react';
import { Copy, Check, Download, Wand2 } from 'lucide-react';
import * as prettier from 'prettier/standalone';
import * as babelPlugin from 'prettier/plugins/babel';
import * as estreePlugin from 'prettier/plugins/estree';
import * as htmlPlugin from 'prettier/plugins/html';
import * as postcssPlugin from 'prettier/plugins/postcss';

type Language = 'javascript' | 'typescript' | 'css' | 'html' | 'json' | 'xml' | 'python';

export function CodeBeautifier() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [language, setLanguage] = useState<Language>('javascript');
  const [copied, setCopied] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);

  const handleBeautify = async () => {
    if (!input.trim()) return;
    setIsFormatting(true);
    try {
      let formatted = '';
      if (language === 'javascript' || language === 'typescript') {
        formatted = await prettier.format(input, {
          parser: 'babel',
          plugins: [babelPlugin, estreePlugin],
          singleQuote: true,
        });
      } else if (language === 'css') {
        formatted = await prettier.format(input, {
          parser: 'css',
          plugins: [postcssPlugin],
        });
      } else if (language === 'html') {
        formatted = await prettier.format(input, {
          parser: 'html',
          plugins: [htmlPlugin],
        });
      } else if (language === 'json') {
        formatted = JSON.stringify(JSON.parse(input), null, 2);
      } else if (language === 'xml') {
        // Basic XML formatter
        let pad = 0;
        const cleanXml = input.replace(/>\s+</g, '><').trim();
        cleanXml.replace(/(>)(<)(\/*)/g, '$1\n$2$3').split('\n').forEach((node) => {
          let indentStr = 0;
          if (node.match(/.+<\/\w[^>]*>$/)) indentStr = 0;
          else if (node.match(/^<\/\w/)) { if (pad !== 0) pad -= 1; }
          else if (node.match(/^<\w[^>]*[^\/]>.*$/)) indentStr = 1;
          else indentStr = 0;
          let padding = '  '.repeat(pad);
          formatted += padding + node + '\n';
          pad += indentStr;
        });
        formatted = formatted.trim();
      } else if (language === 'python') {
        // Python is whitespace sensitive, so we just do basic cleanup
        formatted = input.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      }
      setOutput(formatted);
    } catch (e: any) {
      setOutput(`Error formatting code:\n${e.message}`);
    } finally {
      setIsFormatting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extensions: Record<Language, string> = {
      javascript: 'js',
      typescript: 'ts',
      css: 'css',
      html: 'html',
      json: 'json',
      xml: 'xml',
      python: 'py',
    };
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formatted.${extensions[language]}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface brutal-border p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="font-bold text-sm uppercase tracking-[0.08em]">Language:</label>
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="bg-background brutal-border px-4 py-2 text-sm font-bold outline-none"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="css">CSS</option>
            <option value="html">HTML</option>
            <option value="json">JSON</option>
            <option value="xml">XML</option>
            <option value="python">Python</option>
          </select>
        </div>
        
        <button 
          onClick={handleBeautify} 
          disabled={isFormatting || !input}
          className="brutal-btn-primary px-6 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Wand2 className="h-4 w-4" /> {isFormatting ? 'Formatting...' : 'Beautify Code'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="font-bold text-sm uppercase tracking-[0.08em] text-muted">Input</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Paste your ${language} code here...`}
            className="w-full h-[500px] resize-none bg-surface brutal-border p-4 text-sm font-mono outline-none focus:ring-2 focus:ring-accent"
            spellCheck={false}
          />
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="font-bold text-sm uppercase tracking-[0.08em] text-muted">Output</label>
            <div className="flex gap-2">
              <button onClick={handleCopy} disabled={!output || output.startsWith('Error')} className="brutal-btn-secondary px-3 py-1 text-[10px] flex items-center gap-1 disabled:opacity-50">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy
              </button>
              <button onClick={handleDownload} disabled={!output || output.startsWith('Error')} className="brutal-btn-secondary px-3 py-1 text-[10px] flex items-center gap-1 disabled:opacity-50">
                <Download className="h-3 w-3" /> Download
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={output}
            className={`w-full h-[500px] resize-none bg-background brutal-border p-4 text-sm font-mono outline-none ${output.startsWith('Error') ? 'text-red-500' : ''}`}
          />
        </div>
      </div>
    </div>
  );
}
