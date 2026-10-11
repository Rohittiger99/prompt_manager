import React, { useState } from 'react';
import { usePdfLibs } from './usePdfLibs';
import { PdfUploadZone } from './PdfUploadZone';
import { Download, Loader2, Save, Edit3 } from 'lucide-react';

export function PdfMetadataReader() {
  const libsLoaded = usePdfLibs();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [metadata, setMetadata] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Editable fields
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [subject, setSubject] = useState('');
  const [keywords, setKeywords] = useState('');
  const [creator, setCreator] = useState('');
  const [producer, setProducer] = useState('');

  const handleFile = async (files: FileList) => {
    const f = files[0];
    setFile(f);
    setError(null);
    setIsProcessing(true);
    
    try {
      const arrayBuffer = await f.arrayBuffer();
      const pdfDoc = await window.PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      
      const meta = {
        Title: pdfDoc.getTitle() || '',
        Author: pdfDoc.getAuthor() || '',
        Subject: pdfDoc.getSubject() || '',
        Keywords: pdfDoc.getKeywords() || '',
        Creator: pdfDoc.getCreator() || '',
        Producer: pdfDoc.getProducer() || '',
        CreationDate: pdfDoc.getCreationDate() ? pdfDoc.getCreationDate().toString() : '',
        ModificationDate: pdfDoc.getModificationDate() ? pdfDoc.getModificationDate().toString() : '',
        PageCount: pdfDoc.getPageCount(),
        FileSize: (f.size / 1024 / 1024).toFixed(2) + ' MB'
      };
      
      setMetadata(meta);
      
      setTitle(meta.Title);
      setAuthor(meta.Author);
      setSubject(meta.Subject);
      setKeywords(meta.Keywords);
      setCreator(meta.Creator);
      setProducer(meta.Producer);
      
    } catch (err: any) {
      console.error(err);
      setError("Failed to read PDF metadata. It might be encrypted or corrupted.");
    } finally {
      setIsProcessing(false);
    }
  };

  const saveMetadata = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await window.PDFLib.PDFDocument.load(arrayBuffer);
      
      pdfDoc.setTitle(title);
      pdfDoc.setAuthor(author);
      pdfDoc.setSubject(subject);
      pdfDoc.setKeywords(keywords.split(',').map(k => k.trim()));
      pdfDoc.setCreator(creator);
      pdfDoc.setProducer(producer);
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace('.pdf', '')}_updated.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setIsEditing(false);
      
      // Update local state
      setMetadata({
        ...metadata,
        Title: title,
        Author: author,
        Subject: subject,
        Keywords: keywords,
        Creator: creator,
        Producer: producer
      });
      
    } catch (err: any) {
      console.error(err);
      setError("Failed to save PDF. It might be encrypted.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTxt = () => {
    if (!metadata) return;
    let content = '';
    for (const [key, value] of Object.entries(metadata)) {
      content += `${key}: ${value}\n`;
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name.replace('.pdf', '')}_metadata.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        <PdfUploadZone onFileSelect={handleFile} title="Drop PDF to read metadata" />
      ) : (
        <div className="bg-surface brutal-border p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display font-bold text-xl truncate pr-4">{file.name}</h3>
            <div className="flex gap-2">
              <button 
                onClick={downloadTxt}
                className="text-xs font-bold uppercase text-accent hover:text-accent/80 flex items-center gap-1"
              >
                <Download className="h-3 w-3" /> TXT
              </button>
              <button 
                onClick={() => { setFile(null); setMetadata(null); setIsEditing(false); }}
                className="text-xs font-bold uppercase text-muted hover:text-foreground ml-4"
              >
                Change File
              </button>
            </div>
          </div>
          
          {isProcessing && !metadata ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#DC2626]" /></div>
          ) : metadata && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-lg">Document Properties</h4>
                {!isEditing ? (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="brutal-btn-secondary py-1 px-3 text-xs flex items-center gap-1"
                  >
                    <Edit3 className="h-3 w-3" /> Edit Metadata
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="text-xs font-bold uppercase text-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4 bg-background brutal-border p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1">Title</label>
                      <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full brutal-border p-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">Author</label>
                      <input type="text" value={author} onChange={e => setAuthor(e.target.value)} className="w-full brutal-border p-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">Subject</label>
                      <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full brutal-border p-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">Keywords (comma separated)</label>
                      <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)} className="w-full brutal-border p-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">Creator</label>
                      <input type="text" value={creator} onChange={e => setCreator(e.target.value)} className="w-full brutal-border p-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">Producer</label>
                      <input type="text" value={producer} onChange={e => setProducer(e.target.value)} className="w-full brutal-border p-2 text-sm" />
                    </div>
                  </div>
                  
                  <button 
                    onClick={saveMetadata}
                    disabled={isProcessing}
                    className="w-full brutal-btn-primary bg-[#DC2626] hover:bg-[#B91C1C] text-white py-3 mt-4 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save & Download PDF
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <tbody>
                      {Object.entries(metadata).map(([key, value], i) => (
                        <tr key={key} className={i % 2 === 0 ? 'bg-background' : 'bg-surface'}>
                          <td className="p-3 border border-border-color font-bold text-sm w-1/3">{key}</td>
                          <td className="p-3 border border-border-color text-sm font-mono break-all">{value as string || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
