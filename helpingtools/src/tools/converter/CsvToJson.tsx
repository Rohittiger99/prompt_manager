import React, { useState } from 'react';
import { Download, Copy, Check, Upload } from 'lucide-react';

export function CsvToJson() {
  const [csv, setCsv] = useState('name,age,city\nJohn,30,New York\nJane,25,London');
  const [json, setJson] = useState('');
  const [hasHeader, setHasHeader] = useState(true);
  const [delimiter, setDelimiter] = useState('auto');
  const [outputType, setOutputType] = useState<'objects' | 'arrays'>('objects');
  const [pretty, setPretty] = useState(true);
  const [copied, setCopied] = useState(false);

  const parseCSV = (str: string, delim: string) => {
    const result = [];
    let row = [];
    let inQuotes = false;
    let val = '';
    for (let i = 0; i < str.length; i++) {
        let char = str[i];
        let nextChar = str[i + 1];
        if (char === '"' && inQuotes && nextChar === '"') {
            val += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === delim && !inQuotes) {
            row.push(val);
            val = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
            row.push(val);
            result.push(row);
            row = [];
            val = '';
        } else {
            val += char;
        }
    }
    if (val || row.length > 0) {
        row.push(val);
        result.push(row);
    }
    // remove empty last row if it's just a trailing newline
    if (result.length > 0 && result[result.length - 1].length === 1 && result[result.length - 1][0] === '') {
        result.pop();
    }
    return result;
  };

  React.useEffect(() => {
    try {
      if (!csv.trim()) {
        setJson('');
        return;
      }
      
      let actualDelim = delimiter;
      if (delimiter === 'auto') {
        const firstLine = csv.split('\n')[0];
        if (firstLine.includes('\t')) actualDelim = '\t';
        else if (firstLine.includes(';')) actualDelim = ';';
        else actualDelim = ',';
      }
      
      const parsed = parseCSV(csv, actualDelim);
      if (parsed.length === 0) {
        setJson('[]');
        return;
      }

      let finalJson: any;
      
      if (outputType === 'arrays') {
        finalJson = parsed;
      } else {
        if (hasHeader) {
          const headers = parsed[0];
          finalJson = parsed.slice(1).map(row => {
            const obj: any = {};
            headers.forEach((h, i) => {
              obj[h] = row[i] !== undefined ? row[i] : '';
            });
            return obj;
          });
        } else {
          finalJson = parsed.map(row => {
            const obj: any = {};
            row.forEach((col, i) => {
              obj[`Column${i+1}`] = col;
            });
            return obj;
          });
        }
      }
      
      setJson(JSON.stringify(finalJson, null, pretty ? 2 : 0));
    } catch (e) {
      setJson("Error parsing CSV");
    }
  }, [csv, hasHeader, delimiter, outputType, pretty]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setCsv(ev.target.result as string);
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadJson = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-surface brutal-border p-4 flex gap-6 items-center flex-wrap">
        <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
          <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} className="accent-[#8B5CF6] w-4 h-4" />
          First row is header
        </label>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold">Delimiter:</label>
          <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)} className="brutal-border p-1 text-sm bg-background">
            <option value="auto">Auto-detect</option>
            <option value=",">Comma (,)</option>
            <option value=";">Semicolon (;)</option>
            <option value="\t">Tab</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-bold">Output:</label>
          <select value={outputType} onChange={(e) => setOutputType(e.target.value as any)} className="brutal-border p-1 text-sm bg-background">
            <option value="objects">Array of Objects</option>
            <option value="arrays">Array of Arrays</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
          <input type="checkbox" checked={pretty} onChange={(e) => setPretty(e.target.checked)} className="accent-[#8B5CF6] w-4 h-4" />
          Pretty Print
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface brutal-border p-4 flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-lg">CSV Input</h3>
            <label className="brutal-btn-secondary py-1 px-3 text-xs flex items-center gap-1 cursor-pointer">
              <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
              <Upload className="h-3 w-3" /> Upload .csv
            </label>
          </div>
          <textarea 
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            className="w-full flex-1 brutal-border p-4 bg-background font-mono text-sm resize-none whitespace-pre"
            placeholder="Paste CSV data here..."
          />
        </div>

        <div className="bg-surface brutal-border p-4 flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-lg">JSON Output</h3>
            <div className="flex gap-2">
              <button onClick={copyToClipboard} className="brutal-btn-secondary py-1 px-2 text-xs flex items-center gap-1">
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={downloadJson} className="brutal-btn-primary bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-1 px-2 text-xs flex items-center gap-1">
                <Download className="h-3 w-3" /> Save .json
              </button>
            </div>
          </div>
          
          <textarea 
            value={json}
            readOnly
            className="w-full flex-1 brutal-border p-4 bg-background font-mono text-sm resize-none outline-none whitespace-pre"
          />
        </div>
      </div>
    </div>
  );
}
