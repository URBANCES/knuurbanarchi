import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router-dom';

export function normalizeAdmissionMajor(major?: string): string {
  if (!major) return '';
  const trimmed = major.trim();
  if (trimmed === '건축') return '건축학과';
  if (trimmed === '도시 재생' || trimmed === '도시재생') return '도시재생학과';
  return trimmed;
}

export function getCategoryPriority(category: string): number {
  const norm = (category || '').trim().toLowerCase();
  if (norm === 'postdoc' || norm.includes('post-doc') || norm.includes('postdoc') || norm.includes('박사후')) {
    return 1;
  }
  if (norm === 'researcher' || norm.includes('연구원') || norm.includes('researcher')) {
    return 2;
  }
  if (norm === 'doctor' || norm.includes('ph.d') || norm.includes('phd') || norm.includes('doctor') || norm.includes('박사')) {
    return 3;
  }
  if (norm === 'master' || norm.includes('master') || norm.includes('석사')) {
    return 4;
  }
  if (norm.includes('산업대학원') || norm.includes('industry')) {
    return 5;
  }
  if (norm === 'undergrad' || norm.includes('undergraduate') || norm.includes('학부')) {
    return 6;
  }
  return 100;
}

export function getCategoryLabel(category: string): string {
  const norm = (category || '').trim().toLowerCase();
  if (norm === 'postdoc' || norm.includes('post-doc') || norm.includes('postdoc') || norm.includes('박사후')) return '박사후연구원';
  if (norm === 'researcher' || norm.includes('연구원') || norm.includes('researcher')) return '연구원';
  if (norm === 'doctor' || norm.includes('ph.d') || norm.includes('phd') || norm.includes('doctor') || norm.includes('박사')) return '박사과정';
  if (norm === 'master' || norm.includes('master') || norm.includes('석사')) return '석사과정';
  if (norm.includes('산업대학원') || norm.includes('industry')) return '산업대학원';
  if (norm === 'undergrad' || norm.includes('undergraduate') || norm.includes('학부')) return '학부연구생';
  if (norm === 'professor' || norm.includes('교수')) return '교수';
  return category || '기타';
}

interface Member {
  id: string;
  name: string;
  role: string;
  category?: string;
  status?: 'current' | 'completed' | 'graduate';
  admissionMajor?: string;
  undergraduateMajor?: string;
  masterMajor?: string;
  email?: string;
  majorHistory?: string;
  thesisTitle?: string;
  thesisUrl?: string;
  currentCareer?: string;
  startYear?: string;
  endYear?: string;
  isCurrentPeriod?: boolean;
  period?: string;
  affiliation?: string;
  career?: string;
  image: string;
  order: number;
}

function getMemberPeriod(member: Member): string | null {
  const start = member.startYear?.trim() || '';
  const end = member.endYear?.trim() || '';
  const hasStartOrEnd = !!(start || end);

  if (hasStartOrEnd) {
    const isCurrent = member.isCurrentPeriod ?? (end === '현재' || !end);
    if (isCurrent) {
      return start ? `${start} - 현재` : '현재';
    }
    if (start && end) return `${start} - ${end}`;
    if (start) return start;
    if (end) return end;
  }

  if (member.period && member.period.trim()) {
    return member.period.trim();
  }

  return null;
}

interface MembersProps {
  defaultStatus?: 'current' | 'graduate' | 'completed' | 'all';
}

