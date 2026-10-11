import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { TOOLS } from '../data/tools';

export function NotFound() {
  const popularTools = TOOLS.filter(t => t.isPopular).slice(0, 3);

  return (
    <div className="w-full py-16 md:py-24 flex flex-col items-center justify-center px-4 bg-[#0A0F1E] text-white min-h-[80vh]">
      <div className="text-[100px] md:text-[140px] font-display font-black leading-none text-accent mb-4 brutal-shadow-lg inline-block bg-surface brutal-border px-8 text-foreground">
        404
      </div>
      <h1 className="text-4xl md:text-5xl font-display font-black mb-4">Tool Not Found</h1>
      <p className="text-lg text-white/70 max-w-md mb-12 text-center">
        We couldn't find the tool you're looking for. It might have been moved or deleted.
      </p>
      
      <div className="w-full max-w-3xl mb-12">
        <h2 className="text-xl font-display font-bold mb-6 text-center">Try our popular tools:</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {popularTools.map(tool => (
            <Link 
              key={tool.id} 
              to={`/tool/${tool.id}`}
              className="bg-surface brutal-border p-4 hover-brutal-sm group text-foreground"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 brutal-border bg-background flex items-center justify-center shrink-0">
                  <tool.icon className="h-4 w-4 text-accent" />
                </div>
                <h3 className="font-display font-bold truncate">{tool.name}</h3>
              </div>
              <p className="text-xs text-muted line-clamp-2 mb-3">{tool.description}</p>
              <div className="text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Open Tool <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Link to="/" className="brutal-btn-primary px-8 py-4 text-[13px] flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to Home
      </Link>
    </div>
  );
}
