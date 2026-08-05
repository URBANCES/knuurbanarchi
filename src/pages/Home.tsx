import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Hero from '../components/Hero';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import ProjectCard from '../components/ProjectCard';

import { useAuth } from '../App';

export default function Home() {
  const { isAdmin } = useAuth();
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [recentResearch, setRecentResearch] = useState<any[]>([]);
  const [recentNews, setRecentNews] = useState<any[]>([]);
  const [latestContent, setLatestContent] = useState<any[]>([]);

  useEffect(() => {
    // Fetch 6 recent research items (published only)
    const qResearch = query(
      collection(db, 'research'), 
      where('isPublished', '==', true),
      orderBy('createdAt', 'desc'), 
      limit(10) // Fetch more to filter showOnHome in memory if needed, or just use where
    );
    const unsubResearch = onSnapshot(qResearch, (snapshot) => {
      setRecentResearch(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'research' })));
    });

    // Fetch 4 recent projects (published only)
    const qProjects = query(
      collection(db, 'projects'), 
      where('isPublished', '==', true),
      orderBy('createdAt', 'desc'), 
      limit(10)
    );
    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      setRecentProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'projects' })));
    });

    // Fetch latest from news (published only)
    const qNews = query(
      collection(db, 'news'), 
      where('isPublished', '==', true),
      orderBy('createdAt', 'desc'), 
      limit(10)
    );
    const unsubNews = onSnapshot(qNews, (snapshot) => {
      setRecentNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'news' })));
    });

    return () => {
      unsubResearch();
      unsubProjects();
      unsubNews();
    };
  }, []);

  // Combine and sort for "Latest 4"
  useEffect(() => {
    const combined = [...recentResearch, ...recentProjects, ...recentNews]
      .filter(item => item.showOnHome !== false)
      .sort((a, b) => {
        // Sort by sortOrder (asc) then year (desc)
        if ((a.sortOrder || 0) !== (b.sortOrder || 0)) {
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        }
        const dateA = a.year ? new Date(a.year).getTime() : (a.createdAt?.seconds * 1000 || 0);
        const dateB = b.year ? new Date(b.year).getTime() : (b.createdAt?.seconds * 1000 || 0);
        return dateB - dateA;
      }).slice(0, 4);
    setLatestContent(combined);
  }, [recentResearch, recentProjects, recentNews]);

  return (
    <div className="space-y-48 pb-48">
      <Hero />

      {/* Section A: Research List (6 items) */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Left Column: Title */}
          <div className="md:col-span-4">
            <div className="sticky top-32 space-y-6">
              <h2 className="text-3xl font-bold text-black tracking-tight">주요 연구실적</h2>
              <div className="w-12 h-[2px] bg-black"></div>
            </div>
          </div>

          {/* Right Column: List */}
          <div className="md:col-span-8">
            <div className="flex justify-end mb-12">
              <Link to="/research" className="text-[10px] font-bold tracking-[0.3em] uppercase hover:text-gray-400 transition-colors">
                View All +
              </Link>
            </div>
            
            <div className="space-y-0">
              {recentResearch.slice(0, 6).length > 0 ? (
                recentResearch.slice(0, 6).map((item, idx) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1, duration: 0.8 }}
                    viewport={{ once: true }}
                    className="group border-b border-gray-100"
                  >
                      <div 
                        onClick={() => item.url && window.open(item.url, '_blank', 'noopener,noreferrer')}
                        className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-8 py-8 group-hover:pl-4 transition-all duration-500 ${item.url ? 'cursor-pointer' : ''}`}
                      >
                      <div className="flex-1 min-w-0 space-y-1 pr-0 md:pr-4">
                        <h4 className="text-[16px] font-medium tracking-tight leading-snug group-hover:text-gray-400 transition-colors break-words">
                          {item.title}
                        </h4>
                        {item.titleEn && (
                          <p className="text-[13px] text-gray-500 font-normal leading-snug group-hover:text-gray-400 transition-colors break-words">
                            {item.titleEn}
                          </p>
                        )}
                        {item.author && <p className="text-[12px] text-gray-500 font-light break-words">{item.author}</p>}
                      </div>
                      <div className="shrink-0 text-left md:text-right space-y-1 mt-2 md:mt-0 whitespace-nowrap">
                        <p className="text-[12px] font-light">{item.year}</p>
                        <p className="text-[9px] leading-[14px] text-left md:text-right font-bold tracking-widest text-gray-300 uppercase">{item.affiliation}</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="py-12 text-center text-gray-400 text-xs uppercase tracking-widest border border-dashed border-gray-100">
                  등록된 연구실적이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Section B: Recent Projects (Gallery) */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Left Column: Title */}
          <div className="md:col-span-4">
            <div className="sticky top-32 space-y-6">
              <h2 className="text-3xl font-bold text-black tracking-tight">프로젝트</h2>
              <div className="w-12 h-[2px] bg-black"></div>
            </div>
          </div>

          {/* Right Column: Gallery */}
          <div className="md:col-span-8">
            <div className="flex justify-end mb-12">
              <Link to="/projects" className="text-[10px] font-bold tracking-[0.3em] uppercase hover:text-gray-400 transition-colors">
                View All +
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {recentProjects.slice(0, 4).length > 0 ? (
                recentProjects.slice(0, 4).map((project, idx) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1, duration: 0.8 }}
                    viewport={{ once: true }}
                  />
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-gray-400 text-xs uppercase tracking-widest border border-dashed border-gray-100">
                  등록된 프로젝트가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {isAdmin && (
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-12 flex justify-center">
          <Link to="/admin" className="text-[10px] font-bold tracking-[0.3em] uppercase text-black hover:underline">
            CMS
          </Link>
        </div>
      )}
    </div>
  );
}
