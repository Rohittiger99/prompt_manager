import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Settings, Link as LinkIcon, Unlink } from 'lucide-react';

export function ImageResizer() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resizedUrl, setResizedUrl] = useState<string | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });
  const [width, setWidth] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [unit, setUnit] = useState<'px' | '%'>('px');
  const [outputFormat, setOutputFormat] = useState('image/jpeg');
  const [quality, setQuality] = useState(80);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    setResizedUrl(null);
    setOutputFormat(selectedFile.type === 'image/png' ? 'image/png' : 'image/jpeg');
    
    const img = new Image();
    img.onload = () => {
      setOriginalDimensions({ width: img.width, height: img.height });
      setWidth(img.width);
      setHeight(img.height);
    };
    img.src = url;
  };

  const handleWidthChange = (val: string) => {
    const newWidth = val ? Number(val) : '';
    setWidth(newWidth);
    if (lockAspectRatio && newWidth && originalDimensions.width) {
      setHeight(Math.round((newWidth as number) * (originalDimensions.height / originalDimensions.width)));
    }
  };

  const handleHeightChange = (val: string) => {
    const newHeight = val ? Number(val) : '';
    setHeight(newHeight);
    if (lockAspectRatio && newHeight && originalDimensions.height) {
      setWidth(Math.round((newHeight as number) * (originalDimensions.width / originalDimensions.height)));
    }
  };

  const applyPreset = (w: number, h: number) => {
    setWidth(w);
    setHeight(h);
    setLockAspectRatio(false);
    setUnit('px');
  };

  const handleResize = () => {
    if (!previewUrl || !width || !height) return;
    
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      let targetWidth = width as number;
      let targetHeight = height as number;
      
      if (unit === '%') {
        targetWidth = Math.round(originalDimensions.width * (targetWidth / 100));
        targetHeight = Math.round(originalDimensions.height * (targetHeight / 100));
      }
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      
      const dataUrl = canvas.toDataURL(outputFormat, quality / 100);
      setResizedUrl(dataUrl);
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
                  onClick={() => { setFile(null); setPreviewUrl(null); setResizedUrl(null); }}
                  className="text-xs font-bold uppercase tracking-wider text-muted hover:text-foreground"
                >
                  Start Over
                </button>
              </div>
              
              <div className="mb-4 text-sm font-bold text-muted">
                Original: {originalDimensions.width} × {originalDimensions.height} px
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-2 mb-4">
                  <button 
                    onClick={() => setUnit('px')}
                    className={`flex-1 py-1 text-xs font-bold uppercase ${unit === 'px' ? 'bg-accent text-white' : 'bg-background brutal-border'}`}
                  >
                    Pixels
                  </button>
                  <button 
                    onClick={() => setUnit('%')}
                    className={`flex-1 py-1 text-xs font-bold uppercase ${unit === '%' ? 'bg-accent text-white' : 'bg-background brutal-border'}`}
                  >
                    Percentage
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-bold mb-1">Width ({unit})</label>
                    <input 
                      type="number" 
                      value={width}
                      onChange={(e) => handleWidthChange(e.target.value)}
                      className="w-full brutal-border p-2 bg-background"
                    />
                  </div>
                  <button 
                    onClick={() => setLockAspectRatio(!lockAspectRatio)}
                    className="mt-5 p-2 brutal-border bg-background hover:bg-surface"
                    title={lockAspectRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
                  >
                    {lockAspectRatio ? <LinkIcon className="h-4 w-4" /> : <Unlink className="h-4 w-4" />}
                  </button>
                  <div className="flex-1">
                    <label className="block text-xs font-bold mb-1">Height ({unit})</label>
                    <input 
                      type="number" 
                      value={height}
                      onChange={(e) => handleHeightChange(e.target.value)}
                      className="w-full brutal-border p-2 bg-background"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold mb-2">Presets</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { l: '1080p', w: 1920, h: 1080 },
                      { l: '720p', w: 1280, h: 720 },
                      { l: '800x600', w: 800, h: 600 },
                      { l: '500x500', w: 500, h: 500 },
                    ].map(p => (
                      <button 
                        key={p.l}
                        onClick={() => applyPreset(p.w, p.h)}
                        className="text-[10px] font-bold bg-background brutal-border px-2 py-1 hover:bg-accent hover:text-white"
                      >
                        {p.l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-border-color">
                  <label className="block text-sm font-bold mb-2">Output Format</label>
                  <select 
                    value={outputFormat} 
                    onChange={(e) => setOutputFormat(e.target.value)}
                    className="w-full brutal-border p-2 bg-background mb-4"
                  >
                    <option value="image/jpeg">JPG</option>
                    <option value="image/png">PNG</option>
                    <option value="image/webp">WEBP</option>
                  </select>
                  
                  {outputFormat !== 'image/png' && (
                    <div>
                      <label className="block text-sm font-bold mb-2">Quality: {quality}%</label>
                      <input 
                        type="range" 
                        min="10" max="100" 
                        value={quality} 
                        onChange={(e) => setQuality(Number(e.target.value))}
                        className="w-full accent-accent"
                      />
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={handleResize}
                  className="w-full brutal-btn-primary py-3 mt-4"
                >
                  Resize Image
                </button>
              </div>
            </div>
            
            {resizedUrl && (
              <a 
                href={resizedUrl} 
                download={`resized_${file.name}`}
                className="w-full brutal-btn-primary py-3 flex items-center justify-center gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white"
              >
                <Download className="h-5 w-5" /> Download Resized
              </a>
            )}
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-surface brutal-border p-4 h-full min-h-[400px] flex flex-col">
              <h3 className="font-display font-bold mb-4">Preview</h3>
              <div className="flex-1 relative bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyEgSRC0AQB9CGwScB1zWAAAAABJRU5ErkJggg==')] rounded-lg overflow-hidden flex items-center justify-center border-2 border-border-color p-4">
                <img loading="lazy" src={resizedUrl || previewUrl!} alt="Preview" className="max-w-full max-h-full object-contain shadow-lg" />
              </div>
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
