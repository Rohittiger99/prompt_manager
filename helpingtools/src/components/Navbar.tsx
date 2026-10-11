import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Sun, Moon, Menu, X } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { SearchModal } from './SearchModal';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const NAV_LINKS = [
  { name: 'Image', path: '/category/image' },
  { name: 'PDF', path: '/category/pdf' },
  { name: 'Text', path: '/category/text' },
  { name: 'Developer', path: '/category/developer' },
  { name: 'Converter', path: '/category/converter' },
];

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b-2 border-border-color bg-background transition-colors duration-200">
        <div className="mx-auto flex h-20 max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center text-2xl font-black tracking-tight font-display">
              <span className="text-foreground">Helping</span>
              <span className="text-accent">Tools</span>
            </Link>
            
            <nav className="hidden lg:flex items-center gap-8">
              {NAV_LINKS.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={cn(
                      "text-[13px] font-bold uppercase tracking-[0.06em] transition-colors",
                      isActive 
                        ? "text-accent border-b-2 border-accent pb-1" 
                        : "text-muted hover:text-foreground"
                    )}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="hidden md:flex items-center gap-3 bg-surface brutal-border px-4 py-2 text-[13px] font-bold uppercase tracking-[0.06em] text-foreground hover-brutal-sm"
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
              <span className="text-accent">⌘K</span>
            </button>

            <button
              onClick={() => setIsSearchOpen(true)}
              className="md:hidden flex h-10 w-10 items-center justify-center bg-surface brutal-border text-foreground hover-brutal-sm"
            >
              <Search className="h-4 w-4" />
            </button>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex h-10 w-10 items-center justify-center bg-surface brutal-border text-foreground hover-brutal-sm"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center bg-surface brutal-border text-foreground lg:hidden hover-brutal-sm relative z-50"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu - Full Screen Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-background flex flex-col pt-24 px-6 pb-8"
          >
            <nav className="flex flex-col space-y-6 mt-12">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-5xl font-display font-black text-foreground hover:text-accent transition-colors uppercase tracking-tight"
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
