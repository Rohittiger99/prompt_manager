import React from 'react';
import { Link } from 'react-router-dom';

const CATEGORIES = [
  { name: 'Image Tools', path: '/category/image' },
  { name: 'PDF Tools', path: '/category/pdf' },
  { name: 'Text Tools', path: '/category/text' },
  { name: 'Developer Tools', path: '/category/developer' },
  { name: 'Converters', path: '/category/converter' },
];

const LEGAL = [
  { name: 'About Us', path: '/about' },
  { name: 'Privacy Policy', path: '/privacy' },
  { name: 'Terms of Service', path: '/terms' },
];

export function Footer() {
  return (
    <footer className="bg-[#0A0A0A] text-[#FFFDF7] border-t-2 border-[#FFFDF7] py-20 mt-auto">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4 lg:gap-16">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="inline-flex items-center text-3xl font-black tracking-tight font-display mb-6">
              <span className="text-[#FFFDF7]">Helping</span>
              <span className="text-[#FF4D00]">Tools</span>
            </Link>
            <h2 className="text-2xl md:text-4xl font-display font-bold leading-tight mb-8">
              Every tool you need.<br />
              Right in your browser.
            </h2>
          </div>
          
          <div>
            <h3 className="font-body font-bold text-[11px] uppercase tracking-[0.08em] text-[#A0A09A] mb-6">Categories</h3>
            <ul className="space-y-4">
              {CATEGORIES.map((item) => (
                <li key={item.name}>
                  <Link to={item.path} className="text-[13px] font-bold uppercase tracking-[0.06em] hover:text-[#FF4D00] transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-body font-bold text-[11px] uppercase tracking-[0.08em] text-[#A0A09A] mb-6">Legal</h3>
            <ul className="space-y-4">
              {LEGAL.map((item) => (
                <li key={item.name}>
                  <Link to={item.path} className="text-[13px] font-bold uppercase tracking-[0.06em] hover:text-[#FF4D00] transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="mt-20 pt-8 border-t border-[#333333] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[#A0A09A] font-body">
            Made with humans in mind. Zero uploads, zero tracking.
          </p>
          <p className="text-sm text-[#A0A09A] font-body">
            &copy; {new Date().getFullYear()} HelpingTools.com
          </p>
        </div>
      </div>
    </footer>
  );
}
