import React, { useState, useRef } from 'react';
import { usePdfLibs } from './usePdfLibs';
import { PdfUploadZone } from './PdfUploadZone';
import { Download, Loader2, Image as ImageIcon } from 'lucide-react';

export function PdfToJpg() {
  const libsLoaded = usePdfLibs();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const [resolution, setResolution] = useState(1.5); // scale factor
  const [images, setImages] = useState<{url: string, page: number}[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = (files: FileList) => {
    setFile(files[0]);
    setImages([]);
    setError(null);
  };

  const convertToImages = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setImages([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
      const numPages = pdf.numPages;
      
      const newImages = [];
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not found");
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context not found");

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: resolution });
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Fill white background (PDFs are transparent by default)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        newImages.push({ url: dataUrl, page: i });
        
        setProgress(Math.round((i / numPages) * 100));
      }
      
      setImages(newImages);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to convert PDF to images.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadZip = async () => {
    if (images.length === 0) return;
    const zip = new window.JSZip();
    
    for (const img of images) {
      const base64Data = img.url.replace(/^data:image\/jpeg;base64,/, "");
      zip.file(`page_${img.page}.jpg`, base64Data, { base64: true });
    }
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name.replace('.pdf', '')}_images.zip`;
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
        <PdfUploadZone onFileSelect={handleFile} title="Drop PDF to convert to JPG" />
      ) : (
        <div className="space-y-6">
          <div className="bg-surface brutal-border p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display font-bold text-xl truncate pr-4">{file.name}</h3>
              <button 
                onClick={() => { setFile(null); setImages([]); }}
                className="text-xs font-bold uppercase text-muted hover:text-foreground shrink-0"
              >
                Change File
              </button>
            </div>
            
            {!images.length && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2">Image Quality / Resolution</label>
                  <select 
                    value={resolution}
                    onChange={(e) => setResolution(Number(e.target.value))}
                    className="w-full brutal-border p-3 bg-background"
                  >
                    <option value={1}>Standard (72 DPI)</option>
                    <option value={1.5}>Good (150 DPI)</option>
                    <option value={2}>High (300 DPI)</option>
                  </select>
                </div>
                
                <button 
                  onClick={convertToImages}
                  disabled={isProcessing}
                  className="w-full brutal-btn-primary bg-[#DC2626] hover:bg-[#B91C1C] text-white py-4 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                  {isProcessing ? `Converting... ${progress}%` : 'Convert to JPG'}
                </button>
              </div>
            )}
          </div>

          {images.length > 0 && (
            <div className="bg-surface brutal-border p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-display font-bold text-xl">Converted Images ({images.length})</h3>
                <button 
                  onClick={downloadZip}
                  className="brutal-btn-primary bg-[#2E7D32] hover:bg-[#1B5E20] text-white py-2 px-4 flex items-center gap-2 text-sm"
                >
                  <Download className="h-4 w-4" /> Download ZIP
                </button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto p-2 bg-background border-2 border-border-color">
                {images.map((img) => (
                  <div key={img.page} className="relative group">
                    <img loading="lazy" src={img.url} alt={`Page ${img.page}`} className="w-full h-auto border border-border-color shadow-sm" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <a 
                        href={img.url}
                        download={`page_${img.page}.jpg`}
                        className="bg-white text-black p-2 rounded-full hover:scale-110 transition-transform"
                        title="Download single image"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                    <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1 rounded">
                      Page {img.page}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
