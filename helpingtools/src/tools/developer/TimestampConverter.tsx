import React, { useState, useEffect } from 'react';
import { Copy, Check, Clock } from 'lucide-react';

export function TimestampConverter() {
  const [unixInput, setUnixInput] = useState(Math.floor(Date.now() / 1000).toString());
  const [dateInput, setDateInput] = useState(new Date().toISOString().slice(0, 16));
  const [currentUnix, setCurrentUnix] = useState(Math.floor(Date.now() / 1000));
  const [copied, setCopied] = useState<string | null>(null);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentUnix(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync from Unix to Date
  useEffect(() => {
    if (!unixInput) return;
    const num = parseInt(unixInput, 10);
    if (isNaN(num)) return;
    
    // Auto-detect ms vs seconds
    const isMs = unixInput.length > 11;
    const date = new Date(isMs ? num : num * 1000);
    
    if (!isNaN(date.getTime())) {
      // Format to YYYY-MM-DDThh:mm
      const tzOffset = date.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
      setDateInput(localISOTime);
    }
  }, [unixInput]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateInput(e.target.value);
    const date = new Date(e.target.value);
    if (!isNaN(date.getTime())) {
      setUnixInput(Math.floor(date.getTime() / 1000).toString());
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getRelativeTime = (timestamp: number) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const daysDifference = Math.round((timestamp - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (Math.abs(daysDifference) < 1) {
      const hoursDifference = Math.round((timestamp - Date.now()) / (1000 * 60 * 60));
      if (Math.abs(hoursDifference) < 1) {
        const minutesDifference = Math.round((timestamp - Date.now()) / (1000 * 60));
        return rtf.format(minutesDifference, 'minute');
      }
      return rtf.format(hoursDifference, 'hour');
    }
    return rtf.format(daysDifference, 'day');
  };

  const num = parseInt(unixInput, 10);
  const isMs = unixInput.length > 11;
  const activeDate = new Date(isNaN(num) ? Date.now() : (isMs ? num : num * 1000));
  
  const formats = [
    { id: 'utc', label: 'UTC Time', value: activeDate.toUTCString() },
    { id: 'local', label: 'Local Time', value: activeDate.toString() },
    { id: 'iso', label: 'ISO 8601', value: activeDate.toISOString() },
    { id: 'relative', label: 'Relative', value: getRelativeTime(activeDate.getTime()) },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="bg-surface brutal-border p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-accent" />
          <h3 className="font-display font-bold text-xl">Current Epoch Time</h3>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-3xl font-bold">{currentUnix}</span>
          <button 
            onClick={() => setUnixInput(currentUnix.toString())}
            className="brutal-btn-secondary px-4 py-2 text-xs"
          >
            Use Current
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface brutal-border p-6">
          <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted mb-2">Unix Timestamp</label>
          <input
            type="text"
            value={unixInput}
            onChange={(e) => setUnixInput(e.target.value)}
            placeholder="e.g. 1712496000"
            className="w-full bg-background brutal-border p-4 text-xl font-mono outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="mt-2 text-xs text-muted font-bold">
            Supports seconds and milliseconds
          </div>
        </div>

        <div className="bg-surface brutal-border p-6">
          <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted mb-2">Human Date & Time</label>
          <input
            type="datetime-local"
            value={dateInput}
            onChange={handleDateChange}
            className="w-full bg-background brutal-border p-4 text-xl outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="mt-2 text-xs text-muted font-bold">
            Local timezone
          </div>
        </div>
      </div>

      <div className="bg-surface brutal-border overflow-hidden">
        <div className="bg-background border-b-2 border-border-color px-6 py-4">
          <h3 className="font-display font-bold text-xl">Conversions</h3>
        </div>
        <div className="p-6 space-y-4">
          {formats.map(f => (
            <div key={f.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background brutal-border p-4">
              <div className="w-32 shrink-0 font-bold text-sm uppercase tracking-[0.08em] text-muted">{f.label}</div>
              <div className="flex-1 font-mono text-lg break-all">{f.value}</div>
              <button 
                onClick={() => handleCopy(f.value, f.id)}
                className="brutal-btn-secondary px-3 py-2 text-[10px] flex items-center gap-1 shrink-0"
              >
                {copied === f.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
