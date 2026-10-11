import React, { useState, useRef } from 'react';
import { Upload, Download, Settings, Eraser, Loader2 } from 'lucide-react';

export function BackgroundRemover() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setResultUrl(null);
    setProgress(0);
    setStatusText('');
  };

  const handleRemoveBackground = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setProgress(10);
    setStatusText('Loading AI model...');
    
    try {
      // Dynamically import the library from CDN
      // @ts-ignore
      const imglyRemoveBackground = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/index.mjs');
      
      setStatusText('Processing image...');
      setProgress(40);
      
      const config = {
        progress: (key: string, current: number, total: number) => {
          const p = Math.round((current / total) * 100);
          if (key.includes('compute')) {
            setProgress(40 + (p * 0.5));
            setStatusText(`Removing background: ${p}%`);
          } else if (key.includes('fetch')) {
            setProgress(10 + (p * 0.3));
            setStatusText(`Downloading model: ${p}%`);
          }
        }
      };
      
      const blob = await imglyRemoveBackground.default(file, config);
      
      setProgress(100);
      setStatusText('Done!');
      setResultUrl(URL.createObjectURL(blob));
    } catch (error) {
      console.error("Background removal error:", error);
      setStatusText('Error processing image. Please try a smaller image.');
    } finally {
      setIsProcessing(false);
    }
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
                  <Settings className="h-4 w-4" /> Controls
                </h3>
                <button 
                  onClick={() => { setFile(null); setPreviewUrl(null); setResultUrl(null); }}
                  className="text-xs font-bold uppercase tracking-wider text-muted hover:text-foreground"
                  disabled={isProcessing}
                >
                  Start Over
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-[#E3F2FD] dark:bg-[#0D47A1]/20 brutal-border text-sm">
                  <p className="font-bold text-[#1565C0] dark:text-[#90CAF9] mb-1">Privacy First</p>
                  <p className="text-muted">Processing happens locally in your browser using AI — no image is uploaded to any server.</p>
                </div>
                
                {!resultUrl && (
                  <button 
                    onClick={handleRemoveBackground}
                    disabled={isProcessing}
                    className="w-full brutal-btn-primary py-4 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <Eraser className="h-5 w-5" /> Remove Background
                      </>
                    )}
                  </button>
                )}
                
                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span>{statusText}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 w-full bg-background brutal-border overflow-hidden">
                      <div 
                        className="h-full bg-accent transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {resultUrl && (
              <div className="bg-[#E8F5E9] dark:bg-[#0A1F10] brutal-border p-6 text-center">
                <h3 className="font-display font-bold text-[#2E7D32] dark:text-[#81C784] mb-4">Background Removed!</h3>
                <a 
                  href={resultUrl} 
                  download={`nobg_${file.name.split('.')[0]}.png`}
                  className="w-full brutal-btn-primary py-3 flex items-center justify-center gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white"
                >
                  <Download className="h-5 w-5" /> Download PNG
                </a>
              </div>
            )}
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-surface brutal-border p-4 h-full min-h-[400px] flex flex-col">
              <h3 className="font-display font-bold mb-4">Preview</h3>
              <div className="flex-1 relative bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyEgSRC0AQB9CGwScB1zWAAAAABJRU5ErkJggg==')] rounded-lg overflow-hidden flex items-center justify-center border-2 border-border-color">
                {resultUrl ? (
                  <div className="w-full h-full relative flex">
                    <div className="w-1/2 h-full border-r-2 border-accent relative overflow-hidden">
                      <img loading="lazy" src={previewUrl!} alt="Original" className="absolute top-0 left-0 w-[200%] h-full object-contain max-w-none origin-top-left bg-white" />
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-bold">Original</div>
                    </div>
                    <div className="w-1/2 h-full relative overflow-hidden">
                      <img loading="lazy" src={resultUrl} alt="Result" className="absolute top-0 right-0 w-[200%] h-full object-contain max-w-none origin-top-right" />
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-bold">Result</div>
                    </div>
                  </div>
                ) : (
                  <img loading="lazy" src={previewUrl!} alt="Preview" className="max-w-full max-h-full object-contain shadow-lg" />
                )}
                
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                    <Loader2 className="h-12 w-12 animate-spin mb-4 text-accent" />
                    <p className="font-display font-bold text-xl">🤖 Processing with AI...</p>
                    <p className="text-sm mt-2 opacity-80">{statusText}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
