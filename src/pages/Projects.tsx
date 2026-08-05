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

  const activeTab = searchParams.get('category') || 'all'; // 'all', 'general', 'practical'

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
    // Fetch all published projects
    const q = query(
      collection(db, 'projects'),
      where('isPublished', '==', true),
      orderBy('year', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedProjects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProjectItem[];

      // Real-time Database Recovery & Healing Routine for projects with unclassified values
      for (const item of fetchedProjects) {
        if (!item.category || item.category === '' || item.category === '미분류' || item.category === 'unclassified') {
          let correctedCategory = 'general'; // Default fallback

          const titleText = (item.title || '') + ' ' + (item.titleEn || '') + ' ' + (item.content || '') + ' ' + (item.affiliation || '');

          // Check keywords for Practical vs General
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

          // Permanently correct back to Firestore dynamically
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
          <h2 className="text-3xl font-bold tracking-tight uppercase">Project</h2>
        </div>
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
            filteredProjects.map((project, idx) => (
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
    </div>
  );
}
