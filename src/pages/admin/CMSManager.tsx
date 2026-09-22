import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, storage } from '../../lib/firebase';
import { uploadImageWithFallback } from '../../lib/uploadHelper';
import { motion, AnimatePresence } from 'motion/react';

interface Post {
  id: string;
  title: string;
  titleEn?: string;
  author?: string;
  affiliation?: string;
  agency?: string;
  agencyType?: string;
  agency_type?: string;
  subtitle?: string;
  year: string;
  content: string;
  thumbnail: string;
  category: string;
  researchType?: 'thesis' | 'journal';
  url?: string;
  isPublished?: boolean;
  showOnHome?: boolean;
  sortOrder?: number;
  attachments?: { name: string; url: string; type: string; sortOrder?: number }[];
  principalInvestigator?: string;
  coInvestigator?: string;
  researchers?: string;
  location?: string;
  site?: string;
  area?: string | number;
}

export const formatArea = (val?: string | number): string => {
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

export default function CMSManager({ collectionName, title }: { collectionName: string; title: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPost, setCurrentPost] = useState<Partial<Post> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingFiles, setPendingFiles] = useState<{ [index: number]: File }>({});

  // 검색 및 페이지네이션용 상태 추가
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // 1페이지당 8개 노출

  // News configuration states
  const [newsConfig, setNewsConfig] = useState<any>(null);
  const [introText, setIntroText] = useState('');
  const [savingIntro, setSavingIntro] = useState(false);

  // Dynamic news category fields
  const [newCatText, setNewCatText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null);

  // Fetch news boardConfig
  useEffect(() => {
    if (collectionName === 'news') {
      const unsub = onSnapshot(doc(db, 'boardConfigs', 'news'), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setNewsConfig(data);
          setIntroText(data.description || '');
        }
      });
      return () => unsub();
    }
  }, [collectionName]);

  const handleSaveIntro = async () => {
    setSavingIntro(true);
    try {
      await setDoc(doc(db, 'boardConfigs', 'news'), {
        ...newsConfig,
        description: introText
      }, { merge: true });
      alert('소개글이 성공적으로 변경 및 저장되었습니다.');
    } catch (err) {
      console.error(err);
      alert('소개글 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingIntro(false);
    }
  };

  const handleAddCat = async () => {
    const trimmed = newCatText.trim();
    if (!trimmed) return;
    const normalized = trimmed.toLowerCase();
    if (normalized === '전체' || normalized === '전체 (all)' || normalized === 'all') {
      alert('기본 예약된 카테고리명은 추가할 수 없습니다.');
      return;
    }
    const currentCats = newsConfig?.categories || ['Lab News', 'Announcement'];
    if (currentCats.includes(trimmed)) {
      alert('이미 존재하는 카테고리입니다.');
      return;
    }
    const updatedCats = [...currentCats, trimmed];
    try {
      await setDoc(doc(db, 'boardConfigs', 'news'), {
        ...newsConfig,
        categories: updatedCats
      }, { merge: true });
      setNewCatText('');
    } catch (err) {
      console.error(err);
      alert('카테고리 추가 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteCat = (catToDelete: string) => {
    const currentCats = newsConfig?.categories || ['Lab News', 'Announcement'];
    if (currentCats.length <= 1) {
      alert('최소 하나의 카테고리는 존재해야 합니다.');
      return;
    }
    setConfirmDeleteCat(catToDelete);
  };

  const executeDeleteCat = async (catToDelete: string) => {
    const currentCats = newsConfig?.categories || ['Lab News', 'Announcement'];
    const updatedCats = currentCats.filter((c: string) => c !== catToDelete);
    try {
      const postsToMigrate = posts.filter(post => post.category === catToDelete);
      const migratePromises = postsToMigrate.map(post => 
        updateDoc(doc(db, collectionName, post.id), { category: '전체' })
      );
      await Promise.all(migratePromises);

      await setDoc(doc(db, 'boardConfigs', 'news'), {
        ...newsConfig,
        categories: updatedCats
      }, { merge: true });

      setConfirmDeleteCat(null);
      setSuccessMessage(`카테고리 "${catToDelete}"가 삭제되고 소속 게시글이 '전체'로 안전하게 이동되었습니다.`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('카테고리 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleSaveEditCat = async (index: number) => {
    const trimmed = editingText.trim();
    if (!trimmed) return;
    const normalized = trimmed.toLowerCase();
    if (normalized === '전체' || normalized === '전체 (all)' || normalized === 'all') {
      alert('기본 예약된 카테고리명으로 변경할 수 없습니다.');
      return;
    }
    const currentCats = newsConfig?.categories || ['Lab News', 'Announcement'];
    if (currentCats.includes(trimmed) && currentCats[index] !== trimmed) {
      alert('이미 존재하는 카테고리입니다.');
      return;
    }
    const updatedCats = [...currentCats];
    updatedCats[index] = trimmed;
    try {
      await setDoc(doc(db, 'boardConfigs', 'news'), {
        ...newsConfig,
        categories: updatedCats
      }, { merge: true });
      setEditingIndex(null);
      setEditingText('');
    } catch (err) {
      console.error(err);
      alert('카테고리 수정 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
      setLoading(false);
    });
    return () => unsub();
  }, [collectionName]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPost?.title) return;

    setSaving(true);
    const categoryMapping: { [key: string]: string } = {
      '박사 학위논문': 'phd',
      '석사 학위논문': 'master',
      '국외 학술논문': 'intl',
      '국내 학술논문': 'domestic',
      '연구 프로젝트': 'general',
      '일반 프로젝트': 'general',
      '실무 프로젝트': 'practical'
    };

    const mappedCategory = categoryMapping[currentPost.category || ''] || currentPost.category;

    let processedAttachments = [...(currentPost.attachments || [])];
    try {
      const uploadPromises = processedAttachments.map(async (item, idx) => {
        const file = pendingFiles[idx];
        if (file && item.url && item.url.startsWith('blob:')) {
          const storagePath = `${collectionName}/${Date.now()}_${idx}_${file.name}`;
          const result = await uploadImageWithFallback(file, storagePath);
          if (result.error) {
            if (result.isBase64Fallback) {
              alert(`첨부파일 [${file.name}] 업로드 보안/연동 제한:\n${result.error}\n\n* 안정적인 저장을 위해 이미지를 로컬 Base64 데이터 형식으로 인코딩하여 게시물에 첨부하였습니다.`);
              return { ...item, url: result.url };
            } else {
              throw new Error(result.error);
            }
          }
          return { ...item, url: result.url };
        }
        return item;
      });
      processedAttachments = await Promise.all(uploadPromises);
    } catch (err) {
      console.error('Attachments upload failed:', err);
      alert('파일 업로드 과정에서 오류가 발생했습니다:\n' + (err instanceof Error ? err.message : '알 수 없는 오류'));
      setSaving(false);
      return;
    }

    const finalAttachments = processedAttachments
      .filter(a => a.url || a.name)
      .map((item, idx) => ({ ...item, sortOrder: item.sortOrder || (idx + 1) }))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    let finalThumbnail = currentPost.thumbnail || '';
    if (!finalThumbnail && finalAttachments.length > 0) {
      finalThumbnail = finalAttachments[0].url;
    }

    if (finalThumbnail.startsWith('blob:')) {
      const matchingAttachment = finalAttachments.find((a, idx) => {
        const file = pendingFiles[idx];
        return file && (currentPost.attachments?.[idx]?.url === currentPost.thumbnail);
      });
      if (matchingAttachment) {
        finalThumbnail = matchingAttachment.url;
      } else if (finalAttachments.length > 0) {
        finalThumbnail = finalAttachments[0].url;
      }
    }

    const data = {
      ...currentPost,
      category: mappedCategory,
      thumbnail: finalThumbnail,
      attachments: finalAttachments,
      updatedAt: serverTimestamp(),
      authorUid: auth.currentUser?.uid,
      boardType: collectionName
    };

    if (collectionName === 'projects') {
      const typeVal = currentPost.agencyType || currentPost.agency_type || '발주처';
      data.agencyType = typeVal;
      data.agency_type = typeVal;
    }

    if (collectionName === 'news') {
      const newsSubtitle = currentPost.affiliation || currentPost.subtitle || '';
      data.subtitle = newsSubtitle;
      data.affiliation = newsSubtitle;
    }

    try {
      if (currentPost.id) {
        const { id, ...updateData } = data as any;
        await updateDoc(doc(db, collectionName, id), updateData);
      } else {
        await addDoc(collection(db, collectionName), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
      setIsEditing(false);
      setCurrentPost(null);
      setPendingFiles({});
      
      let successMsg = '홈페이지에 성공적으로 적용되었습니다.';
      if (collectionName === 'research') {
        const catName = currentPost.category === 'phd' || currentPost.category === '박사 학위논문' ? '박사' : 
                        currentPost.category === 'master' || currentPost.category === '석사 학위논문' ? '석사' : '학술';
        successMsg = `해당 게시물이 '연구실적' 페이지의 [${catName}] 카테고리에 정상적으로 등록되었습니다.`;
      } else if (collectionName === 'news') {
        successMsg = `소식 게시물이 정식으로 등록되어 뉴스 피드에 반영되었습니다.`;
      }
      
      setSuccessMessage(successMsg);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteDoc(doc(db, collectionName, deleteId));
      setDeleteId(null);
    }
  };

  const getCategories = () => {
    if (collectionName === 'research') {
      if (currentPost?.researchType === 'journal') {
        return ['국외 학술논문', '국내 학술논문'];
      }
      return ['박사 학위논문', '석사 학위논문'];
    }
    if (collectionName === 'projects') return ['연구 프로젝트', '실무 프로젝트'];
    return newsConfig?.categories || ['Lab News', 'Announcement'];
  };

  const checkFileSize = (file: File, inputElement?: HTMLInputElement | null): boolean => {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert(`사진 용량이 너무 큽니다! (현재: ${sizeInMB}MB)\n최대 2MB 이하의 이미지만 업로드 가능합니다.`);
      if (inputElement) inputElement.value = '';
      return false;
    }
    return true;
  };
  
  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!checkFileSize(file, e.target)) return;

    const currentAttachments = [...(currentPost?.attachments || [])];
    const fakeUrl = URL.createObjectURL(file);
    
    currentAttachments[index] = { 
      name: file.name, 
      url: fakeUrl, 
      type: 'image',
      sortOrder: index + 1
    };

    if (index === currentAttachments.length - 1) {
      currentAttachments.push({ name: '', url: '', type: 'image', sortOrder: currentAttachments.length + 2 });
    }

    setPendingFiles(prev => ({ ...prev, [index]: file }));
    setCurrentPost({ ...currentPost, attachments: currentAttachments });
  };

  const handleRemoveAttachment = (index: number) => {
    let currentAttachments = currentPost?.attachments?.filter((_, i) => i !== index) || [];
    if (currentAttachments.length === 0) {
      currentAttachments = [{ name: '', url: '', type: 'image', sortOrder: 1 }];
    } else {
      const lastItem = currentAttachments[currentAttachments.length - 1];
      if (lastItem.url || lastItem.name) {
        currentAttachments.push({ name: '', url: '', type: 'image', sortOrder: currentAttachments.length + 1 });
      }
    }

    const newPending: { [key: number]: File } = {};
    Object.keys(pendingFiles).forEach(k => {
      const ki = parseInt(k);
      if (ki < index) {
        newPending[ki] = pendingFiles[ki];
      } else if (ki > index) {
        newPending[ki - 1] = pendingFiles[ki];
      }
    });
    setPendingFiles(newPending);
    setCurrentPost({ ...currentPost, attachments: currentAttachments });
  };

  const insertMarkdown = (syntax: string) => {
    const textarea = document.getElementById('content-textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = currentPost?.content || '';
    
    let wrapStart = '';
    let wrapEnd = '';

    if (syntax === 'bold') { wrapStart = '**'; wrapEnd = '**'; }
    else if (syntax === 'italic') { wrapStart = '*'; wrapEnd = '*'; }
    else if (syntax === 'header') { wrapStart = '\n### '; wrapEnd = ''; }
    else if (syntax === 'quote') { wrapStart = '\n> '; wrapEnd = ''; }
    else if (syntax === 'list') { wrapStart = '\n- '; wrapEnd = ''; }
    
    const selectedText = text.substring(start, end);
    const replacement = wrapStart + selectedText + wrapEnd;
    const newContent = text.substring(0, start) + replacement + text.substring(end);
    
    setCurrentPost({ ...currentPost, content: newContent });
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + wrapStart.length, start + wrapStart.length + selectedText.length);
    }, 0);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold tracking-tight">{title} 관리</h3>
        <button 
          onClick={() => {
            setCurrentPost({ 
              title: '', 
              year: collectionName === 'news' ? new Date().toISOString().split('T')[0] : '', 
              content: '', 
              category: getCategories()[0], 
              thumbnail: '',
              isPublished: true,
              showOnHome: true,
              sortOrder: 0,
              attachments: [{ name: '', url: '', type: 'image', sortOrder: 1 }]
            });
            setIsEditing(true);
            setPendingFiles({});
          }}
          className="px-6 py-2 bg-black text-white text-[10px] font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors cursor-pointer"
        >
          새 게시물 추가
        </button>
      </div>

      {/* ⭐️ 띄어쓰기 무시 스마트 검색창 추가 */}
      <div className="relative z-[40]">
        <div className="flex items-center border border-gray-200 focus-within:border-black transition-colors bg-white">
          <span className="pl-4 text-gray-400">🔍</span>
          <input 
            type="text"
            placeholder="게시물 제목 검색 (띄어쓰기 무관)"
            className="w-full p-4 outline-none text-sm font-sans"
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
              className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-xl mt-1 max-h-80 overflow-y-auto"
            >
              {(() => {
                const normalize = (str: string) => (str || '').replace(/\s+/g, '').toLowerCase();
                const queryStr = normalize(searchTerm);
                const matches = posts.filter(post => normalize(post.title).includes(queryStr) || normalize(post.titleEn as string).includes(queryStr));
                
                if (matches.length === 0) return <div className="p-4 text-xs text-gray-400 text-center tracking-widest">검색 결과가 없습니다.</div>;
                
                return matches.map(post => (
                  <div 
                    key={post.id}
                    onClick={() => {
                      const categoryMapping: { [key: string]: string } = {
                        'phd': '박사 학위논문', 'master': '석사 학위논문',
                        'intl': '국외 학술논문', 'domestic': '국내 학술논문',
                        'general': '연구 프로젝트', 'practical': '실무 프로젝트'
                      };
                      const rawCategory = post.category || '';
                      let resolvedCategory = categoryMapping[rawCategory] || rawCategory;
                      const determinedResearchType = (
                        rawCategory === 'intl' || rawCategory === 'domestic' || 
                        rawCategory === '국외 학술논문' || rawCategory === '국내 학술논문' ||
                        post.researchType === 'journal'
                      ) ? 'journal' : 'thesis';
                      if (!resolvedCategory || resolvedCategory === '') resolvedCategory = determinedResearchType === 'journal' ? '국외 학술논문' : '박사 학위논문';

                      setCurrentPost({
                        ...post,
                        researchType: post.researchType || determinedResearchType,
                        category: resolvedCategory,
                        attachments: post.attachments && post.attachments.length > 0 
                          ? [...post.attachments.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)), { name: '', url: '', type: 'image', sortOrder: post.attachments.length + 1 }] 
                          : [{ name: '', url: '', type: 'image', sortOrder: 1 }]
                      });
                      setIsEditing(true);
                      setPendingFiles({});
                      setSearchTerm('');
                    }}
                    className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex justify-between items-center group"
                  >
                     <div>
                       <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{post.title}</p>
                       <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">{post.category} | {post.year}</p>
                     </div>
                     <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">수정하기 📝</span>
                  </div>
                ));
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {collectionName === 'news' && (
        <div className="space-y-6">
          <div className="bg-gray-50 border border-gray-100 p-8 space-y-6">
            <div className="space-y-1">
              <h4 className="text-sm font-bold tracking-tight">소식 페이지 소개글 설정</h4>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">News Page Heading & Description</p>
            </div>
            <div className="space-y-4">
              <textarea
                className="w-full p-4 border border-gray-200 focus:border-black outline-none text-xs h-24 bg-white resize-none leading-relaxed font-sans text-gray-700"
                value={introText}
                onChange={(e) => setIntroText(e.target.value)}
                placeholder="News 페이지 좌측에 표시될 한 줄 소개 혹은 대외적 발자취 글귀를 입력하세요."
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSaveIntro}
                  disabled={savingIntro}
                  className="px-6 py-3 bg-black text-white text-[10px] font-bold tracking-widest uppercase hover:bg-gray-800 disabled:bg-gray-400 font-sans cursor-pointer transition-all shadow-md font-bold"
                >
                  {savingIntro ? '소개글 저장 중...' : '소개글 저장'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-100 p-8 space-y-6">
            <div className="space-y-1">
              <h4 className="text-sm font-bold tracking-tight">소식 카테고리(Categories) 관리</h4>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">News Category Manager</p>
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <div className="px-3 py-1.5 bg-gray-200/60 text-gray-400 font-bold text-[10px] uppercase tracking-widest border border-gray-200 select-none">
                  전체 (All)
                </div>
                {(newsConfig?.categories || ['Lab News', 'Announcement']).map((cat: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 bg-white border border-gray-200 pl-3 pr-1.5 py-1">
                    {editingIndex === index ? (
                      <input 
                        type="text" 
                        className="text-[10px] font-bold tracking-widest uppercase border-b border-black outline-none w-28 py-0.5"
                        value={editingText}
                        onChange={e => setEditingText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEditCat(index); }}
                        autoFocus
                      />
                    ) : (
                      <span className="text-[10px] font-bold tracking-widest uppercase text-gray-800">{cat}</span>
                    )}

                    <div className="flex items-center gap-1 select-none">
                      {editingIndex === index ? (
                        <button onClick={() => handleSaveEditCat(index)} className="text-[9px] font-bold text-green-600 hover:underline px-1 py-0.5 cursor-pointer">저장</button>
                      ) : (
                        <button onClick={() => { setEditingIndex(index); setEditingText(cat); }} className="text-[9px] font-bold text-gray-400 hover:text-black hover:underline px-1 py-0.5 cursor-pointer">수정</button>
                      )}
                      {cat.trim().toLowerCase() !== '전체' && cat.trim().toLowerCase() !== '전체 (all)' && cat.trim().toLowerCase() !== 'all' && (
                        <button onClick={() => handleDeleteCat(cat)} className="text-[9px] font-bold text-red-500 hover:scale-110 active:scale-95 px-1 py-0.5 cursor-pointer transition-transform" title="Delete">×</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 max-w-sm pt-2">
                <input 
                  type="text"
                  placeholder="새 카테고리명 입력"
                  className="flex-grow p-2 border border-gray-200 focus:border-black outline-none text-xs bg-white uppercase font-bold tracking-widest text-gray-700"
                  value={newCatText}
                  onChange={e => setNewCatText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddCat(); }}
                />
                <button onClick={handleAddCat} className="px-4 py-2 bg-black text-white text-[9px] font-bold tracking-widest uppercase hover:bg-gray-800 font-sans cursor-pointer">추가</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditing && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-0 z-[100] bg-white p-8 overflow-y-auto font-sans"
        >
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-center border-b border-gray-100 pb-6">
              <h2 className="text-2xl font-bold tracking-tight">{currentPost?.id ? '정보 수정' : '새 정보 등록'}</h2>
              <button onClick={() => { setIsEditing(false); setPendingFiles({}); }} className="text-xs font-bold tracking-widest uppercase hover:underline cursor-pointer">닫기</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-4 p-4 border border-gray-100">
                    <input 
                      type="checkbox" 
                      id="isPublished"
                      checked={currentPost?.isPublished ?? true}
                      onChange={e => setCurrentPost({...currentPost, isPublished: e.target.checked})}
                      className="w-4 h-4 accent-black"
                    />
                    <label htmlFor="isPublished" className="text-[10px] font-bold tracking-widest uppercase cursor-pointer">공개 여부 (Public)</label>
                  </div>
                </div>

                <div className="space-y-4">
                  {collectionName === 'research' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">연구 종류 선택</label>
                      <div className="flex gap-8 p-4 border border-gray-100">
                        {['thesis', 'journal'].map(type => (
                          <label key={type} className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="radio" 
                              name="researchType"
                              value={type}
                              checked={(currentPost?.researchType || 'thesis') === type}
                              onChange={e => {
                                const newType = e.target.value as 'thesis' | 'journal';
                                const defaultCats = newType === 'journal' ? ['국외 학술논문', '국내 학술논문'] : ['박사 학위논문', '석사 학위논문'];
                                setCurrentPost({...currentPost, researchType: newType, category: defaultCats[0]});
                              }}
                              className="w-4 h-4 accent-black"
                            />
                            <span className="text-xs font-bold tracking-tight uppercase group-hover:text-black transition-colors">
                              {type === 'thesis' ? '학위논문' : '학술논문'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">카테고리 선택 (세부)</label>
                    <div className="flex flex-wrap gap-6 p-4 border border-gray-100">
                      {getCategories().map(cat => (
                        <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="radio" 
                            name="category"
                            value={cat}
                            checked={currentPost?.category === cat}
                            onChange={e => setCurrentPost({...currentPost, category: e.target.value})}
                            className="w-4 h-4 accent-black"
                          />
                          <span className="text-xs font-bold tracking-tight group-hover:text-black transition-colors">{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">제목</label>
                  <input 
                    type="text" 
                    className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                    value={currentPost?.title || ''}
                    onChange={e => setCurrentPost({...currentPost, title: e.target.value})}
                    required
                  />
                </div>

                {(collectionName === 'projects' || collectionName === 'research') && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">영문 제목</label>
                    <input 
                      type="text" 
                      className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                      value={currentPost?.titleEn || ''}
                      onChange={e => setCurrentPost({...currentPost, titleEn: e.target.value})}
                    />
                  </div>
                )}

                {collectionName === 'research' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">외부 링크 (URL)</label>
                    <input 
                      type="url" 
                      className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                      value={currentPost?.url || ''}
                      onChange={e => setCurrentPost({...currentPost, url: e.target.value})}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {collectionName === 'research' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">저자명</label>
                      <input 
                        type="text" 
                        className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                        value={currentPost?.author || ''}
                        onChange={e => setCurrentPost({...currentPost, author: e.target.value})}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">년도/기간</label>
                    <input 
                      type="text" 
                      className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                      value={currentPost?.year || ''}
                      onChange={e => setCurrentPost({...currentPost, year: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">소속기관 / 소제목</label>
                  <input 
                    type="text" 
                    className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                    value={currentPost?.affiliation || currentPost?.subtitle || ''}
                    onChange={e => setCurrentPost({...currentPost, affiliation: e.target.value, subtitle: e.target.value})}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400 block">이미지 첨부</label>
                  <div className="space-y-3">
                    {currentPost?.attachments?.map((file, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex gap-4 items-center bg-gray-50 p-4 border border-gray-100 group transition-all">
                          <div className="flex-1 overflow-hidden">
                            {file.url ? (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                  <div className="w-12 h-12 bg-gray-200 overflow-hidden flex-shrink-0 border border-gray-300">
                                    <img src={file.url} className="w-full h-full object-cover" alt="Preview" />
                                  </div>
                                  <span className="text-xs font-medium text-gray-600 truncate">{file.name}</span>
                                </div>
                                <button type="button" onClick={() => handleRemoveAttachment(idx)} className="text-red-500 text-[9px] font-bold uppercase tracking-widest hover:underline px-2 cursor-pointer">Remove</button>
                              </div>
                            ) : (
                              <div className="relative">
                                <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => handleFileChange(idx, e)} />
                                <div className="p-3 border border-dashed border-gray-300 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 cursor-pointer">이미지 추가 +</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">본문 내용</label>
                  <textarea 
                    id="content-textarea"
                    className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm h-64 font-sans leading-relaxed"
                    value={currentPost?.content || ''}
                    onChange={e => setCurrentPost({...currentPost, content: e.target.value})}
                  />
                </div>

                <button type="submit" disabled={saving} className="w-full py-4 bg-black text-white text-[10px] font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors disabled:bg-gray-400 cursor-pointer">
                  {saving ? '저장 중...' : (currentPost?.id ? '수정 완료' : '등록 완료')}
                </button>
              </form>

              <div className="space-y-8 lg:sticky lg:top-0">
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Live Preview</h3>
                  <div className="border border-gray-100 p-8 bg-white shadow-xs">
                    <h4 className="text-lg font-bold tracking-tight text-gray-950">{currentPost?.title || '국문 제목'}</h4>
                    <p className="text-xs text-gray-500 font-normal">{currentPost?.titleEn || ''}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ⭐️ 페이지네이션이 적용된 게시물 리스트 렌더링 */}
      {(() => {
        const totalPages = Math.ceil(posts.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const currentPosts = posts.slice(startIndex, startIndex + itemsPerPage);

        return (
          <>
            <div className="grid gap-4">
              {loading ? (
                <div className="text-center py-24 text-gray-300 text-[10px] font-bold uppercase tracking-widest">Loading Items...</div>
              ) : posts.length === 0 ? (
                <div className="text-center py-24 border border-dashed border-gray-200 text-gray-300 text-[10px] font-bold uppercase tracking-widest">No Posts Found</div>
              ) : (
                currentPosts.map(post => (
                  <div key={post.id} className="flex items-center justify-between p-6 border border-gray-100 bg-white hover:border-black transition-all group">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-100">
                        {post.thumbnail && <img src={post.thumbnail} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-opacity duration-500" alt="" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-bold uppercase tracking-tighter bg-gray-100 px-1 py-0.5">{post.category}</span>
                          <h4 className="text-sm font-bold tracking-tight">{post.title}</h4>
                        </div>
                        {post.titleEn && <p className="text-xs text-gray-500 font-normal">{post.titleEn}</p>}
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">[{post.year}] {post.affiliation}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => {
                          const categoryMapping: { [key: string]: string } = {
                            'phd': '박사 학위논문', 'master': '석사 학위논문',
                            'intl': '국외 학술논문', 'domestic': '국내 학술논문',
                            'general': '연구 프로젝트', 'practical': '실무 프로젝트'
                          };
                          const rawCategory = post.category || '';
                          let resolvedCategory = categoryMapping[rawCategory] || rawCategory;
                          const determinedResearchType = (
                            rawCategory === 'intl' || rawCategory === 'domestic' || 
                            rawCategory === '국외 학술논문' || rawCategory === '국내 학술논문' ||
                            post.researchType === 'journal'
                          ) ? 'journal' : 'thesis';
                          if (!resolvedCategory || resolvedCategory === '') resolvedCategory = determinedResearchType === 'journal' ? '국외 학술논문' : '박사 학위논문';

                          setCurrentPost({
                            ...post,
                            researchType: post.researchType || determinedResearchType,
                            category: resolvedCategory,
                            attachments: post.attachments && post.attachments.length > 0 
                              ? [...post.attachments.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)), { name: '', url: '', type: 'image', sortOrder: post.attachments.length + 1 }] 
                              : [{ name: '', url: '', type: 'image', sortOrder: 1 }]
                          });
                          setIsEditing(true);
                          setPendingFiles({});
                        }}
                        className="text-[10px] font-bold uppercase tracking-[0.2em] hover:text-gray-400 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button onClick={() => setDeleteId(post.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 하단 페이지네이션 버튼 */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-8">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-200 text-xs text-gray-400 hover:text-black hover:border-black disabled:opacity-30 transition-all cursor-pointer"
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 flex items-center justify-center text-[10px] font-bold border transition-all cursor-pointer ${
                      currentPage === i + 1 
                        ? 'border-black bg-black text-white' 
                        : 'border-transparent text-gray-400 hover:text-black hover:border-gray-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-200 text-xs text-gray-400 hover:text-black hover:border-black disabled:opacity-30 transition-all cursor-pointer"
                >
                  &gt;
                </button>
              </div>
            )}
          </>
        );
      })()}

      {showSuccess && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[300] bg-black text-white px-8 py-4 text-[10px] font-bold tracking-widest uppercase shadow-2xl">
          {successMessage}
        </motion.div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white p-12 max-w-sm w-full text-center space-y-6">
            <h3 className="text-xl font-bold tracking-tight">게시물 삭제</h3>
            <p className="text-xs text-gray-500 leading-relaxed">정말로 삭제하시겠습니까?<br/>삭제된 데이터는 복구할 수 없습니다.</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3 border border-gray-100 text-[10px] font-bold uppercase tracking-widest cursor-pointer">No</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest cursor-pointer">Yes</button>
            </div>
          </motion.div>
        </div>
      )}

      {confirmDeleteCat && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white p-12 max-w-md w-full text-center space-y-6">
            <h3 className="text-xl font-bold tracking-tight">카테고리 삭제</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              정말 삭제하시겠습니까?<br/>
              해당 카테고리에 포함된 게시물은 '전체(ALL)'로 자동 이동됩니다.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDeleteCat(null)} className="flex-1 py-3 border border-gray-100 text-[10px] font-bold uppercase tracking-widest cursor-pointer">취소</button>
              <button onClick={() => executeDeleteCat(confirmDeleteCat)} className="flex-1 py-3 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest cursor-pointer">삭제하기</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
