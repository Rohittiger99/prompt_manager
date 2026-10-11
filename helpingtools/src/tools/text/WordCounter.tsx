import React, { useState, useEffect } from 'react';

export function WordCounter() {
  const [text, setText] = useState('');
  const [stats, setStats] = useState({
    words: 0,
    chars: 0,
    charsNoSpaces: 0,
    sentences: 0,
    paragraphs: 0,
    readingTime: 0,
  });
  const [wordDensity, setWordDensity] = useState<{word: string, count: number, density: number}[]>([]);

  useEffect(() => {
    const words = text.trim() ? text.trim().split(/\s+/) : [];
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s/g, '').length;
    const sentences = text.trim() ? text.split(/[.!?]+/).filter(Boolean).length : 0;
    const paragraphs = text.trim() ? text.split(/\n+/).filter(Boolean).length : 0;
    const readingTime = Math.ceil(words.length / 200);

    setStats({
      words: words.length,
      chars,
      charsNoSpaces,
      sentences,
      paragraphs,
      readingTime,
    });

    // Calculate word density
    const wordCounts: Record<string, number> = {};
    words.forEach(w => {
      const cleanWord = w.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanWord) {
        wordCounts[cleanWord] = (wordCounts[cleanWord] || 0) + 1;
      }
    });

    const density = Object.entries(wordCounts)
      .map(([word, count]) => ({
        word,
        count,
        density: Number(((count / words.length) * 100).toFixed(1))
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setWordDensity(density);
  }, [text]);

  const isOverLimit = stats.words > 10000;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Words', value: stats.words },
          { label: 'Characters', value: stats.chars },
          { label: 'Characters (no spaces)', value: stats.charsNoSpaces },
          { label: 'Sentences', value: stats.sentences },
          { label: 'Paragraphs', value: stats.paragraphs },
          { label: 'Reading Time', value: `${stats.readingTime} min` },
        ].map(stat => (
          <div key={stat.label} className="bg-surface brutal-border p-4 text-center">
            <div className="text-3xl font-display font-black text-accent mb-1">{stat.value}</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste your text here to see real-time statistics..."
          className={`w-full min-h-[250px] resize-y bg-surface brutal-border p-6 text-lg outline-none focus:ring-2 focus:ring-accent transition-shadow ${isOverLimit ? 'border-[#EAB308] ring-2 ring-[#EAB308]' : ''}`}
        />
        {isOverLimit && (
          <div className="absolute bottom-4 right-4 bg-[#EAB308] text-white brutal-border px-3 py-1 text-xs font-bold uppercase">
            Word limit exceeded (10,000 max)
          </div>
        )}
      </div>

      {wordDensity.length > 0 && (
        <div className="bg-surface brutal-border p-6">
          <h3 className="text-xl font-display font-bold mb-4">Top 5 Most Used Words</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-border-color">
                  <th className="py-3 px-4 font-bold uppercase text-[11px] tracking-[0.08em] text-muted">Word</th>
                  <th className="py-3 px-4 font-bold uppercase text-[11px] tracking-[0.08em] text-muted">Count</th>
                  <th className="py-3 px-4 font-bold uppercase text-[11px] tracking-[0.08em] text-muted">Density</th>
                </tr>
              </thead>
              <tbody>
                {wordDensity.map((item, i) => (
                  <tr key={i} className="border-b border-border-color/20 last:border-0">
                    <td className="py-3 px-4 font-bold">{item.word}</td>
                    <td className="py-3 px-4">{item.count}</td>
                    <td className="py-3 px-4">{item.density}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
