import React, { useState, useEffect } from 'react';
import { useConverterLibs } from './useConverterLibs';
import { Download, Loader2, Copy, Check, ArrowRightLeft, Upload } from 'lucide-react';

export function YamlToJson() {
  const libsLoaded = useConverterLibs();
  const [input, setInput] = useState('name: John\nage: 30\ncity: New York');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<'yaml-to-json' | 'json-to-yaml'>('yaml-to-json');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!libsLoaded || !window.jsyaml) return;
    
    try {
      setError(null);
      if (!input.trim()) {
        setOutput('');
        return;
      }

      if (mode === 'yaml-to-json') {
        const obj = window.jsyaml.load(input);
        setOutput(JSON.stringify(obj, null, 2));
      } else {
        const obj = JSON.parse(input);
        setOutput(window.jsyaml.dump(obj));
      }
    } catch (e: any) {
      setError(e.message || "Invalid input format");
      setOutput('');
    }
  }, [input, mode, libsLoaded]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setInput(ev.target.result as string);
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadOutput = () => {
    const ext = mode === 'yaml-to-json' ? 'json' : 'yaml';
    const mime = mode === 'yaml-to-json' ? 'application/json' : 'text/yaml';
    const blob = new Blob([output], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleMode = () => {
    setMode(m => m === 'yaml-to-json' ? 'json-to-yaml' : 'yaml-to-json');
    setInput(output); // Swap input to output
  };

  if (!libsLoaded) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-[#8B5CF6]" /></div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {error && (
        <div className="bg-red-100 text-red-800 p-4 brutal-border font-bold">
          {error}
        </div>
      )}

      <div className="flex justify-center mb-6">
        <button 
          onClick={toggleMode}
          className="brutal-btn-primary bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-2 px-6 flex items-center gap-3 text-lg"
        >
          <span className={mode === 'yaml-to-json' ? 'font-bold' : 'opacity-70'}>YAML</span>
          <ArrowRightLeft className="h-5 w-5" />
          <span className={mode === 'json-to-yaml' ? 'font-bold' : 'opacity-70'}>JSON</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface brutal-border p-4 flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-lg">
              {mode === 'yaml-to-json' ? 'YAML Input' : 'JSON Input'}
            </h3>
            <label className="brutal-btn-secondary py-1 px-3 text-xs flex items-center gap-1 cursor-pointer">
              <input 
                type="file" 
                accept={mode === 'yaml-to-json' ? '.yaml,.yml,.txt' : '.json,.txt'} 
                className="hidden" 
                onChange={handleFileUpload} 
              />
              <Upload className="h-3 w-3" /> Upload File
            </label>
          </div>
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full flex-1 brutal-border p-4 bg-background font-mono text-sm resize-none whitespace-pre"
            placeholder={`Paste ${mode === 'yaml-to-json' ? 'YAML' : 'JSON'} here...`}
          />
        </div>

        <div className="bg-surface brutal-border p-4 flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-lg">
              {mode === 'yaml-to-json' ? 'JSON Output' : 'YAML Output'}
            </h3>
            <div className="flex gap-2">
              <button onClick={copyToClipboard} disabled={!output} className="brutal-btn-secondary py-1 px-2 text-xs flex items-center gap-1 disabled:opacity-50">
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={downloadOutput} disabled={!output} className="brutal-btn-primary bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-1 px-2 text-xs flex items-center gap-1 disabled:opacity-50">
                <Download className="h-3 w-3" /> Save
              </button>
            </div>
          </div>
          
          <textarea 
            value={output}
            readOnly
            className="w-full flex-1 brutal-border p-4 bg-background font-mono text-sm resize-none outline-none whitespace-pre"
          />
        </div>
      </div>
    </div>
  );
}
