import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Facebook, Twitter } from 'lucide-react';
import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/github-dark.css';

export function OgGenerator() {
  const [tags, setTags] = useState({
    title: 'My Awesome Article',
    description: 'This is a description of my awesome article that will show up when shared on social media.',
    url: 'https://example.com/article',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
    type: 'article',
    twitterCard: 'summary_large_image',
    siteName: 'My Website',
  });

  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const html = `<!-- Open Graph / Facebook -->
<meta property="og:type" content="${tags.type}">
<meta property="og:url" content="${tags.url}">
<meta property="og:title" content="${tags.title}">
<meta property="og:description" content="${tags.description}">
<meta property="og:image" content="${tags.image}">
${tags.siteName ? `<meta property="og:site_name" content="${tags.siteName}">\n` : ''}
<!-- Twitter -->
<meta property="twitter:card" content="${tags.twitterCard}">
<meta property="twitter:url" content="${tags.url}">
<meta property="twitter:title" content="${tags.title}">
<meta property="twitter:description" content="${tags.description}">
<meta property="twitter:image" content="${tags.image}">`;

    setOutput(html.trim());
  }, [tags]);

  useEffect(() => {
    if (outputRef.current && output) {
      hljs.highlightElement(outputRef.current);
    }
  }, [output]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Panel */}
        <div className="bg-surface brutal-border p-6 flex flex-col gap-4">
          <h3 className="font-display font-bold text-xl mb-2">Open Graph Details</h3>
          
          <div>
            <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted mb-1">OG Title</label>
            <input
              type="text"
              value={tags.title}
              onChange={(e) => setTags({...tags, title: e.target.value})}
              className="w-full bg-background brutal-border p-3 outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted mb-1">OG Description</label>
            <textarea
              value={tags.description}
              onChange={(e) => setTags({...tags, description: e.target.value})}
              className="w-full h-24 resize-none bg-background brutal-border p-3 outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted mb-1">OG Image URL</label>
            <input
              type="text"
              value={tags.image}
              onChange={(e) => setTags({...tags, image: e.target.value})}
              className="w-full bg-background brutal-border p-3 outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted mb-1">OG URL</label>
            <input
              type="text"
              value={tags.url}
              onChange={(e) => setTags({...tags, url: e.target.value})}
              className="w-full bg-background brutal-border p-3 outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted mb-1">OG Type</label>
              <select
                value={tags.type}
                onChange={(e) => setTags({...tags, type: e.target.value})}
                className="w-full bg-background brutal-border p-3 outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="website">Website</option>
                <option value="article">Article</option>
                <option value="profile">Profile</option>
                <option value="book">Book</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted mb-1">Twitter Card</label>
              <select
                value={tags.twitterCard}
                onChange={(e) => setTags({...tags, twitterCard: e.target.value})}
                className="w-full bg-background brutal-border p-3 outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="summary_large_image">Summary Large Image</option>
                <option value="summary">Summary</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted mb-1">Site Name (Optional)</label>
            <input
              type="text"
              value={tags.siteName}
              onChange={(e) => setTags({...tags, siteName: e.target.value})}
              className="w-full bg-background brutal-border p-3 outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {/* Preview & Output Panel */}
        <div className="flex flex-col gap-6">
          {/* Social Previews */}
          <div className="bg-surface brutal-border p-6 flex flex-col gap-6">
            
            {/* Facebook Preview */}
            <div>
              <h3 className="font-bold text-sm uppercase tracking-[0.08em] text-muted mb-4 flex items-center gap-2">
                <Facebook className="h-4 w-4" /> Facebook Preview
              </h3>
              <div className="bg-[#f0f2f5] p-4 rounded-lg font-sans">
                <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                  <div className="h-[200px] bg-gray-200 overflow-hidden">
                    {tags.image ? (
                      <img src={tags.image} alt="OG Preview" className="w-full h-full object-cover" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                    )}
                  </div>
                  <div className="p-3 bg-[#f2f3f5] border-t border-gray-200">
                    <div className="text-[12px] text-[#606770] uppercase mb-1 truncate">{new URL(tags.url || 'https://example.com').hostname}</div>
                    <div className="font-bold text-[#1d2129] text-[16px] leading-tight mb-1 truncate">{tags.title || 'Title'}</div>
                    <div className="text-[14px] text-[#606770] line-clamp-1">{tags.description || 'Description'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Twitter Preview */}
            <div>
              <h3 className="font-bold text-sm uppercase tracking-[0.08em] text-muted mb-4 flex items-center gap-2">
                <Twitter className="h-4 w-4" /> Twitter Preview
              </h3>
              <div className="bg-white p-4 rounded-lg font-sans border border-gray-200">
                <div className="rounded-2xl overflow-hidden border border-gray-200">
                  {tags.twitterCard === 'summary_large_image' ? (
                    <>
                      <div className="h-[200px] bg-gray-200 overflow-hidden border-b border-gray-200">
                        {tags.image ? (
                          <img src={tags.image} alt="Twitter Preview" className="w-full h-full object-cover" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="text-[15px] text-[#0f1419] line-clamp-1">{tags.title || 'Title'}</div>
                        <div className="text-[15px] text-[#536471] line-clamp-2 mt-1">{tags.description || 'Description'}</div>
                        <div className="text-[15px] text-[#536471] mt-1 flex items-center gap-1">
                          <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-current"><g><path d="M11.96 14.945c-.067 0-.136-.01-.203-.027-1.13-.318-2.097-.986-2.795-1.932-.832-1.125-1.176-2.508-.968-3.893s.942-2.605 2.068-3.438l3.53-2.608c2.322-1.716 5.61-1.224 7.33 1.1.83 1.127 1.175 2.51.967 3.895s-.943 2.605-2.07 3.438l-1.48 1.094c-.333.246-.804.175-1.05-.158-.246-.334-.176-.804.158-1.05l1.48-1.095c.803-.592 1.327-1.463 1.476-2.45.148-.988-.098-1.975-.69-2.778-1.225-1.656-3.572-2.01-5.23-.784l-3.53 2.608c-.802.593-1.326 1.464-1.475 2.45-.15.99.097 1.975.69 2.778.498.675 1.187 1.15 1.992 1.377.4.114.633.528.52.928-.092.33-.394.547-.722.547z"></path><path d="M7.27 22.054c-1.61 0-3.197-.735-4.225-2.125-.832-1.127-1.176-2.51-.968-3.894s.943-2.605 2.07-3.438l1.478-1.094c.334-.245.805-.175 1.05.158s.177.804-.157 1.05l-1.48 1.095c-.803.593-1.326 1.464-1.475 2.45-.148.99.097 1.975.69 2.778 1.225 1.657 3.57 2.01 5.23.785l3.528-2.608c1.658-1.225 2.01-3.57.785-5.23-.498-.674-1.187-1.15-1.992-1.376-.4-.113-.633-.527-.52-.927.112-.4.528-.63.926-.522 1.13.318 2.096.986 2.794 1.932 1.717 2.324 1.224 5.612-1.1 7.33l-3.53 2.608c-.933.693-2.023 1.026-3.105 1.026z"></path></g></svg>
                          {new URL(tags.url || 'https://example.com').hostname}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-[130px]">
                      <div className="w-[130px] bg-gray-200 shrink-0 border-r border-gray-200">
                        {tags.image ? (
                          <img src={tags.image} alt="Twitter Preview" className="w-full h-full object-cover" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                        )}
                      </div>
                      <div className="p-3 flex flex-col justify-center overflow-hidden">
                        <div className="text-[15px] text-[#0f1419] line-clamp-1">{tags.title || 'Title'}</div>
                        <div className="text-[15px] text-[#536471] line-clamp-2 mt-1">{tags.description || 'Description'}</div>
                        <div className="text-[15px] text-[#536471] mt-1 flex items-center gap-1">
                          <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-current"><g><path d="M11.96 14.945c-.067 0-.136-.01-.203-.027-1.13-.318-2.097-.986-2.795-1.932-.832-1.125-1.176-2.508-.968-3.893s.942-2.605 2.068-3.438l3.53-2.608c2.322-1.716 5.61-1.224 7.33 1.1.83 1.127 1.175 2.51.967 3.895s-.943 2.605-2.07 3.438l-1.48 1.094c-.333.246-.804.175-1.05-.158-.246-.334-.176-.804.158-1.05l1.48-1.095c.803-.592 1.327-1.463 1.476-2.45.148-.988-.098-1.975-.69-2.778-1.225-1.656-3.572-2.01-5.23-.784l-3.53 2.608c-.802.593-1.326 1.464-1.475 2.45-.15.99.097 1.975.69 2.778.498.675 1.187 1.15 1.992 1.377.4.114.633.528.52.928-.092.33-.394.547-.722.547z"></path><path d="M7.27 22.054c-1.61 0-3.197-.735-4.225-2.125-.832-1.127-1.176-2.51-.968-3.894s.943-2.605 2.07-3.438l1.478-1.094c.334-.245.805-.175 1.05.158s.177.804-.157 1.05l-1.48 1.095c-.803.593-1.326 1.464-1.475 2.45-.148.99.097 1.975.69 2.778 1.225 1.657 3.57 2.01 5.23.785l3.528-2.608c1.658-1.225 2.01-3.57.785-5.23-.498-.674-1.187-1.15-1.992-1.376-.4-.113-.633-.527-.52-.927.112-.4.528-.63.926-.522 1.13.318 2.096.986 2.794 1.932 1.717 2.324 1.224 5.612-1.1 7.33l-3.53 2.608c-.933.693-2.023 1.026-3.105 1.026z"></path></g></svg>
                          {new URL(tags.url || 'https://example.com').hostname}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Code Output */}
          <div className="flex-1 flex flex-col border-2 border-border-color bg-surface relative overflow-hidden min-h-[250px]">
            <div className="bg-background border-b-2 border-border-color px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-muted flex justify-between items-center">
              <span>Generated HTML</span>
              <button onClick={handleCopy} className="hover:text-accent flex items-center gap-1">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-[#0d1117]">
              <pre className="p-4 text-sm font-mono m-0 h-full">
                <code ref={outputRef} className="language-html bg-transparent p-0">{output}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
