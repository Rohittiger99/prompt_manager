import React, { useState } from 'react';
import { usePdfLibs } from './usePdfLibs';
import { PdfUploadZone } from './PdfUploadZone';
import { Download, Loader2, Stamp, Type, Image as ImageIcon } from 'lucide-react';

export function AddWatermarkToPdf() {
  const libsLoaded = usePdfLibs();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  
  const [type, setType] = useState<'text' | 'image'>('text');
  
  // Text watermark settings
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(60);
  const [color, setColor] = useState('#FF0000');
  const [opacity, setOpacity] = useState(30);
  const [position, setPosition] = useState<'diagonal' | 'center' | 'bottom-right'>('diagonal');
  
  // Image watermark settings
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageScale, setImageScale] = useState(50);

  const handleFile = (files: FileList) => {
    setFile(files[0]);
    setResultUrl(null);
    setError(null);
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFile(e.target.files[0]);
    }
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 0, g: 0, b: 0 };
  };

  const applyWatermark = async () => {
    if (!file) return;
    if (type === 'text' && !text) {
      setError("Please enter watermark text.");
      return;
    }
    if (type === 'image' && !imageFile) {
      setError("Please select a watermark image.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await window.PDFLib.PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      
      let wmImage: any = null;
      let wmDims: any = null;
      
      if (type === 'image' && imageFile) {
        const imgBuffer = await imageFile.arrayBuffer();
        if (imageFile.type === 'image/png') {
          wmImage = await pdfDoc.embedPng(imgBuffer);
        } else if (imageFile.type === 'image/jpeg') {
          wmImage = await pdfDoc.embedJpg(imgBuffer);
        } else {
          throw new Error("Only PNG and JPG images are supported for watermarks.");
        }
      }

      const { rgb, degrees } = window.PDFLib;
      const rgbColor = hexToRgb(color);
      const font = await pdfDoc.embedFont(window.PDFLib.StandardFonts.HelveticaBold);

      for (const page of pages) {
        const { width, height } = page.getSize();
        
        if (type === 'text') {
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          const textHeight = font.heightAtSize(fontSize);
          
          let x = 0, y = 0, angle = 0;
          
          if (position === 'diagonal') {
            angle = Math.atan(height / width) * (180 / Math.PI);
            x = width / 2 - (textWidth * Math.cos(angle * Math.PI / 180)) / 2;
            y = height / 2 - (textWidth * Math.sin(angle * Math.PI / 180)) / 2;
          } else if (position === 'center') {
            x = width / 2 - textWidth / 2;
            y = height / 2 - textHeight / 2;
          } else if (position === 'bottom-right') {
            x = width - textWidth - 20;
            y = 20;
          }

          page.drawText(text, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
            opacity: opacity / 100,
            rotate: degrees(position === 'diagonal' ? angle : 0),
          });
        } else if (type === 'image' && wmImage) {
          const scale = imageScale / 100;
          const scaledWidth = wmImage.width * scale;
          const scaledHeight = wmImage.height * scale;
          
          let x = 0, y = 0;
          
          if (position === 'center' || position === 'diagonal') {
            x = width / 2 - scaledWidth / 2;
            y = height / 2 - scaledHeight / 2;
          } else if (position === 'bottom-right') {
            x = width - scaledWidth - 20;
            y = 20;
          }

          page.drawImage(wmImage, {
            x,
            y,
            width: scaledWidth,
            height: scaledHeight,
            opacity: opacity / 100,
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to apply watermark.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!libsLoaded) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-[#DC2626]" /></div>;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {error && (
        <div className="bg-red-100 text-red-800 p-4 brutal-border font-bold">
          {error}
        </div>
      )}

      {!file ? (
        <PdfUploadZone onFileSelect={handleFile} title="Drop PDF to add watermark" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-surface brutal-border p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-display font-bold text-xl truncate pr-4">{file.name}</h3>
                <button 
                  onClick={() => { setFile(null); setResultUrl(null); }}
                  className="text-xs font-bold uppercase text-muted hover:text-foreground shrink-0"
                >
                  Change File
                </button>
              </div>
              
              <div className="flex gap-2 mb-6 border-b-2 border-border-color pb-4">
                <button 
                  onClick={() => setType('text')}
                  className={`flex-1 py-2 font-bold text-sm flex items-center justify-center gap-2 ${type === 'text' ? 'bg-[#DC2626] text-white' : 'bg-background hover:bg-surface brutal-border'}`}
                >
                  <Type className="h-4 w-4" /> Text
                </button>
                <button 
                  onClick={() => setType('image')}
                  className={`flex-1 py-2 font-bold text-sm flex items-center justify-center gap-2 ${type === 'image' ? 'bg-[#DC2626] text-white' : 'bg-background hover:bg-surface brutal-border'}`}
                >
                  <ImageIcon className="h-4 w-4" /> Image
                </button>
              </div>

              <div className="space-y-4">
                {type === 'text' ? (
                  <>
                    <div>
                      <label className="block text-sm font-bold mb-2">Watermark Text</label>
                      <input 
                        type="text" 
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full brutal-border p-3 bg-background"
                      />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-bold mb-2">Font Size: {fontSize}</label>
                        <input 
                          type="range" min="10" max="150" 
                          value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}
                          className="w-full accent-[#DC2626]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Color</label>
                        <input 
                          type="color" 
                          value={color} onChange={(e) => setColor(e.target.value)}
                          className="h-10 w-16 p-0 brutal-border cursor-pointer"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-bold mb-2">Watermark Image (PNG/JPG)</label>
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg"
                        onChange={handleImageFile}
                        className="w-full brutal-border p-2 bg-background file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-bold file:bg-[#DC2626] file:text-white hover:file:bg-[#B91C1C] cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Scale: {imageScale}%</label>
                      <input 
                        type="range" min="10" max="200" 
                        value={imageScale} onChange={(e) => setImageScale(Number(e.target.value))}
                        className="w-full accent-[#DC2626]"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-bold mb-2">Opacity: {opacity}%</label>
                  <input 
                    type="range" min="5" max="100" 
                    value={opacity} onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-full accent-[#DC2626]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Position</label>
                  <select 
                    value={position}
                    onChange={(e) => setPosition(e.target.value as any)}
                    className="w-full brutal-border p-3 bg-background"
                  >
                    <option value="diagonal">Diagonal Center</option>
                    <option value="center">Center</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                </div>

                <button 
                  onClick={applyWatermark}
                  disabled={isProcessing}
                  className="w-full brutal-btn-primary bg-[#DC2626] hover:bg-[#B91C1C] text-white py-4 mt-4 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Stamp className="h-5 w-5" />}
                  {isProcessing ? 'Applying...' : 'Apply Watermark'}
                </button>
              </div>
            </div>
          </div>

          <div>
            {resultUrl ? (
              <div className="bg-surface brutal-border p-6 text-center h-full flex flex-col justify-center">
                <h3 className="font-display font-bold text-2xl mb-6 text-[#2E7D32]">Watermark Applied!</h3>
                <a 
                  href={resultUrl}
                  download={`${file.name.replace('.pdf', '')}_watermarked.pdf`}
                  className="w-full brutal-btn-primary bg-[#2E7D32] hover:bg-[#1B5E20] text-white py-4 flex items-center justify-center gap-2"
                >
                  <Download className="h-5 w-5" /> Download PDF
                </a>
              </div>
            ) : (
              <div className="bg-surface brutal-border p-6 h-full flex flex-col items-center justify-center text-muted border-dashed border-2">
                <Stamp className="h-16 w-16 mb-4 opacity-20" />
                <p className="font-bold text-center">Configure settings and click Apply to see the result</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
