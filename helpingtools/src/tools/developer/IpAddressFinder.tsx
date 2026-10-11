import React, { useState, useEffect } from 'react';
import { Copy, Check, MapPin, Globe, Network, Server, Clock } from 'lucide-react';

type IpInfo = {
  ip: string;
  version: string;
  city: string;
  region: string;
  country_name: string;
  country_code: string;
  org: string;
  timezone: string;
};

export function IpAddressFinder() {
  const [ipInfo, setIpInfo] = useState<IpInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchIp = async () => {
      try {
        setLoading(true);
        // Fetch IP first
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        
        // Fetch details
        const detailsRes = await fetch(`https://ipapi.co/${ipData.ip}/json/`);
        const detailsData = await detailsRes.json();
        
        if (detailsData.error) {
          throw new Error(detailsData.reason || 'Failed to fetch IP details');
        }

        setIpInfo(detailsData);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch IP information. Please try again later or disable your adblocker.');
      } finally {
        setLoading(false);
      }
    };

    fetchIp();
  }, []);

  const handleCopy = () => {
    if (ipInfo?.ip) {
      navigator.clipboard.writeText(ipInfo.ip);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-muted uppercase tracking-[0.08em]">Detecting your IP address...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-500 p-6 text-red-700 dark:text-red-400 font-bold text-center">
        {error}
      </div>
    );
  }

  if (!ipInfo) return null;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Main IP Card */}
      <div className="bg-surface brutal-border p-8 md:p-12 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-accent"></div>
        <h2 className="font-bold text-sm uppercase tracking-[0.08em] text-muted mb-4">Your Public IP Address</h2>
        <div className="text-4xl md:text-6xl font-display font-black tracking-tight mb-6 break-all">
          {ipInfo.ip}
        </div>
        <div className="flex justify-center gap-4">
          <span className="brutal-border bg-background px-3 py-1 text-xs font-bold uppercase tracking-[0.08em]">
            {ipInfo.version}
          </span>
          <button 
            onClick={handleCopy}
            className="brutal-btn-secondary px-4 py-1 text-xs flex items-center gap-2"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy IP'}
          </button>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Location Card */}
        <div className="bg-surface brutal-border p-6">
          <h3 className="font-display font-bold text-xl mb-6 flex items-center gap-2 border-b-2 border-border-color pb-4">
            <MapPin className="h-5 w-5 text-accent" /> Location Details
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted font-bold text-sm uppercase tracking-[0.08em]">Country</span>
              <span className="font-bold text-lg flex items-center gap-2">
                <img loading="lazy" src={`https://flagcdn.com/24x18/${ipInfo.country_code.toLowerCase()}.png`} alt={ipInfo.country_name} className="brutal-border" />
                {ipInfo.country_name}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted font-bold text-sm uppercase tracking-[0.08em]">Region</span>
              <span className="font-bold">{ipInfo.region}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted font-bold text-sm uppercase tracking-[0.08em]">City</span>
              <span className="font-bold">{ipInfo.city}</span>
            </div>
          </div>
        </div>

        {/* Network Card */}
        <div className="bg-surface brutal-border p-6">
          <h3 className="font-display font-bold text-xl mb-6 flex items-center gap-2 border-b-2 border-border-color pb-4">
            <Network className="h-5 w-5 text-accent" /> Network Details
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-start gap-4">
              <span className="text-muted font-bold text-sm uppercase tracking-[0.08em] flex items-center gap-1 shrink-0">
                <Server className="h-4 w-4" /> ISP / Org
              </span>
              <span className="font-bold text-right break-words">{ipInfo.org}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted font-bold text-sm uppercase tracking-[0.08em] flex items-center gap-1">
                <Clock className="h-4 w-4" /> Timezone
              </span>
              <span className="font-bold">{ipInfo.timezone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="bg-surface brutal-border p-8 text-center flex flex-col items-center justify-center min-h-[200px] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CgkJPHBhdGggZD0iTTAgMGg0MHY0MEgwVjB6bTIwIDIwYzUuNSAwIDEwLTQuNSAxMC0xMFMyNS41IDAgMjAgMCAxMCA0LjUgMTAgMTBzNC41IDEwIDEwIDEwem0wIDE1YzguMyAwIDE1LTYuNyAxNS0xNVMyOC4zIDUgMjAgNSA1IDExLjcgNSAyMHM2LjcgMTUgMTUgMTV6IiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMDUiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPgoJPC9zdmc+')]">
        <div className="bg-background brutal-border p-4 inline-flex flex-col items-center gap-2 shadow-[4px_4px_0px_#0A0A0A]">
          <Globe className="h-8 w-8 text-accent" />
          <div className="font-bold text-lg">{ipInfo.city}, {ipInfo.country_name}</div>
          <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Approximate Location</div>
        </div>
      </div>
    </div>
  );
}
