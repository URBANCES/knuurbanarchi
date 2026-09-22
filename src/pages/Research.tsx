import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, doc, updateDoc } from 'firebase/firestore';
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

  // 검색용 상태 추가
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const activeTab = searchParams.get('category') || 'all'; 

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
    // orderBy를 제거하여 복합 색인 오류 및 첫 접속 로딩 실패 원천 차단
    const q = query(
      collection(db, 'research'),
      where('isPublished', '==', true)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ResearchItem[];

      // 클라이언트 측에서 연도 기준 내림차순 정렬 (최신순)
      fetchedItems.sort((a, b) => {
        const yearA = parseInt(a.year) || 0;
        const yearB = parseInt(b.year) || 0;
        return yearB - yearA;
      });

      for (const item of fetchedItems) {
        if (!item.category || item.category === '' || item.category === '미분류' || item.category === 'unclassified') {
          let correctedCategory = 'master'; 
          let correctedResearchType = 'thesis';

          const titleText = (item.title || '') + ' ' + (item.author || '') + ' ' + (item.affiliation || '');

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
            const containsKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(titleText);
            correctedCategory = containsKorean ? 'domestic' : 'intl';
          } else {
            correctedResearchType = 'thesis';
            correctedCategory = 'master';
          }

          try {
            await updateDoc(doc(db, 'research', item.id), {
              category: correctedCategory,
              researchType: correctedResearchType
            });
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

  // 탭별로 보여줄 하위 카테고리 정의
  const categoriesToShow = 
    activeTab === 'thesis' ? [
      { key: 'phd', label: '박사 학위논문' },
      { key: 'master', label: '석사 학위논문' }
    ] :
    activeTab === 'journal' ? [
      { key: 'intl', label: '국외 학술논문' },
      { key: 'domestic', label: '국내 학술논문' }
    ] : [
      { key: 'phd', label: '박사 학위논문' },
      { key: 'master', label: '석사 학위논문' },
      { key: 'intl', label: '국외 학술논문' },
      { key: 'domestic', label: '국내 학술논문' }
    ];

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

      {/* 스마트 검색창 (띄어쓰기 무관) */}
      <div className="relative z-[40] w-full max-w-xl">
        <div className="flex items-center border-b-2 border-gray-200 focus-within:border-black transition-colors bg-transparent pb-3">
          <span className="pr-3 text-gray-400">🔍</span>
          <input 
            type="text"
            placeholder="연구 실적 검색 (띄어쓰기 무관)"
            className="w-full bg-transparent outline-none text-sm font-sans"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
        </div>
        
        <AnimatePresence>
          {showSuggestions && searchTerm && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
              className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-xl mt-2 max-h-80 overflow-y-auto z-50"
            >
              {(() => {
                const normalize = (str: string) => (str || '').replace(/\s+/g, '').toLowerCase();
                const queryStr = normalize(searchTerm);
                const matches = items.filter(item => normalize(item.title).includes(queryStr) || normalize(item.titleEn as string).includes(queryStr));
                
                if (matches.length === 0) return <div className="p-4 text-xs text-gray-400 text-center tracking-widest">검색 결과가 없습니다.</div>;
                
                return matches.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => {
                      handleItemClick(item.url); 
                      setSearchTerm('');
                    }}
                    className={`p-4 border-b border-gray-50 hover:bg-gray-50 flex justify-between items-center group transition-colors ${item.url ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                     <div>
                       <p className={`text-sm font-bold text-gray-900 transition-colors ${item.url ? 'group-hover:text-blue-600' : ''}`}>{item.title}</p>
                       <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">{item.category} | {item.year}</p>
                     </div>
                     {item.url && <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Link ↗</span>}
                  </div>
                ));
              })()}
            </motion.div>
          )}
        </AnimatePresence>
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

      {/* ⭐️ 소제목 및 가름선으로 구분된 섹션 렌더링 영역 */}
      <div className="px-4 md:px-12 space-y-16">
        <AnimatePresence mode="wait">
          {filteredItems.length > 0 ? (
            <div className="space-y-16">
              {categoriesToShow.map(catGroup => {
                const groupItems = filteredItems.filter(item => {
                  const c = item.category || '';
                  if (catGroup.key === 'phd') return c === 'phd' || c === '박사 학위논문';
                  if (catGroup.key === 'master') return c === 'master' || c === '석사 학위논문';
                  if (catGroup.key === 'intl') return c === 'intl' || c === '국외 학술논문';
                  if (catGroup.key === 'domestic') return c === 'domestic' || c === '국내 학술논문';
                  return false;
                });

                if (groupItems.length === 0) return null;

                return (
                  <div key={catGroup.key} className="space-y-6">
                    {/* 소제목 및 가름선 */}
                    <div className="border-b-2 border-black pb-3">
                      <h3 className="text-lg font-bold tracking-tight text-gray-900 uppercase">
                        {catGroup.label}
                      </h3>
                    </div>

                    {/* 해당 그룹의 게시물 목록 */}
                    <div className="divide-y divide-gray-100">
                      {groupItems.map((item) => (
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
                          {/* Left Area: Title & Author */}
                          <div className="space-y-2.5 max-w-3xl">
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

                          {/* Right Area: Year & Institution */}
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
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
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
