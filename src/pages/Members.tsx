import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, doc } from 'firebase/firestore';
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

export function getCategoryPriority(category: string): number {
  const norm = (category || '').trim().toLowerCase();
  if (norm === 'doctor' || norm.includes('ph.d') || norm.includes('phd') || norm.includes('doctor') || norm.includes('박사')) {
    return 1;
  }
  if (norm === 'master' || norm.includes('master') || norm.includes('석사')) {
    return 2;
  }
  if (norm.includes('산업대학원') || norm.includes('industry')) {
    return 3;
  }
  if (norm === 'postdoc' || norm.includes('post-doc') || norm.includes('postdoc') || norm.includes('박사후')) {
    return 4;
  }
  if (norm === 'researcher' || norm.includes('연구원') || norm.includes('researcher')) {
    return 5;
  }
  if (norm === 'undergrad' || norm.includes('undergraduate') || norm.includes('학부')) {
    return 6;
  }
  return 100;
}

export function getStatusPriority(status?: string): number {
  if (status === 'graduate') return 1;
  if (status === 'completed') return 2;
  return 3; 
}

export function isGradStudent(category: string): boolean {
  const norm = (category || '').toLowerCase();
  return norm.includes('doctor') || norm.includes('ph') || norm.includes('박사') ||
         norm.includes('master') || norm.includes('석사') ||
         norm.includes('industry') || norm.includes('산업대학원');
}

export function isUndergradStudent(category: string): boolean {
  const norm = (category || '').toLowerCase();
  return norm.includes('undergrad') || norm.includes('학부');
}

interface Member {
  id: string;
  name: string;
  role: string;
  category?: string;
  status?: 'current' | 'completed' | 'graduate';
  admissionMajor?: string;
  email?: string;
  majorHistory?: string;
  thesisTitle?: string;
  thesisUrl?: string;
  currentCareer?: string;
  startYear?: string;
  endYear?: string;
  isCurrentPeriod?: boolean;
  period?: string;
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

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [defaultProfileImage, setDefaultProfileImage] = useState<string>('');

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
      where('role', '==', 'member')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      let fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
      
