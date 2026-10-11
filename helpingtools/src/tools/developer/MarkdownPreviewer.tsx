import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, Download, Bold, Italic, Link as LinkIcon, Code, Heading, Sun, Moon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import python from 'highlight.js/lib/languages/python';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import 'highlight.js/styles/github-dark.css';

// Register common languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('python', python);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);

const DEFAULT_MARKDOWN = `# Welcome to Markdown Previewer

This is a **live** preview of your markdown.

## Features
- Clean typography
- Syntax highlighting
- GitHub Flavored Markdown (tables, task lists)
- Dark/Light mode preview

### Code Example
\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}
greet('World');
\`\`\`

### Table Example
| Feature | Supported |
|---------|-----------|
| GFM | Yes |
| Code | Yes |
| Live | Yes |

> "Markdown is a text-to-HTML conversion tool for web writers."
> - John Gruber
`;

export function MarkdownPreviewer() {
  const [input, setInput] = useState(DEFAULT_MARKDOWN);
  const [debouncedInput, setDebouncedInput] = useState(DEFAULT_MARKDOWN);
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light');
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Debounce input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInput(input);
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  // Syntax highlighting
  useEffect(() => {
    if (previewRef.current) {
      const blocks = previewRef.current.querySelectorAll('pre code');
      blocks.forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    }
  }, [debouncedInput, previewTheme]);

  const insertText = (before: string, after: string = '') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = input.substring(start, end);
    const newText = input.substring(0, start) + before + selectedText + after + input.substring(end);
    setInput(newText);
    
    // Reset selection
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + before.length, end + before.length);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') {
        e.preventDefault();
        insertText('**', '**');
      } else if (e.key === 'i') {
        e.preventDefault();
        insertText('*', '*');
      }
    }
  };

  const handleCopyMd = () => {
    navigator.clipboard.writeText(input);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleCopyHtml = () => {
    if (previewRef.current) {
      navigator.clipboard.writeText(previewRef.current.innerHTML);
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([input], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface brutal-border p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => insertText('**', '**')} className="brutal-btn-secondary px-3 py-2 text-xs flex items-center gap-1" title="Bold (Ctrl+B)"><Bold className="h-4 w-4" /></button>
          <button onClick={() => insertText('*', '*')} className="brutal-btn-secondary px-3 py-2 text-xs flex items-center gap-1" title="Italic (Ctrl+I)"><Italic className="h-4 w-4" /></button>
          <button onClick={() => insertText('[', '](url)')} className="brutal-btn-secondary px-3 py-2 text-xs flex items-center gap-1" title="Link"><LinkIcon className="h-4 w-4" /></button>
          <button onClick={() => insertText('\`', '\`')} className="brutal-btn-secondary px-3 py-2 text-xs flex items-center gap-1" title="Code"><Code className="h-4 w-4" /></button>
          <button onClick={() => insertText('### ', '')} className="brutal-btn-secondary px-3 py-2 text-xs flex items-center gap-1" title="Heading"><Heading className="h-4 w-4" /></button>
        </div>
        
        <div className="flex gap-2">
          <button onClick={handleCopyMd} className="brutal-btn-secondary px-4 py-2 text-xs flex items-center gap-2">
            {copiedMd ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy MD
          </button>
          <button onClick={handleCopyHtml} className="brutal-btn-secondary px-4 py-2 text-xs flex items-center gap-2">
            {copiedHtml ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy HTML
          </button>
          <button onClick={handleDownload} className="brutal-btn-secondary px-4 py-2 text-xs flex items-center gap-2">
            <Download className="h-4 w-4" /> Download .md
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[700px]">
        {/* Input Panel */}
        <div className="flex flex-col border-2 border-border-color bg-surface relative overflow-hidden">
          <div className="bg-background border-b-2 border-border-color px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-muted">Markdown Input</div>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            className="flex-1 w-full h-full resize-none bg-transparent p-6 text-sm font-mono outline-none focus:ring-2 focus:ring-accent"
            placeholder="Type your markdown here..."
          />
        </div>

        {/* Output Panel */}
        <div className={`flex flex-col border-2 border-border-color relative overflow-hidden transition-colors ${previewTheme === 'dark' ? 'bg-[#0d1117] text-[#c9d1d9]' : 'bg-white text-gray-900'}`}>
          <div className={`border-b-2 border-border-color px-4 py-2 flex justify-between items-center ${previewTheme === 'dark' ? 'bg-[#161b22]' : 'bg-gray-100'}`}>
            <span className={`text-xs font-bold uppercase tracking-[0.08em] ${previewTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Preview</span>
            <button 
              onClick={() => setPreviewTheme(previewTheme === 'light' ? 'dark' : 'light')}
              className={`p-1 rounded-sm ${previewTheme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}
              title="Toggle Preview Theme"
            >
              {previewTheme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-8">
            <div 
              ref={previewRef}
              className={`prose max-w-none ${previewTheme === 'dark' ? 'prose-invert prose-pre:bg-[#161b22]' : 'prose-pre:bg-gray-100'}`}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {debouncedInput}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
