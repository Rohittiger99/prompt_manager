import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, ClipboardPaste, Copy, Check } from 'lucide-react';
import { useToast } from '../../components/ToastProvider';

export function PasteToImage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [outputFormat, setOutputFormat] = useState('image/png');
  const [quality, setQuality] = useState(80);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              processFile(blob);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

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
    setOutputFormat(selectedFile.type === 'image/jpeg' ? 'image/jpeg' : 'image/png');
  };

  const getProcessedDataUrl = () => {
    if (!previewUrl) return null;
    
    const img = new Image();
    img.src = previewUrl;
    
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    canvas.width = img.width;
    canvas.height = img.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    if (outputFormat === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL(outputFormat, quality / 100);
  };

  const handleCopy = async () => {
    if (!previewUrl) return;
    
    try {
      const dataUrl = getProcessedDataUrl();
      if (!dataUrl) return;
      
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      
      setCopied(true);
      toast('Copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy image: ', err);
      toast('Failed to copy image to clipboard. Your browser might not support this feature.', 'error');
    }
  };

  const handleDownload = () => {
    const dataUrl = getProcessedDataUrl();
    if (!dataUrl) return;
    
    const ext = outputFormat === 'image/jpeg' ? 'jpg' : outputFormat.split('/')[1];
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `pasted_image_${new Date().getTime()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-8">
      {!file ? (
        <div 
          className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors min-h-[400px] flex flex-col items-center justify-center ${isDragging ? 'border-[#00D4FF] bg-[#00D4FF]/10' : 'border-[#00D4FF] hover:bg-[#00D4FF]/5'}`}
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
          <div className="h-20 w-20 bg-surface brutal-border flex items-center justify-center mb-6 text-accent animate-bounce">
            <ClipboardPaste className="h-10 w-10" />
          </div>
          <h2 className="text-3xl font-display font-black mb-4">
            Press <kbd className="bg-surface brutal-border px-2 py-1 text-accent">Ctrl+V</kbd> to paste
          </h2>
          <p className="text-muted text-lg mb-6">or drag and drop an image here</p>
          <button className="brutal-btn-secondary px-6 py-2 text-sm">
            Click to Browse Files
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-surface brutal-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display font-bold">Export Options</h3>
                <button 
                  onClick={() => { setFile(null); setPreviewUrl(null); }}
                  className="text-xs font-bold uppercase tracking-wider text-muted hover:text-foreground"
                >
                  Clear
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Format</label>
                  <select 
                    value={outputFormat} 
                    onChange={(e) => setOutputFormat(e.target.value)}
                    className="w-full brutal-border p-2 bg-background"
                  >
                    <option value="image/png">PNG (Transparent)</option>
                    <option value="image/jpeg">JPG (Smaller)</option>
                    <option value="image/webp">WEBP (Modern)</option>
                  </select>
                </div>
                
                {(outputFormat === 'image/jpeg' || outputFormat === 'image/webp') && (
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
                
                <div className="pt-4 space-y-3">
                  <button 
                    onClick={handleCopy}
                    className="w-full brutal-btn-secondary py-3 flex items-center justify-center gap-2"
                  >
                    {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                  </button>
                  
                  <button 
                    onClick={handleDownload}
                    className="w-full brutal-btn-primary py-3 flex items-center justify-center gap-2"
                  >
                    <Download className="h-5 w-5" /> Download Image
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-surface brutal-border p-4 h-full min-h-[400px] flex flex-col">
              <h3 className="font-display font-bold mb-4">Pasted Image</h3>
              <div className="flex-1 relative bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyEgSRC0AQB9CGwScB1zWAAAAABJRU5ErkJggg==')] rounded-lg overflow-hidden flex items-center justify-center border-2 border-border-color p-4">
                <img loading="lazy" src={previewUrl!} 
                  alt="Pasted" 
                  className="max-w-full max-h-full object-contain shadow-lg" 
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    const canvas = canvasRef.current;
                    if (canvas) {
                      canvas.width = img.naturalWidth;
                      canvas.height = img.naturalHeight;
                      const ctx = canvas.getContext('2d');
                      if (ctx) ctx.drawImage(img, 0, 0);
                    }
                  }}
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
