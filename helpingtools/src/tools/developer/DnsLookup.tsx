import React, { useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';

type DnsRecord = {
  name: string;
  type: number;
  TTL: number;
  data: string;
};

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA'];

export function DnsLookup() {
  const [domain, setDomain] = useState('');
  const [type, setType] = useState('A');
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!domain.trim()) return;

    // Basic domain cleanup
    let cleanDomain = domain.trim().toLowerCase();
    cleanDomain = cleanDomain.replace(/^https?:\/\//, '');
    cleanDomain = cleanDomain.split('/')[0];

    setDomain(cleanDomain);
    setLoading(true);
    setError(null);
    setRecords([]);

    try {
      const res = await fetch(`https://dns.google/resolve?name=${cleanDomain}&type=${type}`);
      const data = await res.json();

      if (data.Status !== 0) {
        throw new Error(`DNS Lookup failed (Status: ${data.Status}). Domain might not exist.`);
      }

      if (!data.Answer || data.Answer.length === 0) {
        setRecords([]);
      } else {
        setRecords(data.Answer);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to perform DNS lookup.');
    } finally {
      setLoading(false);
    }
  };

  const getTypeString = (typeNum: number) => {
    const types: Record<number, string> = {
      1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 15: 'MX', 16: 'TXT', 28: 'AAAA'
    };
    return types[typeNum] || typeNum.toString();
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="bg-surface brutal-border p-6">
        <form onSubmit={handleLookup} className="flex flex-col gap-4">
          <div>
            <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted mb-2">Domain Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. example.com"
                className="flex-1 bg-background brutal-border p-4 text-lg outline-none focus:ring-2 focus:ring-accent"
                required
              />
              <button 
                type="submit" 
                disabled={loading || !domain.trim()}
                className="brutal-btn-primary px-8 py-4 flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Search className="h-5 w-5" />}
                Lookup
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted mb-2">Record Type</label>
            <div className="flex flex-wrap gap-2">
              {RECORD_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setType(t); if (domain) setTimeout(handleLookup, 0); }}
                  className={`px-4 py-2 font-bold uppercase tracking-[0.08em] text-xs transition-colors brutal-border ${
                    type === t ? 'bg-accent text-white' : 'bg-background hover:bg-surface'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-500 p-4 flex items-start gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="font-bold">{error}</div>
        </div>
      )}

      {!loading && !error && records.length === 0 && domain && (
        <div className="bg-surface brutal-border p-8 text-center text-muted font-bold">
          No {type} records found for {domain}.
        </div>
      )}

      {records.length > 0 && (
        <div className="bg-surface brutal-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background border-b-2 border-border-color">
                  <th className="p-4 font-bold text-xs uppercase tracking-[0.08em] text-muted">Type</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-[0.08em] text-muted">Name</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-[0.08em] text-muted">Value / Data</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-[0.08em] text-muted">TTL</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, i) => (
                  <tr key={i} className="border-b border-border-color last:border-0 hover:bg-background/50 transition-colors">
                    <td className="p-4 font-bold text-accent">{getTypeString(record.type)}</td>
                    <td className="p-4 font-mono text-sm">{record.name}</td>
                    <td className="p-4 font-mono text-sm break-all">{record.data}</td>
                    <td className="p-4 font-mono text-sm text-muted">{record.TTL}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
