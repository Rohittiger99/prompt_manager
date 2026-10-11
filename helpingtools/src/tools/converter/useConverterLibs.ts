import { useState, useEffect } from 'react';

declare global {
  interface Window {
    marked: any;
    TurndownService: any;
    jsyaml: any;
  }
}

export function useConverterLibs() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve(true);
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    Promise.all([
      loadScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js'),
      loadScript('https://unpkg.com/turndown/dist/turndown.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js')
    ]).then(() => {
      setLoaded(true);
    }).catch(err => {
      console.error("Failed to load converter libs", err);
    });
  }, []);

  return loaded;
}
