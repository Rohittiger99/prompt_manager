import React, { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';

interface ConverterUploadZoneProps {
  onFileSelect: (file: File) => void;
  accept: string;
  title: string;
  subtitle?: string;
}

export function ConverterUploadZone({ onFileSelect, accept, title, subtitle }: ConverterUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${isDragging ? 'border-[#8B5CF6] bg-[#8B5CF6]/10' : 'border-[#8B5CF6] hover:bg-[#8B5CF6]/5'}`}
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
            onFileSelect(e.target.files[0]);
            e.target.value = '';
          }
        }}
        accept={accept}
        className="hidden"
      />
      <div className="h-16 w-16 bg-surface brutal-border mx-auto flex items-center justify-center mb-4 text-[#8B5CF6]">
        <UploadCloud className="h-8 w-8" />
      </div>
      <h3 className="text-2xl font-display font-bold mb-2">
        {isDragging ? 'Drop it!' : title}
      </h3>
      {subtitle && <p className="text-muted mb-4">{subtitle}</p>}
    </div>
  );
}
