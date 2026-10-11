import React, { useState } from 'react';
import { usePdfLibs } from './usePdfLibs';
import { PdfUploadZone } from './PdfUploadZone';
import { Download, Loader2, Scissors } from 'lucide-react';

export function PdfSplit() {
  const libsLoaded = usePdfLibs();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [splitMode, setSplitMode] = useState<'range' | 'every' | 'all'>('range');
  const [rangeInput, setRangeInput] = useState('');
  const [everyN, setEveryN] = useState(2);
  
  const [outputFiles, setOutputFiles] = useState<{name: string, url: string}[]>([]);

  const handleFile = async (files: FileList) => {
    const f = files[0];
    if (!f) return;
    
    setIsProcessing(true);
    setError(null);
    setOutputFiles([]);
    
    try {
      const arrayBuffer = await f.arrayBuffer();
      const pdfDoc = await window.PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      setPageCount(pdfDoc.getPageCount());
      setFile(f);
    } catch (err) {
      console.error(err);
      setError("Failed to read PDF. It might be encrypted or corrupted.");
    } finally {
      setIsProcessing(false);
    }
  };

  const parseRanges = (input: string, maxPages: number) => {
    const ranges: number[][] = [];
    const parts = input.split(',').map(p => p.trim()).filter(p => p);
    
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n, 10));
        if (isNaN(start) || isNaN(end) || start < 1 || end > maxPages || start > end) {
          throw new Error(`Invalid range: ${part}`);
        }
        const range = [];
        for (let i = start; i <= end; i++) range.push(i - 1); // 0-indexed
        ranges.push(range);
      } else {
        const num = parseInt(part, 10);
        if (isNaN(num) || num < 1 || num > maxPages) {
          throw new Error(`Invalid page number: ${part}`);
        }
        ranges.push([num - 1]);
      }
    }
    return ranges;
  };

  const splitPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setOutputFiles([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const sourcePdf = await window.PDFLib.PDFDocument.load(arrayBuffer);
      
      let rangesToExtract: number[][] = [];
      
      if (splitMode === 'range') {
        rangesToExtract = parseRanges(rangeInput, pageCount);
        if (rangesToExtract.length === 0) throw new Error("Please enter a valid page range.");
      } else if (splitMode === 'every') {
        if (everyN < 1) throw new Error("Number of pages must be at least 1.");
        for (let i = 0; i < pageCount; i += everyN) {
          const range = [];
          for (let j = i; j < Math.min(i + everyN, pageCount); j++) {
            range.push(j);
          }
          rangesToExtract.push(range);
        }
      } else if (splitMode === 'all') {
        for (let i = 0; i < pageCount; i++) {
          rangesToExtract.push([i]);
        }
      }

      const newFiles = [];
      for (let i = 0; i < rangesToExtract.length; i++) {
        const newPdf = await window.PDFLib.PDFDocument.create();
        const copiedPages = await newPdf.copyPages(sourcePdf, rangesToExtract[i]);
        copiedPages.forEach((page: any) => newPdf.addPage(page));
        
        const pdfBytes = await newPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        newFiles.push({
          name: `${file.name.replace('.pdf', '')}_part${i+1}.pdf`,
          url: URL.createObjectURL(blob)
        });
      }
      
      setOutputFiles(newFiles);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to split PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadZip = async () => {
    if (outputFiles.length === 0) return;
    const zip = new window.JSZip();
    
    for (const f of outputFiles) {
      const response = await fetch(f.url);
      const blob = await response.blob();
      zip.file(f.name, blob);
    }
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name.replace('.pdf', '')}_split.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
        <PdfUploadZone onFileSelect={handleFile} title="Drop PDF to split" />
      ) : (
        <div className="space-y-6">
          <div className="bg-surface brutal-border p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-display font-bold text-xl">{file.name}</h3>
                <p className="text-muted">This PDF has <strong className="text-foreground">{pageCount}</strong> pages</p>
              </div>
              <button 
                onClick={() => { setFile(null); setOutputFiles([]); }}
                className="text-xs font-bold uppercase text-muted hover:text-foreground"
              >
                Change File
              </button>
            </div>
            
            {!outputFiles.length && (
              <div className="space-y-6">
                <div className="flex gap-2 border-b-2 border-border-color pb-4">
                  <button 
                    onClick={() => setSplitMode('range')}
                    className={`px-4 py-2 font-bold text-sm ${splitMode === 'range' ? 'bg-[#DC2626] text-white' : 'bg-background hover:bg-surface brutal-border'}`}
                  >
                    By Page Range
                  </button>
                  <button 
                    onClick={() => setSplitMode('every')}
                    className={`px-4 py-2 font-bold text-sm ${splitMode === 'every' ? 'bg-[#DC2626] text-white' : 'bg-background hover:bg-surface brutal-border'}`}
                  >
                    Every N Pages
                  </button>
                  <button 
                    onClick={() => setSplitMode('all')}
                    className={`px-4 py-2 font-bold text-sm ${splitMode === 'all' ? 'bg-[#DC2626] text-white' : 'bg-background hover:bg-surface brutal-border'}`}
                  >
                    Split All
                  </button>
                </div>
                
                <div className="min-h-[100px]">
                  {splitMode === 'range' && (
                    <div>
                      <label className="block text-sm font-bold mb-2">Page Ranges (e.g., 1-3, 5, 7-10)</label>
                      <input 
                        type="text" 
                        value={rangeInput}
                        onChange={(e) => setRangeInput(e.target.value)}
                        placeholder="1-3, 5, 7-10"
                        className="w-full brutal-border p-3 bg-background"
                      />
                      <p className="text-xs text-muted mt-2">Creates one PDF file for each range group.</p>
                    </div>
                  )}
                  
                  {splitMode === 'every' && (
                    <div>
                      <label className="block text-sm font-bold mb-2">Split every N pages</label>
                      <input 
                        type="number" 
                        min="1" max={pageCount}
                        value={everyN}
                        onChange={(e) => setEveryN(parseInt(e.target.value) || 1)}
                        className="w-full brutal-border p-3 bg-background"
                      />
                      <p className="text-xs text-muted mt-2">Splits the document into chunks of {everyN} pages.</p>
                    </div>
                  )}
                  
                  {splitMode === 'all' && (
                    <div className="p-4 bg-background brutal-border flex items-center gap-3">
                      <Scissors className="h-5 w-5 text-[#DC2626]" />
                      <p className="font-bold">This will create {pageCount} separate PDF files.</p>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={splitPdf}
                  disabled={isProcessing || (splitMode === 'range' && !rangeInput)}
                  className="w-full brutal-btn-primary bg-[#DC2626] hover:bg-[#B91C1C] text-white py-4 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Scissors className="h-5 w-5" />}
                  {isProcessing ? 'Processing...' : 'Split PDF'}
                </button>
              </div>
            )}
          </div>

          {outputFiles.length > 0 && (
            <div className="bg-surface brutal-border p-6">
              <h3 className="font-display font-bold text-xl mb-4">Split Complete</h3>
              
              <div className="max-h-60 overflow-y-auto mb-6 space-y-2 border-2 border-border-color p-2 bg-background">
                {outputFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2 hover:bg-surface">
                    <span className="font-mono text-sm">{f.name}</span>
                    <a href={f.url} download={f.name} className="text-[#DC2626] hover:underline text-sm font-bold">Download</a>
                  </div>
                ))}
              </div>
              
              {outputFiles.length > 1 ? (
                <button 
                  onClick={downloadZip}
                  className="w-full brutal-btn-primary bg-[#2E7D32] hover:bg-[#1B5E20] text-white py-4 flex items-center justify-center gap-2"
                >
                  <Download className="h-5 w-5" /> Download All as ZIP
                </button>
              ) : (
                <a 
                  href={outputFiles[0].url}
                  download={outputFiles[0].name}
                  className="w-full brutal-btn-primary bg-[#2E7D32] hover:bg-[#1B5E20] text-white py-4 flex items-center justify-center gap-2 text-center"
                >
                  <Download className="h-5 w-5" /> Download PDF
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
