import React, { useState } from 'react';
import { Search, ShieldAlert, ShieldCheck, AlertCircle } from 'lucide-react';

const SECURITY_HEADERS = [
  'strict-transport-security',
  'content-security-policy',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy'
];

export function HttpHeadersChecker() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  const checkHeaders = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }
    setUrl(targetUrl);

    setLoading(true);
    setError(null);
    setHeaders({});
    setStatus(null);

    try {
      // Using allorigins.win as a CORS proxy to fetch headers
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl);
      const data = await res.json();

      if (!res.ok) throw new Error('Failed to fetch headers');
      
      setStatus(data.status.http_code);
      
      // allorigins returns headers in a somewhat messy format sometimes, 
      // but we can parse them from the raw response if needed, 
      // or use a different proxy. Let's try to parse from the actual fetch if possible,
      // but fetch() doesn't expose all headers due to CORS.
      // Actually, allorigins doesn't expose full headers easily in the JSON.
      // Let's use a different approach: fetch directly if possible (will fail for most sites),
      // or use a dedicated header API.
      // Since we need a reliable way, let's use a public API that returns headers as JSON.
      // https://api.hackertarget.com/httpheaders/?q=example.com returns raw text.
      
      const htRes = await fetch(`https://api.hackertarget.com/httpheaders/?q=${encodeURIComponent(targetUrl)}`);
      const htText = await htRes.text();
      
      if (htText.includes('error') || htText.trim() === '') {
        throw new Error('Could not retrieve headers. The site might be blocking requests or is unreachable.');
      }

      const lines = htText.split('\n');
      const parsedHeaders: Record<string, string> = {};
      
      // First line is usually HTTP/1.1 200 OK
      const statusMatch = lines[0].match(/HTTP\/\d\.\d\s+(\d+)/);
      if (statusMatch) {
        setStatus(parseInt(statusMatch[1], 10));
      }

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const key = line.substring(0, colonIdx).trim().toLowerCase();
          const value = line.substring(colonIdx + 1).trim();
          parsedHeaders[key] = value;
        }
      }

      setHeaders(parsedHeaders);
    } catch (err: any) {
      setError(err.message || 'Failed to check headers.');
    } finally {
      setLoading(false);
    }
  };

  const missingSecurityHeaders = SECURITY_HEADERS.filter(h => !headers[h]);
  const presentSecurityHeaders = SECURITY_HEADERS.filter(h => headers[h]);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="bg-surface brutal-border p-6">
        <form onSubmit={checkHeaders} className="flex flex-col gap-4">
          <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted">Target URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 bg-background brutal-border p-4 text-lg outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <button 
              type="submit" 
              disabled={loading || !url.trim()}
              className="brutal-btn-primary px-8 py-4 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Search className="h-5 w-5" />}
              Check
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-500 p-4 flex items-start gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="font-bold">{error}</div>
        </div>
      )}

      {Object.keys(headers).length > 0 && (
        <div className="flex flex-col gap-6">
          <div className="bg-surface brutal-border p-6 flex justify-between items-center">
            <h3 className="font-display font-bold text-xl">HTTP Status</h3>
            <div className={`px-4 py-2 font-bold text-lg brutal-border ${status && status < 400 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
              {status || 'Unknown'}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface brutal-border p-6">
              <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2 text-green-600 dark:text-green-400">
                <ShieldCheck className="h-6 w-6" /> Security Headers Present
              </h3>
              {presentSecurityHeaders.length > 0 ? (
                <ul className="space-y-2">
                  {presentSecurityHeaders.map(h => (
                    <li key={h} className="font-mono text-sm bg-background brutal-border p-2">✅ {h}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted font-bold">No standard security headers found.</div>
              )}
            </div>

            <div className="bg-surface brutal-border p-6">
              <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2 text-red-600 dark:text-red-400">
                <ShieldAlert className="h-6 w-6" /> Security Headers Missing
              </h3>
              {missingSecurityHeaders.length > 0 ? (
                <ul className="space-y-2">
                  {missingSecurityHeaders.map(h => (
                    <li key={h} className="font-mono text-sm bg-background brutal-border p-2 border-red-500 text-red-600 dark:text-red-400">❌ {h}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted font-bold">All standard security headers are present!</div>
              )}
            </div>
          </div>

          <div className="bg-surface brutal-border overflow-hidden">
            <div className="bg-background border-b-2 border-border-color px-6 py-4">
              <h3 className="font-display font-bold text-xl">All Response Headers</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background border-b-2 border-border-color">
                    <th className="p-4 font-bold text-xs uppercase tracking-[0.08em] text-muted w-1/3">Header Name</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-[0.08em] text-muted">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(headers).map(([key, value], i) => (
                    <tr key={i} className="border-b border-border-color last:border-0 hover:bg-background/50 transition-colors">
                      <td className={`p-4 font-mono text-sm font-bold ${SECURITY_HEADERS.includes(key) ? 'text-accent' : ''}`}>{key}</td>
                      <td className="p-4 font-mono text-sm break-all">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
