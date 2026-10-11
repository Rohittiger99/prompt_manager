import React, { useState, useEffect } from 'react';
import { Copy, Check, Clock } from 'lucide-react';
import cronstrue from 'cronstrue';
import parser from 'cron-parser';

export function CronJobGenerator() {
  const [cron, setCron] = useState('0 3 * * *');
  const [humanReadable, setHumanReadable] = useState('');
  const [nextRuns, setNextRuns] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Split parts
  const parts = cron.split(' ');
  const minute = parts[0] || '*';
  const hour = parts[1] || '*';
  const dom = parts[2] || '*';
  const month = parts[3] || '*';
  const dow = parts[4] || '*';

  useEffect(() => {
    try {
      // Validate and get human readable
      const desc = cronstrue.toString(cron);
      setHumanReadable(desc);
      setError(null);

      // Get next 5 runs
      const interval = parser.parse(cron);
      const runs = [];
      for (let i = 0; i < 5; i++) {
        runs.push(interval.next().toString());
      }
      setNextRuns(runs);
    } catch (e: any) {
      setError(e.message || 'Invalid cron expression');
      setHumanReadable('Invalid expression');
      setNextRuns([]);
    }
  }, [cron]);

  const updatePart = (index: number, value: string) => {
    const newParts = [...parts];
    newParts[index] = value;
    // Ensure we have 5 parts
    while (newParts.length < 5) newParts.push('*');
    setCron(newParts.slice(0, 5).join(' '));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(cron);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const presets = [
    { label: 'Every minute', value: '* * * * *' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Daily at midnight', value: '0 0 * * *' },
    { label: 'Every Monday', value: '0 0 * * 1' },
    { label: 'Monthly', value: '0 0 1 * *' },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      
      {/* Output Display */}
      <div className="bg-surface brutal-border p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-accent"></div>
        <h2 className="font-bold text-sm uppercase tracking-[0.08em] text-muted mb-4">Cron Expression</h2>
        <div className="text-4xl md:text-6xl font-mono font-black tracking-widest mb-6 text-accent">
          {cron}
        </div>
        <div className={`text-xl font-bold mb-6 ${error ? 'text-red-500' : ''}`}>
          {humanReadable}
        </div>
        <div className="flex justify-center">
          <button 
            onClick={handleCopy}
            className="brutal-btn-primary px-6 py-2 flex items-center gap-2"
          >
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />} {copied ? 'Copied' : 'Copy Expression'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Builder */}
        <div className="lg:col-span-2 bg-surface brutal-border p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center border-b-2 border-border-color pb-4">
            <h3 className="font-display font-bold text-xl">Visual Builder</h3>
            <input 
              type="text" 
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              className="bg-background brutal-border px-3 py-1 font-mono text-sm outline-none focus:ring-2 focus:ring-accent w-48"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div className="flex flex-col gap-2">
              <label className="font-bold text-xs uppercase tracking-[0.08em] text-muted">Minute</label>
              <input type="text" value={minute} onChange={(e) => updatePart(0, e.target.value)} className="bg-background brutal-border p-3 font-mono text-center outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-bold text-xs uppercase tracking-[0.08em] text-muted">Hour</label>
              <input type="text" value={hour} onChange={(e) => updatePart(1, e.target.value)} className="bg-background brutal-border p-3 font-mono text-center outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-bold text-xs uppercase tracking-[0.08em] text-muted">Day (Month)</label>
              <input type="text" value={dom} onChange={(e) => updatePart(2, e.target.value)} className="bg-background brutal-border p-3 font-mono text-center outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-bold text-xs uppercase tracking-[0.08em] text-muted">Month</label>
              <input type="text" value={month} onChange={(e) => updatePart(3, e.target.value)} className="bg-background brutal-border p-3 font-mono text-center outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-bold text-xs uppercase tracking-[0.08em] text-muted">Day (Week)</label>
              <input type="text" value={dow} onChange={(e) => updatePart(4, e.target.value)} className="bg-background brutal-border p-3 font-mono text-center outline-none focus:ring-2 focus:ring-accent" />
            </div>
          </div>

          <div className="mt-4">
            <h4 className="font-bold text-sm uppercase tracking-[0.08em] text-muted mb-3">Quick Presets</h4>
            <div className="flex flex-wrap gap-2">
              {presets.map(p => (
                <button
                  key={p.label}
                  onClick={() => setCron(p.value)}
                  className="bg-background hover:bg-surface brutal-border px-3 py-2 text-xs font-bold transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Next Runs */}
        <div className="bg-surface brutal-border overflow-hidden">
          <div className="bg-background border-b-2 border-border-color px-6 py-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" />
            <h3 className="font-display font-bold text-xl">Next 5 Executions</h3>
          </div>
          <div className="p-0">
            {error ? (
              <div className="p-6 text-red-500 font-bold text-center">Cannot calculate next runs due to invalid expression.</div>
            ) : (
              <ul className="divide-y-2 divide-border-color">
                {nextRuns.map((run, i) => (
                  <li key={i} className="p-4 font-mono text-sm hover:bg-background/50 transition-colors">
                    {new Date(run).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
