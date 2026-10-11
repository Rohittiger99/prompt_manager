import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Settings, RotateCw, RotateCcw, FlipHorizontal, FlipVertical } from 'lucide-react';

export function ImageRotator() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [angle, setAngle] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [bgColor, setBgColor] = useState('#ffffff');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    setAngle(0);
    setFlipH(false);
    setFlipV(false);
  };

  useEffect(() => {
    if (!file || !previewUrl) return;
    
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Calculate new dimensions based on angle
      const rad = (angle * Math.PI) / 180;
      const absCos = Math.abs(Math.cos(rad));
      const absSin = Math.abs(Math.sin(rad));
      
      const newWidth = img.width * absCos + img.height * absSin;
      const newHeight = img.width * absSin + img.height * absCos;
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Fill background if not a multiple of 90
      if (angle % 90 !== 0) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, newWidth, newHeight);
      }
      
      ctx.translate(newWidth / 2, newHeight / 2);
      ctx.rotate(rad);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      
      setProcessedUrl(canvas.toDataURL(file.type));
    };
    img.src = previewUrl;
  }, [angle, flipH, flipV, bgColor, file, previewUrl]);

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
                  onClick={() => { setFile(null); setPreviewUrl(null); setProcessedUrl(null); }}
                  className="text-xs font-bold uppercase tracking-wider text-muted hover:text-foreground"
                >
                  Start Over
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2">Quick Actions</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setAngle(a => (a - 90) % 360)}
                      className="py-2 flex items-center justify-center gap-2 text-xs font-bold bg-background brutal-border hover:bg-surface"
                    >
                      <RotateCcw className="h-4 w-4" /> Left 90°
                    </button>
                    <button 
                      onClick={() => setAngle(a => (a + 90) % 360)}
                      className="py-2 flex items-center justify-center gap-2 text-xs font-bold bg-background brutal-border hover:bg-surface"
                    >
                      <RotateCw className="h-4 w-4" /> Right 90°
                    </button>
                    <button 
                      onClick={() => setFlipH(!flipH)}
                      className={`py-2 flex items-center justify-center gap-2 text-xs font-bold brutal-border ${flipH ? 'bg-accent text-white' : 'bg-background hover:bg-surface'}`}
                    >
                      <FlipHorizontal className="h-4 w-4" /> Flip H
                    </button>
                    <button 
                      onClick={() => setFlipV(!flipV)}
                      className={`py-2 flex items-center justify-center gap-2 text-xs font-bold brutal-border ${flipV ? 'bg-accent text-white' : 'bg-background hover:bg-surface'}`}
                    >
                      <FlipVertical className="h-4 w-4" /> Flip V
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold mb-2">Custom Angle: {angle}°</label>
                  <input 
                    type="range" 
                    min="-360" max="360" 
                    value={angle} 
                    onChange={(e) => setAngle(Number(e.target.value))}
                    className="w-full accent-accent"
                  />
                  <div className="flex justify-between mt-1">
                    <button onClick={() => setAngle(0)} className="text-[10px] text-muted hover:text-foreground font-bold uppercase">Reset</button>
                  </div>
                </div>
                
                {angle % 90 !== 0 && (
                  <div>
                    <label className="block text-sm font-bold mb-2">Background Color</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={bgColor} 
                        onChange={(e) => setBgColor(e.target.value)}
                        className="h-10 w-10 p-0 brutal-border cursor-pointer"
                      />
                      <span className="text-xs font-mono">{bgColor}</span>
                    </div>
                    <p className="text-[10px] text-muted mt-1">Fills empty corners when rotated</p>
                  </div>
                )}
              </div>
            </div>
            
            {processedUrl && (
              <a 
                href={processedUrl} 
                download={`rotated_${file.name}`}
                className="w-full brutal-btn-primary py-3 flex items-center justify-center gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white"
              >
                <Download className="h-5 w-5" /> Download Image
              </a>
            )}
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-surface brutal-border p-4 h-full min-h-[400px] flex flex-col">
              <h3 className="font-display font-bold mb-4">Preview</h3>
              <div className="flex-1 relative bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyEgSRC0AQB9CGwScB1zWAAAAABJRU5ErkJggg==')] rounded-lg overflow-hidden flex items-center justify-center border-2 border-border-color p-4">
                <img loading="lazy" ref={imageRef}
                  src={processedUrl || previewUrl!} 
                  alt="Preview" 
                  className="max-w-full max-h-full object-contain shadow-lg transition-transform duration-200" 
                />
              </div>
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
