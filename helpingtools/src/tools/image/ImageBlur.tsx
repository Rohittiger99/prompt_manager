import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Settings, Droplets } from 'lucide-react';
import { useToast } from '../../components/ToastProvider';

export function ImageBlur() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [mode, setMode] = useState<'full' | 'area'>('full');
  const [blurType, setBlurType] = useState<'gaussian' | 'pixelate' | 'frost'>('gaussian');
  const [intensity, setIntensity] = useState(10);
  
  // Area selection state
  const [selection, setSelection] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

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
    setProcessedUrl(null);
    setSelection(null);
  };

  // Handle drawing selection box
  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (mode !== 'area') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setStartPos({ x, y });
    setSelection({ x, y, w: 0, h: 0 });
    setIsSelecting(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isSelecting || mode !== 'area') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;
    
    setSelection({
      x: Math.min(startPos.x, currentX),
      y: Math.min(startPos.y, currentY),
      w: Math.abs(currentX - startPos.x),
      h: Math.abs(currentY - startPos.y)
    });
  };

  const handleMouseUp = () => {
    if (isSelecting) {
      setIsSelecting(false);
      // If selection is too small, clear it
      if (selection && (selection.w < 2 || selection.h < 2)) {
        setSelection(null);
      }
    }
  };

  const applyBlur = () => {
    if (!previewUrl || !file) return;
    
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Calculate area to blur
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (mode === 'area' && selection) {
        sx = (selection.x / 100) * img.width;
        sy = (selection.y / 100) * img.height;
        sw = (selection.w / 100) * img.width;
        sh = (selection.h / 100) * img.height;
      }
      
      if (mode === 'area' && !selection) {
        toast("Please draw an area to blur first.", "warning");
        return;
      }
      
      // Create a temporary canvas for the blurred section
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = sw;
      tempCanvas.height = sh;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;
      
      // Draw the section to temp canvas
      tempCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      
      if (blurType === 'gaussian') {
        tempCtx.filter = `blur(${intensity}px)`;
        tempCtx.drawImage(tempCanvas, 0, 0);
      } else if (blurType === 'pixelate') {
        const pixelSize = intensity;
        const w = sw / pixelSize;
        const h = sh / pixelSize;
        
        // Draw small
        const tinyCanvas = document.createElement('canvas');
        tinyCanvas.width = w;
        tinyCanvas.height = h;
        const tinyCtx = tinyCanvas.getContext('2d');
        if (tinyCtx) {
          tinyCtx.drawImage(tempCanvas, 0, 0, w, h);
          // Draw back large without smoothing
          tempCtx.imageSmoothingEnabled = false;
          tempCtx.drawImage(tinyCanvas, 0, 0, w, h, 0, 0, sw, sh);
        }
      } else if (blurType === 'frost') {
        // Frost effect: blur + brightness + saturation
        tempCtx.filter = `blur(${intensity/2}px) brightness(1.2) saturate(0.5)`;
        tempCtx.drawImage(tempCanvas, 0, 0);
        // Add some noise
        const imgData = tempCtx.getImageData(0, 0, sw, sh);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const noise = (Math.random() - 0.5) * intensity * 5;
          data[i] = Math.min(255, Math.max(0, data[i] + noise));
          data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise));
          data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise));
        }
        tempCtx.putImageData(imgData, 0, 0);
      }
      
      // Draw blurred section back to main canvas
      ctx.drawImage(tempCanvas, 0, 0, sw, sh, sx, sy, sw, sh);
      
      setProcessedUrl(canvas.toDataURL(file.type));
    };
    img.src = previewUrl;
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
                  onClick={() => { setFile(null); setPreviewUrl(null); setProcessedUrl(null); setSelection(null); }}
                  className="text-xs font-bold uppercase tracking-wider text-muted hover:text-foreground"
                >
                  Start Over
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setMode('full'); setSelection(null); }}
                    className={`flex-1 py-2 text-xs font-bold uppercase ${mode === 'full' ? 'bg-accent text-white' : 'bg-background brutal-border'}`}
                  >
                    Full Blur
                  </button>
                  <button 
                    onClick={() => setMode('area')}
                    className={`flex-1 py-2 text-xs font-bold uppercase ${mode === 'area' ? 'bg-accent text-white' : 'bg-background brutal-border'}`}
                  >
                    Custom Area
                  </button>
                </div>
                
                {mode === 'area' && (
                  <p className="text-xs text-muted font-bold">
                    👉 Draw a rectangle on the image to select the area to blur.
                  </p>
                )}
                
                <div>
                  <label className="block text-sm font-bold mb-2">Blur Type</label>
                  <select 
                    value={blurType} 
                    onChange={(e) => setBlurType(e.target.value as any)}
                    className="w-full brutal-border p-2 bg-background"
                  >
                    <option value="gaussian">Gaussian Blur</option>
                    <option value="pixelate">Pixelate</option>
                    <option value="frost">Frost Glass</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold mb-2">Intensity: {intensity}</label>
                  <input 
                    type="range" 
                    min="1" max="50" 
                    value={intensity} 
                    onChange={(e) => setIntensity(Number(e.target.value))}
                    className="w-full accent-accent"
                  />
                </div>
                
                <button 
                  onClick={applyBlur}
                  className="w-full brutal-btn-primary py-3 flex items-center justify-center gap-2"
                >
                  <Droplets className="h-5 w-5" /> Apply Blur
                </button>
              </div>
            </div>
            
            {processedUrl && (
              <a 
                href={processedUrl} 
                download={`blurred_${file.name}`}
                className="w-full brutal-btn-primary py-3 flex items-center justify-center gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white"
              >
                <Download className="h-5 w-5" /> Download Image
              </a>
            )}
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-surface brutal-border p-4 h-full min-h-[400px] flex flex-col">
              <h3 className="font-display font-bold mb-4">{processedUrl ? 'Result' : 'Preview'}</h3>
              <div className="flex-1 relative bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyEgSRC0AQB9CGwScB1zWAAAAABJRU5ErkJggg==')] rounded-lg overflow-hidden flex items-center justify-center border-2 border-border-color">
                {processedUrl ? (
                  <img loading="lazy" src={processedUrl} alt="Blurred" className="max-w-full max-h-full object-contain shadow-lg" />
                ) : (
                  <div className="relative inline-block max-w-full max-h-full">
                    <img loading="lazy" ref={imageRef}
                      src={previewUrl!} 
                      alt="Preview" 
                      className={`max-w-full max-h-full block ${mode === 'area' ? 'cursor-crosshair' : ''}`}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      draggable={false}
                    />
                    
                    {mode === 'area' && selection && (
                      <div 
                        className="absolute border-2 border-accent bg-accent/20 pointer-events-none"
                        style={{
                          left: `${selection.x}%`,
                          top: `${selection.y}%`,
                          width: `${selection.w}%`,
                          height: `${selection.h}%`,
                        }}
                      ></div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
