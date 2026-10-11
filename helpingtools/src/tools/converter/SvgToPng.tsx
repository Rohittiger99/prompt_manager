import React, { useState } from 'react';
import { ConverterUploadZone } from './ConverterUploadZone';
import { Download, Loader2, Image as ImageIcon, ArrowRight } from 'lucide-react';

export function SvgToPng() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{url: string, size: number} | null>(null);
  
  const [width, setWidth] = useState(1000);
  const [height, setHeight] = useState(1000);

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
    
    // Try to extract original dimensions from SVG
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "image/svg+xml");
      const svg = doc.querySelector('svg');
      if (svg) {
        let w = svg.getAttribute('width');
        let h = svg.getAttribute('height');
        
        if (w && h && !w.includes('%') && !h.includes('%')) {
          setWidth(parseInt(w, 10));
          setHeight(parseInt(h, 10));
        } else if (svg.getAttribute('viewBox')) {
          const vb = svg.getAttribute('viewBox')?.split(' ');
          if (vb && vb.length === 4) {
            setWidth(parseInt(vb[2], 10));
            setHeight(parseInt(vb[3], 10));
          }
        }
      }
    };
    reader.readAsText(f);
  };

  const convert = () => {
    if (!file) return;
    setIsProcessing(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const svgData = e.target?.result as string;
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            setResult({
              url: URL.createObjectURL(pngBlob),
              size: pngBlob.size
            });
          }
          setIsProcessing(false);
          URL.revokeObjectURL(url);
        }, 'image/png');
      };
      img.src = url;
    };
    reader.readAsText(file);
  };

  const formatSize = (bytes: number) => (bytes / 1024).toFixed(2) + ' KB';

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {!file ? (
        <ConverterUploadZone onFileSelect={handleFile} accept=".svg,image/svg+xml" title="Drop SVG image here" subtitle="Converts SVG to PNG" />
      ) : (
        <div className="space-y-6">
          <div className="bg-surface brutal-border p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display font-bold text-xl">{file.name}</h3>
              <button onClick={() => { setFile(null); setResult(null); }} className="text-xs font-bold uppercase text-muted hover:text-foreground">Change File</button>
            </div>
            
            {!result && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Output Width (px)</label>
                    <input 
                      type="number" min="1" max="5000"
                      value={width} onChange={(e) => setWidth(Number(e.target.value))}
                      className="w-full brutal-border p-3 bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Output Height (px)</label>
                    <input 
                      type="number" min="1" max="5000"
                      value={height} onChange={(e) => setHeight(Number(e.target.value))}
                      className="w-full brutal-border p-3 bg-background"
                    />
                  </div>
                </div>
                <button onClick={convert} disabled={isProcessing} className="w-full brutal-btn-primary bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-4 flex items-center justify-center gap-2">
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                  {isProcessing ? 'Converting...' : 'Convert to PNG'}
                </button>
              </div>
            )}
          </div>
          {result && (
            <div className="bg-surface brutal-border p-6 text-center">
              <h3 className="font-display font-bold text-2xl mb-6">Conversion Complete</h3>
              <div className="flex justify-center items-center gap-8 mb-8">
                <div className="text-center">
                  <span className="inline-block bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs font-bold mb-2">SVG</span>
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
