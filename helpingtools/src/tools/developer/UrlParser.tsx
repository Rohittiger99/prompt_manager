import React, { useState, useEffect } from 'react';
import { Link2, ArrowRightLeft } from 'lucide-react';

export function UrlParser() {
  const [urlInput, setUrlInput] = useState('https://user:pass@www.example.com:8080/path/to/page?name=ferret&color=purple#section1');
  const [parsed, setParsed] = useState<URL | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'parse' | 'build'>('parse');

  // Builder state
  const [builderState, setBuilderState] = useState({
    protocol: 'https:',
    host: 'example.com',
    port: '',
    pathname: '/path',
    search: '?key=value',
    hash: '#hash'
  });

  useEffect(() => {
    if (mode === 'parse') {
      try {
        if (!urlInput.trim()) {
          setParsed(null);
          setError(null);
          return;
        }
        // Add protocol if missing to allow parsing
        let toParse = urlInput;
        if (!/^https?:\/\//i.test(toParse) && !toParse.startsWith('//')) {
          toParse = 'http://' + toParse;
        }
        const urlObj = new URL(toParse);
        setParsed(urlObj);
        setError(null);
      } catch (e) {
        setParsed(null);
        setError('Invalid URL format');
      }
    }
  }, [urlInput, mode]);

  const builtUrl = () => {
    try {
      let urlStr = builderState.protocol + '//' + builderState.host;
      if (builderState.port) urlStr += ':' + builderState.port;
      if (builderState.pathname) urlStr += builderState.pathname.startsWith('/') ? builderState.pathname : '/' + builderState.pathname;
      if (builderState.search) urlStr += builderState.search.startsWith('?') ? builderState.search : '?' + builderState.search;
      if (builderState.hash) urlStr += builderState.hash.startsWith('#') ? builderState.hash : '#' + builderState.hash;
      return new URL(urlStr).href;
    } catch (e) {
      return 'Invalid URL components';
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex bg-surface brutal-border w-fit">
        <button
          onClick={() => setMode('parse')}
          className={`px-8 py-4 font-bold uppercase tracking-[0.08em] text-[13px] transition-colors ${
            mode === 'parse' ? 'bg-accent text-white' : 'hover:bg-background'
          }`}
        >
          Parse URL
        </button>
        <button
          onClick={() => setMode('build')}
          className={`px-8 py-4 font-bold uppercase tracking-[0.08em] text-[13px] transition-colors border-l-2 border-border-color ${
            mode === 'build' ? 'bg-accent text-white' : 'hover:bg-background'
          }`}
        >
          Build URL
        </button>
      </div>

      {mode === 'parse' ? (
        <>
          <div className="bg-surface brutal-border p-6">
            <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted mb-2">Enter URL to parse</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"><Link2 className="h-5 w-5" /></div>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://..."
                className={`w-full bg-background brutal-border py-4 pl-12 pr-4 text-lg font-mono outline-none focus:ring-2 focus:ring-accent ${error ? 'border-red-500' : ''}`}
              />
            </div>
            {error && <div className="text-red-500 font-bold text-sm mt-2">{error}</div>}
          </div>

          {parsed && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface brutal-border p-4">
                <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted mb-1">Protocol</div>
                <div className="font-mono font-bold text-lg break-all">{parsed.protocol}</div>
              </div>
              <div className="bg-surface brutal-border p-4">
                <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted mb-1">Hostname</div>
                <div className="font-mono font-bold text-lg break-all">{parsed.hostname}</div>
              </div>
              <div className="bg-surface brutal-border p-4">
                <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted mb-1">Port</div>
                <div className="font-mono font-bold text-lg break-all">{parsed.port || '(default)'}</div>
              </div>
              <div className="bg-surface brutal-border p-4">
                <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted mb-1">Origin</div>
                <div className="font-mono font-bold text-lg break-all">{parsed.origin}</div>
              </div>
              <div className="bg-surface brutal-border p-4 md:col-span-2">
                <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted mb-1">Pathname</div>
                <div className="font-mono font-bold text-lg break-all">{parsed.pathname}</div>
              </div>
              <div className="bg-surface brutal-border p-4 md:col-span-2">
                <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted mb-1">Hash</div>
                <div className="font-mono font-bold text-lg break-all">{parsed.hash || '(none)'}</div>
              </div>
              
              {(parsed.username || parsed.password) && (
                <>
                  <div className="bg-surface brutal-border p-4 md:col-span-2">
                    <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted mb-1">Username</div>
                    <div className="font-mono font-bold text-lg break-all">{parsed.username}</div>
                  </div>
                  <div className="bg-surface brutal-border p-4 md:col-span-2">
                    <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted mb-1">Password</div>
                    <div className="font-mono font-bold text-lg break-all">{parsed.password}</div>
                  </div>
                </>
              )}

              <div className="bg-surface brutal-border p-0 md:col-span-2 lg:col-span-4 overflow-hidden">
                <div className="bg-background border-b-2 border-border-color px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Search Parameters</div>
                </div>
                {Array.from(parsed.searchParams.entries()).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-border-color">
                          <th className="p-3 font-bold text-xs uppercase tracking-[0.08em] text-muted w-1/3">Key</th>
                          <th className="p-3 font-bold text-xs uppercase tracking-[0.08em] text-muted">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(parsed.searchParams.entries()).map(([key, value], i) => (
                          <tr key={i} className="border-b border-border-color last:border-0 hover:bg-background/50">
                            <td className="p-3 font-mono text-sm font-bold text-accent">{key}</td>
                            <td className="p-3 font-mono text-sm break-all">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-muted font-bold">No search parameters found.</div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface brutal-border p-6 flex flex-col gap-4">
            <h3 className="font-display font-bold text-xl mb-2">URL Components</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-xs uppercase tracking-[0.08em] text-muted mb-1">Protocol</label>
                <input
                  type="text"
                  value={builderState.protocol}
                  onChange={(e) => setBuilderState({...builderState, protocol: e.target.value})}
                  className="w-full bg-background brutal-border p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block font-bold text-xs uppercase tracking-[0.08em] text-muted mb-1">Port</label>
                <input
                  type="text"
                  value={builderState.port}
                  onChange={(e) => setBuilderState({...builderState, port: e.target.value})}
                  className="w-full bg-background brutal-border p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-xs uppercase tracking-[0.08em] text-muted mb-1">Host</label>
              <input
                type="text"
                value={builderState.host}
                onChange={(e) => setBuilderState({...builderState, host: e.target.value})}
                className="w-full bg-background brutal-border p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block font-bold text-xs uppercase tracking-[0.08em] text-muted mb-1">Pathname</label>
              <input
                type="text"
                value={builderState.pathname}
                onChange={(e) => setBuilderState({...builderState, pathname: e.target.value})}
                className="w-full bg-background brutal-border p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block font-bold text-xs uppercase tracking-[0.08em] text-muted mb-1">Search (Query String)</label>
              <input
                type="text"
                value={builderState.search}
                onChange={(e) => setBuilderState({...builderState, search: e.target.value})}
                className="w-full bg-background brutal-border p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block font-bold text-xs uppercase tracking-[0.08em] text-muted mb-1">Hash</label>
              <input
                type="text"
                value={builderState.hash}
                onChange={(e) => setBuilderState({...builderState, hash: e.target.value})}
                className="w-full bg-background brutal-border p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div className="bg-surface brutal-border p-6 flex flex-col">
            <h3 className="font-display font-bold text-xl mb-4">Assembled URL</h3>
            <div className="flex-1 bg-background brutal-border p-6 font-mono text-xl break-all flex items-center justify-center text-center">
              {builtUrl()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
