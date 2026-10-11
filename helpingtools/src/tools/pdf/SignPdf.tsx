import React, { useState, useRef, useEffect } from 'react';
import { usePdfLibs } from './usePdfLibs';
import { PdfUploadZone } from './PdfUploadZone';
import { Download, Loader2, PenTool, ChevronLeft, ChevronRight, X, Image as ImageIcon, Type } from 'lucide-react';
import { useToast } from '../../components/ToastProvider';

interface SignatureItem {
  id: string;
  dataUrl: string;
  x: number;
  y: number;
  page: number;
  width: number;
  height: number;
}

export function SignPdf() {
  const libsLoaded = usePdfLibs();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  
  const [signatures, setSignatures] = useState<SignatureItem[]>([]);
  const [activeSigId, setActiveSigId] = useState<string | null>(null);
  
  const [sigMode, setSigMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedName, setTypedName] = useState('');
  const [currentSigDataUrl, setCurrentSigDataUrl] = useState<string | null>(null);
  
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  
  const [isDrawing, setIsDrawing] = useState(false);

  const handleFile = async (files: FileList) => {
    const f = files[0];
    setFile(f);
    setResultUrl(null);
    setError(null);
    setSignatures([]);
    setCurrentPage(1);
    
    try {
      const arrayBuffer = await f.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      renderPage(pdf, 1);
    } catch (err) {
      console.error(err);
      setError("Failed to load PDF.");
    }
  };

  const renderPage = async (pdf: any, pageNum: number) => {
    if (!pdfCanvasRef.current) return;
    
    try {
      const page = await pdf.getPage(pageNum);
      const containerWidth = containerRef.current?.clientWidth || 800;
      const unscaledViewport = page.getViewport({ scale: 1 });
      const newScale = Math.min(containerWidth / unscaledViewport.width, 1.5);
      setScale(newScale);
      
      const viewport = page.getViewport({ scale: newScale });
      const canvas = pdfCanvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport }).promise;
    } catch (err) {
      console.error("Render error:", err);
    }
  };

  useEffect(() => {
    if (pdfDoc) {
      renderPage(pdfDoc, currentPage);
    }
  }, [currentPage, pdfDoc]);

  // Drawing logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    saveSignature();
  };

  const clearDrawing = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setCurrentSigDataUrl(null);
  };

  useEffect(() => {
    if (sigMode === 'draw' && drawCanvasRef.current) {
      const ctx = drawCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000000';
      }
    }
  }, [sigMode]);

  const saveSignature = () => {
    if (sigMode === 'draw' && drawCanvasRef.current) {
      setCurrentSigDataUrl(drawCanvasRef.current.toDataURL('image/png'));
    } else if (sigMode === 'type' && typedName) {
      // Create a temporary canvas to render text as image
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = 'italic 48px "Times New Roman", serif';
        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName, 10, 50);
        setCurrentSigDataUrl(canvas.toDataURL('image/png'));
      }
    }
  };

  useEffect(() => {
    if (sigMode === 'type') saveSignature();
  }, [typedName, sigMode]);

  const handleUploadSig = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setCurrentSigDataUrl(ev.target.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handlePdfClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentSigDataUrl) {
      toast("Please create a signature first.", "warning");
      return;
    }
    
    const rect = pdfCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Default size 150x50
    const newSig: SignatureItem = {
      id: Math.random().toString(36).substring(7),
      dataUrl: currentSigDataUrl,
      x: x - 75, // center
      y: y - 25, // center
      page: currentPage,
      width: 150,
      height: 50
    };
    
    setSignatures([...signatures, newSig]);
    setActiveSigId(newSig.id);
  };

  const removeSignature = (id: string) => {
    setSignatures(signatures.filter(s => s.id !== id));
    if (activeSigId === id) setActiveSigId(null);
  };

  const updateSigSize = (size: number) => {
    setSignatures(signatures.map(s => {
      if (s.id === activeSigId) {
        // Maintain aspect ratio roughly
        return { ...s, width: size * 3, height: size };
      }
      return s;
    }));
  };

  const applyAndDownload = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfLibDoc = await window.PDFLib.PDFDocument.load(arrayBuffer);
      const pages = pdfLibDoc.getPages();

      for (const sig of signatures) {
        const pageIndex = sig.page - 1;
        if (pageIndex >= 0 && pageIndex < pages.length) {
          const page = pages[pageIndex];
          const { height } = page.getSize();
          
          // Embed image
          let embeddedImage;
          if (sig.dataUrl.startsWith('data:image/png')) {
            embeddedImage = await pdfLibDoc.embedPng(sig.dataUrl);
          } else {
            embeddedImage = await pdfLibDoc.embedJpg(sig.dataUrl);
          }
          
          const pdfX = sig.x / scale;
          const pdfY = height - (sig.y / scale) - (sig.height / scale);
          const pdfW = sig.width / scale;
          const pdfH = sig.height / scale;
          
          page.drawImage(embeddedImage, {
            x: pdfX,
            y: pdfY,
            width: pdfW,
            height: pdfH,
          });
        }
      }

      const pdfBytes = await pdfLibDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to apply signature.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!libsLoaded) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-[#DC2626]" /></div>;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {error && (
        <div className="bg-red-100 text-red-800 p-4 brutal-border font-bold">
          {error}
        </div>
      )}

      {!file ? (
        <PdfUploadZone onFileSelect={handleFile} title="Drop PDF to sign" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-surface brutal-border p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <h3 className="font-display font-bold text-lg truncate max-w-[200px]">{file.name}</h3>
                  <div className="flex items-center gap-2 bg-background brutal-border px-2 py-1">
                    <button 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-1 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-bold font-mono">{currentPage} / {numPages}</span>
                    <button 
                      onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                      disabled={currentPage === numPages}
                      className="p-1 disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => { setFile(null); setResultUrl(null); }}
                  className="text-xs font-bold uppercase text-muted hover:text-foreground"
                >
                  Change File
                </button>
              </div>
              
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-xs font-bold mb-4 text-center">
                Click anywhere on the document to place your signature
              </div>
              
              <div 
                ref={containerRef}
                className="relative overflow-auto bg-gray-200 dark:bg-gray-800 border-2 border-border-color flex justify-center p-4 min-h-[500px]"
              >
                <div className="relative shadow-xl">
                  <canvas 
                    ref={pdfCanvasRef} 
                    onClick={handlePdfClick}
                    className="cursor-crosshair bg-white"
                  />
                  
                  {/* Render signatures for current page */}
                  {signatures.filter(s => s.page === currentPage).map(s => (
                    <div 
                      key={s.id}
                      className={`absolute cursor-pointer ${activeSigId === s.id ? 'ring-2 ring-[#DC2626] bg-white/50' : ''}`}
                      style={{ 
                        left: s.x, 
                        top: s.y,
                        width: s.width,
                        height: s.height
                      }}
                      onClick={(e) => { e.stopPropagation(); setActiveSigId(s.id); }}
                    >
                      <img loading="lazy" src={s.dataUrl} alt="Signature" className="w-full h-full object-contain pointer-events-none" />
                      {activeSigId === s.id && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeSignature(s.id); }}
                          className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 hover:scale-110"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-surface brutal-border p-6">
              <h3 className="font-display font-bold mb-4">Create Signature</h3>
              
              <div className="flex gap-1 mb-4 border-b-2 border-border-color pb-2">
                <button 
                  onClick={() => setSigMode('draw')}
                  className={`flex-1 py-1 text-xs font-bold flex items-center justify-center gap-1 ${sigMode === 'draw' ? 'text-[#DC2626]' : 'text-muted'}`}
                >
                  <PenTool className="h-3 w-3" /> Draw
                </button>
                <button 
                  onClick={() => setSigMode('type')}
                  className={`flex-1 py-1 text-xs font-bold flex items-center justify-center gap-1 ${sigMode === 'type' ? 'text-[#DC2626]' : 'text-muted'}`}
                >
                  <Type className="h-3 w-3" /> Type
                </button>
                <button 
                  onClick={() => setSigMode('upload')}
                  className={`flex-1 py-1 text-xs font-bold flex items-center justify-center gap-1 ${sigMode === 'upload' ? 'text-[#DC2626]' : 'text-muted'}`}
                >
                  <ImageIcon className="h-3 w-3" /> Upload
                </button>
              </div>
              
              <div className="mb-6">
                {sigMode === 'draw' && (
                  <div>
                    <div className="bg-white border-2 border-border-color mb-2">
                      <canvas 
                        ref={drawCanvasRef}
                        width={250}
                        height={100}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full cursor-crosshair touch-none"
                      />
                    </div>
                    <button onClick={clearDrawing} className="text-xs font-bold text-muted hover:text-foreground">Clear</button>
                  </div>
                )}
                
                {sigMode === 'type' && (
                  <div>
                    <input 
                      type="text" 
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      placeholder="Type your name..."
                      className="w-full brutal-border p-3 bg-background font-serif italic text-xl"
                    />
                  </div>
                )}
                
                {sigMode === 'upload' && (
                  <div>
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg"
                      onChange={handleUploadSig}
                      className="w-full brutal-border p-2 bg-background file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-bold file:bg-[#DC2626] file:text-white hover:file:bg-[#B91C1C] cursor-pointer"
                    />
                  </div>
                )}
              </div>
              
              {activeSigId && (
                <div className="pt-4 border-t-2 border-border-color">
                  <label className="block text-sm font-bold mb-2">Resize Selected Signature</label>
                  <input 
                    type="range" min="20" max="150" 
                    value={signatures.find(s => s.id === activeSigId)?.height || 50} 
                    onChange={(e) => updateSigSize(Number(e.target.value))}
                    className="w-full accent-[#DC2626]"
                  />
                </div>
              )}
              
              <div className="mt-8 pt-6 border-t-2 border-border-color">
                <button 
                  onClick={applyAndDownload}
                  disabled={isProcessing || signatures.length === 0}
                  className="w-full brutal-btn-primary bg-[#DC2626] hover:bg-[#B91C1C] text-white py-4 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                  {isProcessing ? 'Saving...' : 'Save Signed PDF'}
                </button>
              </div>
            </div>
            
            {resultUrl && (
              <div className="bg-[#E8F5E9] dark:bg-[#0A1F10] brutal-border p-6 text-center">
                <h3 className="font-display font-bold text-[#2E7D32] dark:text-[#81C784] mb-4">Success!</h3>
                <a 
                  href={resultUrl}
                  download={`${file.name.replace('.pdf', '')}_signed.pdf`}
                  className="w-full brutal-btn-primary bg-[#2E7D32] hover:bg-[#1B5E20] text-white py-3 flex items-center justify-center gap-2"
                >
                  <Download className="h-5 w-5" /> Download PDF
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
