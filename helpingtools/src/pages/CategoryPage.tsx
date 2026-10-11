import React, { useState, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { ChevronRight, ArrowRight, Star } from 'lucide-react';
import { CATEGORIES, TOOLS } from '../data/tools';
import { cn } from '../lib/utils';

type FilterType = 'all' | 'popular' | 'new' | 'az';

export function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [filter, setFilter] = useState<FilterType>('all');

  const category = categoryId ? CATEGORIES[categoryId as keyof typeof CATEGORIES] : null;

  if (!category) {
    return <Navigate to="/" replace />;
  }

  const categoryTools = TOOLS.filter(t => t.category === category.id);

  const filteredTools = useMemo(() => {
    let result = [...categoryTools];
    
    switch (filter) {
      case 'popular':
        result = result.filter(t => t.isPopular);
        break;
      case 'new':
        result = result.filter(t => t.isNew);
        break;
      case 'az':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        // 'all' - keep original order
        break;
    }
    
    return result;
  }, [categoryTools, filter]);

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

  // Determine background color based on category
  const bgColors: Record<string, string> = {
    image: 'bg-[#FFF9F5] dark:bg-[#1A110D]',
    pdf: 'bg-[#F5F5FF] dark:bg-[#0D0D1A]',
    text: 'bg-[#F5FFF8] dark:bg-[#0D1A11]',
    developer: 'bg-[#FDF5FF] dark:bg-[#1A0D1A]',
    converter: 'bg-[#FFFBF0] dark:bg-[#1A180D]'
  };
  const heroBg = bgColors[category.id] || 'bg-surface';

  const title = `${category.name} — Free Online Tools | HelpingTools`;
  const description = `Free browser-based ${category.name.toLowerCase()}. 100% private — files never leave your device. No signup required.`;

  return (
    <div className="w-full pb-24">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`https://helpingtools.com/category/${category.id}`} />
      </Helmet>

      {/* BREADCRUMB */}
      <div className="border-b-2 border-border-color bg-background">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{category.name}</span>
        </div>
      </div>

      {/* HERO */}
      <section className={`border-b-2 border-border-color py-16 md:py-24 ${heroBg}`}>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col md:flex-row gap-8 md:gap-12 items-start md:items-center"
          >
            <div className="h-24 w-24 md:h-32 md:w-32 brutal-border bg-surface flex items-center justify-center shrink-0 shadow-[6px_6px_0px_#0A0A0A]">
              <category.icon className="h-12 w-12 md:h-16 md:w-16 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight">{category.name}</h1>
                <span className="brutal-border bg-background px-3 py-1 text-[13px] font-bold uppercase tracking-[0.08em]">
                  {categoryTools.length} Tools
                </span>
              </div>
              <p className="text-lg md:text-xl text-muted max-w-2xl">
                {category.description}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* FILTER BAR */}
        <div className="flex overflow-x-auto pb-4 mb-8 gap-3 hide-scrollbar">
          {(['all', 'popular', 'new', 'az'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 text-[13px] font-bold uppercase tracking-[0.08em] brutal-border whitespace-nowrap transition-colors ${
                filter === f 
                  ? 'bg-accent text-white' 
                  : 'bg-surface text-muted hover:bg-background hover:text-foreground'
              }`}
            >
              {f === 'az' ? 'A-Z' : f}
            </button>
          ))}
        </div>

        {/* TOOL GRID */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          key={filter} // Re-trigger animation on filter change
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredTools.map((tool) => (
            <motion.div key={tool.id} variants={itemVariants}>
              <Link 
                to={`/tool/${tool.id}`}
                className="group block h-full bg-surface brutal-border p-6 hover-brutal-md flex flex-col relative"
              >
                {tool.isPopular && (
                  <div className="absolute top-4 right-4 brutal-border bg-accent text-white px-2 py-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em]">
                    <Star className="h-3 w-3 fill-current" /> Popular
                  </div>
                )}
                {tool.isNew && (
                  <div className="absolute top-4 right-4 brutal-border bg-[#16A34A] text-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]">
                    New
                  </div>
                )}
                
                <div className="h-12 w-12 brutal-border bg-background flex items-center justify-center mb-6 group-hover:bg-accent group-hover:text-white transition-colors">
                  <tool.icon className="h-6 w-6 text-foreground group-hover:text-white transition-colors" />
                </div>
                
                <h3 className="text-2xl font-display font-bold mb-3">{tool.name}</h3>
                <p className="text-muted mb-8 line-clamp-2">{tool.description}</p>
                
                <div className="mt-auto flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.08em] text-foreground group-hover:text-accent transition-colors">
                  Open Tool <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </motion.div>
          ))}
          
          {filteredTools.length === 0 && (
            <div className="col-span-full py-20 text-center font-display font-bold text-xl text-muted">
              No tools found for this filter.
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
