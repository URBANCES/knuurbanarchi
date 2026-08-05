import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
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
  if (norm === 'undergrad' || norm.includes('undergraduate') || norm.includes('학부')) {
    return 5;
  }
  return 100;
}

export function getCategoryLabel(category: string): string {
  const norm = (category || '').trim().toLowerCase();
  if (norm === 'postdoc' || norm.includes('post-doc') || norm.includes('postdoc') || norm.includes('박사후')) return '박사후연구원';
  if (norm === 'researcher' || norm.includes('연구원') || norm.includes('researcher')) return '연구원';
  if (norm === 'doctor' || norm.includes('ph.d') || norm.includes('phd') || norm.includes('doctor') || norm.includes('박사')) return '박사과정';
  if (norm === 'master' || norm.includes('master') || norm.includes('석사')) return '석사과정';
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
  defaultStatus?: 'current' | 'graduate' | 'all';
}

export default function Members({ defaultStatus = 'current' }: MembersProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    // Listen to all member documents in database
    const q = query(
      collection(db, 'members'),
      where('role', '==', 'member'),
      orderBy('order', 'asc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      let fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
      
      // Dynamic client-side sorting by status first (current > graduate),
      // then by categoryPriority and then internal order weight
      fetched = fetched.sort((a, b) => {
        const sA = a.status || 'current';
        const sB = b.status || 'current';
        if (sA === 'current' && sB === 'graduate') return -1;
        if (sA === 'graduate' && sB === 'current') return 1;

        const pA = getCategoryPriority(a.category || '');
        const pB = getCategoryPriority(b.category || '');
        if (pA !== pB) return pA - pB;

        return (a.order ?? 0) - (b.order ?? 0);
      });

      setMembers(fetched);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // 1. Filter members belonging to requested mode (current, graduate, or all)
  const statusFilteredMembers = members.filter(member => {
    if (defaultStatus === 'all') return true;
    const statusOfMember = member.status || 'current';
    return statusOfMember === defaultStatus;
  });

  // 2. Extract unique categories present within statusFilteredMembers for the tab switcher
  const foundCategories = Array.from(new Set(statusFilteredMembers.map(m => m.category || 'master')))
    .sort((a, b) => getCategoryPriority(a) - getCategoryPriority(b));

  // Prepend 'all' tab dynamically to let users view all courses in this category combined
  const uniqueCategories = ['all', ...foundCategories];

  // Determine dynamic active tab, defaulting search parameter or 'all' if not set
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

  // Filter members specifically matching the active tab selection
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
              About / {isAllView ? 'All' : defaultStatus === 'graduate' ? 'Alumni' : 'Undergraduate'}
            </h3>
            <h2 className="text-3xl font-bold tracking-tight uppercase">
              {isAllView ? '전체 구성원' : defaultStatus === 'graduate' ? '졸업생' : '재학생'}
            </h2>
          </div>
        </div>

        {/* Dynamic Horizontal Tab Menu */}
        {!isAllView && foundCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-start">
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
              className={
                isAllView 
                  ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2" 
                  : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16"
              }
            >
              {finalFilteredMembers.length > 0 ? (
                finalFilteredMembers.map((member, idx) => (
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
                      {/* Portrait Photo - Fixed 3:4 Aspect Ratio */}
                      <div className="overflow-hidden bg-gray-50 border border-gray-100 relative aspect-[3/4]">
                        {member.image ? (
                          <img 
                            src={member.image} 
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

                      {/* Member Information block - Flexbox Split (Left: Name, Course/Major; Right: Status, Period) */}
                      <div className="pt-2.5 flex justify-between items-start gap-2">
                        {/* Left Column */}
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

                        {/* Right Column */}
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
                ))
              ) : (
                <div className="col-span-full py-24 text-center border border-dashed border-gray-100">
                  <p className="text-xs text-gray-300 uppercase tracking-widest">해당 과정의 구성원이 없습니다.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Profile Detail Popup Modal */}
      <AnimatePresence>
        {selectedMember && (
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
              {/* Close Button */}
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

              {/* Modal Title & Basic Info Header */}
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

              {/* 2-Column Responsive Body Layout (Stack on mobile, Left-Right on desktop) */}
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                {/* [Left Area]: Profile Image */}
                <div className="w-full md:w-52 shrink-0 aspect-[3/4] bg-gray-50 border border-gray-100 overflow-hidden relative rounded-xs">
                  {selectedMember.image ? (
                    <img 
                      src={selectedMember.image} 
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

                {/* [Right Area]: Detailed Text Info listed in exact top-to-bottom order */}
                <div className="flex-1 space-y-4 w-full text-left">
                  {/* 1. 이메일 */}
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

                  {/* 2. 전공 이력 */}
                  {selectedMember.majorHistory?.trim() && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">전공 이력</span>
                      <p className="text-sm text-gray-800 leading-relaxed font-medium">
                        {selectedMember.majorHistory.trim()}
                      </p>
                    </div>
                  )}

                  {/* 3. 졸업 논문 */}
                  {selectedMember.thesisTitle?.trim() && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">졸업 논문</span>
                      <p className="text-sm text-gray-800 leading-relaxed font-medium">
                        {selectedMember.thesisTitle.trim()}
                      </p>
                    </div>
                  )}

                  {/* 4. 졸업논문링크 */}
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

                  {/* 5. 현재 경력 상태 */}
                  {selectedMember.currentCareer?.trim() && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">현재 경력 상태</span>
                      <p className="text-sm text-gray-800 leading-relaxed font-medium">
                        {selectedMember.currentCareer.trim()}
                      </p>
                    </div>
                  )}

                  {/* Fallback if no extra details are registered */}
                  {!selectedMember.email?.trim() && 
                   !selectedMember.majorHistory?.trim() && 
                   !selectedMember.thesisTitle?.trim() && 
                   !selectedMember.thesisUrl?.trim() && 
                   !selectedMember.currentCareer?.trim() && (
                    <div className="py-2">
                      <p className="text-xs text-gray-400 italic">등록된 상세 학술/경력 정보가 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Footer Close Button */}
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
        )}
      </AnimatePresence>
    </div>
  );
}
