import React, { useState, useEffect } from 'react';
import { usePdfLibs } from './usePdfLibs';
import { PdfUploadZone } from './PdfUploadZone';
import { FileText, X, GripVertical, Download, Plus, Loader2 } from 'lucide-react';

interface PdfFile {
  id: string;
  file: File;
  pageCount: number;
}

export function PdfMerge() {
  const libsLoaded = usePdfLibs();
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList) => {
    setError(null);
    const newFiles = Array.from(fileList).filter(f => f.type === 'application/pdf');
    
    if (files.length + newFiles.length > 20) {
      setError("Maximum 20 files allowed.");
      return;
    }

    const oversized = newFiles.find(f => f.size > 50 * 1024 * 1024);
    if (oversized) {
      setError(`File ${oversized.name} exceeds 50MB limit.`);
      return;
    }

    setIsProcessing(true);
    const processedFiles: PdfFile[] = [];

    for (const file of newFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await window.PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        processedFiles.push({
          id: Math.random().toString(36).substring(7),
          file,
          pageCount: pdfDoc.getPageCount()
        });
      } catch (err) {
        console.error("Error reading PDF:", err);
      }
    }

    setFiles(prev => [...prev, ...processedFiles]);
    setIsProcessing(false);
    setMergedUrl(null);
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
    setMergedUrl(null);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId === id) return;
    
    const draggedIndex = files.findIndex(f => f.id === draggedId);
    const targetIndex = files.findIndex(f => f.id === id);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      const newFiles = [...files];
      const [draggedItem] = newFiles.splice(draggedIndex, 1);
      newFiles.splice(targetIndex, 0, draggedItem);
      setFiles(newFiles);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const mergePdfs = async () => {
    if (files.length < 2) {
      setError("Please add at least 2 PDFs to merge.");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const mergedPdf = await window.PDFLib.PDFDocument.create();
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const arrayBuffer = await file.file.arrayBuffer();
        const pdf = await window.PDFLib.PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page: any) => mergedPdf.addPage(page));
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      setMergedUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError("Failed to merge PDFs. They might be encrypted or corrupted.");
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

      {files.length === 0 ? (
        <PdfUploadZone onFileSelect={handleFiles} multiple={true} title="Drop PDFs here to merge" />
      ) : (
        <div className="space-y-6">
          <div className="bg-surface brutal-border p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-bold text-xl">Files to Merge</h3>
              <span className="text-sm font-bold text-muted">{files.length} files</span>
            </div>
            
            <div className="space-y-2 mb-6">
              {files.map((f) => (
                <div 
                  key={f.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, f.id)}
                  onDragOver={(e) => handleDragOver(e, f.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-4 p-3 bg-background brutal-border cursor-move transition-colors ${draggedId === f.id ? 'opacity-50' : 'hover:bg-surface'}`}
                >
                  <GripVertical className="h-5 w-5 text-muted" />
                  <FileText className="h-6 w-6 text-[#DC2626]" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{f.file.name}</p>
                    <p className="text-xs text-muted">{f.pageCount} pages • {(f.file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button 
                    onClick={() => removeFile(f.id)}
                    className="p-2 hover:bg-red-100 text-red-500 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex-1 brutal-btn-secondary py-3 flex items-center justify-center gap-2 cursor-pointer">
                <input type="file" multiple accept="application/pdf" className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
                <Plus className="h-5 w-5" /> Add More Files
              </label>
              
              {!mergedUrl && (
                <button 
                  onClick={mergePdfs}
                  disabled={isProcessing || files.length < 2}
                  className="flex-1 brutal-btn-primary bg-[#DC2626] hover:bg-[#B91C1C] text-white py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
                  {isProcessing ? `Merging... ${progress}%` : 'Merge PDFs'}
                </button>
              )}
            </div>
          </div>

          {mergedUrl && (
            <div className="bg-[#E8F5E9] dark:bg-[#0A1F10] brutal-border p-8 text-center">
              <h3 className="font-display font-bold text-[#2E7D32] dark:text-[#81C784] mb-4 text-2xl">PDFs Merged Successfully!</h3>
              <a 
                href={mergedUrl} 
                download="merged.pdf"
                className="inline-flex items-center justify-center gap-2 brutal-btn-primary bg-[#2E7D32] hover:bg-[#1B5E20] text-white py-4 px-8 text-lg"
              >
                <Download className="h-6 w-6" /> Download Merged PDF
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
