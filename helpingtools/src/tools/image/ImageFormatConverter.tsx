import React, { useState, useRef } from 'react';
import { Upload, Download, Settings, Image as ImageIcon } from 'lucide-react';

export function ImageFormatConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [convertedUrl, setConvertedUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [targetFormat, setTargetFormat] = useState('image/jpeg');
  const [quality, setQuality] = useState(80);
  
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
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setConvertedUrl(null);
    
    // Auto-select a different format
    if (selectedFile.type === 'image/jpeg') setTargetFormat('image/png');
    else setTargetFormat('image/jpeg');
  };

  const handleConvert = () => {
    if (!file || !previewUrl) return;
    
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // If converting to JPEG, fill background with white (since JPEG doesn't support transparency)
      if (targetFormat === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      ctx.drawImage(img, 0, 0);
      
      const dataUrl = canvas.toDataURL(targetFormat, quality / 100);
      setConvertedUrl(dataUrl);
    };
    img.src = previewUrl;
  };

  const getFormatLabel = (mimeType: string) => {
    return mimeType.split('/')[1].toUpperCase();
  };

  const getExtension = (mimeType: string) => {
    if (mimeType === 'image/jpeg') return 'jpg';
    return mimeType.split('/')[1];
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
          <p className="text-muted">JPG, PNG, WEBP, GIF, BMP, SVG — Max 20MB</p>
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
                  onClick={() => { setFile(null); setPreviewUrl(null); setConvertedUrl(null); }}
                  className="text-xs font-bold uppercase tracking-wider text-muted hover:text-foreground"
                >
                  Start Over
                </button>
              </div>
              
              <div className="mb-6 p-3 bg-background brutal-border flex items-center justify-between">
                <span className="text-sm font-bold">Detected Format:</span>
                <span className="bg-accent text-white px-2 py-1 text-xs font-bold rounded">
                  {getFormatLabel(file.type)}
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-3">Target Format</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'image/jpeg', label: 'JPG' },
                      { id: 'image/png', label: 'PNG' },
                      { id: 'image/webp', label: 'WEBP' },
                      { id: 'image/bmp', label: 'BMP' },
                    ].map(f => (
                      <label 
                        key={f.id}
                        className={`flex items-center justify-center py-3 brutal-border cursor-pointer transition-colors ${targetFormat === f.id ? 'bg-accent text-white' : 'bg-background hover:bg-surface'}`}
                      >
                        <input 
                          type="radio" 
                          name="format" 
                          value={f.id}
                          checked={targetFormat === f.id}
                          onChange={() => setTargetFormat(f.id)}
                          className="hidden"
                        />
                        <span className="font-bold">{f.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {(targetFormat === 'image/jpeg' || targetFormat === 'image/webp') && (
                  <div className="pt-4">
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
                
                <button 
                  onClick={handleConvert}
                  className="w-full brutal-btn-primary py-3 mt-4 flex items-center justify-center gap-2"
                >
                  <ImageIcon className="h-5 w-5" /> Convert Image
                </button>
              </div>
            </div>
            
            {convertedUrl && (
              <div className="bg-[#E8F5E9] dark:bg-[#0A1F10] brutal-border p-6 text-center">
                <h3 className="font-display font-bold text-[#2E7D32] dark:text-[#81C784] mb-4">Conversion Complete!</h3>
                <a 
                  href={convertedUrl} 
                  download={`converted_${file.name.split('.')[0]}.${getExtension(targetFormat)}`}
                  className="w-full brutal-btn-primary py-3 flex items-center justify-center gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white"
                >
                  <Download className="h-5 w-5" /> Download {getFormatLabel(targetFormat)}
                </a>
              </div>
            )}
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-surface brutal-border p-4 h-full min-h-[400px] flex flex-col">
              <h3 className="font-display font-bold mb-4">Preview</h3>
              <div className="flex-1 relative bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyEgSRC0AQB9CGwScB1zWAAAAABJRU5ErkJggg==')] rounded-lg overflow-hidden flex items-center justify-center border-2 border-border-color p-4">
                {convertedUrl ? (
                  <div className="w-full h-full relative flex">
                    <div className="w-1/2 h-full border-r-2 border-accent relative overflow-hidden">
                      <img loading="lazy" src={previewUrl!} alt="Original" className="absolute top-0 left-0 w-[200%] h-full object-contain max-w-none origin-top-left" />
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-bold">Original ({getFormatLabel(file.type)})</div>
                    </div>
                    <div className="w-1/2 h-full relative overflow-hidden">
                      <img loading="lazy" src={convertedUrl} alt="Converted" className="absolute top-0 right-0 w-[200%] h-full object-contain max-w-none origin-top-right" />
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-bold">Converted ({getFormatLabel(targetFormat)})</div>
                    </div>
                  </div>
                ) : (
                  <img loading="lazy" src={previewUrl!} alt="Preview" className="max-w-full max-h-full object-contain shadow-lg" />
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
