import React, { useState, useEffect } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';

export function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkPasswords, setBulkPasswords] = useState<string[]>([]);

  const generatePassword = () => {
    const charset = {
      uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      lowercase: 'abcdefghijklmnopqrstuvwxyz',
      numbers: '0123456789',
      symbols: '!@#$%^&*()_+~`|}{[]:;?><,./-=',
    };

    let chars = '';
    if (options.uppercase) chars += charset.uppercase;
    if (options.lowercase) chars += charset.lowercase;
    if (options.numbers) chars += charset.numbers;
    if (options.symbols) chars += charset.symbols;

    if (!chars) {
      setPassword('Please select at least one option');
      return;
    }

    if (bulkMode) {
      const newPasswords = [];
      for (let i = 0; i < bulkCount; i++) {
        let pass = '';
        for (let j = 0; j < length; j++) {
          pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        newPasswords.push(pass);
      }
      setBulkPasswords(newPasswords);
      setPassword(newPasswords[0]);
    } else {
      let pass = '';
      for (let i = 0; i < length; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setPassword(pass);
    }
  };

  useEffect(() => {
    generatePassword();
  }, [length, options, bulkMode, bulkCount]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStrength = () => {
    let score = 0;
    if (length > 8) score += 1;
    if (length > 12) score += 1;
    if (length >= 16) score += 1;
    if (options.uppercase && options.lowercase) score += 1;
    if (options.numbers) score += 1;
    if (options.symbols) score += 1;

    if (score < 3) return { label: 'Weak', color: 'bg-red-500', width: '25%' };
    if (score < 5) return { label: 'Fair', color: 'bg-orange-500', width: '50%' };
    if (score < 6) return { label: 'Strong', color: 'bg-yellow-500', width: '75%' };
    return { label: 'Very Strong', color: 'bg-green-500', width: '100%' };
  };

  const strength = getStrength();

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto w-full">
      <div className="bg-surface brutal-border p-6 md:p-8">
        <div className="relative mb-6">
          <div className="w-full bg-background brutal-border p-6 text-2xl md:text-3xl font-mono text-center break-all min-h-[100px] flex items-center justify-center">
            {password}
          </div>
          <button 
            onClick={() => handleCopy(bulkMode ? bulkPasswords.join('\n') : password)}
            className="absolute top-4 right-4 brutal-btn-secondary px-3 py-1 text-[10px] flex items-center gap-1"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? 'Copied!' : (bulkMode ? 'Copy All' : 'Copy')}
          </button>
        </div>

        {!bulkMode && (
          <div className="mb-8">
            <div className="flex justify-between text-sm font-bold uppercase tracking-[0.08em] mb-2">
              <span>Password Strength</span>
              <span className={strength.color.replace('bg-', 'text-')}>{strength.label}</span>
            </div>
            <div className="h-2 w-full bg-background brutal-border overflow-hidden">
              <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: strength.width }}></div>
            </div>
          </div>
        )}

        <div className="space-y-8">
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="font-bold text-sm uppercase tracking-[0.08em]">Password Length</label>
              <span className="text-2xl font-display font-black text-accent">{length}</span>
            </div>
            <input 
              type="range" 
              min="8" 
              max="128" 
              value={length} 
              onChange={(e) => setLength(parseInt(e.target.value))}
              className="w-full h-2 bg-background brutal-border appearance-none cursor-pointer accent-accent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-background brutal-border hover:bg-[#FFF3EE] dark:hover:bg-[#1A110D] transition-colors">
              <input 
                type="checkbox" 
                checked={options.uppercase}
                onChange={(e) => setOptions({...options, uppercase: e.target.checked})}
                className="w-5 h-5 brutal-border accent-accent"
              />
              <span className="font-bold">Uppercase (A-Z)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-background brutal-border hover:bg-[#FFF3EE] dark:hover:bg-[#1A110D] transition-colors">
              <input 
                type="checkbox" 
                checked={options.lowercase}
                onChange={(e) => setOptions({...options, lowercase: e.target.checked})}
                className="w-5 h-5 brutal-border accent-accent"
              />
              <span className="font-bold">Lowercase (a-z)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-background brutal-border hover:bg-[#FFF3EE] dark:hover:bg-[#1A110D] transition-colors">
              <input 
                type="checkbox" 
                checked={options.numbers}
                onChange={(e) => setOptions({...options, numbers: e.target.checked})}
                className="w-5 h-5 brutal-border accent-accent"
              />
              <span className="font-bold">Numbers (0-9)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-background brutal-border hover:bg-[#FFF3EE] dark:hover:bg-[#1A110D] transition-colors">
              <input 
                type="checkbox" 
                checked={options.symbols}
                onChange={(e) => setOptions({...options, symbols: e.target.checked})}
                className="w-5 h-5 brutal-border accent-accent"
              />
              <span className="font-bold">Symbols (!@#$...)</span>
            </label>
          </div>

          <div className="pt-6 border-t-2 border-border-color flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={bulkMode}
                onChange={(e) => setBulkMode(e.target.checked)}
                className="w-5 h-5 brutal-border accent-accent"
              />
              <span className="font-bold">Generate Multiple</span>
            </label>
            
            {bulkMode && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold uppercase tracking-[0.08em]">Quantity:</span>
                <input 
                  type="number" 
                  min="1" 
                  max="50" 
                  value={bulkCount}
                  onChange={(e) => setBulkCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-20 bg-background brutal-border p-2 text-center font-bold outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            )}
          </div>

          <button 
            onClick={generatePassword}
            className="w-full brutal-btn-primary py-4 text-lg flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-5 w-5" /> Generate Password{bulkMode ? 's' : ''}
          </button>
        </div>
      </div>

      {bulkMode && bulkPasswords.length > 1 && (
        <div className="bg-surface brutal-border p-6">
          <h3 className="font-display font-bold text-xl mb-4">Generated Passwords</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {bulkPasswords.map((pass, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-background brutal-border">
                <code className="font-mono">{pass}</code>
                <button 
                  onClick={() => handleCopy(pass)}
                  className="brutal-btn-secondary px-2 py-1 text-[10px]"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
