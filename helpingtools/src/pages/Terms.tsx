import React from 'react';
import { Helmet } from 'react-helmet-async';

export function Terms() {
  return (
    <div className="w-full pb-24">
      <Helmet>
        <title>Terms of Service | HelpingTools</title>
        <meta name="description" content="Terms of Service for HelpingTools.com. Read the rules and guidelines for using our free browser-based tools." />
        <link rel="canonical" href="https://helpingtools.com/terms" />
      </Helmet>
      <div className="border-b-2 border-border-color bg-[#F5F5FF] dark:bg-[#0D0D1A] py-16 md:py-24">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight mb-6">Terms of Service</h1>
          <p className="text-xl text-muted">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
      
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-8 text-lg text-muted leading-relaxed">
          <section>
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p>By accessing and using HelpingTools.com, you accept and agree to be bound by the terms and provision of this agreement.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">2. Description of Service</h2>
            <p>HelpingTools.com provides a collection of browser-based utility tools. These tools are provided "as is" and are free to use for personal and commercial purposes.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">3. User Responsibilities</h2>
            <p>You agree to use the tools responsibly. While the tools process data locally in your browser, you are solely responsible for the content you process and the results you generate.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">4. Intellectual Property</h2>
            <p>The design, layout, and code of HelpingTools.com are owned by us. You may not copy, modify, or distribute our website's code or design without permission. However, you retain full ownership of any files or data you process using our tools.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">5. Disclaimer of Warranties</h2>
            <p>The tools are provided without any warranties, express or implied. We do not guarantee that the tools will be error-free or uninterrupted.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">6. Limitation of Liability</h2>
            <p>In no event shall HelpingTools.com be liable for any damages arising out of the use or inability to use the tools provided on the website.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">7. Modifications to Service</h2>
            <p>We reserve the right to modify or discontinue, temporarily or permanently, the service with or without notice.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
