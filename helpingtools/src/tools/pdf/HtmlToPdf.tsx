import React, { useState, useRef } from 'react';
import { usePdfLibs } from './usePdfLibs';
import { Download, Loader2, Code, Link as LinkIcon } from 'lucide-react';

export function HtmlToPdf() {
  const libsLoaded = usePdfLibs();
  const [mode, setMode] = useState<'html' | 'url'>('html');
  const [htmlContent, setHtmlContent] = useState('<h1>Hello World</h1>\n<p>This is a sample HTML document.</p>\n<style>\n  h1 { color: #DC2626; }\n  p { font-family: sans-serif; }\n</style>');
  const [url, setUrl] = useState('');
  
  const [pageSize, setPageSize] = useState('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const renderContainerRef = useRef<HTMLDivElement>(null);

  const generatePdf = async () => {
    if (mode === 'url') {
      setError("URL conversion requires a backend server to bypass CORS restrictions. Please use the HTML Code mode instead.");
      return;
    }
    
    if (!htmlContent.trim()) {
      setError("Please enter some HTML code.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setPdfUrl(null);

    try {
      // Create a temporary container to render the HTML
      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      // Apply some base styles so it looks like a page
      container.style.width = orientation === 'portrait' ? '800px' : '1131px';
      container.style.padding = '40px';
      container.style.backgroundColor = 'white';
      container.style.color = 'black';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      document.body.appendChild(container);

      // Wait a moment for any images/fonts to load (basic delay)
      await new Promise(r => setTimeout(r, 500));

      const canvas = await window.html2canvas(container, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: pageSize
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      const blob = pdf.output('blob');
      setPdfUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError("Failed to generate PDF. Check your HTML code for errors.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!libsLoaded) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-[#DC2626]" /></div>;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {error && (
        <div className="bg-red-100 text-red-800 p-4 brutal-border font-bold">
          {error}
        </div>
      )}

      <div className="bg-surface brutal-border p-6">
        <div className="flex gap-2 mb-6 border-b-2 border-border-color pb-4">
          <button 
            onClick={() => setMode('html')}
            className={`px-4 py-2 font-bold text-sm flex items-center gap-2 ${mode === 'html' ? 'bg-[#DC2626] text-white' : 'bg-background hover:bg-surface brutal-border'}`}
          >
            <Code className="h-4 w-4" /> HTML Code
          </button>
          <button 
            onClick={() => setMode('url')}
            className={`px-4 py-2 font-bold text-sm flex items-center gap-2 ${mode === 'url' ? 'bg-[#DC2626] text-white' : 'bg-background hover:bg-surface brutal-border'}`}
          >
            <LinkIcon className="h-4 w-4" /> URL
          </button>
        </div>

        <div className="space-y-6">
          {mode === 'html' ? (
            <div>
              <label className="block text-sm font-bold mb-2">HTML Content</label>
              <textarea 
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                className="w-full h-64 brutal-border p-4 bg-background font-mono text-sm resize-y"
                placeholder="<h1>Type your HTML here...</h1>"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold mb-2">Website URL</label>
              <input 
                type="url" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full brutal-border p-3 bg-background"
                placeholder="https://example.com"
              />
              <p className="text-xs text-muted mt-2">Note: URL conversion requires a backend server due to CORS. This is a client-side only tool.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">Page Size</label>
              <select 
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value)}
                className="w-full brutal-border p-3 bg-background"
              >
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
                <option value="legal">Legal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Orientation</label>
              <select 
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as any)}
                className="w-full brutal-border p-3 bg-background"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
          </div>

          <button 
            onClick={generatePdf}
            disabled={isProcessing}
            className="w-full brutal-btn-primary bg-[#DC2626] hover:bg-[#B91C1C] text-white py-4 flex items-center justify-center gap-2"
          >
            {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Code className="h-5 w-5" />}
            {isProcessing ? 'Generating PDF...' : 'Generate PDF'}
          </button>
        </div>
      </div>

      {pdfUrl && (
        <div className="bg-surface brutal-border p-6 text-center">
          <h3 className="font-display font-bold text-2xl mb-6 text-[#2E7D32]">PDF Generated Successfully!</h3>
          
          <div className="aspect-[1/1.414] w-full max-w-md mx-auto border-2 border-border-color mb-6 bg-white shadow-lg overflow-hidden">
            <iframe src={`${pdfUrl}#toolbar=0&navpanes=0`} className="w-full h-full" title="PDF Preview" />
          </div>
          
          <a 
            href={pdfUrl}
            download="document.pdf"
            className="w-full max-w-md mx-auto brutal-btn-primary bg-[#2E7D32] hover:bg-[#1B5E20] text-white py-4 flex items-center justify-center gap-2"
          >
            <Download className="h-5 w-5" /> Download PDF
          </a>
        </div>
      )}
    </div>
  );
}
