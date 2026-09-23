import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ProjectCard from '../components/ProjectCard';

interface ProjectItem {
  id: string;
  title: string;
  titleEn?: string;
  content: string;
  year: string;
  affiliation: string;
  category: string;
  thumbnail: string;
  isPublished: boolean;
}

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  // 페이지네이션용 상태 (갤러리형 = 6개)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; 

  // ⭐️ 프로젝트 프론트 검색용 상태 추가
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const activeTab = searchParams.get('category') || 'all'; // 'all', 'general', 'practical'

  const setActiveTab = (tab: string) => {
    setCurrentPage(1); // 탭이 바뀌면 무조건 1페이지로 돌아가도록 초기화
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
    const q = query(
      collection(db, 'projects'),
      where('isPublished', '==', true)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedProjects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProjectItem[];

      // ⭐️ 클라이언트 측에서 연도 기준 내림차순 정렬 (최신순)
      fetchedProjects.sort((a, b) => {
        const yearA = parseInt(a.year) || 0;
        const yearB = parseInt(b.year) || 0;
        return yearB - yearA;
      });

      for (const item of fetchedProjects) {
        if (!item.category || item.category === '' || item.category === '미분류' || item.category === 'unclassified') {
          let correctedCategory = 'general'; // Default fallback

          const titleText = (item.title || '') + ' ' + (item.titleEn || '') + ' ' + (item.content || '') + ' ' + (item.affiliation || '');

          if (
            titleText.includes('실무') || 
            titleText.includes('현장') || 
            titleText.includes('공동') || 
            titleText.includes('산학') || 
            titleText.includes('실증') || 
            titleText.includes('용역') || 
            titleText.includes('수행') || 
            titleText.includes('practical')
          ) {
            correctedCategory = 'practical';
          } else {
            correctedCategory = 'general';
          }

          try {
            await updateDoc(doc(db, 'projects', item.id), {
              category: correctedCategory
            });
            console.log(`Successfully healed project item [${item.title}] with category: ${correctedCategory}`);
          } catch (err) {
            console.error('Failed to auto-heal project document:', err);
          }
        }
      }

      setProjects(fetchedProjects);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching projects:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter project items dynamically
  const filteredProjects = projects.filter(project => {
    if (activeTab === 'all') return true;
    
    const cat = project.category || '';
    if (activeTab === 'general') {
      return cat === 'general' || cat === '일반 프로젝트' || cat === '연구 프로젝트';
    }
    if (activeTab === 'practical') {
      return cat === 'practical' || cat === '실무 프로젝트';
    }
    return true;
  });

  const getCategoryLabel = (cat: string) => {
    if (cat === 'practical' || cat === '실무 프로젝트') return '실무 프로젝트';
    return '연구 프로젝트';
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
            PROJECT / {activeTab === 'all' ? 'ALL' : activeTab.toUpperCase()}
          </h3>
          <h2 className="text-3xl font-bold tracking-tight">프로젝트</h2>
        </div>
      </div>

      {/* ⭐️ 프로젝트 스마트 검색창 추가 (띄어쓰기 무관) */}
      <div className="relative z-[40] w-full max-w-xl">
        <div className="flex items-center border-b-2 border-gray-200 focus-within:border-black transition-colors bg-transparent pb-3">
          <span className="pr-3 text-gray-400">🔍</span>
          <input 
            type="text"
            placeholder="프로젝트 제목 검색 (띄어쓰기 무관)"
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
                const matches = projects.filter(project => normalize(project.title).includes(queryStr) || normalize(project.titleEn as string).includes(queryStr));
                
                if (matches.length === 0) return <div className="p-4 text-xs text-gray-400 text-center tracking-widest">검색 결과가 없습니다.</div>;
                
                return matches.map(project => (
                  <div 
                    key={project.id}
                    onClick={() => {
                      // 검색 결과 클릭 시 프로젝트 상세 페이지나 모달 경로로 이동 (프로젝트 카드가 클릭을 처리하듯 상세 이동)
                      navigate(`/projects/${project.id}`); 
                      setSearchTerm('');
                    }}
                    className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex justify-between items-center group transition-colors"
                  >
                     <div>
                       <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{project.title}</p>
                       <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">{getCategoryLabel(project.category)} | {project.year}</p>
                     </div>
                     <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">상세보기 ↗</span>
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
          { id: 'general', label: '연구 프로젝트' },
          { id: 'practical', label: '실무 프로젝트' }
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
                layoutId="projectActiveTabLine"
                className="absolute bottom-0 left-0 w-full h-[2px] bg-black"
                transition={{ duration: 0.3 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Gallery Grid: 3 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
        <AnimatePresence mode="popLayout">
          {filteredProjects.length > 0 ? (
            filteredProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((project, idx) => (
              <ProjectCard
                key={project.id}
                project={project}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4 }}
              />
            ))
          ) : (
            <div className="col-span-full py-24 text-center text-gray-400 text-xs uppercase tracking-widest border border-dashed border-gray-100 italic">
              등록된 콘텐츠가 없습니다.
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* 하단 페이지 번호 버튼 UI */}
      {filteredProjects.length > itemsPerPage && (
        <div className="flex justify-center items-center gap-3 pt-16">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-200 text-xs text-gray-400 hover:text-black hover:border-black disabled:opacity-30 transition-all cursor-pointer"
          >
            &lt;
          </button>
          {Array.from({ length: Math.ceil(filteredProjects.length / itemsPerPage) }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-8 h-8 flex items-center justify-center text-[10px] font-bold border transition-all cursor-pointer ${
                currentPage === i + 1 
                  ? 'border-black bg-black text-white' 
                  : 'border-transparent text-gray-400 hover:text-black hover:border-gray-200'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredProjects.length / itemsPerPage)))}
            disabled={currentPage === Math.ceil(filteredProjects.length / itemsPerPage)}
            className="px-3 py-1 border border-gray-200 text-xs text-gray-400 hover:text-black hover:border-black disabled:opacity-30 transition-all cursor-pointer"
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}
