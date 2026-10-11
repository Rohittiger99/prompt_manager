import React, { useState, useRef, useEffect } from 'react';
import { usePdfLibs } from './usePdfLibs';
import { PdfUploadZone } from './PdfUploadZone';
import { Download, Loader2, Type, PenTool, Highlighter, Eraser, Image as ImageIcon, ChevronLeft, ChevronRight, MousePointer2 } from 'lucide-react';

export function PdfEditor() {
  const libsLoaded = usePdfLibs();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  
  const [tool, setTool] = useState<'select' | 'text' | 'draw' | 'highlight' | 'erase' | 'image'>('select');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Store drawings per page as data URLs
  const [pageDrawings, setPageDrawings] = useState<Record<number, string>>({});

  const handleFile = async (files: FileList) => {
    const f = files[0];
    setFile(f);
    setResultUrl(null);
    setError(null);
    setPageDrawings({});
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
    if (!pdfCanvasRef.current || !drawCanvasRef.current) return;
    
    try {
      const page = await pdf.getPage(pageNum);
      const containerWidth = containerRef.current?.clientWidth || 800;
      const unscaledViewport = page.getViewport({ scale: 1 });
      const newScale = Math.min(containerWidth / unscaledViewport.width, 1.5);
      setScale(newScale);
      
      const viewport = page.getViewport({ scale: newScale });
      
      // Setup PDF Canvas
      const pCanvas = pdfCanvasRef.current;
      const pCtx = pCanvas.getContext('2d');
      pCanvas.height = viewport.height;
      pCanvas.width = viewport.width;
      
      await page.render({ canvasContext: pCtx, viewport }).promise;
      
      // Setup Draw Canvas
      const dCanvas = drawCanvasRef.current;
      const dCtx = dCanvas.getContext('2d');
      dCanvas.height = viewport.height;
      dCanvas.width = viewport.width;
      
      // Restore drawing for this page if exists
      if (pageDrawings[pageNum] && dCtx) {
        const img = new Image();
        img.onload = () => {
          dCtx.clearRect(0, 0, dCanvas.width, dCanvas.height);
          dCtx.drawImage(img, 0, 0);
        };
        img.src = pageDrawings[pageNum];
      } else if (dCtx) {
        dCtx.clearRect(0, 0, dCanvas.width, dCanvas.height);
      }
      
    } catch (err) {
      console.error("Render error:", err);
    }
  };

  useEffect(() => {
    if (pdfDoc) {
      renderPage(pdfDoc, currentPage);
    }
  }, [currentPage, pdfDoc]);

  // Save current drawing before changing page
  const handlePageChange = (newPage: number) => {
    if (drawCanvasRef.current) {
      setPageDrawings(prev => ({
        ...prev,
        [currentPage]: drawCanvasRef.current!.toDataURL('image/png')
      }));
    }
    setCurrentPage(newPage);
  };

  // Drawing logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (tool === 'select') return;
    
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
    
    if (tool === 'highlight') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
      ctx.lineWidth = strokeWidth * 3;
    } else if (tool === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = strokeWidth * 5;
    } else if (tool === 'draw') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
    } else if (tool === 'text') {
      const text = prompt("Enter text:");
      if (text) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.font = `${strokeWidth * 5}px Arial`;
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
      }
      setIsDrawing(false);
    }
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool === 'select' || tool === 'text') return;
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
    // Update current page drawing state
    if (drawCanvasRef.current) {
      setPageDrawings(prev => ({
        ...prev,
        [currentPage]: drawCanvasRef.current!.toDataURL('image/png')
      }));
    }
  };

  const clearCurrentPage = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPageDrawings(prev => ({ ...prev, [currentPage]: '' }));
  };

  const savePdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      // Save current page drawing first
      if (drawCanvasRef.current) {
        pageDrawings[currentPage] = drawCanvasRef.current.toDataURL('image/png');
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdfLibDoc = await window.PDFLib.PDFDocument.load(arrayBuffer);
      const pages = pdfLibDoc.getPages();

      for (let i = 0; i < pages.length; i++) {
        const pageNum = i + 1;
        if (pageDrawings[pageNum]) {
          const page = pages[i];
          const { width, height } = page.getSize();
          
          const embeddedImage = await pdfLibDoc.embedPng(pageDrawings[pageNum]);
          
          page.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: width,
            height: height,
          });
        }
      }

      const pdfBytes = await pdfLibDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save edited PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!libsLoaded) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-[#DC2626]" /></div>;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {error && (
        <div className="bg-red-100 text-red-800 p-4 brutal-border font-bold">
          {error}
        </div>
      )}

      {!file ? (
        <PdfUploadZone onFileSelect={handleFile} title="Drop PDF to edit" />
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Toolbar */}
          <div className="lg:w-64 shrink-0 space-y-6">
            <div className="bg-surface brutal-border p-4">
              <h3 className="font-display font-bold mb-4">Tools</h3>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setTool('select')}
                  className={`p-3 flex flex-col items-center justify-center gap-2 brutal-border ${tool === 'select' ? 'bg-[#DC2626] text-white' : 'bg-background hover:bg-surface'}`}
                >
                  <MousePointer2 className="h-5 w-5" />
                  <span className="text-xs font-bold">Select</span>
                </button>
                <button 
                  onClick={() => setTool('draw')}
                  className={`p-3 flex flex-col items-center justify-center gap-2 brutal-border ${tool === 'draw' ? 'bg-[#DC2626] text-white' : 'bg-background hover:bg-surface'}`}
                >
                  <PenTool className="h-5 w-5" />
                  <span className="text-xs font-bold">Draw</span>
                </button>
                <button 
                  onClick={() => setTool('highlight')}
                  className={`p-3 flex flex-col items-center justify-center gap-2 brutal-border ${tool === 'highlight' ? 'bg-[#DC2626] text-white' : 'bg-background hover:bg-surface'}`}
                >
                  <Highlighter className="h-5 w-5" />
                  <span className="text-xs font-bold">Highlight</span>
                </button>
                <button 
                  onClick={() => setTool('text')}
                  className={`p-3 flex flex-col items-center justify-center gap-2 brutal-border ${tool === 'text' ? 'bg-[#DC2626] text-white' : 'bg-background hover:bg-surface'}`}
                >
                  <Type className="h-5 w-5" />
                  <span className="text-xs font-bold">Text</span>
                </button>
                <button 
                  onClick={() => setTool('erase')}
                  className={`p-3 flex flex-col items-center justify-center gap-2 brutal-border ${tool === 'erase' ? 'bg-[#DC2626] text-white' : 'bg-background hover:bg-surface'}`}
                >
                  <Eraser className="h-5 w-5" />
                  <span className="text-xs font-bold">Erase</span>
                </button>
              </div>
              
              {(tool === 'draw' || tool === 'text') && (
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-2">Color</label>
                    <input 
                      type="color" 
                      value={color} 
                      onChange={(e) => setColor(e.target.value)}
                      className="h-10 w-full p-0 brutal-border cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-2">Size / Width: {strokeWidth}</label>
                    <input 
                      type="range" min="1" max="20" 
                      value={strokeWidth} 
                      onChange={(e) => setStrokeWidth(Number(e.target.value))}
                      className="w-full accent-[#DC2626]"
                    />
                  </div>
                </div>
              )}
              
              <div className="mt-6 pt-6 border-t-2 border-border-color">
                <button 
                  onClick={clearCurrentPage}
                  className="w-full brutal-btn-secondary py-2 text-sm mb-4"
                >
                  Clear Page
                </button>
                <button 
                  onClick={savePdf}
                  disabled={isProcessing}
                  className="w-full brutal-btn-primary bg-[#DC2626] hover:bg-[#B91C1C] text-white py-3 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {isProcessing ? 'Saving...' : 'Save PDF'}
                </button>
              </div>
            </div>
            
            {resultUrl && (
              <div className="bg-[#E8F5E9] dark:bg-[#0A1F10] brutal-border p-4 text-center">
                <p className="font-bold text-[#2E7D32] dark:text-[#81C784] mb-2 text-sm">Saved Successfully!</p>
                <a 
                  href={resultUrl}
                  download={`${file.name.replace('.pdf', '')}_edited.pdf`}
                  className="w-full brutal-btn-primary bg-[#2E7D32] hover:bg-[#1B5E20] text-white py-2 text-sm flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" /> Download
                </a>
              </div>
            )}
          </div>
          
          {/* Canvas Area */}
          <div className="flex-1 space-y-4">
            <div className="bg-surface brutal-border p-4 flex justify-between items-center">
              <h3 className="font-display font-bold truncate max-w-[200px] md:max-w-md">{file.name}</h3>
              <div className="flex items-center gap-2 bg-background brutal-border px-2 py-1">
                <button 
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-1 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-bold font-mono">{currentPage} / {numPages}</span>
                <button 
                  onClick={() => handlePageChange(Math.min(numPages, currentPage + 1))}
                  disabled={currentPage === numPages}
                  className="p-1 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div 
              ref={containerRef}
              className="relative overflow-auto bg-gray-200 dark:bg-gray-800 border-2 border-border-color flex justify-center p-4 min-h-[600px]"
            >
              <div className="relative shadow-xl">
                <canvas 
                  ref={pdfCanvasRef} 
                  className="bg-white"
                />
                <canvas 
                  ref={drawCanvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className={`absolute top-0 left-0 w-full h-full touch-none ${
                    tool === 'select' ? 'cursor-default pointer-events-none' : 
                    tool === 'text' ? 'cursor-text' : 'cursor-crosshair'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
