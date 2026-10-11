import React, { useState } from 'react';
import { ConverterUploadZone } from './ConverterUploadZone';
import { Download, Loader2, Image as ImageIcon, ArrowRight } from 'lucide-react';

export function JpgToPng() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{url: string, size: number} | null>(null);

  const convert = () => {
    if (!file) return;
    setIsProcessing(true);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          setResult({
            url: URL.createObjectURL(blob),
            size: blob.size
          });
        }
        setIsProcessing(false);
      }, 'image/png');
    };
    img.src = URL.createObjectURL(file);
  };

  const formatSize = (bytes: number) => (bytes / 1024 / 1024).toFixed(2) + ' MB';

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {!file ? (
        <ConverterUploadZone onFileSelect={setFile} accept="image/jpeg" title="Drop JPG image here" subtitle="Converts JPG to PNG" />
      ) : (
        <div className="space-y-6">
          <div className="bg-surface brutal-border p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display font-bold text-xl">{file.name}</h3>
              <button onClick={() => { setFile(null); setResult(null); }} className="text-xs font-bold uppercase text-muted hover:text-foreground">Change File</button>
            </div>
            {!result && (
              <button onClick={convert} disabled={isProcessing} className="w-full brutal-btn-primary bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-4 flex items-center justify-center gap-2">
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                {isProcessing ? 'Converting...' : 'Convert to PNG'}
              </button>
            )}
          </div>
          {result && (
            <div className="bg-surface brutal-border p-6 text-center">
              <h3 className="font-display font-bold text-2xl mb-6">Conversion Complete</h3>
              <div className="flex justify-center items-center gap-8 mb-8">
                <div className="text-center">
                  <span className="inline-block bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs font-bold mb-2">JPG</span>
                  <p className="text-xl font-mono">{formatSize(file.size)}</p>
                </div>
                <ArrowRight className="h-8 w-8 text-muted" />
                <div className="text-center">
                  <span className="inline-block bg-[#8B5CF6] text-white px-2 py-1 rounded text-xs font-bold mb-2">PNG</span>
                  <p className="text-xl font-mono font-bold text-[#8B5CF6]">{formatSize(result.size)}</p>
                </div>
              </div>
              <a href={result.url} download={`${file.name.split('.')[0]}.png`} className="w-full brutal-btn-primary bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-4 flex items-center justify-center gap-2">
                <Download className="h-5 w-5" /> Download PNG
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
