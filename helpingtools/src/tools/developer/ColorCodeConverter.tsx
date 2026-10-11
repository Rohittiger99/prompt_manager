import React, { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';

// Helper functions for color conversion
const hexToRgb = (hex: string) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  return { r, g, b };
};

const rgbToHex = (r: number, g: number, b: number) => {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();
};

const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const rgbToHsv = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
};

const rgbToCmyk = (r: number, g: number, b: number) => {
  let c = 1 - (r / 255);
  let m = 1 - (g / 255);
  let y = 1 - (b / 255);
  let k = Math.min(c, Math.min(m, y));
  
  c = (c - k) / (1 - k) || 0;
  m = (m - k) / (1 - k) || 0;
  y = (y - k) / (1 - k) || 0;
  
  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100)
  };
};

export function ColorCodeConverter() {
  const [hex, setHex] = useState('#FF4D00');
  const [textInput, setTextInput] = useState('#FF4D00');
  const [copied, setCopied] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>(['#FF4D00']);

  useEffect(() => {
    // Basic validation for hex
    if (/^#[0-9A-F]{6}$/i.test(textInput) || /^#[0-9A-F]{3}$/i.test(textInput)) {
      setHex(textInput);
      addToHistory(textInput);
    }
  }, [textInput]);

  const addToHistory = (color: string) => {
    setHistory(prev => {
      const newHistory = [color, ...prev.filter(c => c !== color)].slice(0, 10);
      return newHistory;
    });
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value.toUpperCase();
    setHex(newColor);
    setTextInput(newColor);
    addToHistory(newColor);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const { r, g, b } = hexToRgb(hex);
  const hsl = rgbToHsl(r, g, b);
  const hsv = rgbToHsv(r, g, b);
  const cmyk = rgbToCmyk(r, g, b);

  const formats = [
    { id: 'hex', label: 'HEX', value: hex },
    { id: 'rgb', label: 'RGB', value: `rgb(${r}, ${g}, ${b})` },
    { id: 'rgba', label: 'RGBA', value: `rgba(${r}, ${g}, ${b}, 1)` },
    { id: 'hsl', label: 'HSL', value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
    { id: 'hsla', label: 'HSLA', value: `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 1)` },
    { id: 'hsv', label: 'HSV', value: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)` },
    { id: 'cmyk', label: 'CMYK', value: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)` },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Input & Preview */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-surface brutal-border p-6 flex flex-col gap-4">
            <label className="block font-bold text-sm uppercase tracking-[0.08em] text-muted">Color Input</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={hex}
                onChange={handleColorPickerChange}
                className="w-14 h-14 p-1 bg-background brutal-border cursor-pointer"
              />
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="#FFFFFF"
                className="flex-1 bg-background brutal-border p-3 font-mono text-lg outline-none focus:ring-2 focus:ring-accent uppercase"
              />
            </div>
          </div>

          <div 
            className="brutal-border h-48 w-full shadow-[8px_8px_0px_#0A0A0A]"
            style={{ backgroundColor: hex }}
          ></div>

          <div className="bg-surface brutal-border p-6">
            <h3 className="font-bold text-sm uppercase tracking-[0.08em] text-muted mb-4">Recent Colors</h3>
            <div className="flex flex-wrap gap-2">
              {history.map((c, i) => (
                <button
                  key={i}
                  onClick={() => { setHex(c); setTextInput(c); }}
                  className="w-8 h-8 brutal-border cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Conversions */}
        <div className="lg:col-span-2 bg-surface brutal-border overflow-hidden">
          <div className="bg-background border-b-2 border-border-color px-6 py-4">
            <h3 className="font-display font-bold text-xl">Color Formats</h3>
          </div>
          <div className="p-6 space-y-4">
            {formats.map(f => (
              <div key={f.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background brutal-border p-4">
                <div className="w-24 shrink-0 font-bold text-sm uppercase tracking-[0.08em] text-muted">{f.label}</div>
                <div className="flex-1 font-mono text-lg break-all">{f.value}</div>
                <button 
                  onClick={() => handleCopy(f.value, f.id)}
                  className="brutal-btn-secondary px-3 py-2 text-[10px] flex items-center gap-1 shrink-0"
                >
                  {copied === f.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
