import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { MobileNav } from './MobileNav';

export function Layout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-body pb-16 md:pb-0">
      <Navbar />
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="flex-1 w-full"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <Footer />
      <MobileNav />
    </div>
  );
}
