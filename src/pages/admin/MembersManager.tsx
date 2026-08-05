import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { uploadImageWithFallback } from '../../lib/uploadHelper';
import { db, storage } from '../../lib/firebase';
import { motion } from 'motion/react';

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
  startYear?: string;
  endYear?: string;
  isCurrentPeriod?: boolean;
  period?: string;
  image: string;
  email?: string;
  majorHistory?: string;
  thesisTitle?: string;
  thesisUrl?: string;
  currentCareer?: string;
  order: number;
  categoryOrder?: number;
}

export interface CategoryOption {
  id: string;
  key: string;
  label: string;
  order?: number;
}

const DEFAULT_CATEGORY_OPTIONS: CategoryOption[] = [
  { id: 'doctor', key: 'doctor', label: '박사과정', order: 1 },
  { id: 'master', key: 'master', label: '석사과정', order: 2 },
  { id: 'undergrad', key: 'undergrad', label: '학부연구생', order: 3 },
  { id: 'postdoc', key: 'postdoc', label: '박사후연구원', order: 4 },
  { id: 'researcher', key: 'researcher', label: '연구원', order: 5 },
];

export function getMemberPeriod(member: Member): string | null {
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

export default function MembersManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentMember, setCurrentMember] = useState<Partial<Member> | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [cmsFilter, setCmsFilter] = useState<string>('all');
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Category Options Management State
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>(DEFAULT_CATEGORY_OPTIONS);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryOption | null>(null);

  // Real-time synchronization for category options
  useEffect(() => {
    const q = query(collection(db, 'memberCategories'));
    const unsub = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Seed default category options into Firestore
        for (const def of DEFAULT_CATEGORY_OPTIONS) {
          try {
            await addDoc(collection(db, 'memberCategories'), {
              key: def.key,
              label: def.label,
              order: def.order,
              createdAt: serverTimestamp()
            });
          } catch (err) {
            console.error('Error seeding default category option:', err);
          }
        }
        return;
      }

      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        key: doc.data().key || doc.data().label || doc.id,
        label: doc.data().label || doc.data().key || doc.id,
        order: doc.data().order ?? 100
      } as CategoryOption));

      fetched.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
      setCategoryOptions(fetched);
    }, (error) => {
      console.error('Error in memberCategories snapshot listener:', error);
    });

    return () => unsub();
  }, []);

  const handleAddCategory = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    const exists = categoryOptions.some(opt => opt.label === name || opt.key === name);
    if (exists) {
      alert(`'${name}' 항목은 이미 과정 분류 선택지에 존재합니다.`);
      return;
    }

    try {
      await addDoc(collection(db, 'memberCategories'), {
        key: name,
        label: name,
        order: categoryOptions.length + 1,
        createdAt: serverTimestamp()
      });
      setNewCategoryName('');
      if (currentMember) {
        setCurrentMember(prev => prev ? { ...prev, category: name } : prev);
      }
      alert(`'${name}' 과정 분류 항목이 성공적으로 추가되었습니다.`);
    } catch (err) {
      console.error('Error adding category option:', err);
      alert('과정 분류 추가 중 오류가 발생했습니다.');
    }
  };

  const handleRequestDeleteCategory = (opt: CategoryOption) => {
    const inUseMembers = members.filter(m => {
      const cat = (m.category || '').trim();
      const label = getCategoryLabel(cat);
      return cat === opt.key || cat === opt.label || label === opt.label;
    });

    const inUseCount = inUseMembers.length;

    if (inUseCount > 0) {
      alert(`현재 이 과정을 사용 중인 구성원이 ${inUseCount}명 있습니다. 해당 구성원들의 과정을 다른 것으로 변경한 후 삭제해 주세요.`);
      return;
    }

    setCategoryToDelete(opt);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteDoc(doc(db, 'memberCategories', categoryToDelete.id));
      alert(`'${categoryToDelete.label}' 과정 분류 항목이 성공적으로 삭제되었습니다.`);
      setCategoryToDelete(null);
    } catch (err) {
      console.error('Error deleting category option:', err);
      alert('과정 분류 삭제 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'members'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, async (snapshot) => {
      let fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));

      // Self-healing database routine & legacy professor records removal
      const pureMembers: Member[] = [];
      for (const m of fetched) {
        if (m.role === 'professor') {
          try {
            await deleteDoc(doc(db, 'members', m.id));
            console.log(`Deleted legacy professor member doc from members collection: ${m.name}`);
          } catch (err) {
            console.error(`Error deleting legacy professor [${m.name}]:`, err);
          }
          continue;
        }

        let needsUpdate = false;
        const updates: any = {};
        
        if (!m.status) {
          updates.status = 'current';
          needsUpdate = true;
        }

        if (m.admissionMajor) {
          const normMajor = normalizeAdmissionMajor(m.admissionMajor);
          if (normMajor !== m.admissionMajor) {
            updates.admissionMajor = normMajor;
            needsUpdate = true;
          }
        }

        const computedPriority = getCategoryPriority(m.category || '');
        if (m.categoryOrder === undefined || m.categoryOrder !== computedPriority) {
          updates.categoryOrder = computedPriority;
          needsUpdate = true;
        }

        if (needsUpdate) {
          try {
            await updateDoc(doc(db, 'members', m.id), updates);
            console.log(`Successfully healed member [${m.name}]`);
          } catch (err) {
            console.error(`Error during self-healing for member [${m.name}]:`, err);
          }
        }
        pureMembers.push({
          ...m,
          admissionMajor: normalizeAdmissionMajor(m.admissionMajor)
        });
      }

      // Client-side sorting for display
      const sorted = pureMembers.sort((a, b) => {
        const pA = getCategoryPriority(a.category || '');
        const pB = getCategoryPriority(b.category || '');
        if (pA !== pB) return pA - pB;
        return (a.order ?? 0) - (b.order ?? 0);
      });

      setMembers(sorted);
      setLoading(false);
    }, (error) => {
      console.error('Error in members snapshot listener:', error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const checkFileSize = (file: File, inputId?: string): boolean => {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    if (file.size > 20 * 1024 * 1024) {
      alert(`첨부 가능한 파일의 최대 크기는 20MB입니다. 현재 파일은 ${sizeInMB}MB로, 서버 무한 로딩을 방지하기 위해 업로드가 제한됩니다. 이미지 크기를 줄이거나 압축 후 다시 시도해 주세요.`);
      if (inputId) {
        const input = document.getElementById(inputId) as HTMLInputElement | null;
        if (input) input.value = '';
      }
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      const proceed = window.confirm(`첨부하신 파일의 용량이 커서 (${sizeInMB}MB) 업로드 완료까지 1분 이상 소요될 수 있습니다. 진행하시겠습니까?`);
      if (!proceed) {
        if (inputId) {
          const input = document.getElementById(inputId) as HTMLInputElement | null;
          if (input) input.value = '';
        }
        return false;
      }
    }
    return true;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const storagePath = `members/${Date.now()}_${file.name}`;
      const result = await uploadImageWithFallback(file, storagePath, setUploading);
      
      if (result.error) {
        if (result.isBase64Fallback) {
          setCurrentMember({ ...currentMember, image: result.url });
          alert(`${result.error}\n\n* 안정성 확보를 위해 연구원 사진을 로컬 Base64 데이터 형식으로 인코딩하여 임시 저장 완료하였습니다. 정보 저장을 완료하시면 적용됩니다.`);
        } else {
          alert(`구성원 사진 업로드 제한: ${result.error}`);
          const input = document.getElementById('member-file-input') as HTMLInputElement | null;
          if (input) input.value = '';
        }
      } else {
        setCurrentMember({ ...currentMember, image: result.url });
        alert('이미지가 성공적으로 임시 업로드되었습니다.');
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMember?.name) return;

    const categoryVal = currentMember.category || 'master';
    const computedCatOrder = getCategoryPriority(categoryVal);

    const start = currentMember.startYear?.trim() || '';
    const isCurrent = currentMember.isCurrentPeriod ?? (!currentMember.endYear || currentMember.endYear === '현재');
    const end = isCurrent ? '현재' : (currentMember.endYear?.trim() || '');

    let computedPeriod = '';
    if (start && end) {
      computedPeriod = `${start} - ${end}`;
    } else if (start) {
      computedPeriod = isCurrent ? `${start} - 현재` : start;
    } else if (end && end !== '현재') {
      computedPeriod = end;
    } else if (isCurrent) {
      computedPeriod = '현재';
    }

    const data = {
      name: currentMember.name?.trim() || '',
      startYear: start,
      endYear: isCurrent ? '' : end,
      isCurrentPeriod: isCurrent,
      period: computedPeriod,
      admissionMajor: normalizeAdmissionMajor(currentMember.admissionMajor),
      category: categoryVal,
      status: currentMember.status || 'current',
      image: currentMember.image || '',
      email: currentMember.email?.trim() || '',
      majorHistory: currentMember.majorHistory?.trim() || '',
      thesisTitle: currentMember.thesisTitle?.trim() || '',
      thesisUrl: currentMember.thesisUrl?.trim() || '',
      currentCareer: currentMember.currentCareer?.trim() || '',
      role: 'member',
      categoryOrder: computedCatOrder,
      order: currentMember.order ?? members.length,
      updatedAt: serverTimestamp(),
    };

    try {
      if (currentMember.id) {
        await updateDoc(doc(db, 'members', currentMember.id), data);
      } else {
        await addDoc(collection(db, 'members'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
      setIsEditing(false);
      setCurrentMember(null);
    } catch (err) {
      console.error(err);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = (member: Member) => {
    setMemberToDelete(member);
  };

  const confirmDelete = async () => {
    if (!memberToDelete) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'members', memberToDelete.id));
      setMemberToDelete(null);
    } catch (err) {
      console.error('Error deleting member:', err);
      alert('구성원 삭제 처리 중 오류가 발생했습니다. 권한 및 데이터베이스 상태를 확인해 주세요.');
    } finally {
      setDeleting(false);
    }
  };

  // Dynamic filter lists for unified CMS dashboard
  const filteredCmsMembers = members.filter(member => {
    if (cmsFilter === 'all') return true;
    if (cmsFilter === 'current') return member.status === 'current' || !member.status;
    if (cmsFilter === 'completed') return member.status === 'completed';
    if (cmsFilter === 'graduate') return member.status === 'graduate';
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold tracking-tight">구성원 관리</h3>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">Research Lab Members Directory</p>
        </div>
        <button 
          onClick={() => {
            setCurrentMember({ 
              name: '', 
              role: 'member', 
              category: categoryOptions[0]?.key || 'master',
              status: 'current',
              admissionMajor: '건축학과',
              startYear: '',
              endYear: '',
              isCurrentPeriod: true,
              period: '',
              image: '',
              email: '',
              majorHistory: '',
              thesisTitle: '',
              thesisUrl: '',
              currentCareer: '',
              order: members.length
            });
            setIsEditing(true);
          }}
          className="px-6 py-2 bg-black text-white text-[10px] font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors cursor-pointer"
        >
          구성원 추가
        </button>
      </div>

      {/* Dynamic Status Filter Tabs in CMS */}
      <div className="flex gap-8 border-b border-gray-100 pb-px">
        {[
          { id: 'all', label: '전체' },
          { id: 'current', label: '재학' },
          { id: 'completed', label: '수료' },
          { id: 'graduate', label: '졸업' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCmsFilter(tab.id)}
            className={`pb-4 text-[10px] font-bold uppercase tracking-widest transition-all relative cursor-pointer ${
              cmsFilter === tab.id ? 'text-black font-extrabold' : 'text-gray-400 hover:text-black'
            }`}
          >
            {tab.label} ({
              tab.id === 'all' ? members.length :
              tab.id === 'current' ? members.filter(m => m.status === 'current' || !m.status).length :
              tab.id === 'completed' ? members.filter(m => m.status === 'completed').length :
              members.filter(m => m.status === 'graduate').length
            })
            {cmsFilter === tab.id && (
              <motion.div
                layoutId="cmsMembersFilterLine"
                className="absolute bottom-0 left-0 w-full h-[2px] bg-black"
                transition={{ duration: 0.3 }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-xs uppercase tracking-widest">Loading...</div>
        ) : filteredCmsMembers.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-200 text-gray-400 text-xs uppercase tracking-widest">
            등록된 구성원이 없습니다.
          </div>
        ) : (
          filteredCmsMembers.map(member => (
            <div key={member.id} className="flex items-center justify-between p-6 border border-gray-100 hover:bg-gray-50 transition-all group">
              <div className="flex items-center gap-6">
                <div className="w-16 h-20 bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100">
                  {member.image ? (
                    <img src={member.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-300">No Image</div>
                  )}
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold tracking-tight">{member.name}</h4>
                  <div className="text-[10px] text-gray-400 uppercase tracking-widest flex flex-wrap items-center gap-2">
                    <span className="font-bold text-black border border-black/15 bg-gray-50 px-1.5 py-0.5">
                      {getCategoryLabel(member.category || '')}
                    </span>
                    <span className={`px-1.5 py-0.5 border ${
                      member.status === 'graduate' 
                        ? 'border-amber-500/30 bg-amber-50 text-amber-700' 
                        : member.status === 'completed'
                        ? 'border-purple-500/30 bg-purple-50 text-purple-700'
                        : 'border-blue-500/30 bg-blue-50 text-blue-700'
                    } font-bold`}>
                      {member.status === 'graduate' ? '졸업' : member.status === 'completed' ? '수료' : '재학'}
                    </span>
                    {member.admissionMajor && (
                      <span className="px-1.5 py-0.5 border border-gray-200 bg-gray-100 text-gray-800 font-bold">
                        {normalizeAdmissionMajor(member.admissionMajor)}
                      </span>
                    )}
                    {getMemberPeriod(member) && (
                      <>
                        <span>|</span>
                        <span>{getMemberPeriod(member)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    const isCurr = member.isCurrentPeriod ?? (!member.endYear || member.endYear === '현재');
                    setCurrentMember({
                      ...member,
                      isCurrentPeriod: isCurr
                    });
                    setIsEditing(true);
                  }}
                  className="text-[10px] font-bold text-black uppercase tracking-widest hover:underline cursor-pointer"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(member)}
                  className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:underline cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isEditing && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 z-[150] bg-white p-8 overflow-y-auto"
        >
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex justify-between items-center border-b border-gray-100 pb-6">
              <h2 className="text-2xl font-bold tracking-tight">{currentMember?.id ? '구성원 수정' : '새 구성원 등록'}</h2>
              <button onClick={() => setIsEditing(false)} className="text-xs font-bold tracking-widest uppercase hover:underline cursor-pointer">닫기</button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              {/* 1. 이름 */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">이름 *</label>
                <input 
                  type="text" 
                  className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                  placeholder="성함을 입력하세요 (예: 홍길동)"
                  value={currentMember?.name || ''}
                  onChange={e => setCurrentMember({...currentMember, name: e.target.value})}
                  required
                />
              </div>

              {/* 2. 소속 기간 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">소속 기간</label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="w-3.5 h-3.5 accent-black rounded cursor-pointer"
                      checked={currentMember?.isCurrentPeriod ?? (!currentMember?.endYear || currentMember?.endYear === '현재')}
                      onChange={e => {
                        const checked = e.target.checked;
                        setCurrentMember({
                          ...currentMember,
                          isCurrentPeriod: checked,
                          endYear: checked ? '' : (currentMember?.endYear === '현재' ? '' : currentMember?.endYear)
                        });
                      }}
                    />
                    <span className="text-xs font-semibold text-gray-700">현재 진행 중 (Present)</span>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    maxLength={4}
                    className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm bg-white"
                    value={currentMember?.startYear || ''}
                    onChange={e => setCurrentMember({...currentMember, startYear: e.target.value.replace(/[^0-9]/g, '')})}
                    placeholder="시작 년도 (예: 2024)"
                  />
                  <span className="text-gray-400 font-bold px-1">~</span>
                  <input 
                    type="text" 
                    maxLength={4}
                    disabled={currentMember?.isCurrentPeriod ?? (!currentMember?.endYear || currentMember?.endYear === '현재')}
                    className={`w-full p-4 border border-gray-100 focus:border-black outline-none text-sm ${
                      (currentMember?.isCurrentPeriod ?? (!currentMember?.endYear || currentMember?.endYear === '현재'))
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-white'
                    }`}
                    value={(currentMember?.isCurrentPeriod ?? (!currentMember?.endYear || currentMember?.endYear === '현재')) ? '현재' : (currentMember?.endYear || '')}
                    onChange={e => setCurrentMember({...currentMember, endYear: e.target.value.replace(/[^0-9]/g, '')})}
                    placeholder="종료 년도 (예: 2026)"
                  />
                </div>
              </div>

              {/* 3. 소속 전공 */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">소속 전공</label>
                <div className="flex flex-wrap gap-6 p-4 border border-gray-100 bg-white">
                  {['건축학과', '도시재생학과'].map(major => (
                    <label key={major} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="admissionMajor"
                        value={major}
                        checked={normalizeAdmissionMajor(currentMember?.admissionMajor) === major}
                        onChange={e => setCurrentMember({...currentMember, admissionMajor: e.target.value})}
                        className="accent-black"
                      />
                      <span className="text-xs font-bold uppercase tracking-tight">{major}</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="admissionMajor"
                      value=""
                      checked={!currentMember?.admissionMajor}
                      onChange={() => setCurrentMember({...currentMember, admissionMajor: ''})}
                      className="accent-black"
                    />
                    <span className="text-xs text-gray-400 uppercase tracking-tight">선택 안함</span>
                  </label>
                </div>
              </div>

              {/* 4. 과정 분류 */}
              <div className="space-y-2.5 p-3.5 border border-gray-100 bg-gray-50/40 rounded-xs">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">과정 분류 *</label>
                  <button
                    type="button"
                    onClick={() => setIsManagingCategories(true)}
                    className="text-[10px] font-bold text-gray-600 hover:text-black underline cursor-pointer flex items-center gap-1"
                  >
                    <span>⚙️ 과정 선택지 전체 관리 / 삭제</span>
                  </button>
                </div>

                <select
                  className="w-full p-3.5 border border-gray-200 focus:border-black outline-none text-sm bg-white cursor-pointer font-medium"
                  value={currentMember?.category || (categoryOptions[0]?.key || 'master')}
                  onChange={e => setCurrentMember({...currentMember, category: e.target.value})}
                  required
                >
                  {categoryOptions.map(opt => (
                    <option key={opt.id} value={opt.key}>{opt.label}</option>
                  ))}
                  {currentMember?.category && !categoryOptions.some(o => o.key === currentMember.category || o.label === currentMember.category) && (
                    <option value={currentMember.category}>{getCategoryLabel(currentMember.category)}</option>
                  )}
                </select>

                {/* Inline Quick Add Category Option */}
                <div className="flex gap-2 pt-1">
                  <input 
                    type="text"
                    placeholder="새 과정 분류 즉석 추가 (예: 객원연구원)"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="flex-1 p-2.5 border border-gray-200 focus:border-black outline-none text-xs bg-white"
                  />
                  <button 
                    type="button"
                    onClick={() => handleAddCategory()}
                    className="px-3.5 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
                  >
                    + 추가
                  </button>
                </div>
              </div>

              {/* 5. 상태 분류 */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">상태 분류 *</label>
                <div className="flex flex-wrap gap-4 p-4 border border-gray-100 bg-white">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="status"
                      value="current"
                      checked={currentMember?.status === 'current' || !currentMember?.status}
                      onChange={e => setCurrentMember({...currentMember, status: e.target.value as any})}
                      className="accent-black"
                      required
                    />
                    <span className="text-xs font-bold uppercase tracking-tight">재학</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="status"
                      value="completed"
                      checked={currentMember?.status === 'completed'}
                      onChange={e => setCurrentMember({...currentMember, status: e.target.value as any})}
                      className="accent-black"
                    />
                    <span className="text-xs font-bold uppercase tracking-tight">수료</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="status"
                      value="graduate"
                      checked={currentMember?.status === 'graduate'}
                      onChange={e => setCurrentMember({...currentMember, status: e.target.value as any})}
                      className="accent-black"
                    />
                    <span className="text-xs font-bold uppercase tracking-tight">졸업</span>
                  </label>
                </div>
              </div>

              {/* 6. 프로필 사진 */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">프로필 사진</label>
                <div className="relative group">
                  <input 
                    id="member-file-input"
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="p-4 border-2 border-dashed border-gray-100 text-center text-xs font-bold uppercase tracking-widest text-gray-400 group-hover:border-black group-hover:text-black transition-all">
                    {currentMember?.image ? '사진 변경하기' : '사진 업로드 +'}
                  </div>
                </div>
                <p className="text-[9px] text-[#A3A3A3] font-medium leading-normal">
                  * 최대 20MB 이하의 이미지 파일(PNG, JPG)만 첨부 가능합니다.
                </p>
                {currentMember?.image && (
                  <div className="mt-2 w-24 h-32 border border-gray-100 overflow-hidden">
                    <img src={currentMember.image} className="w-full h-full object-cover grayscale" alt="Preview" />
                  </div>
                )}
              </div>

              {/* 7. 이메일 */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">이메일</label>
                <input 
                  type="email" 
                  className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                  placeholder="이메일 주소 입력 (예: researcher@lab.ac.kr)"
                  value={currentMember?.email || ''}
                  onChange={e => setCurrentMember({...currentMember, email: e.target.value})}
                />
              </div>

              {/* 8. 전공 이력 */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">전공 이력</label>
                <input 
                  type="text" 
                  className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                  placeholder="전공 이력/학위 과정 입력 (예: OO대학교 건축학 학사)"
                  value={currentMember?.majorHistory || ''}
                  onChange={e => setCurrentMember({...currentMember, majorHistory: e.target.value})}
                />
              </div>

              {/* 9. 졸업 논문 */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">졸업 논문</label>
                <input 
                  type="text" 
                  className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                  placeholder="졸업 논문 제목 입력"
                  value={currentMember?.thesisTitle || ''}
                  onChange={e => setCurrentMember({...currentMember, thesisTitle: e.target.value})}
                />
              </div>

              {/* 10. 졸업논문링크 */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">졸업논문링크</label>
                <input 
                  type="url" 
                  className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                  placeholder="논문 링크 URL 입력 (예: https://doi.org/... 또는 https://...)"
                  value={currentMember?.thesisUrl || ''}
                  onChange={e => setCurrentMember({...currentMember, thesisUrl: e.target.value})}
                />
              </div>

              {/* 11. 현재 경력 상태 */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">현재 경력 상태</label>
                <input 
                  type="text" 
                  className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                  placeholder="현재 경력 또는 소속 상태 입력 (예: OO연구소 선임연구원)"
                  value={currentMember?.currentCareer || ''}
                  onChange={e => setCurrentMember({...currentMember, currentCareer: e.target.value})}
                />
              </div>

              <button 
                type="submit" 
                disabled={uploading}
                className="w-full py-4 bg-black text-white text-[10px] font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors disabled:bg-gray-400 cursor-pointer"
              >
                {uploading ? '업로딩...' : currentMember?.id ? '수정 완료' : '등록 완료'}
              </button>
            </form>
          </div>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 md:p-8 max-w-md w-full border border-gray-100 shadow-2xl space-y-6"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg">
                !
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">구성원 삭제 확인</h3>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                  정말로 <strong className="text-black font-bold">[{memberToDelete.name}]</strong> 구성원 데이터를 삭제하시겠습니까?
                </p>
                <p className="text-xs text-red-500 font-medium mt-1">
                  * 이 작업은 되돌릴 수 없으며, 해당 데이터가 영구 삭제됩니다.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 cursor-pointer transition-colors disabled:opacity-50"
              >
                {deleting ? '삭제 중...' : '확인 및 삭제'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Category Options Management Modal */}
      {isManagingCategories && (
        <div className="fixed inset-0 z-[180] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 md:p-8 max-w-lg w-full border border-gray-100 shadow-2xl space-y-6 max-h-[85vh] flex flex-col"
          >
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold tracking-tight">과정 분류 선택지 관리</h3>
                <p className="text-xs text-gray-400 mt-0.5">구성원 등록 및 필터링에 사용되는 과정을 관리합니다.</p>
              </div>
              <button 
                onClick={() => setIsManagingCategories(false)}
                className="text-xs font-bold uppercase tracking-widest hover:underline cursor-pointer"
              >
                닫기
              </button>
            </div>

            {/* Add New Category Option Form */}
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input 
                type="text"
                placeholder="새 과정 분류 입력 (예: 객원연구원)"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                className="flex-1 p-3 border border-gray-200 focus:border-black outline-none text-sm"
              />
              <button 
                type="submit"
                className="px-4 py-3 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors cursor-pointer whitespace-nowrap"
              >
                + 추가
              </button>
            </form>

            {/* Category Options List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">등록된 과정 분류 목록 ({categoryOptions.length})</label>
              {categoryOptions.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">등록된 과정 분류 항목이 없습니다.</p>
              ) : (
                categoryOptions.map(opt => {
                  const usageCount = members.filter(m => {
                    const cat = (m.category || '').trim();
                    const label = getCategoryLabel(cat);
                    return cat === opt.key || cat === opt.label || label === opt.label;
                  }).length;

                  return (
                    <div 
                      key={opt.id} 
                      className="flex items-center justify-between p-3.5 border border-gray-100 bg-gray-50/50 hover:bg-white transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-900">{opt.label}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          usageCount > 0 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          사용 중: {usageCount}명
                        </span>
                      </div>

                      <button 
                        type="button"
                        onClick={() => handleRequestDeleteCategory(opt)}
                        className="px-2.5 py-1 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded border border-transparent hover:border-red-200 transition-all cursor-pointer flex items-center gap-1"
                        title="선택지 삭제"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>삭제</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setIsManagingCategories(false)}
                className="px-5 py-2.5 bg-gray-100 text-gray-800 text-xs font-bold uppercase hover:bg-gray-200 transition-colors cursor-pointer"
              >
                닫기
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Category Option Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 md:p-8 max-w-md w-full border border-gray-100 shadow-2xl space-y-6"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg">
                !
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">과정 분류 선택지 삭제 확인</h3>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                  해당 과정 분류 항목 <strong className="text-black font-bold">[{categoryToDelete.label}]</strong>을(를) 삭제하시겠습니까?
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  * 이 과정을 사용 중인 구성원이 0명이므로 데이터 유실 없이 삭제됩니다.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmDeleteCategory}
                className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 cursor-pointer transition-colors"
              >
                확인 및 삭제
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
