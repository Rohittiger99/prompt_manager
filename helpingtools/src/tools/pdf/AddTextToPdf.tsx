import React, { useState, useRef, useEffect } from 'react';
import { usePdfLibs } from './usePdfLibs';
import { PdfUploadZone } from './PdfUploadZone';
import { Download, Loader2, Type, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface TextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  page: number;
  color: string;
  size: number;
}

export function AddTextToPdf() {
  const libsLoaded = usePdfLibs();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  
  const [textColor, setTextColor] = useState('#000000');
  const [textSize, setTextSize] = useState(16);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFile = async (files: FileList) => {
    const f = files[0];
    setFile(f);
    setResultUrl(null);
    setError(null);
    setTexts([]);
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
    if (!canvasRef.current) return;
    
    try {
      const page = await pdf.getPage(pageNum);
      
      // Calculate scale to fit container width
      const containerWidth = containerRef.current?.clientWidth || 800;
      const unscaledViewport = page.getViewport({ scale: 1 });
      const newScale = Math.min(containerWidth / unscaledViewport.width, 1.5);
      setScale(newScale);
      
      const viewport = page.getViewport({ scale: newScale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
    } catch (err) {
      console.error("Render error:", err);
    }
  };

  useEffect(() => {
    if (pdfDoc) {
      renderPage(pdfDoc, currentPage);
    }
  }, [currentPage, pdfDoc]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTextId) {
      setActiveTextId(null);
      return;
    }
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newText: TextItem = {
      id: Math.random().toString(36).substring(7),
      text: 'New Text',
      x,
      y,
      page: currentPage,
      color: textColor,
      size: textSize
    };
    
    setTexts([...texts, newText]);
    setActiveTextId(newText.id);
  };

  const updateActiveText = (val: string) => {
    setTexts(texts.map(t => t.id === activeTextId ? { ...t, text: val } : t));
  };

  const removeText = (id: string) => {
    setTexts(texts.filter(t => t.id !== id));
    if (activeTextId === id) setActiveTextId(null);
  };

  const applyAndDownload = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfLibDoc = await window.PDFLib.PDFDocument.load(arrayBuffer);
      const pages = pdfLibDoc.getPages();
      const font = await pdfLibDoc.embedFont(window.PDFLib.StandardFonts.Helvetica);
      
      const { rgb } = window.PDFLib;
      
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255
        } : { r: 0, g: 0, b: 0 };
      };

      // Group texts by page
      for (const text of texts) {
        const pageIndex = text.page - 1;
        if (pageIndex >= 0 && pageIndex < pages.length) {
          const page = pages[pageIndex];
          const { height } = page.getSize();
          
          const color = hexToRgb(text.color);
          
          // Convert canvas coordinates to PDF coordinates
          // PDF coordinates start from bottom-left, canvas from top-left
          const pdfX = text.x / scale;
          const pdfY = height - (text.y / scale) - text.size; // Adjust for baseline
          
          page.drawText(text.text, {
            x: pdfX,
            y: pdfY,
            size: text.size,
            font,
            color: rgb(color.r, color.g, color.b),
          });
        }
      }

      const pdfBytes = await pdfLibDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to apply text to PDF.");
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
        <PdfUploadZone onFileSelect={handleFile} title="Drop PDF to add text" />
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
                Click anywhere on the document to place text
              </div>
              
              <div 
                ref={containerRef}
                className="relative overflow-auto bg-gray-200 dark:bg-gray-800 border-2 border-border-color flex justify-center p-4 min-h-[500px]"
              >
                <div className="relative shadow-xl">
                  <canvas 
                    ref={canvasRef} 
                    onClick={handleCanvasClick}
                    className="cursor-text bg-white"
                  />
                  
                  {/* Render text overlays for current page */}
                  {texts.filter(t => t.page === currentPage).map(t => (
                    <div 
                      key={t.id}
                      className={`absolute whitespace-nowrap cursor-pointer ${activeTextId === t.id ? 'ring-2 ring-[#DC2626] bg-white/50' : ''}`}
                      style={{ 
                        left: t.x, 
                        top: t.y,
                        color: t.color,
                        fontSize: `${t.size * scale}px`,
                        fontFamily: 'Helvetica, Arial, sans-serif',
                        transform: 'translateY(-100%)' // Align bottom to click point
                      }}
                      onClick={(e) => { e.stopPropagation(); setActiveTextId(t.id); }}
                    >
                      {t.text}
                      {activeTextId === t.id && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeText(t.id); }}
                          className="absolute -top-6 -right-6 bg-red-500 text-white rounded-full p-1 hover:scale-110"
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
              <h3 className="font-display font-bold mb-4">Text Settings</h3>
              
              {activeTextId ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Edit Text</label>
                    <textarea 
                      value={texts.find(t => t.id === activeTextId)?.text || ''}
                      onChange={(e) => updateActiveText(e.target.value)}
                      className="w-full brutal-border p-2 bg-background font-mono text-sm"
                      rows={3}
                      autoFocus
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-bold mb-2">Size: {textSize}</label>
                      <input 
                        type="range" min="8" max="72" 
                        value={textSize} 
                        onChange={(e) => {
                          const size = Number(e.target.value);
                          setTextSize(size);
                          setTexts(texts.map(t => t.id === activeTextId ? { ...t, size } : t));
                        }}
                        className="w-full accent-[#DC2626]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Color</label>
                      <input 
                        type="color" 
                        value={textColor} 
                        onChange={(e) => {
                          const color = e.target.value;
                          setTextColor(color);
                          setTexts(texts.map(t => t.id === activeTextId ? { ...t, color } : t));
                        }}
                        className="h-10 w-12 p-0 brutal-border cursor-pointer"
                      />
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setActiveTextId(null)}
                    className="w-full brutal-btn-secondary py-2 text-sm"
                  >
                    Done Editing
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted border-2 border-dashed border-border-color">
                  <Type className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-bold">Click on the PDF to add text</p>
                </div>
              )}
              
              <div className="mt-8 pt-6 border-t-2 border-border-color">
                <button 
                  onClick={applyAndDownload}
                  disabled={isProcessing || texts.length === 0}
                  className="w-full brutal-btn-primary bg-[#DC2626] hover:bg-[#B91C1C] text-white py-4 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                  {isProcessing ? 'Applying...' : 'Apply & Download'}
                </button>
              </div>
            </div>
            
            {resultUrl && (
              <div className="bg-[#E8F5E9] dark:bg-[#0A1F10] brutal-border p-6 text-center">
                <h3 className="font-display font-bold text-[#2E7D32] dark:text-[#81C784] mb-4">Success!</h3>
                <a 
                  href={resultUrl}
                  download={`${file.name.replace('.pdf', '')}_edited.pdf`}
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
