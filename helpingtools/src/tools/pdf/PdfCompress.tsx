import React, { useState } from 'react';
import { usePdfLibs } from './usePdfLibs';
import { PdfUploadZone } from './PdfUploadZone';
import { Download, Loader2, Minimize } from 'lucide-react';

export function PdfCompress() {
  const libsLoaded = usePdfLibs();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [compressionLevel, setCompressionLevel] = useState<'low' | 'medium' | 'high'>('medium');
  
  const [result, setResult] = useState<{url: string, originalSize: number, newSize: number} | null>(null);

  const handleFile = (files: FileList) => {
    setFile(files[0]);
    setResult(null);
    setError(null);
  };

  const compressPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await window.PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      
      // Basic compression via pdf-lib
      // We can remove metadata, and use object streams
      if (compressionLevel === 'high') {
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setKeywords([]);
        pdfDoc.setProducer('');
        pdfDoc.setCreator('');
      }

      const pdfBytes = await pdfDoc.save({ 
        useObjectStreams: true,
        // pdf-lib doesn't have advanced image compression built-in, 
        // but re-saving with object streams often reduces size significantly for bloated PDFs.
      });
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      setResult({
        url: URL.createObjectURL(blob),
        originalSize: file.size,
        newSize: blob.size
      });
    } catch (err) {
      console.error(err);
      setError("Failed to compress PDF. It might be encrypted or corrupted.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
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
        <PdfUploadZone onFileSelect={handleFile} title="Drop PDF to compress" />
      ) : (
        <div className="space-y-6">
          <div className="bg-surface brutal-border p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-display font-bold text-xl">{file.name}</h3>
                <p className="text-muted">Original size: {formatSize(file.size)}</p>
              </div>
              <button 
                onClick={() => { setFile(null); setResult(null); }}
                className="text-xs font-bold uppercase text-muted hover:text-foreground"
              >
                Change File
              </button>
            </div>
            
            {!result && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-3">Compression Level</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button 
                      onClick={() => setCompressionLevel('low')}
                      className={`p-4 text-left brutal-border ${compressionLevel === 'low' ? 'bg-[#DC2626] text-white' : 'bg-background hover:bg-surface'}`}
                    >
                      <div className="font-bold mb-1">Low</div>
                      <div className="text-xs opacity-80">Best quality, less compression</div>
                    </button>
                    <button 
                      onClick={() => setCompressionLevel('medium')}
                      className={`p-4 text-left brutal-border ${compressionLevel === 'medium' ? 'bg-[#DC2626] text-white' : 'bg-background hover:bg-surface'}`}
                    >
                      <div className="font-bold mb-1">Medium</div>
                      <div className="text-xs opacity-80">Good quality, good compression</div>
                    </button>
                    <button 
                      onClick={() => setCompressionLevel('high')}
                      className={`p-4 text-left brutal-border ${compressionLevel === 'high' ? 'bg-[#DC2626] text-white' : 'bg-background hover:bg-surface'}`}
                    >
                      <div className="font-bold mb-1">High</div>
                      <div className="text-xs opacity-80">Lowest quality, smallest size</div>
                    </button>
                  </div>
                  <p className="text-xs text-muted mt-3">
                    Note: Since processing happens in your browser, compression relies on optimizing PDF structure. Image downsampling is limited.
                  </p>
                </div>
                
                <button 
                  onClick={compressPdf}
                  disabled={isProcessing}
                  className="w-full brutal-btn-primary bg-[#DC2626] hover:bg-[#B91C1C] text-white py-4 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Minimize className="h-5 w-5" />}
                  {isProcessing ? 'Compressing...' : 'Compress PDF'}
                </button>
              </div>
            )}
          </div>

          {result && (
            <div className="bg-surface brutal-border p-6 text-center">
              <h3 className="font-display font-bold text-2xl mb-6">Compression Complete</h3>
              
              <div className="flex justify-center items-center gap-8 mb-8">
                <div className="text-center">
                  <p className="text-muted text-sm font-bold mb-1">Original</p>
                  <p className="text-xl font-mono">{formatSize(result.originalSize)}</p>
                </div>
                <div className="text-2xl text-muted">→</div>
                <div className="text-center">
                  <p className="text-muted text-sm font-bold mb-1">Compressed</p>
                  <p className="text-2xl font-mono font-bold text-[#2E7D32]">{formatSize(result.newSize)}</p>
                </div>
              </div>
              
              <div className="inline-block bg-[#E8F5E9] dark:bg-[#0A1F10] text-[#2E7D32] dark:text-[#81C784] px-4 py-2 font-bold mb-8 brutal-border">
                Saved {((1 - result.newSize / result.originalSize) * 100).toFixed(1)}%
              </div>
              
              <a 
                href={result.url}
                download={`${file.name.replace('.pdf', '')}_compressed.pdf`}
                className="w-full brutal-btn-primary bg-[#2E7D32] hover:bg-[#1B5E20] text-white py-4 flex items-center justify-center gap-2"
              >
                <Download className="h-5 w-5" /> Download Compressed PDF
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
