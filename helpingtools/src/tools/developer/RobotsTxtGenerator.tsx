import React, { useState, useEffect } from 'react';
import { Copy, Check, Download, Plus, Trash2 } from 'lucide-react';

type Rule = {
  type: 'Allow' | 'Disallow';
  path: string;
};

type AgentGroup = {
  userAgent: string;
  rules: Rule[];
  crawlDelay?: string;
};

export function RobotsTxtGenerator() {
  const [mode, setMode] = useState<'allow' | 'block' | 'custom'>('custom');
  const [groups, setGroups] = useState<AgentGroup[]>([
    { userAgent: '*', rules: [{ type: 'Disallow', path: '/cgi-bin/' }, { type: 'Disallow', path: '/admin/' }] }
  ]);
  const [sitemap, setSitemap] = useState('https://example.com/sitemap.xml');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let txt = '';
    if (mode === 'allow') {
      txt = 'User-agent: *\nDisallow:';
    } else if (mode === 'block') {
      txt = 'User-agent: *\nDisallow: /';
    } else {
      groups.forEach(group => {
        if (!group.userAgent) return;
        txt += `User-agent: ${group.userAgent}\n`;
        if (group.crawlDelay) {
          txt += `Crawl-delay: ${group.crawlDelay}\n`;
        }
        group.rules.forEach(rule => {
          if (rule.path) {
            txt += `${rule.type}: ${rule.path}\n`;
          }
        });
        txt += '\n';
      });
    }

    if (sitemap) {
      txt += `\nSitemap: ${sitemap}`;
    }

    setOutput(txt.trim());
  }, [mode, groups, sitemap]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'robots.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const addGroup = () => {
    setGroups([...groups, { userAgent: 'Googlebot', rules: [{ type: 'Disallow', path: '' }] }]);
  };

  const removeGroup = (index: number) => {
    const newGroups = [...groups];
    newGroups.splice(index, 1);
    setGroups(newGroups);
  };

  const updateGroup = (index: number, field: keyof AgentGroup, value: any) => {
    const newGroups = [...groups];
    newGroups[index] = { ...newGroups[index], [field]: value };
    setGroups(newGroups);
  };

  const addRule = (groupIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex].rules.push({ type: 'Disallow', path: '' });
    setGroups(newGroups);
  };

  const updateRule = (groupIndex: number, ruleIndex: number, field: keyof Rule, value: string) => {
    const newGroups = [...groups];
    newGroups[groupIndex].rules[ruleIndex] = { ...newGroups[groupIndex].rules[ruleIndex], [field]: value };
    setGroups(newGroups);
  };

  const removeRule = (groupIndex: number, ruleIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex].rules.splice(ruleIndex, 1);
    setGroups(newGroups);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Panel */}
        <div className="bg-surface brutal-border p-6 flex flex-col gap-6">
          <div>
            <h3 className="font-display font-bold text-xl mb-4">Preset Templates</h3>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="mode" checked={mode === 'allow'} onChange={() => setMode('allow')} className="w-4 h-4 accent-accent" />
                <span className="font-bold">Allow all</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="mode" checked={mode === 'block'} onChange={() => setMode('block')} className="w-4 h-4 accent-accent" />
                <span className="font-bold">Block all</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="mode" checked={mode === 'custom'} onChange={() => setMode('custom')} className="w-4 h-4 accent-accent" />
                <span className="font-bold">Custom</span>
              </label>
            </div>
          </div>

          {mode === 'custom' && (
            <div className="space-y-6 border-t-2 border-border-color pt-6">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-bold text-xl">Rules</h3>
                <button onClick={addGroup} className="brutal-btn-secondary px-3 py-1 text-[10px] flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Add User-agent
                </button>
              </div>

              {groups.map((group, gIndex) => (
                <div key={gIndex} className="bg-background brutal-border p-4 relative">
                  {groups.length > 1 && (
                    <button onClick={() => removeGroup(gIndex)} className="absolute top-2 right-2 text-muted hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block font-bold text-xs uppercase tracking-[0.08em] text-muted mb-1">User-agent</label>
                      <input
                        type="text"
                        value={group.userAgent}
                        onChange={(e) => updateGroup(gIndex, 'userAgent', e.target.value)}
                        placeholder="* or Googlebot"
                        className="w-full bg-surface brutal-border p-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-xs uppercase tracking-[0.08em] text-muted mb-1">Crawl-delay (seconds)</label>
                      <input
                        type="number"
                        value={group.crawlDelay || ''}
                        onChange={(e) => updateGroup(gIndex, 'crawlDelay', e.target.value)}
                        placeholder="Optional"
                        className="w-full bg-surface brutal-border p-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block font-bold text-xs uppercase tracking-[0.08em] text-muted">Paths</label>
                    {group.rules.map((rule, rIndex) => (
                      <div key={rIndex} className="flex gap-2">
                        <select
                          value={rule.type}
                          onChange={(e) => updateRule(gIndex, rIndex, 'type', e.target.value as any)}
                          className="bg-surface brutal-border p-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                        >
                          <option value="Disallow">Disallow</option>
                          <option value="Allow">Allow</option>
                        </select>
                        <input
                          type="text"
                          value={rule.path}
                          onChange={(e) => updateRule(gIndex, rIndex, 'path', e.target.value)}
                          placeholder="/path/"
                          className="flex-1 bg-surface brutal-border p-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                        />
                        <button onClick={() => removeRule(gIndex, rIndex)} className="p-2 text-muted hover:text-red-500 brutal-border bg-surface">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => addRule(gIndex)} className="text-xs font-bold text-accent hover:underline flex items-center gap-1 mt-2">
                      <Plus className="h-3 w-3" /> Add Path
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t-2 border-border-color pt-6">
            <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted mb-1">Sitemap URL (Optional)</label>
            <input
              type="text"
              value={sitemap}
              onChange={(e) => setSitemap(e.target.value)}
              placeholder="https://example.com/sitemap.xml"
              className="w-full bg-background brutal-border p-3 outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {/* Output Panel */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="font-bold text-sm uppercase tracking-[0.08em] text-muted">Generated robots.txt</label>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="brutal-btn-secondary px-3 py-1 text-[10px] flex items-center gap-1">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy
              </button>
              <button onClick={handleDownload} className="brutal-btn-secondary px-3 py-1 text-[10px] flex items-center gap-1">
                <Download className="h-3 w-3" /> Download
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={output}
            className="w-full h-full min-h-[400px] resize-none bg-background brutal-border p-4 text-sm font-mono outline-none whitespace-pre"
          />
        </div>
      </div>
    </div>
  );
}
