import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Shield, Zap, Gift, ArrowRight } from 'lucide-react';

export function About() {
  return (
    <div className="w-full pb-24">
      <Helmet>
        <title>About Us | HelpingTools</title>
        <meta name="description" content="Learn about HelpingTools.com, our mission to provide fast, free, and private browser-based tools." />
        <link rel="canonical" href="https://helpingtools.com/about" />
      </Helmet>
      <div className="border-b-2 border-border-color bg-[#FDF5FF] dark:bg-[#1A0D1A] py-16 md:py-24">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight mb-6">About Us</h1>
          <p className="text-xl text-muted">Building the best browser-based tools for everyone.</p>
        </div>
      </div>
      
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        <section>
          <h2 className="text-3xl font-display font-black mb-6">Our Mission</h2>
          <p className="text-lg text-muted leading-relaxed mb-6">
            At HelpingTools.com, we believe that utility tools should be fast, free, and most importantly, private. 
            Too many websites require you to upload your sensitive documents to their servers just to convert a PDF or resize an image.
          </p>
          <p className="text-lg text-muted leading-relaxed">
            We built this platform to change that. Every single tool on our website runs entirely in your web browser. 
            Your files never leave your device.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-display font-black mb-8">Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="brutal-border bg-surface p-6">
              <div className="h-12 w-12 brutal-border bg-accent text-white flex items-center justify-center mb-4">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-display font-bold mb-2">Privacy First</h3>
              <p className="text-muted text-sm">Zero server uploads. Your data stays on your device, always.</p>
            </div>
            <div className="brutal-border bg-surface p-6">
              <div className="h-12 w-12 brutal-border bg-accent text-white flex items-center justify-center mb-4">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-display font-bold mb-2">Lightning Fast</h3>
              <p className="text-muted text-sm">No waiting for uploads or downloads. Processing is instant.</p>
            </div>
            <div className="brutal-border bg-surface p-6">
              <div className="h-12 w-12 brutal-border bg-accent text-white flex items-center justify-center mb-4">
                <Gift className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-display font-bold mb-2">Always Free</h3>
              <p className="text-muted text-sm">No paywalls, no premium tiers, no hidden fees.</p>
            </div>
          </div>
        </section>

        <section className="brutal-border bg-[#FFF9F5] dark:bg-[#1A110D] p-8 md:p-12 text-center">
          <h2 className="text-3xl font-display font-black mb-4">Ready to get started?</h2>
          <p className="text-lg text-muted mb-8 max-w-md mx-auto">
            Explore our collection of 70+ free tools and see the difference for yourself.
          </p>
          <Link to="/" className="brutal-btn-primary px-8 py-4 text-[13px] inline-flex items-center gap-2">
            Explore Tools <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}
