import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { ChevronRight, Upload, Settings, Download, ArrowRight, Star } from 'lucide-react';
import { TOOLS, CATEGORIES } from '../data/tools';






const TOOL_COMPONENTS: Record<string, React.LazyExoticComponent<React.FC>> = {
  'word-counter': React.lazy(() => import('../tools/text/WordCounter').then(m => ({ default: m.WordCounter }))),
  'case-converter': React.lazy(() => import('../tools/text/CaseConverter').then(m => ({ default: m.CaseConverter }))),
  'remove-spaces': React.lazy(() => import('../tools/text/RemoveSpaces').then(m => ({ default: m.RemoveSpaces }))),
  'text-formatter': React.lazy(() => import('../tools/text/TextFormatter').then(m => ({ default: m.TextFormatter }))),
  'url-encode-decode': React.lazy(() => import('../tools/text/UrlEncodeDecode').then(m => ({ default: m.UrlEncodeDecode }))),
  'html-encode-decode': React.lazy(() => import('../tools/text/HtmlEncodeDecode').then(m => ({ default: m.HtmlEncodeDecode }))),
  'password-generator': React.lazy(() => import('../tools/text/PasswordGenerator').then(m => ({ default: m.PasswordGenerator }))),
  'password-checker': React.lazy(() => import('../tools/text/PasswordChecker').then(m => ({ default: m.PasswordChecker }))),
  'lorem-ipsum': React.lazy(() => import('../tools/text/LoremIpsum').then(m => ({ default: m.LoremIpsum }))),
  'json-formatter': React.lazy(() => import('../tools/developer/JsonFormatter').then(m => ({ default: m.JsonFormatter }))),
  'xml-formatter': React.lazy(() => import('../tools/developer/XmlFormatter').then(m => ({ default: m.XmlFormatter }))),
  'html-formatter': React.lazy(() => import('../tools/developer/HtmlFormatter').then(m => ({ default: m.HtmlFormatter }))),
  'css-minifier': React.lazy(() => import('../tools/developer/CssMinifier').then(m => ({ default: m.CssMinifier }))),
  'js-minifier': React.lazy(() => import('../tools/developer/JsMinifier').then(m => ({ default: m.JsMinifier }))),
  'code-beautifier': React.lazy(() => import('../tools/developer/CodeBeautifier').then(m => ({ default: m.CodeBeautifier }))),
  'regex-tester': React.lazy(() => import('../tools/developer/RegexTester').then(m => ({ default: m.RegexTester }))),
  'markdown-previewer': React.lazy(() => import('../tools/developer/MarkdownPreviewer').then(m => ({ default: m.MarkdownPreviewer }))),
  'meta-tag-generator': React.lazy(() => import('../tools/developer/MetaTagGenerator').then(m => ({ default: m.MetaTagGenerator }))),
  'og-generator': React.lazy(() => import('../tools/developer/OgGenerator').then(m => ({ default: m.OgGenerator }))),
  'robots-txt': React.lazy(() => import('../tools/developer/RobotsTxtGenerator').then(m => ({ default: m.RobotsTxtGenerator }))),
  'sitemap-generator': React.lazy(() => import('../tools/developer/SitemapGenerator').then(m => ({ default: m.SitemapGenerator }))),
  'ip-finder': React.lazy(() => import('../tools/developer/IpAddressFinder').then(m => ({ default: m.IpAddressFinder }))),
  'dns-lookup': React.lazy(() => import('../tools/developer/DnsLookup').then(m => ({ default: m.DnsLookup }))),
  'http-headers': React.lazy(() => import('../tools/developer/HttpHeadersChecker').then(m => ({ default: m.HttpHeadersChecker }))),
  'url-parser': React.lazy(() => import('../tools/developer/UrlParser').then(m => ({ default: m.UrlParser }))),
  'uuid-generator': React.lazy(() => import('../tools/developer/UuidGenerator').then(m => ({ default: m.UuidGenerator }))),
  'timestamp-converter': React.lazy(() => import('../tools/developer/TimestampConverter').then(m => ({ default: m.TimestampConverter }))),
  'color-converter': React.lazy(() => import('../tools/developer/ColorCodeConverter').then(m => ({ default: m.ColorCodeConverter }))),
  'cron-generator': React.lazy(() => import('../tools/developer/CronJobGenerator').then(m => ({ default: m.CronJobGenerator }))),
  'base64-encoder': React.lazy(() => import('../tools/developer/Base64Encoder').then(m => ({ default: m.Base64Encoder }))),
  'speed-checker': React.lazy(() => import('../tools/developer/WebsiteSpeedChecker').then(m => ({ default: m.WebsiteSpeedChecker }))),
  'image-compressor': React.lazy(() => import('../tools/image/ImageCompressor').then(m => ({ default: m.ImageCompressor }))),
  'image-resizer': React.lazy(() => import('../tools/image/ImageResizer').then(m => ({ default: m.ImageResizer }))),
  'image-cropper': React.lazy(() => import('../tools/image/ImageCropper').then(m => ({ default: m.ImageCropper }))),
  'image-rotator': React.lazy(() => import('../tools/image/ImageRotator').then(m => ({ default: m.ImageRotator }))),
  'image-format-converter': React.lazy(() => import('../tools/image/ImageFormatConverter').then(m => ({ default: m.ImageFormatConverter }))),
  'background-remover': React.lazy(() => import('../tools/image/BackgroundRemover').then(m => ({ default: m.BackgroundRemover }))),
  'image-blur': React.lazy(() => import('../tools/image/ImageBlur').then(m => ({ default: m.ImageBlur }))),
  'watermark-adder': React.lazy(() => import('../tools/image/WatermarkAdder').then(m => ({ default: m.WatermarkAdder }))),
  'paste-to-image': React.lazy(() => import('../tools/image/PasteToImage').then(m => ({ default: m.PasteToImage }))),
  'base64-image': React.lazy(() => import('../tools/image/Base64ImageConverter').then(m => ({ default: m.Base64ImageConverter }))),
  'image-color-picker': React.lazy(() => import('../tools/image/ImageColorPicker').then(m => ({ default: m.ImageColorPicker }))),
  'image-metadata': React.lazy(() => import('../tools/image/ImageMetadataViewer').then(m => ({ default: m.ImageMetadataViewer }))),
  'pdf-merge': React.lazy(() => import('../tools/pdf/PdfMerge').then(m => ({ default: m.PdfMerge }))),
  'pdf-split': React.lazy(() => import('../tools/pdf/PdfSplit').then(m => ({ default: m.PdfSplit }))),
  'pdf-compress': React.lazy(() => import('../tools/pdf/PdfCompress').then(m => ({ default: m.PdfCompress }))),
  'pdf-to-word': React.lazy(() => import('../tools/pdf/PdfToWord').then(m => ({ default: m.PdfToWord }))),
  'html-to-pdf': React.lazy(() => import('../tools/pdf/HtmlToPdf').then(m => ({ default: m.HtmlToPdf }))),
  'add-text-to-pdf': React.lazy(() => import('../tools/pdf/AddTextToPdf').then(m => ({ default: m.AddTextToPdf }))),
  'sign-pdf': React.lazy(() => import('../tools/pdf/SignPdf').then(m => ({ default: m.SignPdf }))),
  'add-watermark-to-pdf': React.lazy(() => import('../tools/pdf/AddWatermarkToPdf').then(m => ({ default: m.AddWatermarkToPdf }))),
  'lock-pdf': React.lazy(() => import('../tools/pdf/LockPdf').then(m => ({ default: m.LockPdf }))),
  'unlock-pdf': React.lazy(() => import('../tools/pdf/UnlockPdf').then(m => ({ default: m.UnlockPdf }))),
  'pdf-metadata-reader': React.lazy(() => import('../tools/pdf/PdfMetadataReader').then(m => ({ default: m.PdfMetadataReader }))),
  'pdf-to-jpg': React.lazy(() => import('../tools/pdf/PdfToJpg').then(m => ({ default: m.PdfToJpg }))),
  'jpg-to-pdf': React.lazy(() => import('../tools/pdf/JpgToPdf').then(m => ({ default: m.JpgToPdf }))),
  'pdf-to-excel': React.lazy(() => import('../tools/pdf/PdfToExcel').then(m => ({ default: m.PdfToExcel }))),
  'pdf-editor': React.lazy(() => import('../tools/pdf/PdfEditor').then(m => ({ default: m.PdfEditor }))),
  'pdf-to-ppt': React.lazy(() => import('../tools/pdf/PdfToPpt').then(m => ({ default: m.PdfToPpt }))),
  'jpg-to-png': React.lazy(() => import('../tools/converter/JpgToPng').then(m => ({ default: m.JpgToPng }))),
  'png-to-jpg': React.lazy(() => import('../tools/converter/PngToJpg').then(m => ({ default: m.PngToJpg }))),
  'webp-to-jpg': React.lazy(() => import('../tools/converter/WebpToJpg').then(m => ({ default: m.WebpToJpg }))),
  'jpg-to-webp': React.lazy(() => import('../tools/converter/JpgToWebp').then(m => ({ default: m.JpgToWebp }))),
  'svg-to-png': React.lazy(() => import('../tools/converter/SvgToPng').then(m => ({ default: m.SvgToPng }))),
  'markdown-to-html': React.lazy(() => import('../tools/converter/MarkdownToHtml').then(m => ({ default: m.MarkdownToHtml }))),
  'html-to-markdown': React.lazy(() => import('../tools/converter/HtmlToMarkdown').then(m => ({ default: m.HtmlToMarkdown }))),
  'csv-to-json': React.lazy(() => import('../tools/converter/CsvToJson').then(m => ({ default: m.CsvToJson }))),
  'json-to-csv': React.lazy(() => import('../tools/converter/JsonToCsv').then(m => ({ default: m.JsonToCsv }))),
  'yaml-to-json': React.lazy(() => import('../tools/converter/YamlToJson').then(m => ({ default: m.YamlToJson }))),
};

