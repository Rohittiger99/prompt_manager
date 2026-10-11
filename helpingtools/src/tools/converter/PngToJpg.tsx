import React, { useState } from 'react';
import { ConverterUploadZone } from './ConverterUploadZone';
import { Download, Loader2, Image as ImageIcon, ArrowRight } from 'lucide-react';

export function PngToJpg() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{url: string, size: number} | null>(null);
  const [quality, setQuality] = useState(90);

  const convert = () => {
    if (!file) return;
    setIsProcessing(true);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      // Fill white background since PNG might have transparency
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
      canvas.toBlob((blob) => {
        if (blob) {
          setResult({
            url: URL.createObjectURL(blob),
            size: blob.size
          });
        }
        setIsProcessing(false);
      }, 'image/jpeg', quality / 100);
    };
    img.src = URL.createObjectURL(file);
  };

  const formatSize = (bytes: number) => (bytes / 1024 / 1024).toFixed(2) + ' MB';

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {!file ? (
        <ConverterUploadZone onFileSelect={setFile} accept="image/png" title="Drop PNG image here" subtitle="Converts PNG to JPG" />
      ) : (
        <div className="space-y-6">
          <div className="bg-surface brutal-border p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display font-bold text-xl">{file.name}</h3>
              <button onClick={() => { setFile(null); setResult(null); }} className="text-xs font-bold uppercase text-muted hover:text-foreground">Change File</button>
            </div>
            
            {!result && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2">JPG Quality: {quality}%</label>
                  <input 
                    type="range" min="10" max="100" 
                    value={quality} onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-[#8B5CF6]"
                  />
                </div>
                <button onClick={convert} disabled={isProcessing} className="w-full brutal-btn-primary bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-4 flex items-center justify-center gap-2">
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                  {isProcessing ? 'Converting...' : 'Convert to JPG'}
                </button>
              </div>
            )}
          </div>
          {result && (
            <div className="bg-surface brutal-border p-6 text-center">
              <h3 className="font-display font-bold text-2xl mb-6">Conversion Complete</h3>
              <div className="flex justify-center items-center gap-8 mb-8">
                <div className="text-center">
                  <span className="inline-block bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs font-bold mb-2">PNG</span>
                  <p className="text-xl font-mono">{formatSize(file.size)}</p>
                </div>
                <ArrowRight className="h-8 w-8 text-muted" />
                <div className="text-center">
                  <span className="inline-block bg-[#8B5CF6] text-white px-2 py-1 rounded text-xs font-bold mb-2">JPG</span>
                  <p className="text-xl font-mono font-bold text-[#8B5CF6]">{formatSize(result.size)}</p>
                </div>
              </div>
              <a href={result.url} download={`${file.name.split('.')[0]}.jpg`} className="w-full brutal-btn-primary bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-4 flex items-center justify-center gap-2">
                <Download className="h-5 w-5" /> Download JPG
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
