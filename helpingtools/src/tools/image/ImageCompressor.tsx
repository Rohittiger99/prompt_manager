import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Image as ImageIcon, Settings, RefreshCw } from 'lucide-react';
import { useToast } from '../../components/ToastProvider';

export function ImageCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [quality, setQuality] = useState(70);
  const [maxWidthOrHeight, setMaxWidthOrHeight] = useState<number | ''>('');
  const [outputFormat, setOutputFormat] = useState('same');
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load browser-image-compression from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/browser-image-compression@2.0.2/dist/browser-image-compression.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
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
    setCompressedFile(null);
    setCompressedUrl(null);
  };

  const handleCompress = async () => {
    if (!file) return;
    setIsCompressing(true);
    
    try {
      // @ts-ignore - loaded from CDN
      const imageCompression = window.imageCompression;
      if (!imageCompression) throw new Error("Compression library not loaded");

      let fileType = file.type;
      if (outputFormat === 'jpeg') fileType = 'image/jpeg';
      else if (outputFormat === 'png') fileType = 'image/png';
      else if (outputFormat === 'webp') fileType = 'image/webp';

      const options = {
        maxSizeMB: file.size / 1024 / 1024, // Don't restrict by MB, use quality
        maxWidthOrHeight: maxWidthOrHeight || undefined,
        useWebWorker: true,
        initialQuality: quality / 100,
        fileType: fileType,
      };

      const compressed = await imageCompression(file, options);
      setCompressedFile(compressed);
      setCompressedUrl(URL.createObjectURL(compressed));
      toast('Image compressed successfully!', 'success');
    } catch (error) {
      console.error("Compression error:", error);
      toast("Error compressing image.", "error");
    } finally {
      setIsCompressing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSavings = () => {
    if (!file || !compressedFile) return 0;
    return Math.max(0, Math.round((1 - compressedFile.size / file.size) * 100));
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
            accept="image/jpeg, image/png, image/webp, image/gif, image/bmp" 
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
                  onClick={() => { setFile(null); setPreviewUrl(null); setCompressedFile(null); setCompressedUrl(null); }}
                  className="text-xs font-bold uppercase tracking-wider text-muted hover:text-foreground"
                >
                  Start Over
                </button>
              </div>
              
              <div className="space-y-4">
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
                
                <div>
                  <label className="block text-sm font-bold mb-2">Max Resolution (px)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 1920 (optional)" 
                    value={maxWidthOrHeight}
                    onChange={(e) => setMaxWidthOrHeight(e.target.value ? Number(e.target.value) : '')}
                    className="w-full brutal-border p-2 bg-background"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold mb-2">Output Format</label>
                  <select 
                    value={outputFormat} 
                    onChange={(e) => setOutputFormat(e.target.value)}
                    className="w-full brutal-border p-2 bg-background"
                  >
                    <option value="same">Same as original</option>
                    <option value="jpeg">JPG</option>
                    <option value="png">PNG</option>
                    <option value="webp">WEBP</option>
                  </select>
                </div>
                
                <button 
                  onClick={handleCompress}
                  disabled={isCompressing}
                  className="w-full brutal-btn-primary py-3 flex items-center justify-center gap-2"
                >
                  {isCompressing ? <RefreshCw className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                  {isCompressing ? 'Compressing...' : 'Compress Image'}
                </button>
              </div>
            </div>
            
            {compressedFile && (
              <div className="bg-[#E8F5E9] dark:bg-[#0A1F10] brutal-border p-6 text-center">
                <h3 className="font-display font-bold text-[#2E7D32] dark:text-[#81C784] mb-2">Compression Complete!</h3>
                <p className="text-sm font-bold mb-4">
                  {formatBytes(file.size)} → {formatBytes(compressedFile.size)} — Saved {getSavings()}% 🎉
                </p>
                <a 
                  href={compressedUrl!} 
                  download={`compressed_${file.name}`}
                  className="w-full brutal-btn-primary py-3 flex items-center justify-center gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white"
                >
                  <Download className="h-5 w-5" /> Download Compressed
                </a>
              </div>
            )}
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-surface brutal-border p-4 h-full min-h-[400px] flex flex-col">
              <h3 className="font-display font-bold mb-4">Preview</h3>
              <div className="flex-1 relative bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyEgSRC0AQB9CGwScB1zWAAAAABJRU5ErkJggg==')] rounded-lg overflow-hidden flex items-center justify-center border-2 border-border-color">
                {compressedUrl ? (
                  <div className="w-full h-full relative flex">
                    <div className="w-1/2 h-full border-r-2 border-accent relative overflow-hidden">
                      <img loading="lazy" src={previewUrl!} alt="Original" className="absolute top-0 left-0 w-[200%] h-full object-contain max-w-none origin-top-left" />
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-bold">Original ({formatBytes(file.size)})</div>
                    </div>
                    <div className="w-1/2 h-full relative overflow-hidden">
                      <img loading="lazy" src={compressedUrl} alt="Compressed" className="absolute top-0 right-0 w-[200%] h-full object-contain max-w-none origin-top-right" />
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-bold">Compressed ({formatBytes(compressedFile.size)})</div>
                    </div>
                  </div>
                ) : (
                  <img loading="lazy" src={previewUrl!} alt="Preview" className="max-w-full max-h-full object-contain" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
