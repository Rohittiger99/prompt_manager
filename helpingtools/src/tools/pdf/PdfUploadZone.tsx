import React, { useRef, useState } from 'react';
import { FileText } from 'lucide-react';

interface PdfUploadZoneProps {
  onFileSelect: (files: FileList) => void;
  multiple?: boolean;
  accept?: string;
  title?: string;
  subtitle?: string;
}

export function PdfUploadZone({ 
  onFileSelect, 
  multiple = false, 
  accept = "application/pdf",
  title = "Drop your PDF here or click to upload",
  subtitle = "Max file size: 50MB"
}: PdfUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files);
    }
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${isDragging ? 'border-[#DC2626] bg-[#DC2626]/10' : 'border-[#DC2626] hover:bg-[#DC2626]/5'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFileSelect(e.target.files);
            // Reset input so the same file can be selected again if needed
            e.target.value = '';
          }
        }} 
        accept={accept}
        multiple={multiple}
        className="hidden" 
      />
      <div className="h-16 w-16 bg-surface brutal-border mx-auto flex items-center justify-center mb-4 text-[#DC2626]">
        <FileText className="h-8 w-8" />
      </div>
      <h3 className="text-2xl font-display font-bold mb-2">
        {isDragging ? 'Drop it!' : title}
      </h3>
      <p className="text-muted mb-4">{subtitle}</p>
      <div className="inline-flex items-center gap-2 bg-[#DC2626]/10 text-[#DC2626] px-3 py-1 rounded-full text-xs font-bold">
        <span>🔒</span> Your file never leaves your device
      </div>
    </div>
  );
}
