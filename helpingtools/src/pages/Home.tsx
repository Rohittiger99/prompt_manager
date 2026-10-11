import React from 'react';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { 
  Search, Shield, Zap, Gift, Smartphone, 
  Image as ImageIcon, FileType, FileText, Code, RefreshCw,
  ArrowRight, Hash, Palette, Edit3, FileJson, ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const BENTO_CATEGORIES = [
  {
    id: 'image',
    name: 'Image Tools',
    icon: ImageIcon,
    count: 24,
    examples: ['Resizer', 'Compressor', 'Crop'],
    className: 'md:col-span-2 md:row-span-1',
    bg: 'bg-[#FFF9F5] dark:bg-[#1A110D]',
    path: '/category/image'
  },
  {
    id: 'pdf',
    name: 'PDF Tools',
    icon: FileType,
    count: 12,
    examples: ['Merge', 'Split', 'To Word'],
    className: 'md:col-span-1 md:row-span-2',
    bg: 'bg-[#F5F5FF] dark:bg-[#0D0D1A]',
    path: '/category/pdf'
  },
  {
    id: 'text',
    name: 'Text Tools',
    icon: FileText,
    count: 18,
    examples: ['Word Count', 'Case Converter', 'Diff'],
    className: 'md:col-span-1 md:row-span-1',
    bg: 'bg-[#F5FFF8] dark:bg-[#0D1A11]',
    path: '/category/text'
  },
  {
    id: 'dev',
    name: 'Developer Tools',
    icon: Code,
    count: 15,
    examples: ['JSON Formatter', 'Base64', 'Regex'],
    className: 'md:col-span-1 md:row-span-1',
    bg: 'bg-[#FDF5FF] dark:bg-[#1A0D1A]',
    path: '/category/developer'
  },
  {
    id: 'converter',
    name: 'Converter Tools',
    icon: RefreshCw,
    count: 8,
    examples: ['CSV to JSON', 'XML to JSON', 'HEX to RGB'],
    className: 'md:col-span-1 md:row-span-1',
    bg: 'bg-[#FFFBF0] dark:bg-[#1A180D]',
    path: '/category/converter'
  }
];

const POPULAR_TOOLS = [
  { name: 'Image Resizer', icon: ImageIcon, uses: '1.2M uses' },
  { name: 'PDF to Word', icon: FileType, uses: '980K uses' },
  { name: 'JSON Formatter', icon: Code, uses: '2.1M uses' },
  { name: 'Word Counter', icon: FileText, uses: '850K uses' },
  { name: 'Color Picker', icon: Palette, uses: '640K uses' },
  { name: 'Base64 Encoder', icon: Hash, uses: '1.5M uses' },
  { name: 'Markdown Editor', icon: Edit3, uses: '420K uses' },
  { name: 'CSV to JSON', icon: FileJson, uses: '310K uses' },
];

const FEATURES = [
  { icon: Shield, title: 'Privacy First', desc: 'No uploads ever. Your files never leave your device.' },
  { icon: Zap, title: 'Lightning Fast', desc: 'Runs locally on your CPU. Zero latency, instant results.' },
  { icon: Gift, title: 'Always Free', desc: 'No paywalls, no premium tiers, no annoying ads on tools.' },
];

const STEPS = [
  { num: '01', title: 'Choose your tool', desc: 'Select from our library of 70+ specialized utilities.' },
  { num: '02', title: 'Drop your file', desc: 'Drag & drop your file or paste your text directly into the browser.' },
  { num: '03', title: 'Get your result', desc: 'Download your processed file instantly. No waiting.' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as any } }
};