      fetched = fetched.sort((a, b) => {
        const yearA = parseInt(a.startYear || '9999', 10);
        const yearB = parseInt(b.startYear || '9999', 10);
        if (yearA !== yearB) {
          return yearA - yearB; 
        }

        const catPrioA = getCategoryPriority(a.category || '');
        const catPrioB = getCategoryPriority(b.category || '');
        if (catPrioA !== catPrioB) {
          return catPrioA - catPrioB;
        }

        const statusPrioA = getStatusPriority(a.status);
        const statusPrioB = getStatusPriority(b.status);
        if (statusPrioA !== statusPrioB) {
          return statusPrioA - statusPrioB;
        }

        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB, 'ko-KR');
      });

      setMembers(fetched);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const rawQueryCategory = searchParams.get('group');
  const activeTab = rawQueryCategory || 'all';

  const filteredMembers = members.filter(member => {
    if (activeTab === 'all') return true;
    if (activeTab === 'grad') return isGradStudent(member.category || '');
    if (activeTab === 'undergrad') return isUndergradStudent(member.category || '');
    return true;
  });

  const uniqueYears = Array.from(new Set(filteredMembers.map(m => m.startYear?.trim() || '미상')));

  return (
    <div className="max-w-7xl mx-auto px-6 py-24 space-y-16">
      <div className="space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-baseline border-b border-gray-100 pb-8 gap-4">
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold tracking-[0.4em] uppercase text-gray-400">
              About / {activeTab === 'all' ? 'All Members' : activeTab === 'grad' ? 'Graduate' : 'Undergraduate'}
            </h3>
            <h2 className="text-3xl font-bold tracking-tight">
              구성원
            </h2>
          </div>
        </div>

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
                        setSearchTerm('');
                      }}
                      className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex justify-between items-center group transition-colors"
                    >
                       <div>
                         <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{member.name}</p>
                         <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">{getCategoryLabel(member.category || '')} | {member.status === 'graduate' ? '졸업' : member.status === 'completed' ? '수료' : '재학'}</p>
                       </div>
                       <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">이동 ↗</span>
                    </div>
                  ));
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
         <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-24 w-full"
            >
              {filteredMembers.length > 0 ? (
                uniqueYears.map((year) => {
                  const membersInYear = filteredMembers.filter(m => (m.startYear?.trim() || '미상') === year);
                  if (membersInYear.length === 0) return null;

                  return (
                    <div key={year} className="space-y-8">
                      {/* ⭐️ 소제목을 연도 숫자만 표시 (예: 2013) */}
                      <div className="border-b-2 border-black pb-2 mb-8">
                        <h3 className="text-xl font-extrabold tracking-tight text-gray-900">
                          {year === '미상' ? '입학년도 미상' : year}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {membersInYear.map((member, idx) => {
                          const displayImage = member.image || defaultProfileImage;

                          return (
                            <motion.div
                              key={member.id}
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.05 }}
                              className="flex flex-col sm:flex-row gap-6 p-6 border border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm transition-all group"
                            >
                              <div className="w-full sm:w-36 md:w-40 shrink-0 aspect-[3/4] bg-gray-50 border border-gray-100 overflow-hidden relative">
                                {displayImage ? (
                                  <img 
                                    src={displayImage} 
                                    alt={member.name}
                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-300 uppercase tracking-widest">No Image</div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0 flex flex-col justify-start">
                                <div className="flex justify-between items-start gap-4 mb-4">
                                  <div className="space-y-1">
                                    <h4 className="text-lg md:text-xl font-bold tracking-tight text-gray-900 group-hover:text-black transition-colors">{member.name}</h4>
                                    <p className="text-xs font-medium text-gray-500">
                                      {getCategoryLabel(member.category || '')}
                                      {member.admissionMajor && (
                                        <span className="font-normal text-gray-400"> / {normalizeAdmissionMajor(member.admissionMajor)}</span>
                                      )}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                                    <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-xs text-right whitespace-nowrap ${
                                      member.status === 'graduate' 
                                        ? 'bg-amber-50 text-amber-800 border border-amber-200/60' 
                                        : member.status === 'completed'
                                        ? 'bg-purple-50 text-purple-800 border border-purple-200/60'
                                        : 'bg-blue-50 text-blue-800 border border-blue-200/60'
                                    }`}>
                                      {member.status === 'graduate' ? '졸업' : member.status === 'completed' ? '수료' : '재학'}
                                    </span>
                                    {getMemberPeriod(member) && (
                                      <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap">
                                        {getMemberPeriod(member)}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="border-t border-gray-100 pt-4 space-y-3 flex-1">
                                  {member.email?.trim() && (
                                    <div className="flex items-start gap-3 text-xs">
                                      <span className="w-16 shrink-0 font-bold text-gray-400 uppercase tracking-widest text-[9px] mt-0.5">이메일</span>
                                      <a href={`mailto:${member.email.trim()}`} className="text-gray-700 hover:text-black hover:underline break-all">{member.email.trim()}</a>
                                    </div>
                                  )}
                                  
                                  {member.majorHistory?.trim() && (
                                    <div className="flex items-start gap-3 text-xs">
                                      <span className="w-16 shrink-0 font-bold text-gray-400 uppercase tracking-widest text-[9px] mt-0.5">전공이력</span>
                                      <span className="text-gray-700 leading-relaxed font-medium">{member.majorHistory.trim()}</span>
                                    </div>
                                  )}

                                  {member.thesisTitle?.trim() && (
                                    <div className="flex items-start gap-3 text-xs">
                                      <span className="w-16 shrink-0 font-bold text-gray-400 uppercase tracking-widest text-[9px] mt-0.5">졸업논문</span>
                                      <span className="text-gray-700 leading-relaxed font-medium">{member.thesisTitle.trim()}</span>
                                    </div>
                                  )}

                                  {member.thesisUrl?.trim() && (
                                    <div className="flex items-start gap-3 text-xs">
                                      <span className="w-16 shrink-0 font-bold text-gray-400 uppercase tracking-widest text-[9px] mt-0.5">논문링크</span>
                                      <a 
                                        href={member.thesisUrl.trim().startsWith('http') ? member.thesisUrl.trim() : `https://${member.thesisUrl.trim()}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-blue-600 hover:text-blue-800 hover:underline break-all inline-flex items-center gap-1 font-semibold"
                                      >
                                        <span>Link</span>
                                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                      </a>
                                    </div>
                                  )}

                                  {member.currentCareer?.trim() && (
                                    <div className="flex items-start gap-3 text-xs">
                                      <span className="w-16 shrink-0 font-bold text-gray-400 uppercase tracking-widest text-[9px] mt-0.5">현재경력</span>
                                      <span className="text-gray-700 leading-relaxed font-medium">{member.currentCareer.trim()}</span>
                                    </div>
                                  )}

                                  {!member.email?.trim() && !member.majorHistory?.trim() && !member.thesisTitle?.trim() && !member.thesisUrl?.trim() && !member.currentCareer?.trim() && (
                                    <div className="pt-2">
                                      <p className="text-xs text-gray-300 italic font-medium">등록된 상세 이력 정보가 없습니다.</p>
                                    </div>
                                  )}
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
                  <p className="text-xs text-gray-300 uppercase tracking-widest">해당하는 구성원이 없습니다.</p>
                </div>
              )}
            </motion.div>
         </AnimatePresence>
        )}
      </div>
    </div>
  );
}
