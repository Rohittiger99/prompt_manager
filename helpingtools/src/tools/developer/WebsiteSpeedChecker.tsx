import React, { useState } from 'react';
import { Search, Monitor, Smartphone, AlertCircle, CheckCircle, Zap } from 'lucide-react';

type SpeedResult = {
  score: number;
  metrics: {
    lcp: string;
    fid: string;
    cls: string;
    fcp: string;
    ttfb: string;
  };
  audits: any[];
};

export function WebsiteSpeedChecker() {
  const [url, setUrl] = useState('');
  const [strategy, setStrategy] = useState<'mobile' | 'desktop'>('mobile');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SpeedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkSpeed = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }
    setUrl(targetUrl);

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&strategy=${strategy}`);
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error.message || 'Failed to analyze website.');
      }

      const lighthouse = data.lighthouseResult;
      const audits = lighthouse.audits;

      // Extract top 5 opportunities (recommendations)
      const recommendations = Object.values(audits)
        .filter((audit: any) => audit.details && audit.details.type === 'opportunity' && audit.score !== 1 && audit.score !== null)
        .sort((a: any, b: any) => (a.score || 0) - (b.score || 0))
        .slice(0, 5);

      setResult({
        score: Math.round(lighthouse.categories.performance.score * 100),
        metrics: {
          lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
          fid: audits['max-potential-fid']?.displayValue || 'N/A', // Using max potential FID as proxy if real FID not available
          cls: audits['cumulative-layout-shift']?.displayValue || 'N/A',
          fcp: audits['first-contentful-paint']?.displayValue || 'N/A',
          ttfb: audits['server-response-time']?.displayValue || 'N/A',
        },
        audits: recommendations
      });
    } catch (err: any) {
      setError(err.message || 'Failed to check website speed. Please ensure the URL is publicly accessible.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500 border-green-500';
    if (score >= 50) return 'text-orange-500 border-orange-500';
    return 'text-red-500 border-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="bg-surface brutal-border p-6">
        <form onSubmit={checkSpeed} className="flex flex-col gap-4">
          <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted">Website URL</label>
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 bg-background brutal-border p-4 text-lg outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setStrategy('mobile')}
                className={`px-4 py-4 font-bold uppercase tracking-[0.08em] text-xs transition-colors brutal-border flex items-center gap-2 ${
                  strategy === 'mobile' ? 'bg-accent text-white' : 'bg-background hover:bg-surface'
                }`}
              >
                <Smartphone className="h-4 w-4" /> Mobile
              </button>
              <button
                type="button"
                onClick={() => setStrategy('desktop')}
                className={`px-4 py-4 font-bold uppercase tracking-[0.08em] text-xs transition-colors brutal-border flex items-center gap-2 ${
                  strategy === 'desktop' ? 'bg-accent text-white' : 'bg-background hover:bg-surface'
                }`}
              >
                <Monitor className="h-4 w-4" /> Desktop
              </button>
            </div>
            <button 
              type="submit" 
              disabled={loading || !url.trim()}
              className="brutal-btn-primary px-8 py-4 flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Zap className="h-5 w-5" />}
              Analyze
            </button>
          </div>
        </form>
      </div>

      {loading && (
        <div className="bg-surface brutal-border p-12 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-muted uppercase tracking-[0.08em]">Analyzing Performance...</p>
          <p className="text-sm text-muted">This usually takes 10-20 seconds.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-500 p-4 flex items-start gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="font-bold">{error}</div>
        </div>
      )}

      {result && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Score Card */}
          <div className="bg-surface brutal-border p-8 flex flex-col items-center justify-center text-center">
            <h3 className="font-bold text-sm uppercase tracking-[0.08em] text-muted mb-6">Performance Score</h3>
            <div className={`w-40 h-40 rounded-full border-8 flex items-center justify-center mb-6 ${getScoreColor(result.score)}`}>
              <span className="text-6xl font-display font-black">{result.score}</span>
            </div>
            <div className="flex gap-4 text-xs font-bold uppercase tracking-[0.08em]">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> 0-49</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500"></span> 50-89</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> 90-100</span>
            </div>
          </div>

          {/* Metrics Card */}
          <div className="lg:col-span-2 bg-surface brutal-border p-6">
            <h3 className="font-display font-bold text-xl mb-6 border-b-2 border-border-color pb-4">Core Web Vitals & Metrics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-background brutal-border p-4">
                <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted mb-1">Largest Contentful Paint (LCP)</div>
                <div className="font-mono font-bold text-xl">{result.metrics.lcp}</div>
              </div>
              <div className="bg-background brutal-border p-4">
                <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted mb-1">First Contentful Paint (FCP)</div>
                <div className="font-mono font-bold text-xl">{result.metrics.fcp}</div>
              </div>
              <div className="bg-background brutal-border p-4">
                <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted mb-1">Cumulative Layout Shift (CLS)</div>
                <div className="font-mono font-bold text-xl">{result.metrics.cls}</div>
              </div>
              <div className="bg-background brutal-border p-4">
                <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted mb-1">Time to First Byte (TTFB)</div>
                <div className="font-mono font-bold text-xl">{result.metrics.ttfb}</div>
              </div>
              <div className="bg-background brutal-border p-4 sm:col-span-2">
                <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted mb-1">Max Potential First Input Delay (FID proxy)</div>
                <div className="font-mono font-bold text-xl">{result.metrics.fid}</div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {result.audits.length > 0 && (
            <div className="lg:col-span-3 bg-surface brutal-border overflow-hidden">
              <div className="bg-background border-b-2 border-border-color px-6 py-4">
                <h3 className="font-display font-bold text-xl">Top Recommendations</h3>
              </div>
              <div className="p-0">
                <ul className="divide-y-2 divide-border-color">
                  {result.audits.map((audit, i) => (
                    <li key={i} className="p-6 hover:bg-background/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className={`mt-1 shrink-0 w-3 h-3 rounded-full ${getScoreBg(audit.score * 100)}`}></div>
                        <div>
                          <h4 className="font-bold text-lg mb-2">{audit.title}</h4>
                          <p className="text-muted text-sm leading-relaxed">{audit.description.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')}</p>
                          {audit.displayValue && (
                            <div className="mt-2 inline-block bg-background brutal-border px-2 py-1 text-xs font-bold font-mono text-accent">
                              Potential savings: {audit.displayValue}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
