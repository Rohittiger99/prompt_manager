import React, { useState, useRef } from 'react';
import { Copy, Check, Download, Upload } from 'lucide-react';

export function Base64Encoder() {
  const [mode, setMode] = useState<'encode' | 'decode' | 'file'>('encode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConvert = () => {
    setError(null);
    try {
      if (mode === 'encode') {
        // Handle utf-8 properly
        const encoded = btoa(unescape(encodeURIComponent(input)));
        setOutput(encoded);
      } else if (mode === 'decode') {
        const decoded = decodeURIComponent(escape(atob(input)));
        setOutput(decoded);
      }
    } catch (e) {
      setError('Invalid input for conversion.');
      setOutput('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setOutput('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      // result is a data URL: data:image/png;base64,iVBORw0KGgo...
      const base64String = result.split(',')[1];
      setOutput(base64String);
    };
    reader.onerror = () => {
      setError('Failed to read file.');
    };
    reader.readAsDataURL(file);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName ? `${fileName}.base64.txt` : 'base64-output.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex bg-surface brutal-border w-fit">
        <button
          onClick={() => { setMode('encode'); setInput(''); setOutput(''); setError(null); }}
          className={`px-6 py-4 font-bold uppercase tracking-[0.08em] text-[13px] transition-colors ${
            mode === 'encode' ? 'bg-accent text-white' : 'hover:bg-background'
          }`}
        >
          Text → Base64
        </button>
        <button
          onClick={() => { setMode('decode'); setInput(''); setOutput(''); setError(null); }}
          className={`px-6 py-4 font-bold uppercase tracking-[0.08em] text-[13px] transition-colors border-l-2 border-border-color ${
            mode === 'decode' ? 'bg-accent text-white' : 'hover:bg-background'
          }`}
        >
          Base64 → Text
        </button>
        <button
          onClick={() => { setMode('file'); setInput(''); setOutput(''); setError(null); setFileName(null); }}
          className={`px-6 py-4 font-bold uppercase tracking-[0.08em] text-[13px] transition-colors border-l-2 border-border-color ${
            mode === 'file' ? 'bg-accent text-white' : 'hover:bg-background'
          }`}
        >
          File → Base64
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="bg-surface brutal-border p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-xl">
              {mode === 'encode' ? 'Text Input' : mode === 'decode' ? 'Base64 Input' : 'File Upload'}
            </h3>
            {mode !== 'file' && (
              <span className="text-xs font-bold text-muted">{input.length} chars</span>
            )}
          </div>

          {mode === 'file' ? (
            <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-border-color bg-background p-8 min-h-[300px]">
              <Upload className="h-12 w-12 text-muted mb-4" />
              <p className="font-bold text-center mb-4">Select any file to convert to Base64</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="brutal-btn-primary px-6 py-3"
              >
                Choose File
              </button>
              {fileName && <p className="mt-4 text-sm font-bold text-accent truncate max-w-full">Selected: {fileName}</p>}
            </div>
          ) : (
            <>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === 'encode' ? "Enter text to encode..." : "Enter Base64 to decode..."}
                className={`flex-1 min-h-[300px] resize-none bg-background brutal-border p-4 font-mono text-sm outline-none focus:ring-2 focus:ring-accent ${error ? 'border-red-500' : ''}`}
              />
              <button 
                onClick={handleConvert}
                disabled={!input}
                className="brutal-btn-primary py-4 disabled:opacity-50"
              >
                {mode === 'encode' ? 'Encode to Base64' : 'Decode to Text'}
              </button>
            </>
          )}
          {error && <div className="text-red-500 font-bold text-sm">{error}</div>}
        </div>

        {/* Output Panel */}
        <div className="bg-surface brutal-border p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-xl">Output</h3>
            {output && (
              <span className="text-xs font-bold text-muted">{output.length} chars</span>
            )}
          </div>

          <div className="flex-1 relative">
            <textarea
              readOnly
              value={output}
              placeholder="Output will appear here..."
              className="w-full h-full min-h-[300px] resize-none bg-background brutal-border p-4 font-mono text-sm outline-none"
            />
            {mode === 'file' && output && output.length > 100000 && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center border-2 border-border-color">
                <p className="font-bold mb-4">Base64 string is very large ({Math.round(output.length / 1024)} KB).</p>
                <p className="text-sm text-muted mb-6">Preview is hidden to maintain performance. Please copy or download the result.</p>
                <div className="flex gap-4">
                  <button onClick={handleCopy} className="brutal-btn-primary px-6 py-3 flex items-center gap-2">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy
                  </button>
                  <button onClick={handleDownload} className="brutal-btn-secondary px-6 py-3 flex items-center gap-2">
                    <Download className="h-4 w-4" /> Download
                  </button>
                </div>
              </div>
            )}
          </div>

          {output && !(mode === 'file' && output.length > 100000) && (
            <div className="flex gap-4">
              <button onClick={handleCopy} className="flex-1 brutal-btn-secondary py-4 flex items-center justify-center gap-2">
                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />} {copied ? 'Copied' : 'Copy Output'}
              </button>
              <button onClick={handleDownload} className="flex-1 brutal-btn-secondary py-4 flex items-center justify-center gap-2">
                <Download className="h-5 w-5" /> Download .txt
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
