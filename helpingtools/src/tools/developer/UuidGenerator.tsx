import React, { useState } from 'react';
import { Copy, Check, Download, RefreshCw } from 'lucide-react';
import { v1 as uuidv1, v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { useToast } from '../../components/ToastProvider';

export function UuidGenerator() {
  const [version, setVersion] = useState<'v1' | 'v4' | 'v5'>('v4');
  const [quantity, setQuantity] = useState(5);
  const [namespace, setNamespace] = useState('6ba7b810-9dad-11d1-80b4-00c04fd430c8'); // DNS namespace
  const [name, setName] = useState('example.com');
  const [uuids, setUuids] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const { toast } = useToast();

  const generateUuids = () => {
    const newUuids: string[] = [];
    try {
      for (let i = 0; i < quantity; i++) {
        if (version === 'v1') {
          newUuids.push(uuidv1());
        } else if (version === 'v4') {
          newUuids.push(uuidv4());
        } else if (version === 'v5') {
          // v5 needs namespace and name. If generating multiple, we append index to name to make them unique
          newUuids.push(uuidv5(`${name}${i > 0 ? i : ''}`, namespace));
        }
      }
      setUuids(newUuids);
    } catch (e) {
      toast('Error generating UUIDs. Check namespace format for v5.', 'error');
    }
  };

  // Generate initially
  React.useEffect(() => {
    generateUuids();
  }, [version, quantity]);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(uuids.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([uuids.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uuids-${version}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="bg-surface brutal-border p-6 flex flex-col gap-6">
        <div className="flex flex-wrap gap-6 items-end">
          <div>
            <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted mb-2">Version</label>
            <div className="flex gap-2">
              {(['v1', 'v4', 'v5'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setVersion(v)}
                  className={`px-6 py-3 font-bold uppercase tracking-[0.08em] text-xs transition-colors brutal-border ${
                    version === v ? 'bg-accent text-white' : 'bg-background hover:bg-surface'
                  }`}
                >
                  UUID {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted mb-2">Quantity</label>
            <select
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="bg-background brutal-border px-6 py-3 font-bold outline-none"
            >
              <option value={1}>1</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <button onClick={generateUuids} className="brutal-btn-primary px-8 py-3 flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Generate
          </button>
        </div>

        {version === 'v5' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t-2 border-border-color pt-6">
            <div>
              <label className="block font-bold text-xs uppercase tracking-[0.08em] text-muted mb-1">Namespace (UUID)</label>
              <input
                type="text"
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                className="w-full bg-background brutal-border p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block font-bold text-xs uppercase tracking-[0.08em] text-muted mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-background brutal-border p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-surface brutal-border overflow-hidden flex flex-col">
        <div className="bg-background border-b-2 border-border-color px-6 py-4 flex justify-between items-center">
          <h3 className="font-display font-bold text-xl">Generated UUIDs</h3>
          <div className="flex gap-2">
            <button onClick={handleCopyAll} className="brutal-btn-secondary px-3 py-1 text-[10px] flex items-center gap-1">
              {copiedAll ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy All
            </button>
            <button onClick={handleDownload} className="brutal-btn-secondary px-3 py-1 text-[10px] flex items-center gap-1">
              <Download className="h-3 w-3" /> Download
            </button>
          </div>
        </div>
        
        <div className="p-6 max-h-[500px] overflow-y-auto">
          <div className="space-y-2">
            {uuids.map((uuid, i) => (
              <div 
                key={i} 
                onClick={() => handleCopy(uuid, i)}
                className="group flex items-center justify-between bg-background brutal-border p-3 cursor-pointer hover:border-accent transition-colors"
              >
                <span className="font-mono text-lg">{uuid}</span>
                <span className="text-muted group-hover:text-accent transition-colors">
                  {copiedIndex === i ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#FFF9F5] dark:bg-[#1A110D] brutal-border p-6 text-center">
        <h4 className="font-bold text-sm uppercase tracking-[0.08em] text-muted mb-4">UUID Format Breakdown (8-4-4-4-12)</h4>
        <div className="flex flex-wrap justify-center gap-2 font-mono text-xl md:text-2xl font-bold">
          <span className="text-blue-500">xxxxxxxx</span>
          <span className="text-muted">-</span>
          <span className="text-green-500">xxxx</span>
          <span className="text-muted">-</span>
          <span className="text-purple-500">Mxxx</span>
          <span className="text-muted">-</span>
          <span className="text-orange-500">Nxxx</span>
          <span className="text-muted">-</span>
          <span className="text-red-500">xxxxxxxxxxxx</span>
        </div>
        <div className="mt-4 text-sm text-muted">
          M = Version, N = Variant
        </div>
      </div>
    </div>
  );
}
