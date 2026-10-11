import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Settings, Info, MapPin } from 'lucide-react';

export function ImageMetadataViewer() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [exifData, setExifData] = useState<any>(null);
  const [hasExif, setHasExif] = useState<boolean | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load exif-js from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/exif-js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

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
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setExifData(null);
    setHasExif(null);
    setIsProcessing(true);
    
    // Process EXIF
    setTimeout(() => {
      try {
        // @ts-ignore
        if (window.EXIF) {
          // @ts-ignore
          window.EXIF.getData(selectedFile, function() {
            // @ts-ignore
            const allTags = window.EXIF.getAllTags(this);
            if (Object.keys(allTags).length > 0) {
              setExifData(allTags);
              setHasExif(true);
            } else {
              setHasExif(false);
            }
            setIsProcessing(false);
          });
        } else {
          setIsProcessing(false);
          setHasExif(false);
        }
      } catch (err) {
        console.error("EXIF parsing error:", err);
        setIsProcessing(false);
        setHasExif(false);
      }
    }, 500);
  };

  const formatValue = (val: any): string => {
    if (val === undefined || val === null) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return val.toString();
    if (Array.isArray(val)) return val.join(', ');
    if (val instanceof Number) return val.toString();
    if (val instanceof String) return val.toString();
    if (val.numerator && val.denominator) {
      if (val.denominator === 1) return val.numerator.toString();
      return `${val.numerator}/${val.denominator} (${(val.numerator/val.denominator).toFixed(2)})`;
    }
    return JSON.stringify(val);
  };

  const getGpsCoords = () => {
    if (!exifData) return null;
    
    const lat = exifData.GPSLatitude;
    const latRef = exifData.GPSLatitudeRef;
    const lng = exifData.GPSLongitude;
    const lngRef = exifData.GPSLongitudeRef;
    
    if (lat && latRef && lng && lngRef) {
      const convertToDec = (coords: any[], ref: string) => {
        let dec = coords[0] + coords[1]/60 + coords[2]/3600;
        if (ref === 'S' || ref === 'W') dec = dec * -1;
        return dec;
      };
      
      return {
        lat: convertToDec(lat, latRef),
        lng: convertToDec(lng, lngRef)
      };
    }
    return null;
  };

  const downloadMetadata = (format: 'json' | 'txt') => {
    if (!exifData) return;
    
    let content = '';
    let mimeType = '';
    let ext = '';
    
    if (format === 'json') {
      // Need to clean up the object because some EXIF values are complex objects
      const cleanData: any = {};
      for (const key in exifData) {
        if (key !== 'thumbnail') {
          cleanData[key] = formatValue(exifData[key]);
        }
      }
      content = JSON.stringify(cleanData, null, 2);
      mimeType = 'application/json';
      ext = 'json';
    } else {
      for (const key in exifData) {
        if (key !== 'thumbnail') {
          content += `${key}: ${formatValue(exifData[key])}\n`;
        }
      }
      mimeType = 'text/plain';
      ext = 'txt';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metadata_${file?.name.split('.')[0] || 'image'}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderTable = (keys: string[], title: string) => {
    const availableKeys = keys.filter(k => exifData[k] !== undefined);
    if (availableKeys.length === 0) return null;
    
    return (
      <div className="mb-8">
        <h4 className="font-display font-bold text-lg mb-3 bg-accent text-white px-3 py-1 inline-block">{title}</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <tbody>
              {availableKeys.map((key, i) => (
                <tr key={key} className={i % 2 === 0 ? 'bg-background' : 'bg-surface'}>
                  <td className="p-3 border border-border-color font-bold text-sm w-1/3">{key}</td>
                  <td className="p-3 border border-border-color text-sm font-mono break-all">{formatValue(exifData[key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const gpsCoords = getGpsCoords();

  return (
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
            accept="image/jpeg, image/png, image/webp, image/tiff" 
            className="hidden" 
          />
          <div className="h-16 w-16 bg-surface brutal-border mx-auto flex items-center justify-center mb-4 text-[#00D4FF]">
            <Upload className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-display font-bold mb-2">
            {isDragging ? 'Drop it!' : 'Drop image here or click to upload'}
          </h3>
          <p className="text-muted">JPG, PNG, WEBP, TIFF — Max 20MB</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-surface brutal-border p-4">
              <img loading="lazy" src={previewUrl!} alt="Preview" className="w-full h-auto object-contain max-h-[300px] border-2 border-border-color mb-4" />
              <div className="text-sm font-bold truncate mb-1">{file.name}</div>
              <div className="text-xs text-muted mb-4">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}</div>
              
              <button 
                onClick={() => { setFile(null); setPreviewUrl(null); setExifData(null); setHasExif(null); }}
                className="w-full brutal-btn-secondary py-2 text-sm"
              >
                Upload Different Image
              </button>
            </div>
            
            {hasExif && (
              <div className="bg-surface brutal-border p-6">
                <h3 className="font-display font-bold mb-4">Export Metadata</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => downloadMetadata('json')}
                    className="w-full brutal-btn-primary py-2 flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" /> Download as JSON
                  </button>
                  <button 
                    onClick={() => downloadMetadata('txt')}
                    className="w-full brutal-btn-secondary py-2 flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" /> Download as TXT
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-surface brutal-border p-6 h-full min-h-[400px]">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-border-color">
                <Info className="h-6 w-6 text-accent" />
                <h3 className="text-2xl font-display font-black">Image Metadata</h3>
              </div>
              
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted">
                  <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full mb-4"></div>
                  <p className="font-bold">Analyzing image data...</p>
                </div>
              ) : hasExif === false ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="h-16 w-16 bg-background brutal-border flex items-center justify-center mb-4 text-muted">
                    <Info className="h-8 w-8" />
                  </div>
                  <h4 className="text-xl font-bold mb-2">No metadata found</h4>
                  <p className="text-muted max-w-md">
                    No EXIF metadata found in this image. This is common for screenshots, images downloaded from social media, or images processed by web tools that strip metadata for privacy.
                  </p>
                </div>
              ) : exifData ? (
                <div className="space-y-2">
                  {gpsCoords && (
                    <div className="mb-8 p-4 bg-[#E3F2FD] dark:bg-[#0D47A1]/20 brutal-border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-6 w-6 text-[#1565C0] dark:text-[#90CAF9]" />
                        <div>
                          <h4 className="font-bold text-[#1565C0] dark:text-[#90CAF9]">GPS Location Found</h4>
                          <p className="text-xs font-mono">{gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}</p>
                        </div>
                      </div>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${gpsCoords.lat},${gpsCoords.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="brutal-btn-primary py-2 px-4 text-xs bg-[#1565C0] hover:bg-[#0D47A1] text-white"
                      >
                        📍 View on Google Maps
                      </a>
                    </div>
                  )}
                  
                  {renderTable(['Make', 'Model', 'Software', 'Orientation', 'XResolution', 'YResolution', 'ResolutionUnit'], 'Basic Info')}
                  
                  {renderTable(['DateTimeOriginal', 'DateTimeDigitized', 'DateTime'], 'Date & Time')}
                  
                  {renderTable(['ExposureTime', 'FNumber', 'ExposureProgram', 'ISOSpeedRatings', 'ShutterSpeedValue', 'ApertureValue', 'BrightnessValue', 'ExposureBias', 'MaxApertureValue', 'MeteringMode', 'LightSource', 'Flash', 'FocalLength', 'ColorSpace', 'PixelXDimension', 'PixelYDimension', 'FocalLengthIn35mmFilm', 'LensMake', 'LensModel'], 'Camera Settings')}
                  
                  {renderTable(['GPSLatitudeRef', 'GPSLatitude', 'GPSLongitudeRef', 'GPSLongitude', 'GPSAltitudeRef', 'GPSAltitude', 'GPSTimeStamp', 'GPSDateStamp'], 'GPS Data')}
                  
                  {/* Render any remaining keys that weren't in the specific categories */}
                  {renderTable(
                    Object.keys(exifData).filter(k => 
                      k !== 'thumbnail' && 
                      !['Make', 'Model', 'Software', 'Orientation', 'XResolution', 'YResolution', 'ResolutionUnit', 'DateTimeOriginal', 'DateTimeDigitized', 'DateTime', 'ExposureTime', 'FNumber', 'ExposureProgram', 'ISOSpeedRatings', 'ShutterSpeedValue', 'ApertureValue', 'BrightnessValue', 'ExposureBias', 'MaxApertureValue', 'MeteringMode', 'LightSource', 'Flash', 'FocalLength', 'ColorSpace', 'PixelXDimension', 'PixelYDimension', 'FocalLengthIn35mmFilm', 'LensMake', 'LensModel', 'GPSLatitudeRef', 'GPSLatitude', 'GPSLongitudeRef', 'GPSLongitude', 'GPSAltitudeRef', 'GPSAltitude', 'GPSTimeStamp', 'GPSDateStamp'].includes(k)
                    ), 
                    'Other Metadata'
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
