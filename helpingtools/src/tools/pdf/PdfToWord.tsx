import React, { useState } from 'react';
import { usePdfLibs } from './usePdfLibs';
import { PdfUploadZone } from './PdfUploadZone';
import { Download, Loader2, FileText, Copy, Check } from 'lucide-react';

export function PdfToWord() {
  const libsLoaded = usePdfLibs();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleFile = (files: FileList) => {
    setFile(files[0]);
    setExtractedText('');
    setError(null);
  };

  const extractText = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
      
      let fullText = '';
      const numPages = pdf.numPages;
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        
        fullText += `--- Page ${i} ---\n\n${pageText}\n\n`;
        setProgress(Math.round((i / numPages) * 100));
      }
      
      if (!fullText.trim().replace(/--- Page \d+ ---/g, '')) {
        setError("No text found. This might be a scanned PDF without a text layer.");
      }
      
      setExtractedText(fullText);
    } catch (err) {
      console.error(err);
      setError("Failed to extract text. The PDF might be encrypted or corrupted.");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = () => {
    const blob = new Blob([extractedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name.replace('.pdf', '')}_extracted.txt`;
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
        <PdfUploadZone onFileSelect={handleFile} title="Drop PDF to extract text" />
      ) : (
        <div className="space-y-6">
          <div className="bg-surface brutal-border p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display font-bold text-xl">{file.name}</h3>
              <button 
                onClick={() => { setFile(null); setExtractedText(''); }}
                className="text-xs font-bold uppercase text-muted hover:text-foreground"
              >
                Change File
              </button>
            </div>
            
            <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 brutal-border text-sm mb-6">
              <strong>⚠ Note:</strong> This tool extracts text only. Scanned PDFs with no text layer may show empty results. Formatting (tables, columns) may not be perfectly preserved.
            </div>
            
            {!extractedText && (
              <button 
                onClick={extractText}
                disabled={isProcessing}
                className="w-full brutal-btn-primary bg-[#DC2626] hover:bg-[#B91C1C] text-white py-4 flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
                {isProcessing ? `Extracting... ${progress}%` : 'Extract Text'}
              </button>
            )}
          </div>

          {extractedText && (
            <div className="bg-surface brutal-border p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-bold text-xl">Extracted Text</h3>
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
              
              <textarea 
                value={extractedText}
                readOnly
                className="w-full h-96 brutal-border p-4 bg-background font-mono text-sm resize-y"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
