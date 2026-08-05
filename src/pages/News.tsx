import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { BoardConfig } from './admin/BoardSettings';
import { useSearchParams } from 'react-router-dom';
import Markdown from 'react-markdown';

export default function News() {
  const [allNews, setAllNews] = useState<any[]>([]);
  const [config, setConfig] = useState<BoardConfig | null>(null);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Get selected category from search parameters, default is '전체'
  const selectedCategory = searchParams.get('category') || '전체';

  // Load board config
  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'boardConfigs', 'news'), (snapshot) => {
      if (snapshot.exists()) {
        setConfig({ id: 'news', ...snapshot.data() } as BoardConfig);
      }
    });
    return () => unsubConfig();
  }, []);

  // Load news collection
  useEffect(() => {
    const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const newsItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllNews(newsItems);
    });
    return () => unsub();
  }, []);

  // Filter out unpublished news (isPublished === false)
  const activeNews = allNews.filter(item => item.isPublished !== false);

  // Load categories dynamically from config.categories, defaulting to ['Lab News', 'Announcement']
  const uniqueCategories = config?.categories && config.categories.length > 0
    ? config.categories
    : ['Lab News', 'Announcement'];

  // Filter current news items by selected category
  const filteredNews = selectedCategory === '전체'
    ? activeNews
    : activeNews.filter(item => item.category === selectedCategory);

  // Sorting: Sort by the custom publication date (year) string descending first,
  // falling back to Firestore creation timestamp (createdAt)
  const sortedNews = [...filteredNews].sort((a, b) => {
    const dateA = a.year || '';
    const dateB = b.year || '';
    if (dateB !== dateA) {
      return dateB.localeCompare(dateA);
    }
    const timeA = a.createdAt?.seconds || 0;
    const timeB = b.createdAt?.seconds || 0;
    return timeB - timeA;
  });

  // Handle click on category filter
  const handleCategorySelect = (cat: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (cat === '전체') {
      newParams.delete('category');
    } else {
      newParams.set('category', cat);
    }
    setSearchParams(newParams);
  };

  // Helper to format date visually, e.g. 2026-06-15 to 2026.06.15
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Date Unknown';
    return dateStr.replace(/-/g, '.');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-24">
      {/* 2-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-16 lg:gap-24">
        
        {/* Left Column (3 of 10) - Intro & Category */}
        <div className="lg:col-span-3 space-y-12">
          {/* Header & Description */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold tracking-[0.4em] uppercase text-gray-400 font-mono">Updates</h3>
            <h2 className="text-4xl font-bold tracking-tight text-black font-sans">News</h2>
            {config?.description ? (
              <p className="text-xs text-gray-400 leading-relaxed font-light whitespace-pre-wrap pt-2 border-t border-gray-100">
                {config.description}
              </p>
            ) : (
              <p className="text-xs text-gray-400 leading-relaxed font-light pt-2 border-t border-gray-100">
                도시건축연구실의 대외적 발자취와 학술 동정 등 최신 소식을 빠르게 전해드립니다.
              </p>
            )}
          </div>

          {/* Category Filter Menu */}
          <div className="space-y-4 pt-4">
            <h4 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase font-mono">Categories</h4>
            <div className="flex flex-col gap-2 border-l border-gray-100 font-sans">
              <button
                onClick={() => handleCategorySelect('전체')}
                className={`text-left text-xs font-bold tracking-widest uppercase py-1.5 px-4 transition-all border-l cursor-pointer ${
                  selectedCategory === '전체'
                    ? 'border-black text-black font-extrabold bg-gray-50/50'
                    : 'border-transparent text-gray-400 hover:text-black hover:pl-5'
                }`}
              >
                전체 (All)
              </button>
              {uniqueCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  className={`text-left text-xs font-bold tracking-widest uppercase py-1.5 px-4 transition-all border-l cursor-pointer ${
                    selectedCategory === cat
                      ? 'border-black text-black font-extrabold bg-gray-50/50'
                      : 'border-transparent text-gray-400 hover:text-black hover:pl-5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (7 of 10) - News Post List */}
        <div className="lg:col-span-7 space-y-16">
          {sortedNews.length > 0 ? (
            <div className="flex flex-col gap-12 md:gap-16">
              {sortedNews.map((item, idx) => (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.5, ease: 'easeOut' }}
                  onClick={() => setSelectedPost(item)}
                  className="group flex flex-col md:flex-row gap-6 md:gap-10 pb-12 border-b border-gray-100 cursor-pointer items-start"
                >
                  {/* Thumbnail (Left side) */}
                  <div className="w-full md:w-56 lg:w-64 aspect-[16/10] overflow-hidden bg-gray-50 flex-shrink-0 relative border border-gray-100">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[9px] font-mono text-gray-300 uppercase tracking-widest bg-gray-50">
                        No Image
                      </div>
                    )}
                    {/* Floating little category */}
                    <div className="absolute top-2 left-2 bg-black/90 backdrop-blur-sm px-2.5 py-1 text-[8px] font-bold tracking-widest uppercase text-white font-mono">
                      {item.category || 'Lab News'}
                    </div>
                  </div>

                  {/* Text Information (Right side parallel) */}
                  <div className="flex flex-col flex-grow justify-between min-h-[120px] md:py-1 w-full">
                    <div className="space-y-3">
                      <h3 className="text-xl font-bold tracking-tight text-gray-900 group-hover:text-black group-hover:underline transition-colors duration-350">
                        {item.title}
                      </h3>
                      {/* Subtitle / Description Summary - mapping to item.subtitle or item.affiliation */}
                      {(item.subtitle || item.affiliation) ? (
                        <p className="text-xs text-gray-500 font-normal leading-relaxed line-clamp-2">
                          {item.subtitle || item.affiliation}
                        </p>
                      ) : item.content ? (
                        <p className="text-xs text-gray-400 font-light leading-relaxed line-clamp-2">
                          {item.content}
                        </p>
                      ) : null}
                    </div>

                    {/* Bottom row: Read More & Date */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-6 md:mt-0 font-mono">
                      <button className="text-[10px] font-bold tracking-widest uppercase hover:underline text-black flex items-center gap-1.5 group-hover:text-black cursor-pointer">
                        READ MORE <span className="font-sans group-hover:translate-x-1.5 transition-transform inline-block">→</span>
                      </button>
                      <span className="text-[10px] tracking-widest text-gray-400 uppercase">
                        {formatDate(item.year)}
                      </span>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
            <div className="py-24 text-center text-gray-300 text-xs uppercase tracking-widest border border-dashed border-gray-100 bg-gray-50/50">
              등록된 소식이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* Detailed Modal Overlay */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
            onClick={() => setSelectedPost(null)}
          >
            <motion.div
              initial={{ scale: 0.98, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 15 }}
              transition={{ ease: 'easeOut', duration: 0.4 }}
              className="bg-white w-full max-w-4xl h-fit max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start px-6 py-6 md:px-8 border-b border-gray-100 flex-shrink-0">
                <div className="space-y-1.5 pr-6">
                  <span className="text-[9px] font-bold tracking-widest uppercase text-gray-400 font-mono">
                    {selectedPost.category || 'Lab News'} — {formatDate(selectedPost.year)}
                  </span>
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight text-gray-950">
                    {selectedPost.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-[10px] font-mono tracking-widest uppercase text-gray-400 hover:text-black p-1 border border-transparent hover:border-gray-100 transition-all font-bold flex items-center justify-center cursor-pointer"
                >
                  Close ×
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-grow overflow-y-auto p-6 md:p-8 space-y-8">
                {/* Image panel */}
                {selectedPost.thumbnail && (
                  <div className="w-full aspect-[16/9] overflow-hidden bg-gray-50 border border-gray-100">
                    <img
                      src={selectedPost.thumbnail}
                      alt={selectedPost.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Subtitle summary */}
                {(selectedPost.subtitle || selectedPost.affiliation) && (
                  <p className="text-sm text-gray-600 font-medium leading-relaxed border-l-2 border-black pl-4 py-1">
                    {selectedPost.subtitle || selectedPost.affiliation}
                  </p>
                )}

                {/* Body Content with WYSIWYG support (React Markdown) */}
                <div className="text-gray-800 text-sm leading-relaxed font-light font-sans whitespace-pre-wrap">
                  <Markdown>{selectedPost.content}</Markdown>
                </div>

                {/* Additional gallery if attachments are available */}
                {selectedPost.attachments && selectedPost.attachments.filter((a: any) => a.url).length > 0 && (
                  <div className="space-y-4 pt-8 border-t border-gray-100">
                    <h4 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase font-mono">
                      Image Gallery
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedPost.attachments
                        .filter((a: any) => a.url)
                        .map((file: any, idx: number) => (
                          <div key={idx} className="aspect-square bg-gray-50 border border-gray-100 overflow-hidden relative group">
                            <img
                              src={file.url}
                              alt={file.name || `Gallery item ${idx + 1}`}
                              className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 md:px-8 bg-gray-50 border-t border-gray-100 flex justify-between items-center flex-shrink-0">
                <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">
                  Urban Architecture Lab — Updates
                </span>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="px-6 py-2 bg-black text-white text-[9px] font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors font-mono cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
