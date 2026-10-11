import React, { useState } from 'react';
import { usePdfLibs } from './usePdfLibs';
import { PdfUploadZone } from './PdfUploadZone';
import { Download, Loader2, Lock, Eye, EyeOff } from 'lucide-react';

export function LockPdf() {
  const libsLoaded = usePdfLibs();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleFile = (files: FileList) => {
    setFile(files[0]);
    setResultUrl(null);
    setError(null);
    setPassword('');
    setConfirmPassword('');
  };

  const encryptPdf = async () => {
    if (!file) return;
    if (!password) {
      setError("Please enter a password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await window.PDFLib.PDFDocument.load(arrayBuffer);
      
      // Encrypt the document
      pdfDoc.encrypt({
        userPassword: password,
        ownerPassword: password,
        permissions: {
          printing: 'highResolution',
          modifying: false,
          copying: false,
          annotating: false,
          fillingForms: false,
          contentAccessibility: false,
          documentAssembly: false,
        },
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to encrypt PDF. It might already be encrypted.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getPasswordStrength = () => {
    if (!password) return { score: 0, label: '', color: 'bg-gray-200' };
    let score = 0;
    if (password.length > 6) score++;
    if (password.length > 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score, label: 'Medium', color: 'bg-yellow-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
  };

  const strength = getPasswordStrength();

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
        <PdfUploadZone onFileSelect={handleFile} title="Drop PDF to lock" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
              
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 brutal-border text-sm mb-6">
                <strong>Note:</strong> Set a password to prevent unauthorized opening of your PDF. Keep this password safe, as it cannot be recovered if lost.
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full brutal-border p-3 pr-12 bg-background"
                      placeholder="Enter password"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  
                  {password && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full ${strength.color} transition-all`} style={{ width: `${(strength.score / 5) * 100}%` }}></div>
                      </div>
                      <span className="text-xs font-bold text-muted w-12">{strength.label}</span>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-bold mb-2">Confirm Password</label>
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full brutal-border p-3 bg-background"
                    placeholder="Confirm password"
                  />
                </div>

                <button 
                  onClick={encryptPdf}
                  disabled={isProcessing || !password || password !== confirmPassword}
                  className="w-full brutal-btn-primary bg-[#DC2626] hover:bg-[#B91C1C] text-white py-4 mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
                  {isProcessing ? 'Encrypting...' : 'Encrypt PDF'}
                </button>
              </div>
            </div>
          </div>

          <div>
            {resultUrl ? (
              <div className="bg-surface brutal-border p-6 text-center h-full flex flex-col justify-center">
                <h3 className="font-display font-bold text-2xl mb-6 text-[#2E7D32]">PDF Locked Successfully!</h3>
                <div className="mb-8 text-muted">
                  <Lock className="h-16 w-16 mx-auto mb-4 text-[#2E7D32]" />
                  <p>Your PDF is now password protected.</p>
                </div>
                <a 
                  href={resultUrl}
                  download={`${file.name.replace('.pdf', '')}_locked.pdf`}
                  className="w-full brutal-btn-primary bg-[#2E7D32] hover:bg-[#1B5E20] text-white py-4 flex items-center justify-center gap-2"
                >
                  <Download className="h-5 w-5" /> Download Locked PDF
                </a>
              </div>
            ) : (
              <div className="bg-surface brutal-border p-6 h-full flex flex-col items-center justify-center text-muted border-dashed border-2">
                <Lock className="h-16 w-16 mb-4 opacity-20" />
                <p className="font-bold text-center">Set a password and click Encrypt to secure your PDF</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