export function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>();
  
  const tool = TOOLS.find(t => t.id === toolId);
  
  if (!tool) {
    return <Navigate to="/404" replace />;
  }

  const category = CATEGORIES[tool.category as keyof typeof CATEGORIES];
  const relatedTools = TOOLS.filter(t => t.category === tool.category && t.id !== tool.id).slice(0, 3);

  const title = `${tool.name} — Free Online ${category.name.replace(' Tools', '')} Tool | HelpingTools`;
  const description = `Free online ${tool.name.toLowerCase()} tool. Works entirely in your browser. No file uploads, no signup, instant results.`;

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": tool.name,
    "operatingSystem": "Any",
    "applicationCategory": "BrowserApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": description
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://helpingtools.com/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": category.name,
        "item": `https://helpingtools.com/category/${category.id}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": tool.name,
        "item": `https://helpingtools.com/tool/${tool.id}`
      }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `Is this ${tool.name} tool free to use?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, this tool is 100% free to use with no limits or hidden fees."
        }
      },
      {
        "@type": "Question",
        "name": "Is my data secure?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Absolutely. All processing happens locally in your browser. We never upload your text or files to any server."
        }
      },
      {
        "@type": "Question",
        "name": "Does this work on mobile devices?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, our tools are fully responsive and work perfectly on smartphones and tablets."
        }
      },
      {
        "@type": "Question",
        "name": "Do I need to create an account?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No account or registration is required. You can use all our tools instantly."
        }
      }
    ]
  };

  return (
    <div className="w-full pb-24">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`https://helpingtools.com/tool/${tool.id}`} />
        <script type="application/ld+json">{JSON.stringify(softwareAppSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      {/* BREADCRUMB */}
      <div className="border-b-2 border-border-color bg-background">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to={`/category/${category.id}`} className="hover:text-foreground transition-colors">{category.name}</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{tool.name}</span>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* HEADER */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 brutal-border bg-surface flex items-center justify-center shadow-[4px_4px_0px_#0A0A0A]">
              <tool.icon className="h-8 w-8 text-accent" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight">{tool.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="brutal-border bg-[#FFF3EE] dark:bg-[#1A110D] text-accent px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]">
                  ⚡ BROWSER ONLY
                </span>
                <span className="text-muted text-sm font-bold">{tool.description}</span>
              </div>
            </div>
          </div>
        </div>

        {/* TOOL INTERFACE */}
        <div className="mb-20">
          {TOOL_COMPONENTS[tool.id] ? (
            <React.Suspense fallback={<div className="p-12 flex justify-center"><div className="h-8 w-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div></div>}>{React.createElement(TOOL_COMPONENTS[tool.id])}</React.Suspense>
          ) : (
            <div className="bg-surface brutal-border brutal-shadow-lg">
              {/* Toolbar */}
              <div className="border-b-2 border-border-color bg-background px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.08em]">
                  <Settings className="h-4 w-4" /> Tool Settings
                </div>
                <button className="brutal-btn-secondary px-4 py-2 text-[11px]">
                  Reset
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[500px]">
                {/* Input Area */}
                <div className="p-8 flex flex-col">
                  <div className="flex-1 border-2 border-dashed border-border-color bg-background hover:bg-[#FFF3EE] dark:hover:bg-[#1A110D] transition-colors flex flex-col items-center justify-center p-12 text-center cursor-pointer group">
                    <div className="h-16 w-16 brutal-border bg-surface flex items-center justify-center mb-6 group-hover:text-accent transition-colors">
                      <Upload className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-display font-bold mb-2">Upload File</h3>
                    <p className="text-muted mb-6">Drag and drop your file here, or click to browse</p>
                    <button className="brutal-btn-primary px-6 py-3 text-[13px]">
                      Select File
                    </button>
                  </div>
                </div>

                {/* Output Area */}
                <div className="border-t-2 lg:border-t-0 lg:border-l-2 border-border-color bg-[#FAFAFA] dark:bg-[#0A0A0A] p-8 flex flex-col">
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="h-24 w-24 rounded-full border-2 border-border-color border-dashed flex items-center justify-center mb-6 text-muted">
                      <tool.icon className="h-8 w-8 opacity-20" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-muted mb-2">Ready to process</h3>
                    <p className="text-muted text-sm max-w-xs">
                      Upload a file on the left to see the results here. Processing happens instantly in your browser.
                    </p>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t-2 border-border-color flex justify-end">
                    <button className="brutal-btn-primary px-8 py-4 text-[13px] flex items-center gap-2 opacity-50 cursor-not-allowed">
                      <Download className="h-4 w-4" /> Download Result
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CONTENT SECTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2 space-y-16">
            {/* How to Use */}
            <section>
              <h2 className="text-3xl font-display font-black mb-8">How to use {tool.name}</h2>
              <div className="space-y-6">
                {[
                  `Enter or paste your text into the input area.`,
                  `Select your desired options or formatting settings.`,
                  `Copy or download your processed text instantly.`
                ].map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="h-8 w-8 shrink-0 brutal-border bg-accent text-white flex items-center justify-center font-display font-bold">
                      {i + 1}
                    </div>
                    <p className="text-lg text-foreground pt-1">{step}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* FAQ */}
            <section>
              <h2 className="text-3xl font-display font-black mb-8">Frequently Asked Questions</h2>
              <div className="space-y-4" itemScope itemType="https://schema.org/FAQPage">
                {[
                  { q: `Is this ${tool.name} tool free to use?`, a: 'Yes, this tool is 100% free to use with no limits or hidden fees.' },
                  { q: 'Is my data secure?', a: 'Absolutely. All processing happens locally in your browser. We never upload your text or files to any server.' },
                  { q: 'Does this work on mobile devices?', a: 'Yes, our tools are fully responsive and work perfectly on smartphones and tablets.' },
                  { q: 'Do I need to create an account?', a: 'No account or registration is required. You can use all our tools instantly.' }
                ].map((faq, i) => (
                  <div key={i} className="brutal-border bg-surface p-6" itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 className="text-xl font-display font-bold mb-2" itemProp="name">{faq.q}</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                      <p className="text-muted" itemProp="text">{faq.a}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div>
            <h2 className="text-2xl font-display font-black mb-6">Related Tools</h2>
            <div className="space-y-4">
              {relatedTools.map(rt => (
                <Link 
                  key={rt.id} 
                  to={`/tool/${rt.id}`}
                  className="block brutal-border bg-surface p-4 hover-brutal-sm group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 brutal-border bg-background flex items-center justify-center shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                      <rt.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-foreground group-hover:text-accent transition-colors">{rt.name}</h4>
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted line-clamp-1">{rt.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            <div className="mt-8 brutal-border bg-[#FFF9F5] dark:bg-[#1A110D] p-6 text-center">
              <div className="h-12 w-12 mx-auto brutal-border bg-accent text-white flex items-center justify-center mb-4">
                <Star className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-xl mb-2">Love this tool?</h3>
              <p className="text-muted text-sm mb-4">Bookmark this page (Ctrl+D) to access it quickly next time.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
