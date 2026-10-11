import React, { useState } from 'react';
import { usePdfLibs } from './usePdfLibs';
import { PdfUploadZone } from './PdfUploadZone';
import { Download, Loader2, Unlock, Eye, EyeOff } from 'lucide-react';

export function UnlockPdf() {
  const libsLoaded = usePdfLibs();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);

  const handleFile = async (files: FileList) => {
    const f = files[0];
    setFile(f);
    setResultUrl(null);
    setError(null);
    setPassword('');
    setNeedsPassword(false);
    
    // Check if it actually needs a password
    try {
      const arrayBuffer = await f.arrayBuffer();
      await window.PDFLib.PDFDocument.load(arrayBuffer);
      // If it loads without error, it's not password protected
      setError("This PDF is not password-protected.");
    } catch (err: any) {
      if (err.message && err.message.includes('encrypted')) {
        setNeedsPassword(true);
      } else {
        setError("Failed to read PDF. It might be corrupted.");
      }
    }
  };

  const decryptPdf = async () => {
    if (!file) return;
    if (needsPassword && !password) {
      setError("Please enter the password.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Load with password
      const pdfDoc = await window.PDFLib.PDFDocument.load(arrayBuffer, { 
        password: password 
      });
      
      // Save without encryption
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes('password')) {
        setError("⚠ Incorrect password. Please try again.");
      } else {
        setError(err.message || "Failed to unlock PDF.");
      }
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
        <div className={`p-4 brutal-border font-bold ${error.includes('not password-protected') ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
          {error}
        </div>
      )}

      {!file ? (
        <PdfUploadZone onFileSelect={handleFile} title="Drop locked PDF here" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-surface brutal-border p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-display font-bold text-xl truncate pr-4">{file.name}</h3>
                <button 
                  onClick={() => { setFile(null); setResultUrl(null); setNeedsPassword(false); }}
                  className="text-xs font-bold uppercase text-muted hover:text-foreground shrink-0"
                >
                  Change File
                </button>
              </div>
              
              {needsPassword && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Enter PDF Password</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full brutal-border p-3 pr-12 bg-background"
                        placeholder="Password"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={decryptPdf}
                    disabled={isProcessing || !password}
                    className="w-full brutal-btn-primary bg-[#DC2626] hover:bg-[#B91C1C] text-white py-4 mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Unlock className="h-5 w-5" />}
                    {isProcessing ? 'Unlocking...' : 'Unlock PDF'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            {resultUrl ? (
              <div className="bg-surface brutal-border p-6 text-center h-full flex flex-col justify-center">
                <h3 className="font-display font-bold text-2xl mb-6 text-[#2E7D32]">PDF Unlocked Successfully!</h3>
                <div className="mb-8 text-muted">
                  <Unlock className="h-16 w-16 mx-auto mb-4 text-[#2E7D32]" />
                  <p>The password has been removed from your PDF.</p>
                </div>
                <a 
                  href={resultUrl}
                  download={`${file.name.replace('.pdf', '')}_unlocked.pdf`}
                  className="w-full brutal-btn-primary bg-[#2E7D32] hover:bg-[#1B5E20] text-white py-4 flex items-center justify-center gap-2"
                >
                  <Download className="h-5 w-5" /> Download Unlocked PDF
                </a>
              </div>
            ) : (
              <div className="bg-surface brutal-border p-6 h-full flex flex-col items-center justify-center text-muted border-dashed border-2">
                <Unlock className="h-16 w-16 mb-4 opacity-20" />
                <p className="font-bold text-center">
                  {needsPassword ? "Enter the password to unlock this PDF" : "Upload a password-protected PDF"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
