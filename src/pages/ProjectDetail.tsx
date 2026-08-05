import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'motion/react';

interface ProjectDetailData {
  id: string;
  title: string;
  titleEn?: string;
  content: string;
  year: string;
  affiliation?: string;
  agency?: string;
  agencyType?: string;
  agency_type?: string;
  principalInvestigator?: string;
  coInvestigator?: string;
  researchers?: string;
  location?: string;
  site?: string;
  area?: string | number;
  thumbnail: string;
  attachments?: { name: string; url: string; type: string; sortOrder?: number }[];
  category: string;
}

const formatArea = (val?: string | number): string => {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  if (!str) return '';
  
  const cleanNumber = str.replace(/[^0-9.]/g, '');
  if (cleanNumber && !isNaN(Number(cleanNumber))) {
    const parts = cleanNumber.split('.');
    parts[0] = Number(parts[0]).toLocaleString('en-US');
    return `${parts.join('.')} ㎡`;
  }
  return str.endsWith('㎡') ? str : `${str} ㎡`;
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProject() {
      if (!id) return;
      try {
        const docRef = doc(db, 'projects', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProject({ id: docSnap.id, ...docSnap.data() } as ProjectDetailData);
        } else {
          console.error("No such project!");
          navigate('/projects');
        }
      } catch (err) {
        console.error("Error fetching project:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-48">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!project) return null;

  // Sort attachments by sortOrder and display them
  const displayImages = (project.attachments || [])
    .filter(a => a.url)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <div className="max-w-7xl mx-auto px-6 py-24">
      {/* 1. Header Section */}
      <div className="space-y-6 mb-16">
        <div className="flex justify-between items-end">
          <h1 className="text-6xl font-bold tracking-tighter uppercase leading-none">Work</h1>
          <div className="text-right max-w-xs">
            <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase leading-relaxed">
              Exploring the boundaries of urban architecture. <br />
              도시건축의 지속가능한 미래를 제안합니다.
            </p>
          </div>
        </div>
        <div className="w-full h-px bg-gray-200" />
      </div>

      {/* 2. Layout 배분 (Two-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
        
        {/* 좌측: 이미지 갤러리 영역 (Left Column - 7/12) */}
        <div className="lg:col-span-7 space-y-4">
          {displayImages.length > 0 ? (
            displayImages.map((img, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.8 }}
                className="w-full bg-gray-50 overflow-hidden"
              >
                <img 
                  src={img.url} 
                  alt={`${project.title} - ${idx}`} 
                  className="w-full h-auto object-cover grayscale hover:grayscale-0 transition-all duration-1000"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            ))
          ) : (
            <div className="aspect-video bg-gray-50 flex items-center justify-center text-xs text-gray-300 uppercase tracking-widest">
              No images uploaded
            </div>
          )}
        </div>

        {/* 우측: 상세 정보 영역 (Right Column - 5/12) */}
        <div className="lg:col-span-5 relative">
          <div className="lg:sticky lg:top-32 space-y-12">
            
            {/* Titles */}
            <div className="space-y-2">
              <h2 className="text-4xl font-bold tracking-tight leading-tight whitespace-pre-wrap">
                {project.title}
              </h2>
              {project.titleEn && (
                <h3 className="text-xl font-medium text-gray-400 leading-tight">
                  {project.titleEn}
                </h3>
              )}
            </div>

            {/* Project Details with Labels */}
            <div className="space-y-10">
              <div className="space-y-6">
                {(project.affiliation || project.agency) && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold tracking-widest text-gray-300 uppercase">
                      {project.agencyType || project.agency_type || '발주처'}
                    </label>
                    <p className="text-sm font-medium">{project.affiliation || project.agency}</p>
                  </div>
                )}

                {project.principalInvestigator && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold tracking-widest text-gray-300 uppercase">총괄 책임자</label>
                    <p className="text-sm font-medium">{project.principalInvestigator}</p>
                  </div>
                )}

                {project.coInvestigator && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold tracking-widest text-gray-300 uppercase">부책임자</label>
                    <p className="text-sm font-medium">{project.coInvestigator}</p>
                  </div>
                )}

                {project.researchers && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold tracking-widest text-gray-300 uppercase">참여 연구진</label>
                    <p className="text-sm font-medium whitespace-pre-wrap">{project.researchers}</p>
                  </div>
                )}

                {(project.location || project.site) && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold tracking-widest text-gray-300 uppercase">대상지</label>
                    <p className="text-sm font-medium">{project.location || project.site}</p>
                  </div>
                )}

                {project.area && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold tracking-widest text-gray-300 uppercase">면적</label>
                    <p className="text-sm font-medium">{formatArea(project.area)}</p>
                  </div>
                )}

                {project.year && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold tracking-widest text-gray-300 uppercase">연구 기간</label>
                    <p className="text-sm font-medium">{project.year}</p>
                  </div>
                )}
              </div>

              {project.content && (
                <div className="space-y-3">
                  <label className="text-[10px] font-bold tracking-widest text-gray-300 uppercase">연구 내용</label>
                  <div className="text-sm text-gray-600 font-normal leading-relaxed whitespace-pre-wrap">
                    {project.content}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Navigation (Relocated) */}
      <div className="mt-32 pt-12 border-t border-gray-100 flex justify-end">
        <button 
          onClick={() => navigate(-1)}
          className="group flex items-center gap-4 text-[11px] font-bold tracking-[0.3em] uppercase text-[#666666] hover:text-black transition-all duration-300"
        >
          <span className="w-12 h-px bg-gray-200 group-hover:w-16 group-hover:bg-black transition-all duration-500" />
          RETURN TO LIST
        </button>
      </div>
    </div>
  );
}