export default function Members({ defaultStatus = 'current' }: MembersProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  // 프론트 검색용 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ⭐️ CMS에서 설정한 기본 프로필 이미지 상태
  const [defaultProfileImage, setDefaultProfileImage] = useState<string>('');

  // 기본 프로필 이미지 동기화
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'boardConfigs', 'members'), (snapshot) => {
      if (snapshot.exists()) {
        setDefaultProfileImage(snapshot.data().defaultProfileImage || '');
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'members'),
      where('role', '==', 'member'),
      orderBy('order', 'asc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      let fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
      
      fetched = fetched.sort((a, b) => {
        const pA = getCategoryPriority(a.category || '');
        const pB = getCategoryPriority(b.category || '');
        if (pA !== pB) return pA - pB;

        const yearA = parseInt(a.startYear || '9999', 10);
        const yearB = parseInt(b.startYear || '9999', 10);
        if (yearA !== yearB) return yearA - yearB;

        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB, 'ko-KR');
      });

      setMembers(fetched);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const statusFilteredMembers = members.filter(member => {
    if (defaultStatus === 'all') return true;
    const statusOfMember = member.status || 'current';
    return statusOfMember === defaultStatus;
  });

  const foundCategories = Array.from(new Set(statusFilteredMembers.map(m => m.category || 'master')))
    .sort((a, b) => getCategoryPriority(a) - getCategoryPriority(b));

  const uniqueCategories = ['all', ...foundCategories];

  const rawQueryCategory = searchParams.get('category');
  const activeTab = rawQueryCategory || 'all';

  const handleTabChange = (cat: string) => {
    if (cat === 'all') {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('category');
      setSearchParams(newParams);
    } else {
      setSearchParams({ category: cat });
    }
  };

  const isAllView = defaultStatus === 'all';

  const finalFilteredMembers = statusFilteredMembers.filter(member => {
    if (isAllView || activeTab === 'all') return true;
    const rawCat = member.category || 'master';
    return rawCat === activeTab;
  });

  return (
    <div className={`max-w-7xl mx-auto px-6 py-24 ${isAllView ? 'space-y-8' : 'space-y-16'}`}>
      {/* Header & Dynamic Title Block */}
      <div className={isAllView ? 'space-y-0' : 'space-y-12'}>
        <div className="flex flex-col md:flex-row justify-between items-baseline border-b border-gray-100 pb-8 gap-4">
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold tracking-[0.4em] uppercase text-gray-400">
              About / {isAllView ? 'All' : defaultStatus === 'graduate' ? 'Alumni' : defaultStatus === 'completed' ? 'Completed' : 'Undergraduate'}
            </h3>
            <h2 className="text-3xl font-bold tracking-tight uppercase">
              {isAllView ? '전체 구성원' : defaultStatus === 'graduate' ? '졸업생' : defaultStatus === 'completed' ? '수료생' : '재학생'}
            </h2>
          </div>
        </div>

        {/* 스마트 검색창 */}
        <div className="relative z-[40] w-full max-w-xl">
          <div className="flex items-center border-b-2 border-gray-200 focus-within:border-black transition-colors bg-transparent pb-3">
            <span className="pr-3 text-gray-400">🔍</span>
            <input 
              type="text"
              placeholder="구성원 이름 검색 (띄어쓰기 무관)"
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
                  const matches = members.filter(member => normalize(member.name).includes(queryStr));
                  
                  if (matches.length === 0) return <div className="p-4 text-xs text-gray-400 text-center tracking-widest">검색 결과가 없습니다.</div>;
                  
                  return matches.map(member => (
                    <div 
                      key={member.id}
                      onClick={() => {
                        setSelectedMember(member);
                        setSearchTerm('');
                      }}
                      className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex justify-between items-center group transition-colors"
                    >
                       <div>
                         <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{member.name}</p>
                         <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">{getCategoryLabel(member.category || '')} | {member.status === 'graduate' ? '졸업' : member.status === 'completed' ? '수료' : '재학'}</p>
                       </div>
                       <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">프로필 보기 ↗</span>
                    </div>
                  ));
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!isAllView && foundCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-start pt-4">
            {uniqueCategories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => handleTabChange(cat)}
                className={`px-8 py-3 text-xs font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer ${
                  activeTab === cat 
                    ? 'bg-[#333333] text-white shadow-lg' 
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                }`}
              >
                {cat === 'all' ? '전체보기' : getCategoryLabel(cat)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid of Profile Cards */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
         <AnimatePresence mode="wait">
            <motion.div
              key={`${defaultStatus}-${activeTab}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-16 w-full"
            >
              {finalFilteredMembers.length > 0 ? (
                (isAllView || activeTab === 'all' ? foundCategories : [activeTab]).map((cat) => {
                  const membersInCat = finalFilteredMembers.filter(m => (m.category || 'master') === cat);
                  if (membersInCat.length === 0) return null;

                  return (
                    <div key={cat} className="space-y-6">
                      {(isAllView || activeTab === 'all') && (
                        <div className="border-b border-gray-200 pb-2 mb-6">
                          <h3 className="text-lg font-bold tracking-tight text-gray-900 uppercase">
                            {getCategoryLabel(cat)}
                          </h3>
                        </div>
                      )}

                      <div className={
                        isAllView 
                          ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2" 
                          : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16"
                      }>
                        {membersInCat.map((member, idx) => {
                          // ⭐️ 개별 사진이 없으면 기본 이미지 적용
                          const displayImage = member.image || defaultProfileImage;

                          return (
                            <motion.div
                              key={member.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.03 }}
                              onClick={() => setSelectedMember(member)}
                              className={
                                isAllView
                                  ? "space-y-2.5 group bg-white border border-gray-100 p-2.5 flex flex-col justify-between hover:border-black/50 transition-all cursor-pointer hover:shadow-md"
                                  : "space-y-3 group cursor-pointer"
                              }
                            >
                              <div>
                                <div className="overflow-hidden bg-gray-50 border border-gray-100 relative aspect-[3/4]">
                                  {displayImage ? (
                                    <img 
                                      src={displayImage} 
                                      alt={member.name}
                                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-300 uppercase tracking-widest">No Image</div>
                                  )}
                                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-black/70 px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                      상세보기 +
                                    </span>
                                  </div>
                                </div>

                                <div className="pt-2.5 flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0 space-y-0.5 text-left">
                                    <h4 className="text-sm font-bold tracking-tight text-gray-900 truncate leading-snug group-hover:text-black transition-colors">
                                      {member.name}
                                    </h4>
                                    <p className="text-xs font-medium text-gray-500 truncate leading-normal">
                                      {getCategoryLabel(member.category || '')}
                                      {member.admissionMajor && (
                                        <span className="text-gray-500 font-normal"> / {normalizeAdmissionMajor(member.admissionMajor)}</span>
                                      )}
                                    </p>
                                    {member.email && (
                                      <p className="text-[10px] font-normal text-gray-400 truncate leading-normal">
                                        {member.email}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex-shrink-0 flex flex-col items-end text-right space-y-1">
                                    <span className={`text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-xs text-right whitespace-nowrap ${
                                      member.status === 'graduate' 
                                        ? 'bg-amber-50 text-amber-800 border border-amber-200/60' 
                                        : member.status === 'completed'
                                        ? 'bg-purple-50 text-purple-800 border border-purple-200/60'
                                        : 'bg-blue-50 text-blue-800 border border-blue-200/60'
                                    }`}>
                                      {member.status === 'graduate' ? '졸업' : member.status === 'completed' ? '수료' : '재학'}
                                    </span>

                                    {getMemberPeriod(member) && (
                                      <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap text-right">
                                        {getMemberPeriod(member)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="w-full py-24 text-center border border-dashed border-gray-100">
                  <p className="text-xs text-gray-300 uppercase tracking-widest">해당 과정의 구성원이 없습니다.</p>
                </div>
              )}
            </motion.div>
         </AnimatePresence>
        )}
      </div>

      {/* Profile Detail Popup Modal */}
      <AnimatePresence>
        {selectedMember && (() => {
          const displayImage = selectedMember.image || defaultProfileImage;

          return (
            <div 
              className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 overflow-y-auto"
              onClick={() => setSelectedMember(null)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white p-6 md:p-8 max-w-2xl w-full border border-gray-100 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto"
              >
                <button 
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors p-1 rounded-full cursor-pointer"
                  aria-label="닫기"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="border-b border-gray-100 pb-4 pr-10">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <h3 className="text-2xl font-bold tracking-tight text-gray-900">{selectedMember.name}</h3>
                    <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-xs ${
                      selectedMember.status === 'graduate' 
                        ? 'bg-amber-50 text-amber-800 border border-amber-200/60' 
                        : selectedMember.status === 'completed'
                        ? 'bg-purple-50 text-purple-800 border border-purple-200/60'
                        : 'bg-blue-50 text-blue-800 border border-blue-200/60'
                    }`}>
                      {selectedMember.status === 'graduate' ? '졸업' : selectedMember.status === 'completed' ? '수료' : '재학'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-gray-500 mt-1">
                    {getCategoryLabel(selectedMember.category || '')}
                    {selectedMember.admissionMajor && (
                      <span className="font-normal text-gray-500"> / {normalizeAdmissionMajor(selectedMember.admissionMajor)}</span>
                    )}
                    {getMemberPeriod(selectedMember) && (
                      <span className="font-normal text-gray-400"> ({getMemberPeriod(selectedMember)})</span>
                    )}
                  </p>
                </div>

                <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                  <div className="w-full md:w-52 shrink-0 aspect-[3/4] bg-gray-50 border border-gray-100 overflow-hidden relative rounded-xs">
                    {displayImage ? (
                      <img 
                        src={displayImage} 
                        alt={selectedMember.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-300 uppercase tracking-widest">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-4 w-full text-left">
                    {selectedMember.email?.trim() && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">이메일</span>
                        <a 
                          href={`mailto:${selectedMember.email.trim()}`}
                          className="text-sm font-semibold text-gray-900 hover:text-black hover:underline break-all inline-flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{selectedMember.email.trim()}</span>
                        </a>
                      </div>
                    )}

                    {selectedMember.majorHistory?.trim() && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">전공 이력</span>
                        <p className="text-sm text-gray-800 leading-relaxed font-medium">
                          {selectedMember.majorHistory.trim()}
                        </p>
                      </div>
                    )}

                    {selectedMember.thesisTitle?.trim() && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">졸업 논문</span>
                        <p className="text-sm text-gray-800 leading-relaxed font-medium">
                          {selectedMember.thesisTitle.trim()}
                        </p>
                      </div>
                    )}

                    {selectedMember.thesisUrl?.trim() && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">졸업논문링크</span>
                        <a 
                          href={selectedMember.thesisUrl.trim().startsWith('http') ? selectedMember.thesisUrl.trim() : `https://${selectedMember.thesisUrl.trim()}`}
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline break-all inline-flex items-center gap-1"
                        >
                          <span>{selectedMember.thesisUrl.trim()}</span>
                          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    )}

                    {selectedMember.currentCareer?.trim() && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">현재 경력 상태</span>
                        <p className="text-sm text-gray-800 leading-relaxed font-medium">
                          {selectedMember.currentCareer.trim()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button 
                    type="button"
                    onClick={() => setSelectedMember(null)}
                    className="px-5 py-2.5 bg-gray-100 text-gray-800 text-xs font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    닫기
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
