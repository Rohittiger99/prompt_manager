import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Settings, Crop } from 'lucide-react';

export function ImageCropper() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Crop state
  const [crop, setCrop] = useState({ x: 10, y: 10, width: 80, height: 80 }); // percentages
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isDraggingBox, setIsDraggingBox] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) return;
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setCroppedUrl(null);
    setCrop({ x: 10, y: 10, width: 80, height: 80 });
  };

  const applyAspectRatio = (ratio: number | null) => {
    setAspectRatio(ratio);
    if (!ratio) return;
    
    // Adjust current crop to match ratio
    const newCrop = { ...crop };
    // Assuming container is square-ish for simplicity, but we should use actual image dimensions
    // For a robust implementation, we'd calculate based on image aspect ratio vs container aspect ratio
    // Simplified: just set width and calculate height
    newCrop.height = newCrop.width / ratio;
    if (newCrop.height > 100) {
      newCrop.height = 100;
      newCrop.width = 100 * ratio;
    }
    setCrop(newCrop);
  };

  // Mouse event handlers for crop box
  const handleMouseDown = (e: React.MouseEvent, action: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (action === 'move') {
      setIsDraggingBox(true);
    } else {
      setIsResizing(action);
    }
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      cropX: crop.x,
      cropY: crop.y,
      cropW: crop.width,
      cropH: crop.height
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingBox && !isResizing) return;
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragStart.x) / containerRect.width) * 100;
      const dy = ((e.clientY - dragStart.y) / containerRect.height) * 100;
      
      let newCrop = { ...crop };
      
      if (isDraggingBox) {
        newCrop.x = Math.max(0, Math.min(100 - crop.width, dragStart.cropX + dx));
        newCrop.y = Math.max(0, Math.min(100 - crop.height, dragStart.cropY + dy));
      } else if (isResizing) {
        if (isResizing.includes('e')) newCrop.width = Math.max(5, Math.min(100 - crop.x, dragStart.cropW + dx));
        if (isResizing.includes('s')) newCrop.height = Math.max(5, Math.min(100 - crop.y, dragStart.cropH + dy));
        if (isResizing.includes('w')) {
          const w = Math.max(5, dragStart.cropW - dx);
          if (dragStart.cropX + dragStart.cropW - w >= 0) {
            newCrop.width = w;
            newCrop.x = dragStart.cropX + dragStart.cropW - w;
          }
        }
        if (isResizing.includes('n')) {
          const h = Math.max(5, dragStart.cropH - dy);
          if (dragStart.cropY + dragStart.cropH - h >= 0) {
            newCrop.height = h;
            newCrop.y = dragStart.cropY + dragStart.cropH - h;
          }
        }
        
        if (aspectRatio) {
          // Enforce aspect ratio during resize (simplified)
          if (isResizing.includes('e') || isResizing.includes('w')) {
            newCrop.height = newCrop.width / aspectRatio;
          } else {
            newCrop.width = newCrop.height * aspectRatio;
          }
        }
      }
      
      setCrop(newCrop);
    };

    const handleMouseUp = () => {
      setIsDraggingBox(false);
      setIsResizing(null);
    };

    if (isDraggingBox || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingBox, isResizing, dragStart, crop, aspectRatio]);

  const handleCrop = () => {
    if (!imageRef.current || !canvasRef.current || !file) return;
    
    const img = imageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Calculate actual pixel coordinates based on natural image size
    const sx = (crop.x / 100) * img.naturalWidth;
    const sy = (crop.y / 100) * img.naturalHeight;
    const sWidth = (crop.width / 100) * img.naturalWidth;
    const sHeight = (crop.height / 100) * img.naturalHeight;
    
    canvas.width = sWidth;
    canvas.height = sHeight;
    
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
    
    setCroppedUrl(canvas.toDataURL(file.type));
  };

  return (
    <div className="space-y-8">
      {!file ? (
        <div 
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${isDragging ? 'border-[#00D4FF] bg-[#00D4FF]/10' : 'border-[#00D4FF] hover:bg-[#00D4FF]/5'}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          <div className="h-16 w-16 bg-surface brutal-border mx-auto flex items-center justify-center mb-4 text-[#00D4FF]">
            <Upload className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-display font-bold mb-2">
            {isDragging ? 'Drop it!' : 'Drop image here or click to upload'}
          </h3>
          <p className="text-muted">JPG, PNG, WEBP, GIF, BMP — Max 20MB</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-surface brutal-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Settings
                </h3>
                <button 
                  onClick={() => { setFile(null); setPreviewUrl(null); setCroppedUrl(null); }}
                  className="text-xs font-bold uppercase tracking-wider text-muted hover:text-foreground"
                >
                  Start Over
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Aspect Ratio</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { l: 'Free', r: null },
                      { l: '1:1', r: 1 },
                      { l: '4:3', r: 4/3 },
                      { l: '16:9', r: 16/9 },
                      { l: '3:2', r: 3/2 },
                      { l: '2:3', r: 2/3 },
                    ].map(p => (
                      <button 
                        key={p.l}
                        onClick={() => applyAspectRatio(p.r)}
                        className={`py-2 text-xs font-bold brutal-border ${aspectRatio === p.r ? 'bg-accent text-white' : 'bg-background hover:bg-surface'}`}
                      >
                        {p.l}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="pt-4 border-t-2 border-border-color">
                  <p className="text-sm font-bold text-muted mb-4">
                    Crop: {imageRef.current ? Math.round((crop.width / 100) * imageRef.current.naturalWidth) : 0} × {imageRef.current ? Math.round((crop.height / 100) * imageRef.current.naturalHeight) : 0} px
                  </p>
                  
                  <button 
                    onClick={handleCrop}
                    className="w-full brutal-btn-primary py-3 flex items-center justify-center gap-2"
                  >
                    <Crop className="h-5 w-5" /> Crop Image
                  </button>
                </div>
              </div>
            </div>
            
            {croppedUrl && (
              <a 
                href={croppedUrl} 
                download={`cropped_${file.name}`}
                className="w-full brutal-btn-primary py-3 flex items-center justify-center gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white"
              >
                <Download className="h-5 w-5" /> Download Cropped
              </a>
            )}
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-surface brutal-border p-4 h-full min-h-[400px] flex flex-col">
              <h3 className="font-display font-bold mb-4">{croppedUrl ? 'Result' : 'Crop Area'}</h3>
              
              {croppedUrl ? (
                <div className="flex-1 relative bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyEgSRC0AQB9CGwScB1zWAAAAABJRU5ErkJggg==')] rounded-lg overflow-hidden flex items-center justify-center border-2 border-border-color p-4">
                  <img loading="lazy" src={croppedUrl} alt="Cropped" className="max-w-full max-h-full object-contain shadow-lg" />
                </div>
              ) : (
                <div className="flex-1 relative bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyEgSRC0AQB9CGwScB1zWAAAAABJRU5ErkJggg==')] rounded-lg overflow-hidden flex items-center justify-center border-2 border-border-color">
                  <div 
                    ref={containerRef}
                    className="relative inline-block max-w-full max-h-full"
                    style={{ userSelect: 'none' }}
                  >
                    <img loading="lazy" ref={imageRef}
                      src={previewUrl!} 
                      alt="Preview" 
                      className="max-w-full max-h-full block pointer-events-none" 
                    />
                    
                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-black/50 pointer-events-none"></div>
                    
                    {/* Crop box */}
                    <div 
                      className="absolute border-2 border-[#00D4FF] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move"
                      style={{
                        left: `${crop.x}%`,
                        top: `${crop.y}%`,
                        width: `${crop.width}%`,
                        height: `${crop.height}%`,
                        boxShadow: 'none', // Override the shadow to just show the box
                      }}
                      onMouseDown={(e) => handleMouseDown(e, 'move')}
                    >
                      {/* Clear background inside crop box */}
                      <div className="absolute inset-0 bg-transparent" style={{ backdropFilter: 'brightness(2)' }}></div>
                      
                      {/* Grid lines */}
                      <div className="absolute inset-0 pointer-events-none flex flex-col justify-evenly">
                        <div className="w-full h-[1px] bg-white/30"></div>
                        <div className="w-full h-[1px] bg-white/30"></div>
                      </div>
                      <div className="absolute inset-0 pointer-events-none flex justify-evenly">
                        <div className="h-full w-[1px] bg-white/30"></div>
                        <div className="h-full w-[1px] bg-white/30"></div>
                      </div>
                      
                      {/* Handles */}
                      <div className="absolute top-0 left-0 w-3 h-3 bg-white border border-[#00D4FF] -mt-1.5 -ml-1.5 cursor-nwse-resize" onMouseDown={(e) => handleMouseDown(e, 'nw')}></div>
                      <div className="absolute top-0 right-0 w-3 h-3 bg-white border border-[#00D4FF] -mt-1.5 -mr-1.5 cursor-nesw-resize" onMouseDown={(e) => handleMouseDown(e, 'ne')}></div>
                      <div className="absolute bottom-0 left-0 w-3 h-3 bg-white border border-[#00D4FF] -mb-1.5 -ml-1.5 cursor-nesw-resize" onMouseDown={(e) => handleMouseDown(e, 'sw')}></div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-white border border-[#00D4FF] -mb-1.5 -mr-1.5 cursor-nwse-resize" onMouseDown={(e) => handleMouseDown(e, 'se')}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
