import React, { useState } from 'react';
import { usePdfLibs } from './usePdfLibs';
import { PdfUploadZone } from './PdfUploadZone';
import { Download, Loader2, Table, Copy, Check } from 'lucide-react';

export function PdfToExcel() {
  const libsLoaded = usePdfLibs();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [csvData, setCsvData] = useState('');
  const [copied, setCopied] = useState(false);

  const handleFile = (files: FileList) => {
    setFile(files[0]);
    setCsvData('');
    setError(null);
  };

  const extractToCsv = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
      
      let fullCsv = '';
      const numPages = pdf.numPages;
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Basic heuristic to group text items into rows based on Y coordinate
        const items = textContent.items;
        if (items.length === 0) continue;
        
        // Sort items by Y (top to bottom), then by X (left to right)
        // Note: PDF coordinates usually have Y starting from bottom, so we sort descending for Y
        items.sort((a: any, b: any) => {
          const yDiff = b.transform[5] - a.transform[5];
          if (Math.abs(yDiff) > 5) return yDiff; // 5pt tolerance for same line
          return a.transform[4] - b.transform[4];
        });
        
        let currentRowY = items[0].transform[5];
        let currentRowItems: any[] = [];
        const rows: any[][] = [];
        
        for (const item of items) {
          if (Math.abs(item.transform[5] - currentRowY) > 5) {
            rows.push(currentRowItems);
            currentRowItems = [item];
            currentRowY = item.transform[5];
          } else {
            currentRowItems.push(item);
          }
        }
        if (currentRowItems.length > 0) rows.push(currentRowItems);
        
        // Convert rows to CSV strings
        for (const row of rows) {
          // Sort row by X just in case
          row.sort((a: any, b: any) => a.transform[4] - b.transform[4]);
          
          // Basic column separation: if X gap is large, treat as new column
          const cols: string[] = [];
          let currentColStr = '';
          let lastX = row[0].transform[4];
          let lastWidth = row[0].width;
          
          for (let j = 0; j < row.length; j++) {
            const item = row[j];
            const gap = item.transform[4] - (lastX + lastWidth);
            
            if (j > 0 && gap > 20) { // 20pt gap threshold for new column
              cols.push(currentColStr.trim());
              currentColStr = item.str;
            } else {
              currentColStr += (j > 0 && gap > 5 ? ' ' : '') + item.str;
            }
            
            lastX = item.transform[4];
            lastWidth = item.width;
          }
          cols.push(currentColStr.trim());
          
          // Escape CSV quotes and wrap in quotes if contains comma
          const csvRow = cols.map(col => {
            if (col.includes(',') || col.includes('"') || col.includes('\n')) {
              return `"${col.replace(/"/g, '""')}"`;
            }
            return col;
          }).join(',');
          
          if (csvRow.trim()) {
            fullCsv += csvRow + '\n';
          }
        }
        
        setProgress(Math.round((i / numPages) * 100));
      }
      
      if (!fullCsv.trim()) {
        setError("No text found. This might be a scanned PDF without a text layer.");
      }
      
      setCsvData(fullCsv);
    } catch (err) {
      console.error(err);
      setError("Failed to extract data. The PDF might be encrypted or corrupted.");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(csvData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCsv = () => {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name.replace('.pdf', '')}_extracted.csv`;
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
        <PdfUploadZone onFileSelect={handleFile} title="Drop PDF to extract tables" />
      ) : (
        <div className="space-y-6">
          <div className="bg-surface brutal-border p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display font-bold text-xl">{file.name}</h3>
              <button 
                onClick={() => { setFile(null); setCsvData(''); }}
                className="text-xs font-bold uppercase text-muted hover:text-foreground"
              >
                Change File
              </button>
            </div>
            
            <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 brutal-border text-sm mb-6">
              <strong>⚠ Note:</strong> Works best with simple, well-structured PDF tables. Complex layouts may need manual cleanup in Excel.
            </div>
            
            {!csvData && (
              <button 
                onClick={extractToCsv}
                disabled={isProcessing}
                className="w-full brutal-btn-primary bg-[#DC2626] hover:bg-[#B91C1C] text-white py-4 flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Table className="h-5 w-5" />}
                {isProcessing ? `Extracting... ${progress}%` : 'Extract to CSV'}
              </button>
            )}
          </div>

          {csvData && (
            <div className="bg-surface brutal-border p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-bold text-xl">Extracted CSV Data</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={copyToClipboard}
                    className="brutal-btn-secondary px-4 py-2 text-sm flex items-center gap-2"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied!' : 'Copy All'}
                  </button>
                  <button 
                    onClick={downloadCsv}
                    className="brutal-btn-primary bg-[#2E7D32] hover:bg-[#1B5E20] text-white px-4 py-2 text-sm flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" /> Download .csv
                  </button>
                </div>
              </div>
              
              <textarea 
                value={csvData}
                readOnly
                className="w-full h-96 brutal-border p-4 bg-background font-mono text-sm resize-y whitespace-pre"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
