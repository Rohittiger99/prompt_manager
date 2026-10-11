import { 
  Image as ImageIcon, FileType, FileText, Code, RefreshCw,
  Minimize, Maximize, Crop, RotateCw, ImagePlus, Eraser, Droplets, Stamp, ClipboardPaste, Hash, Palette, Info,
  Combine, SplitSquareHorizontal, FileArchive, FileOutput, Globe, Edit, Type, PenTool, Lock, Unlock, FileImage, FileSpreadsheet, Presentation,
  Calculator, CaseSensitive, Space, AlignLeft, Link, Shield, ShieldCheck, AlignJustify,
  FileJson, Braces, FileCode, FileType2, FileDigit, Regex, Tags, Share2, Bot, Map, Network, Search, Server, Link2, Key, Clock, PaintBucket, Calendar, Zap,
  ArrowRightLeft
} from 'lucide-react';

export const CATEGORIES = {
  image: {
    id: 'image',
    name: 'Image Tools',
    description: 'Edit, convert, and optimize your images directly in the browser. No uploads required.',
    icon: ImageIcon,
  },
  pdf: {
    id: 'pdf',
    name: 'PDF Tools',
    description: 'Merge, split, convert, and edit PDF documents securely without leaving your browser.',
    icon: FileType,
  },
  text: {
    id: 'text',
    name: 'Text Tools',
    description: 'Format, count, and manipulate text instantly. Perfect for writers and editors.',
    icon: FileText,
  },
  developer: {
    id: 'developer',
    name: 'Developer Tools',
    description: 'Formatters, minifiers, encoders, and generators to speed up your development workflow.',
    icon: Code,
  },
  converter: {
    id: 'converter',
    name: 'Converter Tools',
    description: 'Convert between different file formats and data structures instantly.',
    icon: RefreshCw,
  }
};

