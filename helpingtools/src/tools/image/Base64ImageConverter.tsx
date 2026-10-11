import React, { useState, useRef } from 'react';
import { Upload, Download, Copy, Check, Image as ImageIcon, Code } from 'lucide-react';

export function Base64ImageConverter() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  
  // Encode state
  const [file, setFile] = useState<File | null>(null);
  const [base64String, setBase64String] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [copiedEncode, setCopiedEncode] = useState(false);
  const [copiedImg, setCopiedImg] = useState(false);
  const [copiedCss, setCopiedCss] = useState(false);
  
  // Decode state
  const [inputBase64, setInputBase64] = useState('');
  const [decodedUrl, setDecodedUrl] = useState<string | null>(null);
  const [decodeError, setDecodeError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Encode Logic ---
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
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setBase64String(e.target.result as string);
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  const copyToClipboard = (text: string, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  // --- Decode Logic ---
  const handleDecode = () => {
    setDecodeError('');
    setDecodedUrl(null);
    
    if (!inputBase64.trim()) {
      setDecodeError('Please enter a Base64 string');
      return;
    }
    
    let cleanStr = inputBase64.trim();
    
    // Check if it has data URI scheme, if not add a default one
    if (!cleanStr.startsWith('data:image/')) {
      // Basic validation if it looks like base64
      const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
      if (!base64Regex.test(cleanStr.replace(/\s/g, ''))) {
        setDecodeError('Invalid Base64 string format');
        return;
      }
      cleanStr = `data:image/png;base64,${cleanStr}`;
    }
    
    setDecodedUrl(cleanStr);
  };

  return (
    <div className="space-y-8">
      <div className="flex gap-2 p-1 bg-surface brutal-border w-fit mx-auto">
        <button
          onClick={() => setMode('encode')}
          className={`px-6 py-2 font-bold uppercase text-sm ${mode === 'encode' ? 'bg-accent text-white' : 'hover:bg-background'}`}
        >
          Image → Base64
        </button>
        <button
          onClick={() => setMode('decode')}
          className={`px-6 py-2 font-bold uppercase text-sm ${mode === 'decode' ? 'bg-accent text-white' : 'hover:bg-background'}`}
        >
          Base64 → Image
        </button>
      </div>

      {mode === 'encode' ? (
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-surface brutal-border p-4 flex flex-col items-center justify-center min-h-[300px] bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyEgSRC0AQB9CGwScB1zWAAAAABJRU5ErkJggg==')]">
                  <img loading="lazy" src={base64String} alt="Preview" className="max-w-full max-h-[400px] object-contain shadow-lg bg-white" />
                </div>
                <button 
                  onClick={() => { setFile(null); setBase64String(''); }}
                  className="w-full brutal-btn-secondary py-3"
                >
                  Upload Different Image
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="bg-surface brutal-border p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold flex items-center gap-2"><Code className="h-4 w-4" /> Base64 String</h3>
                    <button 
                      onClick={() => copyToClipboard(base64String, setCopiedEncode)}
                      className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 text-accent hover:text-accent/80"
                    >
                      {copiedEncode ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedEncode ? 'Copied' : 'Copy All'}
                    </button>
                  </div>
                  <textarea 
                    readOnly 
                    value={base64String} 
                    className="w-full h-32 brutal-border p-3 bg-background font-mono text-xs text-muted resize-none"
                  />
                </div>
                
                <div className="bg-surface brutal-border p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold flex items-center gap-2"><Code className="h-4 w-4" /> HTML &lt;img&gt; Tag</h3>
                    <button 
                      onClick={() => copyToClipboard(`<img loading="lazy" src="${base64String}" alt="Base64 Image" />`, setCopiedImg)}
                      className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 text-accent hover:text-accent/80"
                    >
                      {copiedImg ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedImg ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <textarea 
                    readOnly 
                    value={`<img loading="lazy" src="${base64String.substring(0, 50)}..." alt="Base64 Image" />`} 
                    className="w-full h-16 brutal-border p-3 bg-background font-mono text-xs text-muted resize-none"
                  />
                </div>
                
                <div className="bg-surface brutal-border p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold flex items-center gap-2"><Code className="h-4 w-4" /> CSS Background</h3>
                    <button 
                      onClick={() => copyToClipboard(`background-image: url('${base64String}');`, setCopiedCss)}
                      className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 text-accent hover:text-accent/80"
                    >
                      {copiedCss ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedCss ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <textarea 
                    readOnly 
                    value={`background-image: url('${base64String.substring(0, 50)}...');`} 
                    className="w-full h-16 brutal-border p-3 bg-background font-mono text-xs text-muted resize-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="bg-surface brutal-border p-6 h-full flex flex-col">
              <h3 className="font-display font-bold mb-4">Paste Base64 String</h3>
              <textarea 
                value={inputBase64}
                onChange={(e) => setInputBase64(e.target.value)}
                placeholder="data:image/png;base64,iVBORw0KGgo..."
                className={`w-full flex-1 min-h-[300px] brutal-border p-4 bg-background font-mono text-xs ${decodeError ? 'border-red-500' : ''}`}
              />
              {decodeError && <p className="text-red-500 text-sm font-bold mt-2">{decodeError}</p>}
              <button 
                onClick={handleDecode}
                className="w-full brutal-btn-primary py-3 mt-4"
              >
                Render Image
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-surface brutal-border p-6 h-full flex flex-col">
              <h3 className="font-display font-bold mb-4">Preview</h3>
              <div className="flex-1 border-2 border-border-color bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyEgSRC0AQB9CGwScB1zWAAAAABJRU5ErkJggg==')] flex items-center justify-center p-4 min-h-[300px]">
                {decodedUrl ? (
                  <img loading="lazy" src={decodedUrl} 
                    alt="Decoded" 
                    className="max-w-full max-h-[400px] object-contain shadow-lg bg-white" 
                    onError={() => {
                      setDecodeError('Invalid image data');
                      setDecodedUrl(null);
                    }}
                  />
                ) : (
                  <div className="text-muted flex flex-col items-center">
                    <ImageIcon className="h-12 w-12 mb-2 opacity-20" />
                    <p>Image will appear here</p>
                  </div>
                )}
              </div>
              
              {decodedUrl && (
                <a 
                  href={decodedUrl} 
                  download={`decoded_image_${new Date().getTime()}.png`}
                  className="w-full brutal-btn-primary py-3 mt-4 flex items-center justify-center gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white"
                >
                  <Download className="h-5 w-5" /> Download Image
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
