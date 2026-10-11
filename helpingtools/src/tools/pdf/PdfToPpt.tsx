import React, { useState } from 'react';
import { usePdfLibs } from './usePdfLibs';
import { PdfUploadZone } from './PdfUploadZone';
import { Download, Loader2, Presentation, Copy, Check } from 'lucide-react';

export function PdfToPpt() {
  const libsLoaded = usePdfLibs();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [slidesData, setSlidesData] = useState<{page: number, text: string}[]>([]);
  const [copied, setCopied] = useState(false);

  const handleFile = (files: FileList) => {
    setFile(files[0]);
    setSlidesData([]);
    setError(null);
  };

  const extractSlides = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
      
      const numPages = pdf.numPages;
      const extractedSlides = [];
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Group text by Y coordinate roughly to form lines
        const items = textContent.items;
        items.sort((a: any, b: any) => {
          const yDiff = b.transform[5] - a.transform[5];
          if (Math.abs(yDiff) > 5) return yDiff;
          return a.transform[4] - b.transform[4];
        });
        
        let pageText = '';
        let currentRowY = items.length > 0 ? items[0].transform[5] : 0;
        let currentLine = '';
        
        for (const item of items) {
          if (Math.abs(item.transform[5] - currentRowY) > 5) {
            pageText += currentLine.trim() + '\n';
            currentLine = item.str;
            currentRowY = item.transform[5];
          } else {
            currentLine += ' ' + item.str;
          }
        }
        if (currentLine) pageText += currentLine.trim() + '\n';
        
        extractedSlides.push({
          page: i,
          text: pageText.trim()
        });
        
        setProgress(Math.round((i / numPages) * 100));
      }
      
      if (extractedSlides.every(s => !s.text)) {
        setError("No text found. This might be a scanned PDF without a text layer.");
      }
      
      setSlidesData(extractedSlides);
    } catch (err) {
      console.error(err);
      setError("Failed to extract data. The PDF might be encrypted or corrupted.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getFormattedText = () => {
    return slidesData.map(s => `--- Slide ${s.page} ---\n${s.text}\n`).join('\n');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getFormattedText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = () => {
    const blob = new Blob([getFormattedText()], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name.replace('.pdf', '')}_slides.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

      {!file ? (
        <PdfUploadZone onFileSelect={handleFile} title="Drop PDF to extract slides" />
      ) : (
        <div className="space-y-6">
          <div className="bg-surface brutal-border p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display font-bold text-xl">{file.name}</h3>
              <button 
                onClick={() => { setFile(null); setSlidesData([]); }}
                className="text-xs font-bold uppercase text-muted hover:text-foreground"
              >
                Change File
              </button>
            </div>
            
            <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 brutal-border text-sm mb-6">
              <strong>⚠ Note:</strong> Full PDF-to-PPTX conversion requires a backend server. This tool extracts text content per slide. For full conversion with layout preservation, consider desktop tools like LibreOffice.
            </div>
            
            {slidesData.length === 0 && (
              <button 
                onClick={extractSlides}
                disabled={isProcessing}
                className="w-full brutal-btn-primary bg-[#DC2626] hover:bg-[#B91C1C] text-white py-4 flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Presentation className="h-5 w-5" />}
                {isProcessing ? `Extracting... ${progress}%` : 'Extract Slide Text'}
              </button>
            )}
          </div>

          {slidesData.length > 0 && (
            <div className="bg-surface brutal-border p-6">
              <div className="flex justify-between items-center mb-6 border-b-2 border-border-color pb-4">
                <h3 className="font-display font-bold text-xl">Extracted Slides</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={copyToClipboard}
                    className="brutal-btn-secondary px-4 py-2 text-sm flex items-center gap-2"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied!' : 'Copy All'}
                  </button>
                  <button 
                    onClick={downloadTxt}
                    className="brutal-btn-primary bg-[#2E7D32] hover:bg-[#1B5E20] text-white px-4 py-2 text-sm flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" /> Download .txt
                  </button>
                </div>
              </div>
              
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                {slidesData.map((slide) => (
                  <div key={slide.page} className="bg-background brutal-border p-4">
                    <h4 className="font-bold text-[#DC2626] mb-2 border-b border-border-color pb-2">Slide {slide.page}</h4>
                    <pre className="whitespace-pre-wrap font-mono text-sm text-muted">
                      {slide.text || <span className="italic opacity-50">[No text found on this slide]</span>}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
