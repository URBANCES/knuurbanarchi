import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Hero from '../components/Hero';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import ProjectCard from '../components/ProjectCard';

import { useAuth } from '../App';

export default function Home() {
  const { isAdmin } = useAuth();
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [recentResearch, setRecentResearch] = useState<any[]>([]);
  const [recentNews, setRecentNews] = useState<any[]>([]);
  const [homeBanners, setHomeBanners] = useState<string[]>([]);
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0);

  useEffect(() => {
    // 1. 홈페이지 첫 화면 배너 이미지 불러오기 (settings/home)
    const unsubHome = onSnapshot(doc(db, 'settings', 'home'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.homeBannerImageUrls && Array.isArray(data.homeBannerImageUrls)) {
          setHomeBanners(data.homeBannerImageUrls);
        }
      }
    });

    // 2. 연구실적 불러오기
    const qResearch = query(
      collection(db, 'research'), 
      where('isPublished', '==', true),
      orderBy('createdAt', 'desc'), 
      limit(10)
    );
    const unsubResearch = onSnapshot(qResearch, (snapshot) => {
      setRecentResearch(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'research' })));
    });

    // 3. 프로젝트 불러오기
    const qProjects = query(
      collection(db, 'projects'), 
      where('isPublished', '==', true),
      orderBy('createdAt', 'desc'), 
      limit(10)
    );
    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      setRecentProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'projects' })));
    });

    // 4. 소식 불러오기
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
      unsubHome();
      unsubResearch();
      unsubProjects();
      unsubNews();
    };
  }, []);

  // 배너가 여러 장일 경우 5초마다 자동 슬라이드 전환
  useEffect(() => {
    if (homeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIdx((prev) => (prev + 1) % homeBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [homeBanners.length]);

  return (
    <div className="space-y-48 pb-48">
      {/* ⭐️ 홈페이지 첫 화면 배너 슬라이드 영역 (등록된 이미지가 있다면 슬라이드로 표시) */}
      {homeBanners.length > 0 ? (
        <div className="relative w-full h-[60vh] md:h-[75vh] bg-gray-900 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBannerIdx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0"
            >
              <img
                src={homeBanners[currentBannerIdx]}
                alt={`Home Banner ${currentBannerIdx + 1}`}
                className="w-full h-full object-cover opacity-80"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/30"></div>
            </motion.div>
          </AnimatePresence>

          {/* 슬라이드 인디케이터 점 버튼 */}
          {homeBanners.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {homeBanners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentBannerIdx(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                    idx === currentBannerIdx ? 'bg-white w-6' : 'bg-white/50'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <Hero />
      )}

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
                        <h4 className="text-[16px] font-medium tracking-tight leading-snug group-hover:text-gray-400 transition-colors break-keep">
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
