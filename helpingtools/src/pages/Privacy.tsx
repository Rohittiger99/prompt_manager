import React from 'react';
import { Helmet } from 'react-helmet-async';

export function Privacy() {
  return (
    <div className="w-full pb-24">
      <Helmet>
        <title>Privacy Policy | HelpingTools</title>
        <meta name="description" content="Privacy Policy for HelpingTools.com. Learn how we protect your data by processing everything locally in your browser." />
        <link rel="canonical" href="https://helpingtools.com/privacy" />
      </Helmet>
      <div className="border-b-2 border-border-color bg-[#FFF9F5] dark:bg-[#1A110D] py-16 md:py-24">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight mb-6">Privacy Policy</h1>
          <p className="text-xl text-muted">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
      
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-8 text-lg text-muted leading-relaxed">
          <section>
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">1. Introduction</h2>
            <p>At HelpingTools.com, your privacy is our top priority. We have built our tools with a "privacy-first" approach, meaning that your data stays on your device.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">2. Data Processing</h2>
            <p>All file processing, conversions, and manipulations happen entirely within your web browser. We do not upload your files, images, or text to any external servers.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">3. Information Collection</h2>
            <p>We do not require you to create an account, and we do not collect personally identifiable information (PII). We may use basic analytics to understand how our website is used, but this data is anonymized.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">4. Cookies</h2>
            <p>We use minimal cookies necessary for the functioning of the website (such as remembering your dark/light mode preference). We do not use tracking or advertising cookies.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">5. Third-Party Services</h2>
            <p>Since all processing is local, we do not share your files with any third-party services. Our website is hosted on secure infrastructure, but your data never leaves your browser.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">6. Changes to This Policy</h2>
            <p>We may update our Privacy Policy from time to time. Any changes will be reflected on this page.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">7. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
