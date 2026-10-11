import React, { useState } from 'react';
import { Eye, EyeOff, Check, X } from 'lucide-react';

export function PasswordChecker() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const analyzePassword = (pass: string) => {
    const checks = {
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      symbol: /[^A-Za-z0-9]/.test(pass),
      notCommon: !['password', '123456', 'qwerty', 'admin'].includes(pass.toLowerCase()),
    };

    let score = 0;
    if (checks.length) score += 1;
    if (checks.uppercase) score += 1;
    if (checks.lowercase) score += 1;
    if (checks.number) score += 1;
    if (checks.symbol) score += 1;
    if (pass.length >= 12) score += 1;
    if (pass.length >= 16) score += 1;

    let strength = { label: 'Very Weak', color: 'bg-red-600', width: '10%' };
    if (score >= 2) strength = { label: 'Weak', color: 'bg-red-400', width: '25%' };
    if (score >= 4) strength = { label: 'Fair', color: 'bg-orange-500', width: '50%' };
    if (score >= 6) strength = { label: 'Strong', color: 'bg-yellow-500', width: '75%' };
    if (score >= 7) strength = { label: 'Very Strong', color: 'bg-green-500', width: '100%' };

    if (pass.length === 0) {
      strength = { label: 'None', color: 'bg-transparent', width: '0%' };
    }

    // Rough estimation of crack time
    let crackTime = 'Instant';
    if (score >= 2) crackTime = 'A few minutes';
    if (score >= 4) crackTime = 'A few days';
    if (score >= 6) crackTime = 'Several years';
    if (score >= 7) crackTime = 'Centuries';
    if (pass.length === 0) crackTime = '-';

    return { checks, strength, crackTime };
  };

  const { checks, strength, crackTime } = analyzePassword(password);

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto w-full">
      <div className="bg-surface brutal-border p-6 md:p-8">
        <div className="mb-8">
          <label className="block font-bold text-sm uppercase tracking-[0.08em] mb-4">Enter Password to Check</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Type a password..."
              className="w-full bg-background brutal-border p-4 pr-12 text-xl outline-none focus:ring-2 focus:ring-accent font-mono"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
            </button>
          </div>
          <p className="text-xs text-muted mt-2 font-bold">
            ⚡ This tool runs entirely in your browser. Your password is never sent to any server.
          </p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between text-sm font-bold uppercase tracking-[0.08em] mb-2">
            <span>Strength</span>
            <span className={strength.color.replace('bg-', 'text-')}>{strength.label}</span>
          </div>
          <div className="h-4 w-full bg-background brutal-border overflow-hidden">
            <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: strength.width }}></div>
          </div>
        </div>

        <div className="bg-[#FFF9F5] dark:bg-[#1A110D] brutal-border p-6 mb-8 text-center">
          <div className="text-sm font-bold uppercase tracking-[0.08em] text-muted mb-2">Estimated Time to Crack</div>
          <div className="text-3xl font-display font-black text-accent">{crackTime}</div>
        </div>

        <div>
          <h3 className="font-bold text-sm uppercase tracking-[0.08em] mb-4">Requirements Checklist</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ChecklistItem met={checks.length} text="At least 8 characters" />
            <ChecklistItem met={checks.uppercase} text="Contains uppercase letter" />
            <ChecklistItem met={checks.lowercase} text="Contains lowercase letter" />
            <ChecklistItem met={checks.number} text="Contains number" />
            <ChecklistItem met={checks.symbol} text="Contains symbol" />
            <ChecklistItem met={checks.notCommon} text="Not a common password" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center justify-center h-6 w-6 brutal-border shrink-0 ${met ? 'bg-green-500 text-white' : 'bg-background text-muted'}`}>
        {met ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </div>
      <span className={`font-medium ${met ? 'text-foreground' : 'text-muted'}`}>{text}</span>
    </div>
  );
}