export function Home() {
  const openSearch = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
  };

  return (
    <div className="w-full pb-16">
      <Helmet>
        <title>HelpingTools — 70+ Free Online Tools | No Upload, No Signup</title>
        <meta name="description" content="Free browser-based tools for PDF, Image, Text & Developers. 100% private — files never leave your device. No signup required." />
        <meta property="og:title" content="HelpingTools — 70+ Free Online Tools | No Upload, No Signup" />
        <meta property="og:description" content="Free browser-based tools for PDF, Image, Text & Developers. 100% private — files never leave your device. No signup required." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://helpingtools.com/" />
      </Helmet>

      {/* SECTION 1 - HERO */}
      <section className="relative w-full py-20 md:py-32 overflow-hidden">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-16"
        >
          <div className="flex-1 w-full">
            <motion.div variants={itemVariants} className="flex flex-wrap gap-3 mb-8">
              <span className="brutal-border bg-surface px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em]">70+ TOOLS</span>
              <span className="brutal-border bg-surface px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em]">NO UPLOADS</span>
              <span className="brutal-border bg-surface px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em]">FREE FOREVER</span>
            </motion.div>

            <motion.h1 variants={itemVariants} className="font-display font-black leading-[0.95] tracking-[-0.03em] mb-8 flex flex-col">
              <span className="text-[clamp(56px,8vw,120px)] text-foreground">Every Tool</span>
              <span className="text-[clamp(56px,8vw,120px)] text-stroke">You</span>
              <span className="text-[clamp(56px,8vw,120px)] text-foreground">Need<span className="text-accent">.</span></span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-lg md:text-xl text-muted max-w-xl mb-12">
              A premium collection of utility tools for developers, designers, and everyday users. 100% private, fast, and secure.
            </motion.p>

            <motion.button 
              variants={itemVariants}
              onClick={openSearch}
              className="w-full max-w-xl bg-surface brutal-border brutal-shadow-md p-4 md:p-6 flex items-center justify-between text-muted hover-brutal-md group cursor-text"
            >
              <div className="flex items-center gap-4">
                <Search className="h-6 w-6 md:h-8 md:w-8 text-foreground" />
                <span className="text-lg md:text-2xl font-display font-bold text-muted group-hover:text-foreground transition-colors">Search 70+ tools...</span>
              </div>
              <kbd className="hidden sm:flex items-center gap-1 brutal-border bg-background px-3 py-1 font-bold text-sm text-foreground">
                <span>⌘</span>K
              </kbd>
            </motion.button>
          </div>

          <motion.div variants={itemVariants} className="hidden lg:block relative w-[400px] shrink-0">
            <div className="absolute inset-0 bg-accent translate-x-4 translate-y-4 brutal-border"></div>
            <div className="relative bg-surface brutal-border p-8 rotate-3 hover:rotate-0 transition-transform duration-300">
              <div className="text-[120px] font-display font-black leading-none text-accent mb-4">70<span className="text-foreground">+</span></div>
              <h3 className="text-3xl font-display font-bold mb-2">Tools Available</h3>
              <p className="text-muted font-medium">Ready to use instantly. No installation required.</p>
              <div className="mt-8 pt-8 border-t-2 border-border-color flex justify-between items-center">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em]">Updated Today</span>
                <div className="flex -space-x-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full brutal-border bg-background"></div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* STATS SECTION */}
      <section className="bg-[#0A0A0A] text-[#FFFDF7] border-y-2 border-[#0A0A0A] py-16 md:py-24">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-0 divide-y-2 md:divide-y-0 md:divide-x-2 divide-[#333333]">
            <div className="flex flex-col items-center text-center md:px-8 pt-8 md:pt-0 first:pt-0">
              <div className="text-6xl md:text-[80px] font-display font-black text-[#FF4D00] mb-2">70+</div>
              <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#FFFDF7]">Tools Available</div>
            </div>
            <div className="flex flex-col items-center text-center md:px-8 pt-8 md:pt-0">
              <div className="text-6xl md:text-[80px] font-display font-black text-[#FF4D00] mb-2">0 MB</div>
              <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#FFFDF7]">Uploaded to Server</div>
            </div>
            <div className="flex flex-col items-center text-center md:px-8 pt-8 md:pt-0">
              <div className="text-6xl md:text-[80px] font-display font-black text-[#FF4D00] mb-2">100%</div>
              <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#FFFDF7]">Free Forever</div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-32">
        
        {/* SECTION 2 - BENTO CATEGORY GRID */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div variants={itemVariants} className="flex items-center justify-between mb-12">
            <h2 className="text-4xl md:text-5xl font-display font-black tracking-tight">Tool Categories</h2>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BENTO_CATEGORIES.map((cat) => (
              <motion.div 
                key={cat.id}
                variants={itemVariants} 
                className={`group brutal-border p-8 flex flex-col hover-brutal-md ${cat.bg} ${cat.className}`}
              >
                <div className="flex items-start justify-between mb-8">
                  <span className="brutal-border bg-surface px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em]">
                    {cat.name}
                  </span>
                  <div className="h-12 w-12 brutal-border bg-surface flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors">
                    <cat.icon className="h-6 w-6" />
                  </div>
                </div>
                
                <div className="mt-auto">
                  <div className="text-6xl font-display font-black text-accent mb-2">{cat.count}</div>
                  <h3 className="text-3xl font-display font-bold mb-6">{cat.name}</h3>
                  
                  <div className="flex flex-wrap gap-2 mb-8">
                    {cat.examples.map(ex => (
                      <span key={ex} className="brutal-border bg-surface text-[13px] font-bold px-3 py-1.5">
                        {ex}
                      </span>
                    ))}
                  </div>
                  
                  <Link to={cat.path} className="inline-flex items-center gap-2 text-lg font-bold hover:text-accent transition-colors">
                    Explore Tools <ArrowUpRight className="h-5 w-5" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* SECTION 3 - POPULAR TOOLS */}
        <motion.section 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.h2 variants={itemVariants} className="text-4xl md:text-5xl font-display font-black tracking-tight mb-12">Most Used Today</motion.h2>
          <motion.div variants={itemVariants} className="flex overflow-x-auto pb-6 snap-x snap-mandatory md:flex-wrap md:overflow-visible gap-4 hide-scrollbar">
            {POPULAR_TOOLS.map(tool => (
              <div key={tool.name} className="flex items-center gap-4 bg-surface brutal-border px-5 py-4 whitespace-nowrap snap-start shrink-0 hover-brutal-sm cursor-pointer group">
                <tool.icon className="h-6 w-6 text-foreground group-hover:text-accent transition-colors" />
                <span className="font-display font-bold text-lg">{tool.name}</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] bg-background brutal-border px-2 py-1">{tool.uses}</span>
              </div>
            ))}
          </motion.div>
        </motion.section>

        {/* SECTION 4 - WHY HELPINGTOOLS */}
        <motion.section 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center"
        >
          <motion.div variants={itemVariants}>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-display font-black leading-[0.95] tracking-tight">
              Built different.<br/>
              <span className="text-accent">Built private.</span>
            </h2>
          </motion.div>
          <div className="flex flex-col gap-10">
            {FEATURES.map((feat, i) => (
              <motion.div key={i} variants={itemVariants} className="flex gap-6">
                <div className="flex-shrink-0 h-16 w-16 brutal-border bg-surface flex items-center justify-center text-accent shadow-[4px_4px_0px_#0A0A0A]">
                  <feat.icon className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-display font-bold mb-2">{feat.title}</h3>
                  <p className="text-lg text-muted leading-relaxed">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* SECTION 5 - HOW IT WORKS */}
        <motion.section 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div variants={itemVariants} className="mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-black tracking-tight">How It Works</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-16 left-[16%] right-[16%] h-[2px] bg-border-color" />
            
            {STEPS.map((step, i) => (
              <motion.div key={i} variants={itemVariants} className="relative flex flex-col gap-6 bg-surface brutal-border p-8 hover-brutal-md">
                <div className="h-16 w-16 brutal-border bg-background flex items-center justify-center text-2xl font-display font-black text-accent shadow-[4px_4px_0px_#0A0A0A]">
                  {step.num}
                </div>
                <div>
                  <h3 className="text-2xl font-display font-bold mb-3">{step.title}</h3>
                  <p className="text-muted text-lg">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

      </div>
    </div>
  );
}
