import React, { useState } from 'react';
import { usePdfLibs } from './usePdfLibs';
import { Download, Loader2, Image as ImageIcon, X, GripVertical, Plus } from 'lucide-react';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
}

export function JpgToPdf() {
  const libsLoaded = usePdfLibs();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'fit'>('a4');
  const [imageFit, setImageFit] = useState<'fill' | 'fit' | 'original'>('fit');
  
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const newFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    
    const newImages = newFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file)
    }));
    
    setImages(prev => [...prev, ...newImages]);
    setPdfUrl(null);
    e.target.value = '';
  };

  const removeImage = (id: string) => {
    setImages(images.filter(img => img.id !== id));
    setPdfUrl(null);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId === id) return;
    
    const draggedIndex = images.findIndex(img => img.id === draggedId);
    const targetIndex = images.findIndex(img => img.id === id);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      const newImages = [...images];
      const [draggedItem] = newImages.splice(draggedIndex, 1);
      newImages.splice(targetIndex, 0, draggedItem);
      setImages(newImages);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const createPdf = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const pdfDoc = await window.PDFLib.PDFDocument.create();
      
      for (const img of images) {
        const imgBuffer = await img.file.arrayBuffer();
        let pdfImage;
        
        if (img.file.type === 'image/png') {
          pdfImage = await pdfDoc.embedPng(imgBuffer);
        } else if (img.file.type === 'image/jpeg') {
          pdfImage = await pdfDoc.embedJpg(imgBuffer);
        } else {
          // Skip unsupported formats or try to convert them first (not implemented here)
          continue;
        }

        const imgDims = pdfImage.scale(1);
        
        let pageWidth = 595.28; // A4 width
        let pageHeight = 841.89; // A4 height
        
        if (pageSize === 'letter') {
          pageWidth = 612;
          pageHeight = 792;
        } else if (pageSize === 'fit') {
          pageWidth = imgDims.width;
          pageHeight = imgDims.height;
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        
        let drawWidth = imgDims.width;
        let drawHeight = imgDims.height;
        let x = 0;
        let y = 0;

        if (pageSize !== 'fit') {
          if (imageFit === 'fit') {
            const scale = Math.min(pageWidth / imgDims.width, pageHeight / imgDims.height);
            drawWidth = imgDims.width * scale;
            drawHeight = imgDims.height * scale;
            x = (pageWidth - drawWidth) / 2;
            y = (pageHeight - drawHeight) / 2;
          } else if (imageFit === 'fill') {
            const scale = Math.max(pageWidth / imgDims.width, pageHeight / imgDims.height);
            drawWidth = imgDims.width * scale;
            drawHeight = imgDims.height * scale;
            x = (pageWidth - drawWidth) / 2;
            y = (pageHeight - drawHeight) / 2;
          } else {
            // Original size, centered
            x = (pageWidth - drawWidth) / 2;
            y = (pageHeight - drawHeight) / 2;
          }
        }

        page.drawImage(pdfImage, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setPdfUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create PDF. Some images might be in an unsupported format.");
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

      {images.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors border-[#DC2626] hover:bg-[#DC2626]/5">
          <label className="cursor-pointer w-full h-full flex flex-col items-center">
            <input 
              type="file" 
              onChange={handleFiles} 
              accept="image/jpeg, image/png"
              multiple
              className="hidden" 
            />
            <div className="h-16 w-16 bg-surface brutal-border mx-auto flex items-center justify-center mb-4 text-[#DC2626]">
              <ImageIcon className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-display font-bold mb-2">
              Drop images here or click to upload
            </h3>
            <p className="text-muted mb-4">JPG, PNG — Select multiple files</p>
            <div className="inline-flex items-center gap-2 bg-[#DC2626]/10 text-[#DC2626] px-3 py-1 rounded-full text-xs font-bold">
              <span>🔒</span> Processed locally
            </div>
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-surface brutal-border p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-bold text-lg">Images ({images.length})</h3>
                <label className="brutal-btn-secondary py-1 px-3 text-xs flex items-center gap-1 cursor-pointer">
                  <input type="file" multiple accept="image/jpeg, image/png" className="hidden" onChange={handleFiles} />
                  <Plus className="h-3 w-3" /> Add More
                </label>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto p-2 bg-background border-2 border-border-color">
                {images.map((img, index) => (
                  <div 
                    key={img.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, img.id)}
                    onDragOver={(e) => handleDragOver(e, img.id)}
                    onDragEnd={handleDragEnd}
                    className={`relative group cursor-move border-2 ${draggedId === img.id ? 'border-[#DC2626] opacity-50' : 'border-border-color'}`}
                  >
                    <img loading="lazy" src={img.preview} alt={`Image ${index}`} className="w-full h-24 object-cover" />
                    <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1 rounded flex items-center gap-1">
                      <GripVertical className="h-3 w-3" /> {index + 1}
                    </div>
                    <button 
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-surface brutal-border p-6">
              <h3 className="font-display font-bold mb-4">Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Page Size</label>
                  <select 
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as any)}
                    className="w-full brutal-border p-3 bg-background"
                  >
                    <option value="a4">A4</option>
                    <option value="letter">Letter</option>
                    <option value="fit">Fit to Image</option>
                  </select>
                </div>
                
                {pageSize !== 'fit' && (
                  <div>
                    <label className="block text-sm font-bold mb-2">Image Fit</label>
                    <select 
                      value={imageFit}
                      onChange={(e) => setImageFit(e.target.value as any)}
                      className="w-full brutal-border p-3 bg-background"
                    >
                      <option value="fit">Fit to Page (Keep aspect ratio)</option>
                      <option value="fill">Fill Page (Crop)</option>
                      <option value="original">Original Size (Center)</option>
                    </select>
                  </div>
                )}
                
                <button 
                  onClick={createPdf}
                  disabled={isProcessing}
                  className="w-full brutal-btn-primary bg-[#DC2626] hover:bg-[#B91C1C] text-white py-4 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                  {isProcessing ? 'Creating...' : 'Create PDF'}
                </button>
              </div>
            </div>
            
            {pdfUrl && (
              <div className="bg-[#E8F5E9] dark:bg-[#0A1F10] brutal-border p-6 text-center">
                <h3 className="font-display font-bold text-[#2E7D32] dark:text-[#81C784] mb-4">PDF Ready!</h3>
                <a 
                  href={pdfUrl}
                  download="images.pdf"
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
