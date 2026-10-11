import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Settings, Stamp, Type, Image as ImageIcon } from 'lucide-react';

export function WatermarkAdder() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [mode, setMode] = useState<'text' | 'image'>('text');
  
  // Text watermark state
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState('#ffffff');
  const [opacity, setOpacity] = useState(50);
  const [position, setPosition] = useState('center');
  const [repeat, setRepeat] = useState(false);
  
  // Image watermark state
  const [wmFile, setWmFile] = useState<File | null>(null);
  const [wmPreviewUrl, setWmUrl] = useState<string | null>(null);
  const [wmSize, setWmSize] = useState(30); // percentage of main image width
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wmInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleWmFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      if (!selected.type.startsWith('image/')) return;
      setWmFile(selected);
      setWmUrl(URL.createObjectURL(selected));
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
  };

  const getCoordinates = (pos: string, imgW: number, imgH: number, itemW: number, itemH: number) => {
    let x = 0, y = 0;
    const padding = 20;
    
    switch (pos) {
      case 'tl': x = padding; y = padding; break;
      case 'tc': x = (imgW - itemW) / 2; y = padding; break;
      case 'tr': x = imgW - itemW - padding; y = padding; break;
      case 'ml': x = padding; y = (imgH - itemH) / 2; break;
      case 'center': x = (imgW - itemW) / 2; y = (imgH - itemH) / 2; break;
      case 'mr': x = imgW - itemW - padding; y = (imgH - itemH) / 2; break;
      case 'bl': x = padding; y = imgH - itemH - padding; break;
      case 'bc': x = (imgW - itemW) / 2; y = imgH - itemH - padding; break;
      case 'br': x = imgW - itemW - padding; y = imgH - itemH - padding; break;
    }
    return { x, y };
  };

  const applyWatermark = () => {
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
      
      ctx.globalAlpha = opacity / 100;
      
      if (mode === 'text' && text) {
        ctx.fillStyle = color;
        // Scale font size based on image width to make it responsive
        const scaledFontSize = (fontSize / 1000) * img.width;
        ctx.font = `bold ${scaledFontSize}px sans-serif`;
        ctx.textBaseline = 'top';
        
        const metrics = ctx.measureText(text);
        const textW = metrics.width;
        const textH = scaledFontSize; // approximation
        
        if (repeat) {
          // Draw diagonal repeating pattern
          ctx.translate(img.width / 2, img.height / 2);
          ctx.rotate(-Math.PI / 4);
          
          const stepX = textW * 1.5;
          const stepY = textH * 3;
          const diag = Math.sqrt(img.width * img.width + img.height * img.height);
          
          for (let x = -diag; x < diag; x += stepX) {
            for (let y = -diag; y < diag; y += stepY) {
              ctx.fillText(text, x, y);
            }
          }
          
          ctx.rotate(Math.PI / 4);
          ctx.translate(-img.width / 2, -img.height / 2);
        } else {
          const { x, y } = getCoordinates(position, img.width, img.height, textW, textH);
          
          // Add slight shadow for better visibility
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          ctx.fillText(text, x, y);
          
          ctx.shadowColor = 'transparent';
        }
        
        setProcessedUrl(canvas.toDataURL(file.type));
      } else if (mode === 'image' && wmPreviewUrl) {
        const wmImg = new Image();
        wmImg.onload = () => {
          const targetW = img.width * (wmSize / 100);
          const targetH = wmImg.height * (targetW / wmImg.width);
          
          if (repeat) {
            // Simple tile repeat
            for (let x = 0; x < img.width; x += targetW + 20) {
              for (let y = 0; y < img.height; y += targetH + 20) {
                ctx.drawImage(wmImg, x, y, targetW, targetH);
              }
            }
          } else {
            const { x, y } = getCoordinates(position, img.width, img.height, targetW, targetH);
            ctx.drawImage(wmImg, x, y, targetW, targetH);
          }
          
          setProcessedUrl(canvas.toDataURL(file.type));
        };
        wmImg.src = wmPreviewUrl;
      } else {
        setProcessedUrl(canvas.toDataURL(file.type));
      }
    };
    img.src = previewUrl;
  };

  // Live preview update
  useEffect(() => {
    if (file && previewUrl) {
      applyWatermark();
    }
  }, [text, fontSize, color, opacity, position, repeat, mode, wmPreviewUrl, wmSize]);

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
                <div className="flex gap-2">
                  <button 
                    onClick={() => setMode('text')}
                    className={`flex-1 py-2 text-xs font-bold uppercase flex items-center justify-center gap-2 ${mode === 'text' ? 'bg-accent text-white' : 'bg-background brutal-border'}`}
                  >
                    <Type className="h-4 w-4" /> Text
                  </button>
                  <button 
                    onClick={() => setMode('image')}
                    className={`flex-1 py-2 text-xs font-bold uppercase flex items-center justify-center gap-2 ${mode === 'image' ? 'bg-accent text-white' : 'bg-background brutal-border'}`}
                  >
                    <ImageIcon className="h-4 w-4" /> Image
                  </button>
                </div>
                
                {mode === 'text' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Watermark Text</label>
                      <input 
                        type="text" 
                        value={text} 
                        onChange={(e) => setText(e.target.value)}
                        className="w-full brutal-border p-2 bg-background"
                        placeholder="Enter text..."
                      />
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-bold mb-2">Size: {fontSize}</label>
                        <input 
                          type="range" 
                          min="10" max="200" 
                          value={fontSize} 
                          onChange={(e) => setFontSize(Number(e.target.value))}
                          className="w-full accent-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Color</label>
                        <input 
                          type="color" 
                          value={color} 
                          onChange={(e) => setColor(e.target.value)}
                          className="h-8 w-16 p-0 brutal-border cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Watermark Image</label>
                      <input 
                        type="file" 
                        ref={wmInputRef} 
                        onChange={handleWmFileChange} 
                        accept="image/png, image/svg+xml" 
                        className="hidden" 
                      />
                      <button 
                        onClick={() => wmInputRef.current?.click()}
                        className="w-full brutal-border bg-background hover:bg-surface py-2 text-sm font-bold flex items-center justify-center gap-2"
                      >
                        <Upload className="h-4 w-4" /> {wmFile ? wmFile.name : 'Choose PNG/SVG'}
                      </button>
                    </div>
                    
                    {wmFile && (
                      <div>
                        <label className="block text-sm font-bold mb-2">Size: {wmSize}%</label>
                        <input 
                          type="range" 
                          min="5" max="100" 
                          value={wmSize} 
                          onChange={(e) => setWmSize(Number(e.target.value))}
                          className="w-full accent-accent"
                        />
                      </div>
                    )}
                  </div>
                )}
                
                <div className="pt-4 border-t-2 border-border-color space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Opacity: {opacity}%</label>
                    <input 
                      type="range" 
                      min="1" max="100" 
                      value={opacity} 
                      onChange={(e) => setOpacity(Number(e.target.value))}
                      className="w-full accent-accent"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="repeat"
                      checked={repeat}
                      onChange={(e) => setRepeat(e.target.checked)}
                      className="h-4 w-4 accent-accent"
                    />
                    <label htmlFor="repeat" className="text-sm font-bold cursor-pointer">Repeat Pattern</label>
                  </div>
                  
                  {!repeat && (
                    <div>
                      <label className="block text-sm font-bold mb-2">Position</label>
                      <div className="grid grid-cols-3 gap-1 w-32 mx-auto">
                        {['tl', 'tc', 'tr', 'ml', 'center', 'mr', 'bl', 'bc', 'br'].map(pos => (
                          <button
                            key={pos}
                            onClick={() => setPosition(pos)}
                            className={`h-8 w-8 border ${position === pos ? 'bg-accent border-accent' : 'bg-background border-border-color hover:bg-surface'}`}
                            title={pos.toUpperCase()}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {processedUrl && (
              <a 
                href={processedUrl} 
                download={`watermarked_${file.name}`}
                className="w-full brutal-btn-primary py-3 flex items-center justify-center gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white"
              >
                <Download className="h-5 w-5" /> Download Image
              </a>
            )}
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-surface brutal-border p-4 h-full min-h-[400px] flex flex-col">
              <h3 className="font-display font-bold mb-4">Live Preview</h3>
              <div className="flex-1 relative bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyEgSRC0AQB9CGwScB1zWAAAAABJRU5ErkJggg==')] rounded-lg overflow-hidden flex items-center justify-center border-2 border-border-color p-4">
                <img loading="lazy" src={processedUrl || previewUrl!} 
                  alt="Preview" 
                  className="max-w-full max-h-full object-contain shadow-lg" 
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
