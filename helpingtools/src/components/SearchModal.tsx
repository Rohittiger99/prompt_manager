import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import { TOOLS } from '../data/tools';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const fuse = new Fuse(TOOLS, {
    keys: ['name', 'description', 'category'],
    threshold: 0.3,
  });

  const results = query ? fuse.search(query).map(result => result.item) : TOOLS;

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(`/tool/${results[selectedIndex].id}`);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
    setQuery('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-[10%] z-50 w-full max-w-2xl -translate-x-1/2 px-4 sm:px-0"
          >
            <div className="bg-surface brutal-border brutal-shadow-lg flex flex-col max-h-[80vh]">
              <div className="flex items-center border-b-2 border-border-color px-4 py-4 shrink-0">
                <Search className="h-6 w-6 text-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search 70+ tools..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent px-4 py-2 text-xl font-display font-bold text-foreground outline-none placeholder:text-muted"
                />
                <button onClick={onClose} className="p-2 brutal-border hover-brutal-sm bg-surface text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="overflow-y-auto p-4 flex-1">
                {results.length > 0 ? (
                  <div className="space-y-2">
                    {results.map((tool, index) => {
                      const isSelected = index === selectedIndex;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => handleSelect(`/tool/${tool.id}`)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`flex w-full items-center gap-4 brutal-border p-3 text-left transition-colors group bg-surface ${
                            isSelected ? 'bg-accent text-white border-accent' : 'hover:bg-background'
                          }`}
                        >
                          <div className={`flex h-12 w-12 items-center justify-center brutal-border shrink-0 ${
                            isSelected ? 'bg-white text-accent' : 'bg-background'
                          }`}>
                            <tool.icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-display font-bold text-lg truncate">{tool.name}</div>
                            <div className={`text-[11px] font-bold uppercase tracking-[0.08em] truncate ${
                              isSelected ? 'text-white/80' : 'text-muted'
                            }`}>{tool.category} Tools</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-16 text-center text-muted font-display text-xl font-bold">
                    No tools found for "{query}"
                  </div>
                )}
              </div>
              
              <div className="border-t-2 border-border-color bg-background px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-2">
                    <kbd className="brutal-border bg-surface px-2 py-1 font-mono">↑</kbd>
                    <kbd className="brutal-border bg-surface px-2 py-1 font-mono">↓</kbd> to navigate
                  </span>
                  <span className="flex items-center gap-2">
                    <kbd className="brutal-border bg-surface px-2 py-1 font-mono">↵</kbd> to select
                  </span>
                </div>
                <span className="flex items-center gap-2">
                  <kbd className="brutal-border bg-surface px-2 py-1 font-mono">ESC</kbd> to close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
