import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router-dom';

interface ResearchItem {
  id: string;
  title: string;
  titleEn?: string;
  author: string;
  year: string;
  affiliation: string;
  category: string;
  url?: string;
  isPublished: boolean;
  createdAt: any;
  researchType?: 'thesis' | 'journal';
}

export default function Research() {
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('category') || 'all'; // 'all', 'thesis', 'journal'

  const setActiveTab = (tab: string) => {
    if (tab === 'all') {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('category');
      setSearchParams(newParams);
    } else {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('category', tab);
      setSearchParams(newParams);
    }
  };

  useEffect(() => {
    // Fetch all published research items
    const q = query(
      collection(db, 'research'),
      where('isPublished', '==', true),
      orderBy('year', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ResearchItem[];

      // Real-time Database Recovery & Healing Routine for unclassified entries
      for (const item of fetchedItems) {
        if (!item.category || item.category === '' || item.category === '미분류' || item.category === 'unclassified') {
          let correctedCategory = 'master'; // Default fallback
          let correctedResearchType = 'thesis';

          const titleText = (item.title || '') + ' ' + (item.author || '') + ' ' + (item.affiliation || '');

          // Check keywords for Thesis vs Publications
          if (
            titleText.includes('Dissertation') || 
            titleText.includes('Thesis') || 
            titleText.includes('학위') || 
            item.researchType === 'thesis'
          ) {
            correctedResearchType = 'thesis';
            if (titleText.includes('박사') || titleText.includes('Ph.D') || titleText.includes('doctor')) {
              correctedCategory = 'phd';
            } else {
              correctedCategory = 'master';
            }
          } else if (
            titleText.includes('Journal') || 
            titleText.includes('Transaction') || 
            titleText.includes('학술지') || 
            titleText.includes('논문지') || 
            titleText.includes('Proceeding') ||
            item.researchType === 'journal'
          ) {
            correctedResearchType = 'journal';
            // Determine if domestic vs international (contains Han-gul)
            const containsKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(titleText);
            correctedCategory = containsKorean ? 'domestic' : 'intl';
          } else {
            // General heuristics fallback
            correctedResearchType = 'thesis';
            correctedCategory = 'master';
          }

          // Permanently correct back to Firestore dynamically
          try {
            await updateDoc(doc(db, 'research', item.id), {
              category: correctedCategory,
              researchType: correctedResearchType
            });
            console.log(`Successfully healed research item [${item.title}] with category: ${correctedCategory}`);
          } catch (err) {
            console.error('Failed to auto-heal research document:', err);
          }
        }
      }

      setItems(fetchedItems);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching all research items:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleItemClick = (url?: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Perform client-side filter for maximum instantaneous responsiveness
  const filteredItems = items.filter(item => {
    if (activeTab === 'all') return true;
    
    const cat = item.category || '';
    if (activeTab === 'thesis') {
      return cat === 'phd' || cat === 'master' || cat === '박사 학위논문' || cat === '석사 학위논문' || item.researchType === 'thesis';
    }
    if (activeTab === 'journal') {
      return cat === 'intl' || cat === 'domestic' || cat === '국외 학술논문' || cat === '국내 학술논문' || item.researchType === 'journal';
    }
    return true;
  });

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'phd':
      case '박사 학위논문':
        return '박사 학위논문';
      case 'master':
      case '석사 학위논문':
        return '석사 학위논문';
      case 'intl':
      case '국외 학술논문':
        return '국외 학술논문';
      case 'domestic':
      case '국내 학술논문':
        return '국내 학술논문';
      default:
        return '기타 실적';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-24 space-y-16">
      {/* Breadcrumb & Dynamic Title */}
      <div className="flex flex-col md:flex-row justify-between items-baseline border-b border-gray-100 pb-8 gap-4">
        <div className="space-y-1">
          <h3 className="text-[10px] font-bold tracking-[0.4em] uppercase text-gray-400">
            RESEARCH / {activeTab === 'all' ? 'ALL' : activeTab.toUpperCase()}
          </h3>
          <h2 className="text-3xl font-bold tracking-tight uppercase">Research</h2>
        </div>
      </div>

      {/* Modern Filter Tabs */}
      <div className="flex gap-10 justify-center border-b border-gray-100 pb-px">
        {[
          { id: 'all', label: '전체' },
          { id: 'thesis', label: '학위논문' },
          { id: 'journal', label: '학술논문' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-4 text-[12px] font-bold uppercase tracking-widest transition-all relative cursor-pointer ${
              activeTab === tab.id ? 'text-black' : 'text-gray-400 hover:text-black'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="researchActiveTabLine"
                className="absolute bottom-0 left-0 w-full h-[2px] bg-black"
                transition={{ duration: 0.3 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Combined List Section */}
      <div className="divide-y divide-gray-100 px-4 md:px-12">
        <AnimatePresence mode="popLayout">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                onClick={() => handleItemClick(item.url)}
                className={`flex flex-col md:flex-row justify-between items-start md:items-center py-6 gap-6 group transition-all hover:bg-gray-50/50 ${item.url ? 'cursor-pointer' : ''}`}
              >
                {/* Left Area: Title & Author (Indented) */}
                <div className="space-y-2.5 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold tracking-wider text-black border border-black/15 bg-gray-50 px-2 py-0.5 uppercase">
                      {getCategoryLabel(item.category)}
                    </span>
                  </div>
                  <h4 className="text-[1.1rem] font-bold tracking-tight leading-snug group-hover:text-black transition-colors break-words">
                    {item.title}
                  </h4>
                  {item.titleEn && (
                    <p className="text-[0.95rem] text-gray-500 font-normal leading-snug break-words">
                      {item.titleEn}
                    </p>
                  )}
                  {item.author && (
                    <p className="text-[0.9rem] text-gray-500 font-normal">
                      {item.author}
                    </p>
                  )}
                </div>

                {/* Right Area: Year & Institution (Compact) */}
                <div className="text-right space-y-0.5 w-full md:w-auto">
                  <p className="text-[0.85rem] font-normal text-gray-500 whitespace-nowrap">
                    게재년도 | <span className="font-semibold text-black">{item.year}</span>
                  </p>
                  <p className="text-[0.85rem] font-normal text-gray-400">
                    {item.affiliation}
                  </p>
                  {item.url && (
                    <div className="flex justify-end pt-1">
                      <span className="text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest bg-black text-white px-2 py-0.5">Link +</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-24 text-center text-gray-400 text-xs uppercase tracking-widest border border-dashed border-gray-100 italic">
              등록된 콘텐츠가 없습니다.
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
