import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Spec {
  label: string;
  content: string;
}

interface Section {
  title: string;
  items: string[];
}

interface ProfessorData {
  name: string;
  image: string;
  introduction?: string;
  specs: Spec[];
  sections: Section[];
}

export default function About() {
  const [labInfo, setLabInfo] = useState<any>(null);
  const [profData, setProfData] = useState<ProfessorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubInfo = onSnapshot(doc(db, 'settings', 'lab'), (snapshot) => {
      if (snapshot.exists()) {
        setLabInfo(snapshot.data());
      }
    });

    const unsubProf = onSnapshot(doc(db, 'about', 'professor'), (docSnap) => {
      if (docSnap.exists()) {
        setProfData(docSnap.data() as ProfessorData);
      }
      setLoading(false);
    });

    return () => {
      unsubInfo();
      unsubProf();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin font-bold"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-24">
      {/* SECTION 1: Lab Philosophy & Vision */}
      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-24 items-start"
      >
        <div className="space-y-12">
          <div className="space-y-4">
            <h3 className="text-[12px] font-bold tracking-[0.4em] uppercase text-gray-400 font-sans">Lab Philosophy</h3>
            <div className="space-y-8">
              <h2 className="text-[30px] font-bold tracking-tight leading-tight whitespace-pre-wrap font-sans">
                {labInfo?.highlightLine || '도시의 본질을 탐구하고 \n건축의 미래를 설계합니다.'}
              </h2>
              <div className="w-12 h-1 bg-black"></div>
            </div>
          </div>
          <p className="text-[14px] text-gray-600 leading-[1.8] text-justify font-light whitespace-pre-wrap max-w-lg font-sans">
            {labInfo?.description || `도시건축연구실(Urban Architecture Lab)은 현대 도시가 직면한 복합적인 문제들을 건축적 시각에서 분석하고 해결책을 제시하는 연구 중심의 디자인 스튜디오입니다. 우리는 도시의 역사적 맥락과 미래의 기술적 변화 사이의 균형을 찾으며, 사람 중심의 지속 가능한 도시 환경을 구축하는 것을 목표로 합니다.`}
          </p>

          {/* 본문 삽입 이미지 (Conditional Rendering) */}
          {labInfo?.bodyImageUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="aspect-[16/10] bg-gray-100 overflow-hidden shadow-xl border border-gray-100 rounded"
            >
              <img 
                src={labInfo.bodyImageUrl} 
                alt="Lab illustration"
                className="w-full h-full object-cover grayscale opacity-90 hover:opacity-100 transition-opacity duration-700"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          )}
        </div>
        <div className="aspect-[4/3] bg-gray-100 overflow-hidden shadow-2xl">
          <img 
            src={labInfo?.bannerImageUrl || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000"} 
            alt="Office"
            className="w-full h-full object-cover grayscale opacity-90 transition-opacity hover:opacity-100 duration-1000"
            referrerPolicy="no-referrer"
          />
        </div>
      </motion.section>

      {/* Decorative Elegant Divider */}
      <div className="border-t border-gray-100 my-32 md:my-40 relative">
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-8 text-[11px] font-bold tracking-[0.6em] text-gray-300 uppercase font-sans">
          Professor Profile
        </span>
      </div>

      {/* SECTION 2: Professor Profile */}
      {profData && (
        <motion.section 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="space-y-24"
        >
          {/* Header - Precise authoritative style */}
          <div className="text-center space-y-4 mb-24">
            <h4 className="text-[12px] font-bold tracking-[0.6em] uppercase text-gray-400 font-sans">도시 및 건축설계</h4>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight uppercase font-sans">
              {profData.name} 교수
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-32">
            {/* Left: Profile & Key Specs (학력, 경력, 수상경력) */}
            <div className="lg:col-span-4 space-y-16">
              <div className="aspect-square bg-gray-50 border border-gray-100 overflow-hidden">
                {profData.image ? (
                   <img 
                    src={profData.image} 
                    alt={profData.name || 'Professor'} 
                    className="w-full h-full object-cover grayscale"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px] tracking-widest uppercase font-mono">No Photo</div>
                )}
              </div>

              <div className="space-y-12">
                {profData.specs?.map((spec, idx) => (
                  <div key={idx} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-black"></div>
                      <h4 className="text-sm font-bold tracking-widest uppercase text-black font-sans">{spec.label}</h4>
                    </div>
                    <div className="pl-4.5">
                      <p className="text-[12px] text-gray-600 leading-[1.8] font-light whitespace-pre-wrap font-sans">{spec.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Detailed Records (Detailed Records Column) */}
            <div className="lg:col-span-8 space-y-24">
              {/* Representative Greeting (Introduction) */}
              {profData.introduction && (
                <div className="space-y-8 pb-16 border-b border-gray-100">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold tracking-tight text-black leading-tight font-sans">
                      {profData.introduction.split('\n')[0]}
                    </h3>
                    <div className="w-12 h-1 bg-black"></div>
                  </div>
                  <p className="text-[15px] text-gray-600 leading-[1.8] font-light whitespace-pre-wrap font-sans">
                    {profData.introduction.split('\n').slice(1).join('\n')}
                  </p>
                </div>
              )}

              <div className="space-y-24">
                {profData.sections?.map((section, idx) => (
                  <div key={idx} className="space-y-10">
                    <div className="border-b border-black pb-4">
                      <h3 className="text-lg font-bold tracking-widest uppercase font-sans">
                        {section.title}
                      </h3>
                    </div>
                    
                    <div className="space-y-6 font-sans">
                      <ul className="space-y-4">
                        {section.items?.map((item, iIdx) => (
                          <li key={iIdx} className="text-[14.5px] leading-[1.8] text-gray-600 font-light list-none">
                            {item.includes('|') ? (
                              <div className="flex gap-4">
                                <span className="font-bold text-black min-w-[60px]">{item.split('|')[0].trim()}</span>
                                <span>{item.split('|').slice(1).join('|').trim()}</span>
                              </div>
                            ) : item}
                          </li>
                        ))}
                      </ul>
                      {(!section.items || section.items.length === 0) && (
                        <p className="text-[13px] text-gray-300 italic">등록된 이력이 없습니다.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>
      )}
    </div>
  );
}
