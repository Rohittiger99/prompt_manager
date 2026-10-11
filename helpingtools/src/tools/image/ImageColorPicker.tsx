import React, { useState, useRef, useEffect } from 'react';
import { Upload, Palette, Copy, Check } from 'lucide-react';

export function ImageColorPicker() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const [colorHistory, setColorHistory] = useState<string[]>([]);
  
  const [copiedHex, setCopiedHex] = useState(false);
  const [copiedRgb, setCopiedRgb] = useState(false);
  const [copiedHsl, setCopiedHsl] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

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
    setPickedColor(null);
    setHoverColor(null);
  };

  const drawImageToCanvas = () => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    
    // Set canvas size to match displayed image size to get accurate coordinates
    const rect = img.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };

  const getColorAtEvent = (e: React.MouseEvent<HTMLImageElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    try {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      return rgbToHex(pixel[0], pixel[1], pixel[2]);
    } catch (err) {
      // Cross-origin issues if image is not local
      return null;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    const color = getColorAtEvent(e);
    if (color) setHoverColor(color);
  };

  const handleMouseLeave = () => {
    setHoverColor(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const color = getColorAtEvent(e);
    if (color) {
      setPickedColor(color);
      setColorHistory(prev => {
        const newHistory = [color, ...prev.filter(c => c !== color)].slice(0, 10);
        return newHistory;
      });
    }
  };

  // Color conversion utilities
  const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('').toUpperCase();
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const hexToHsl = (hex: string) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    
    let { r, g, b } = rgb;
    r /= 255; g /= 255; b /= 255;
    
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  const copyToClipboard = (text: string, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const renderColorDetails = (hex: string) => {
    const rgb = hexToRgb(hex);
    const hsl = hexToHsl(hex);
    
    const rgbStr = rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : '';
    const hslStr = hsl ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` : '';
    
    return (
      <div className="space-y-4 w-full">
        <div className="flex items-center justify-between p-3 bg-background brutal-border">
          <span className="font-mono text-sm font-bold">{hex}</span>
          <button 
            onClick={() => copyToClipboard(hex, setCopiedHex)}
            className="text-xs font-bold uppercase text-accent hover:text-accent/80 flex items-center gap-1"
          >
            {copiedHex ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copiedHex ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="flex items-center justify-between p-3 bg-background brutal-border">
          <span className="font-mono text-sm font-bold">{rgbStr}</span>
          <button 
            onClick={() => copyToClipboard(rgbStr, setCopiedRgb)}
            className="text-xs font-bold uppercase text-accent hover:text-accent/80 flex items-center gap-1"
          >
            {copiedRgb ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copiedRgb ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="flex items-center justify-between p-3 bg-background brutal-border">
          <span className="font-mono text-sm font-bold">{hslStr}</span>
          <button 
            onClick={() => copyToClipboard(hslStr, setCopiedHsl)}
            className="text-xs font-bold uppercase text-accent hover:text-accent/80 flex items-center gap-1"
          >
            {copiedHsl ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copiedHsl ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    );
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
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-surface brutal-border p-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold flex items-center gap-2">
                  <Palette className="h-4 w-4" /> Click on image to pick color
                </h3>
                <button 
                  onClick={() => { setFile(null); setPreviewUrl(null); }}
                  className="text-xs font-bold uppercase tracking-wider text-muted hover:text-foreground"
                >
                  Change Image
                </button>
              </div>
              
              <div className="relative bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyEgSRC0AQB9CGwScB1zWAAAAABJRU5ErkJggg==')] rounded-lg overflow-hidden border-2 border-border-color flex items-center justify-center min-h-[400px]">
                <img loading="lazy" ref={imageRef}
                  src={previewUrl!} 
                  alt="Preview" 
                  className="max-w-full max-h-[600px] object-contain cursor-crosshair" 
                  onLoad={drawImageToCanvas}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  onClick={handleClick}
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Hover color indicator */}
                {hoverColor && (
                  <div 
                    className="absolute top-4 right-4 w-12 h-12 rounded-full border-4 border-white shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none z-10"
                    style={{ backgroundColor: hoverColor }}
                  />
                )}
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-surface brutal-border p-6">
              <h3 className="font-display font-bold mb-4">Picked Color</h3>
              
              {pickedColor ? (
                <div className="space-y-6 flex flex-col items-center">
                  <div 
                    className="w-32 h-32 rounded-full border-4 border-border-color shadow-lg"
                    style={{ backgroundColor: pickedColor }}
                  />
                  {renderColorDetails(pickedColor)}
                </div>
              ) : (
                <div className="text-center py-12 text-muted border-2 border-dashed border-border-color">
                  <Palette className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p className="font-bold">No color picked yet</p>
                  <p className="text-sm">Click anywhere on the image</p>
                </div>
              )}
            </div>
            
            {colorHistory.length > 0 && (
              <div className="bg-surface brutal-border p-6">
                <h3 className="font-display font-bold mb-4">History</h3>
                <div className="flex flex-wrap gap-2">
                  {colorHistory.map((color, idx) => (
                    <button
                      key={`${color}-${idx}`}
                      onClick={() => setPickedColor(color)}
                      className="w-10 h-10 rounded-full border-2 border-border-color hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