export const TOOLS = [
  // IMAGE TOOLS
  { id: 'image-compressor', name: 'Image Compressor', description: 'Reduce image file size without losing quality.', category: 'image', icon: Minimize, isPopular: true },
  { id: 'image-resizer', name: 'Image Resizer', description: 'Resize images to exact dimensions easily.', category: 'image', icon: Maximize, isPopular: true },
  { id: 'image-cropper', name: 'Image Cropper', description: 'Crop images to specific aspect ratios.', category: 'image', icon: Crop },
  { id: 'image-rotator', name: 'Image Rotator & Flipper', description: 'Rotate or flip images horizontally and vertically.', category: 'image', icon: RotateCw },
  { id: 'image-format-converter', name: 'Image Format Converter', description: 'Convert images between PNG, JPG, WEBP, etc.', category: 'image', icon: ImagePlus, isPopular: true },
  { id: 'background-remover', name: 'Background Remover', description: 'Remove backgrounds from images instantly.', category: 'image', icon: Eraser, isPopular: true, isNew: true },
  { id: 'image-blur', name: 'Image Blur Tool', description: 'Apply blur effects to your images.', category: 'image', icon: Droplets, isNew: true },
  { id: 'watermark-adder', name: 'Watermark Adder', description: 'Add text or image watermarks to your pictures.', category: 'image', icon: Stamp },
  { id: 'paste-to-image', name: 'Paste to Image', description: 'Create an image file from clipboard data.', category: 'image', icon: ClipboardPaste },
  { id: 'base64-image', name: 'Base64 Image Converter', description: 'Convert images to Base64 strings and vice versa.', category: 'image', icon: Hash },
  { id: 'image-color-picker', name: 'Image Color Picker', description: 'Extract colors from any image.', category: 'image', icon: Palette },
  { id: 'image-metadata', name: 'Image Metadata Viewer', description: 'View EXIF data and metadata of images.', category: 'image', icon: Info },

  // PDF TOOLS
  { id: 'pdf-merge', name: 'PDF Merge', description: 'Combine multiple PDF files into one document.', category: 'pdf', icon: Combine, isPopular: true },
  { id: 'pdf-split', name: 'PDF Split', description: 'Extract pages or split a PDF into multiple files.', category: 'pdf', icon: SplitSquareHorizontal },
  { id: 'pdf-compress', name: 'PDF Compress', description: 'Reduce the file size of your PDF documents.', category: 'pdf', icon: FileArchive, isPopular: true },
  { id: 'pdf-to-word', name: 'PDF to Word', description: 'Convert PDF documents to editable Word files.', category: 'pdf', icon: FileOutput, isPopular: true },
  { id: 'html-to-pdf', name: 'HTML to PDF', description: 'Convert web pages or HTML code to PDF.', category: 'pdf', icon: Globe },
  { id: 'pdf-editor', name: 'PDF Editor', description: 'Edit text, add shapes, and annotate PDFs.', category: 'pdf', icon: Edit },
  { id: 'add-text-pdf', name: 'Add Text to PDF', description: 'Type text directly onto your PDF pages.', category: 'pdf', icon: Type },
  { id: 'sign-pdf', name: 'Sign PDF', description: 'Add your electronic signature to PDF documents.', category: 'pdf', icon: PenTool },
  { id: 'watermark-pdf', name: 'Add Watermark to PDF', description: 'Stamp PDFs with text or image watermarks.', category: 'pdf', icon: Stamp },
  { id: 'lock-pdf', name: 'Lock PDF', description: 'Secure your PDF files with a password.', category: 'pdf', icon: Lock },
  { id: 'unlock-pdf', name: 'Unlock PDF', description: 'Remove password protection from PDFs.', category: 'pdf', icon: Unlock },
  { id: 'pdf-metadata', name: 'PDF Metadata Reader', description: 'View and edit PDF document properties.', category: 'pdf', icon: Info },
  { id: 'pdf-to-jpg', name: 'PDF to JPG', description: 'Extract PDF pages as high-quality JPG images.', category: 'pdf', icon: FileImage },
  { id: 'jpg-to-pdf', name: 'JPG to PDF', description: 'Convert JPG images into a single PDF document.', category: 'pdf', icon: ImageIcon },
  { id: 'pdf-to-excel', name: 'PDF to Excel', description: 'Convert PDF tables to Excel spreadsheets.', category: 'pdf', icon: FileSpreadsheet },
  { id: 'pdf-to-ppt', name: 'PDF to PowerPoint', description: 'Convert PDF presentations to PPT format.', category: 'pdf', icon: Presentation },

  // TEXT TOOLS
  { id: 'word-counter', name: 'Word Counter', description: 'Count words, characters, sentences, and paragraphs.', category: 'text', icon: Calculator, isPopular: true },
  { id: 'case-converter', name: 'Case Converter', description: 'Convert text to UPPERCASE, lowercase, Title Case, etc.', category: 'text', icon: CaseSensitive },
  { id: 'remove-spaces', name: 'Remove Extra Spaces', description: 'Clean up text by removing double spaces and line breaks.', category: 'text', icon: Space },
  { id: 'text-formatter', name: 'Text Formatter', description: 'Format and align text documents easily.', category: 'text', icon: AlignLeft },
  { id: 'url-encode-decode', name: 'URL Encode/Decode', description: 'Encode or decode URL strings safely.', category: 'text', icon: Link },
  { id: 'html-encode-decode', name: 'HTML Encode/Decode', description: 'Convert special characters to HTML entities.', category: 'text', icon: Code },
  { id: 'password-generator', name: 'Password Generator', description: 'Generate secure, random passwords.', category: 'text', icon: Shield, isPopular: true },
  { id: 'password-checker', name: 'Password Strength Checker', description: 'Test how secure your password really is.', category: 'text', icon: ShieldCheck },
  { id: 'lorem-ipsum', name: 'Lorem Ipsum Generator', description: 'Generate placeholder text for your designs.', category: 'text', icon: AlignJustify },

  // DEVELOPER TOOLS
  { id: 'json-formatter', name: 'JSON Formatter', description: 'Format, validate, and beautify JSON data.', category: 'developer', icon: FileJson, isPopular: true },
  { id: 'base64-encoder', name: 'Base64 Encoder/Decoder', description: 'Encode and decode strings to Base64 format.', category: 'developer', icon: Hash, isPopular: true },
  { id: 'xml-formatter', name: 'XML Formatter', description: 'Format and beautify XML documents.', category: 'developer', icon: Braces },
  { id: 'markdown-previewer', name: 'Markdown Previewer', description: 'Write and preview Markdown in real-time.', category: 'developer', icon: FileCode },
  { id: 'html-formatter', name: 'HTML Formatter', description: 'Beautify and format HTML source code.', category: 'developer', icon: FileType2 },
  { id: 'css-minifier', name: 'CSS Minifier', description: 'Compress CSS code to reduce file size.', category: 'developer', icon: FileDigit },
  { id: 'js-minifier', name: 'JS Minifier', description: 'Compress JavaScript code for production.', category: 'developer', icon: FileDigit },
  { id: 'code-beautifier', name: 'Code Beautifier', description: 'Format source code for multiple languages.', category: 'developer', icon: Code },
  { id: 'regex-tester', name: 'Regex Tester', description: 'Test and debug regular expressions.', category: 'developer', icon: Regex, isPopular: true },
  { id: 'meta-tag-generator', name: 'Meta Tag Generator', description: 'Generate SEO meta tags for your website.', category: 'developer', icon: Tags },
  { id: 'og-generator', name: 'OG Generator', description: 'Create Open Graph tags for social sharing.', category: 'developer', icon: Share2 },
  { id: 'robots-txt', name: 'Robots.txt Generator', description: 'Generate robots.txt files for search engines.', category: 'developer', icon: Bot },
  { id: 'sitemap-generator', name: 'Sitemap Generator', description: 'Create XML sitemaps for your website.', category: 'developer', icon: Map },
  { id: 'ip-finder', name: 'IP Finder', description: 'Find your public IP address and details.', category: 'developer', icon: Network },
  { id: 'dns-lookup', name: 'DNS Lookup', description: 'Check DNS records for any domain.', category: 'developer', icon: Search },
  { id: 'http-headers', name: 'HTTP Headers Checker', description: 'View HTTP response headers for any URL.', category: 'developer', icon: Server },
  { id: 'url-parser', name: 'URL Parser', description: 'Parse URLs into their component parts.', category: 'developer', icon: Link2 },
  { id: 'uuid-generator', name: 'UUID Generator', description: 'Generate random UUIDs (v4).', category: 'developer', icon: Key },
  { id: 'timestamp-converter', name: 'Timestamp Converter', description: 'Convert Unix timestamps to readable dates.', category: 'developer', icon: Clock },
  { id: 'color-converter', name: 'Color Code Converter', description: 'Convert between HEX, RGB, HSL, etc.', category: 'developer', icon: PaintBucket },
  { id: 'cron-generator', name: 'Cron Job Generator', description: 'Generate cron schedule expressions.', category: 'developer', icon: Calendar },
  { id: 'speed-checker', name: 'Website Speed Checker', description: 'Test website loading speed and performance.', category: 'developer', icon: Zap },

  // CONVERTER TOOLS
  { id: 'jpg-to-png', name: 'JPG to PNG', description: 'Convert JPG images to transparent PNGs.', category: 'converter', icon: ArrowRightLeft, isPopular: true },
  { id: 'png-to-jpg', name: 'PNG to JPG', description: 'Convert PNG images to JPG format.', category: 'converter', icon: ArrowRightLeft },
  { id: 'webp-to-jpg', name: 'WebP to JPG', description: 'Convert WebP images to standard JPGs.', category: 'converter', icon: ArrowRightLeft },
  { id: 'jpg-to-webp', name: 'JPG to WebP', description: 'Convert JPG images to optimized WebP format.', category: 'converter', icon: ArrowRightLeft },
  { id: 'svg-to-png', name: 'SVG to PNG', description: 'Convert vector SVGs to raster PNG images.', category: 'converter', icon: ArrowRightLeft },
  { id: 'markdown-to-html', name: 'Markdown to HTML', description: 'Convert Markdown text to HTML code.', category: 'converter', icon: ArrowRightLeft },
  { id: 'html-to-markdown', name: 'HTML to Markdown', description: 'Convert HTML code back to Markdown.', category: 'converter', icon: ArrowRightLeft },
  { id: 'csv-to-json', name: 'CSV to JSON', description: 'Convert CSV spreadsheets to JSON arrays.', category: 'converter', icon: ArrowRightLeft, isPopular: true },
  { id: 'json-to-csv', name: 'JSON to CSV', description: 'Convert JSON data arrays to CSV format.', category: 'converter', icon: ArrowRightLeft },
  { id: 'yaml-to-json', name: 'YAML to JSON', description: 'Convert YAML configuration to JSON format.', category: 'converter', icon: ArrowRightLeft },
];
