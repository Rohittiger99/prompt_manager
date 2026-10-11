import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Image, FileText, Type, Code } from 'lucide-react';

export function MobileNav() {
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Image', path: '/category/image', icon: Image },
    { name: 'PDF', path: '/category/pdf', icon: FileText },
    { name: 'Text', path: '/category/text', icon: Type },
    { name: 'Dev', path: '/category/developer', icon: Code },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A0F1E] border-t-2 border-border-color flex justify-around items-center h-16 px-2 pb-safe">
      {navItems.map((item) => {
        const isActive = item.path === '/' 
          ? location.pathname === '/' 
          : location.pathname.startsWith(item.path);

        return (
          <Link
            key={item.name}
            to={item.path}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              isActive ? 'text-accent' : 'text-muted hover:text-white'
            }`}
          >
            <item.icon className={`h-5 w-5 ${isActive ? 'fill-accent/20' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
