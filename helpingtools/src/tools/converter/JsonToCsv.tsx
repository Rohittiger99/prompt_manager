import React, { useState } from 'react';
import { Download, Copy, Check, Upload } from 'lucide-react';

export function JsonToCsv() {
  const [json, setJson] = useState('[\n  {\n    "name": "John",\n    "age": 30,\n    "city": "New York"\n  },\n  {\n    "name": "Jane",\n    "age": 25,\n    "city": "London"\n  }\n]');
  const [csv, setCsv] = useState('');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [delimiter, setDelimiter] = useState(',');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    try {
      setError(null);
      if (!json.trim()) {
        setCsv('');
        return;
      }
      
      const arr = JSON.parse(json);
      if (!Array.isArray(arr)) {
        throw new Error("Input must be a JSON array of objects or arrays");
      }
      if (arr.length === 0) {
        setCsv('');
        return;
      }

      let headers: string[] = [];
      let isArrayOfArrays = false;

      if (Array.isArray(arr[0])) {
        isArrayOfArrays = true;
      } else if (typeof arr[0] === 'object' && arr[0] !== null) {
        const keySet = new Set<string>();
        arr.forEach(obj => {
          if (typeof obj === 'object' && obj !== null) {
            Object.keys(obj).forEach(k => keySet.add(k));
          }
        });
        headers = Array.from(keySet);
      } else {
        throw new Error("Input must be a JSON array of objects or arrays");
      }

      let resultCsv = '';
      const escape = (val: any) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      if (includeHeaders && !isArrayOfArrays && headers.length > 0) {
        resultCsv += headers.map(escape).join(delimiter) + '\n';
      }

      for (const row of arr) {
        if (isArrayOfArrays) {
          resultCsv += row.map(escape).join(delimiter) + '\n';
        } else {
          resultCsv += headers.map(h => escape(row[h])).join(delimiter) + '\n';
        }
      }

      setCsv(resultCsv.trim());
    } catch (e: any) {
      setError(e.message || "Invalid JSON");
      setCsv('');
    }
  }, [json, includeHeaders, delimiter]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setJson(ev.target.result as string);
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(csv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCsv = () => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {error && (
        <div className="bg-red-100 text-red-800 p-4 brutal-border font-bold">
          {error}
        </div>
      )}

      <div className="bg-surface brutal-border p-4 flex gap-6 items-center flex-wrap">
        <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
          <input type="checkbox" checked={includeHeaders} onChange={(e) => setIncludeHeaders(e.target.checked)} className="accent-[#8B5CF6] w-4 h-4" />
          Include headers
        </label>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold">Delimiter:</label>
          <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)} className="brutal-border p-1 text-sm bg-background">
            <option value=",">Comma (,)</option>
            <option value=";">Semicolon (;)</option>
            <option value="\t">Tab</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface brutal-border p-4 flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-lg">JSON Input</h3>
            <label className="brutal-btn-secondary py-1 px-3 text-xs flex items-center gap-1 cursor-pointer">
              <input type="file" accept=".json,.txt" className="hidden" onChange={handleFileUpload} />
              <Upload className="h-3 w-3" /> Upload .json
            </label>
          </div>
          <textarea 
            value={json}
            onChange={(e) => setJson(e.target.value)}
            className="w-full flex-1 brutal-border p-4 bg-background font-mono text-sm resize-none whitespace-pre"
            placeholder="Paste JSON array here..."
          />
        </div>

        <div className="bg-surface brutal-border p-4 flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-lg">CSV Output</h3>
            <div className="flex gap-2">
              <button onClick={copyToClipboard} disabled={!csv} className="brutal-btn-secondary py-1 px-2 text-xs flex items-center gap-1 disabled:opacity-50">
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={downloadCsv} disabled={!csv} className="brutal-btn-primary bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-1 px-2 text-xs flex items-center gap-1 disabled:opacity-50">
                <Download className="h-3 w-3" /> Save .csv
              </button>
            </div>
          </div>
          
          <textarea 
            value={csv}
            readOnly
            className="w-full flex-1 brutal-border p-4 bg-background font-mono text-sm resize-none outline-none whitespace-pre"
          />
        </div>
      </div>
    </div>
  );
}
