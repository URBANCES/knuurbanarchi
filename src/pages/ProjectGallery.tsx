import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, useNavigate } from 'react-router-dom';

interface ProjectItem {
  id: string;
  title: string;
  titleEn?: string;
  thumbnail: string;
  category: string;
  isPublished: boolean;
  year: string;
}

export default function ProjectGallery() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Determine target category based on URL
    const targetCat = category === 'general' ? 'general' : 'practical';

    const q = query(
      collection(db, 'projects'),
      where('isPublished', '==', true),
      where('category', '==', targetCat),
      orderBy('year', 'desc'),
      orderBy('sortOrder', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProjectItem[];
      setProjects(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching project gallery:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [category]);

  const displayTitle = category === 'general' ? '연구 프로젝트' : '실무 프로젝트';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-48">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-24 space-y-16">
      {/* Dynamic Title */}
      <div className="flex items-baseline gap-4">
        <h2 className="text-4xl font-bold tracking-tight uppercase">Project</h2>
        <span className="text-xl font-medium text-gray-400" style={{ fontSize: '12px' }}>[{displayTitle}]</span>
      </div>

      {/* Gallery Grid: 3 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
        <AnimatePresence mode="popLayout">
          {projects.length > 0 ? (
            projects.map((project, idx) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05, duration: 0.8 }}
                onClick={() => navigate(`/project/detail/${project.id}`)}
                className="group relative aspect-[4/3] overflow-hidden bg-black cursor-pointer"
              >
                {project.thumbnail ? (
                  <img 
                    src={project.thumbnail} 
                    alt={project.title} 
                    className="w-full h-full object-cover grayscale transition-all duration-1000 group-hover:grayscale-0 group-hover:scale-110" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-700 uppercase tracking-widest bg-gray-900">No Image</div>
                )}

                {/* Dark Overlay with Centered Text */}
                <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-all duration-500 flex flex-col items-center justify-center text-center p-6">
                  <div className="space-y-1 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                    <h4 className="text-white text-lg font-bold tracking-tight leading-tight">
                      {project.title}
                    </h4>
                    {project.titleEn && (
                      <p className="text-white/80 text-[10px] font-light uppercase tracking-[0.3em]">
                        {project.titleEn}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-24 text-center text-gray-400 text-xs uppercase tracking-widest border border-dashed border-gray-100 italic">
              등록된 {displayTitle}가 없습니다.
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
