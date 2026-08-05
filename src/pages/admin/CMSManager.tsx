import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, storage } from '../../lib/firebase';
import { uploadImageWithFallback } from '../../lib/uploadHelper';
import { motion } from 'motion/react';

interface Post {
  id: string;
  title: string;
  titleEn?: string;
  author?: string;
  affiliation?: string;
  agency?: string;
  agencyType?: string;
  agency_type?: string;
  subtitle?: string; // Explicit subtitle for news summary
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

  // News configuration states (intro description and categories)
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
      // 1. Find all news items targeting this category and migrate them to '전체'
      const postsToMigrate = posts.filter(post => post.category === catToDelete);
      
      const migratePromises = postsToMigrate.map(post => 
        updateDoc(doc(db, collectionName, post.id), { category: '전체' })
      );
      await Promise.all(migratePromises);

      // 2. Delete the category from boardConfig
      await setDoc(doc(db, 'boardConfigs', 'news'), {
        ...newsConfig,
        categories: updatedCats
      }, { merge: true });

      setConfirmDeleteCat(null);

      // Show success toast
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

  // Load primary collection posts
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

    // First process and upload any pending files (blob URLs)
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
              return {
                ...item,
                url: result.url
              };
            } else {
              throw new Error(result.error);
            }
          }
          return {
            ...item,
            url: result.url
          };
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

    // Process and sort attachments
    const finalAttachments = processedAttachments
      .filter(a => a.url || a.name)
      .map((item, idx) => ({ ...item, sortOrder: item.sortOrder || (idx + 1) }))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    // Default thumbnail logic
    let finalThumbnail = currentPost.thumbnail || '';
    if (!finalThumbnail && finalAttachments.length > 0) {
      finalThumbnail = finalAttachments[0].url;
    }

    // If thumbnail was a blob URL, we should update it to the uploaded URL if possible
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

    // Agency type default mapping for projects
    if (collectionName === 'projects') {
      const typeVal = currentPost.agencyType || currentPost.agency_type || '발주처';
      data.agencyType = typeVal;
      data.agency_type = typeVal;
    }

    // Subtitle backward compatibility mapping
    if (collectionName === 'news') {
      const newsSubtitle = currentPost.affiliation || currentPost.subtitle || '';
      data.subtitle = newsSubtitle;
      data.affiliation = newsSubtitle; // both properties synchronized
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
    // For news, dynamically map from database configuration
    return newsConfig?.categories || ['Lab News', 'Announcement'];
  };

  const checkFileSize = (file: File, inputElement?: HTMLInputElement | null): boolean => {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    if (file.size > 20 * 1024 * 1024) {
      alert(`첨부 가능한 파일의 최대 크기는 20MB입니다. 현재 파일은 ${sizeInMB}MB로, 서버 무한 로딩을 방지하기 위해 업로드가 제한됩니다. 이미지 크기를 줄이거나 압축 후 다시 시도해 주세요.`);
      if (inputElement) {
        inputElement.value = '';
      }
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      const proceed = window.confirm(`첨부하신 파일의 용량이 커서 (${sizeInMB}MB) 업로드 완료까지 1분 이상 소요될 수 있습니다. 진행하시겠습니까?`);
      if (!proceed) {
        if (inputElement) {
          inputElement.value = '';
        }
        return false;
      }
    }
    return true;
  };

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!checkFileSize(file, e.target)) {
      return;
    }

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

    // Shift indexes in pendingFiles
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

  // Helper formatting for Textarea inserting markdown tags
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

      {collectionName === 'news' && (
        <div className="space-y-6">
          {/* 1. News Page Description Banner Config */}
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

          {/* 2. Dynamic Categories Controller */}
          <div className="bg-gray-50 border border-gray-100 p-8 space-y-6">
            <div className="space-y-1">
              <h4 className="text-sm font-bold tracking-tight">소식 카테고리(Categories) 관리</h4>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">News Category Manager (전체(All) 카테고리는 고정 상태입니다)</p>
            </div>
            <div className="space-y-4">
              {/* Active display of loaded categories */}
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
                        <button 
                          onClick={() => handleSaveEditCat(index)} 
                          className="text-[9px] font-bold text-green-600 hover:underline px-1 py-0.5 cursor-pointer"
                        >
                          저장
                        </button>
                      ) : (
                        <button 
                          onClick={() => { setEditingIndex(index); setEditingText(cat); }} 
                          className="text-[9px] font-bold text-gray-400 hover:text-black hover:underline px-1 py-0.5 cursor-pointer"
                        >
                          수정
                        </button>
                      )}
                      
                      {cat.trim().toLowerCase() !== '전체' && 
                       cat.trim().toLowerCase() !== '전체 (all)' && 
                       cat.trim().toLowerCase() !== 'all' && (
                        <button 
                          onClick={() => handleDeleteCat(cat)} 
                          className="text-[9px] font-bold text-red-500 hover:scale-110 active:scale-95 px-1 py-0.5 cursor-pointer transition-transform"
                          title="Delete"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add category text element */}
              <div className="flex gap-2 max-w-sm pt-2">
                <input 
                  type="text"
                  placeholder="새 카테고리명 입력 (예: SEMINAR)"
                  className="flex-grow p-2 border border-gray-200 focus:border-black outline-none text-xs bg-white uppercase font-bold tracking-widest text-gray-700"
                  value={newCatText}
                  onChange={e => setNewCatText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddCat(); }}
                />
                <button
                  onClick={handleAddCat}
                  className="px-4 py-2 bg-black text-white text-[9px] font-bold tracking-widest uppercase hover:bg-gray-800 font-sans cursor-pointer"
                >
                  추가
                </button>
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
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
                    {collectionName === 'projects' ? '한글 제목 (Korean Title)' : collectionName === 'news' ? '대제목 (Main Title)' : '국문 연구제목 (필수)'}
                  </label>
                  <input 
                    type="text" 
                    className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                    value={currentPost?.title || ''}
                    onChange={e => setCurrentPost({...currentPost, title: e.target.value})}
                    placeholder={collectionName === 'news' ? "예: 2026학년도 신공간 창출 도시건축 설계 제안 공모안" : "예: 도시 건축의 지속가능성 연구"}
                    required
                  />
                </div>

                {(collectionName === 'projects' || collectionName === 'research') && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
                      {collectionName === 'projects' ? '영문 제목 (English Title)' : '영문 연구제목 (선택)'}
                    </label>
                    <input 
                      type="text" 
                      className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                      value={currentPost?.titleEn || ''}
                      onChange={e => setCurrentPost({...currentPost, titleEn: e.target.value})}
                      placeholder={collectionName === 'projects' ? "Example: Sustainable Urban Architecture" : "Example: Sustainable Urban Architecture Study"}
                    />
                  </div>
                )}

                {collectionName === 'research' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
                      외부 링크 (URL)
                    </label>
                    <input 
                      type="url" 
                      className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                      value={currentPost?.url || ''}
                      onChange={e => setCurrentPost({...currentPost, url: e.target.value})}
                      placeholder="https://example.com/paper"
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
                    <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
                      {collectionName === 'projects' ? '연구 기간' : collectionName === 'news' ? '게시일 (Date)' : '게재년도 (Year)'}
                    </label>
                    {collectionName === 'news' ? (
                      <input 
                        type="date" 
                        className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                        value={currentPost?.year || new Date().toISOString().split('T')[0]}
                        onChange={e => setCurrentPost({...currentPost, year: e.target.value})}
                        required
                      />
                    ) : (
                      <input 
                        type="text" 
                        className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                        value={currentPost?.year || ''}
                        onChange={e => setCurrentPost({...currentPost, year: e.target.value})}
                        placeholder={collectionName === 'projects' ? "예: 2021년 07월 ~ 2021년 11월" : "예: 2021"}
                        required
                      />
                    )}
                  </div>
                </div>

                {collectionName === 'projects' ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400 block">
                      기관 구분 및 기관명
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select 
                        className="p-4 border border-gray-100 focus:border-black outline-none text-sm bg-white font-medium sm:w-52 cursor-pointer"
                        value={currentPost?.agencyType || currentPost?.agency_type || '발주처'}
                        onChange={e => setCurrentPost({
                          ...currentPost, 
                          agencyType: e.target.value,
                          agency_type: e.target.value
                        })}
                      >
                        <option value="발주처">발주처</option>
                        <option value="연구 지원 기관">연구 지원 기관</option>
                      </select>
                      <input 
                        type="text" 
                        className="flex-1 p-4 border border-gray-100 focus:border-black outline-none text-sm"
                        value={currentPost?.affiliation || currentPost?.agency || ''}
                        onChange={e => setCurrentPost({
                          ...currentPost, 
                          agencyType: currentPost?.agencyType || currentPost?.agency_type || '발주처',
                          agency_type: currentPost?.agencyType || currentPost?.agency_type || '발주처',
                          affiliation: e.target.value, 
                          agency: e.target.value 
                        })}
                        placeholder={
                          (currentPost?.agencyType || currentPost?.agency_type) === '연구 지원 기관'
                            ? "예: 한국연구재단, 국토교통부"
                            : "예: LH 토지주택연구원, 서울특별시"
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
                     {collectionName === 'news' ? '소제목/요약글 (Subtitle)' : '소속기관 (Affiliation)'}
                    </label>
                    <input 
                      type="text" 
                      className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                      value={currentPost?.affiliation || currentPost?.subtitle || ''}
                      onChange={e => setCurrentPost({...currentPost, affiliation: e.target.value, subtitle: e.target.value})}
                      placeholder={collectionName === 'news' ? "예: 도시건축연구실과 새로운 미션을 수행할 신입 연구원을 모집합니다." : "예: 경북대학교 대학원"}
                    />
                  </div>
                )}

                {collectionName === 'projects' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
                        총괄 책임자
                      </label>
                      <input 
                        type="text" 
                        className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                        value={currentPost?.principalInvestigator || ''}
                        onChange={e => setCurrentPost({...currentPost, principalInvestigator: e.target.value})}
                        placeholder="예: 홍길동 교수"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
                        부책임자
                      </label>
                      <input 
                        type="text" 
                        className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                        value={currentPost?.coInvestigator || ''}
                        onChange={e => setCurrentPost({...currentPost, coInvestigator: e.target.value})}
                        placeholder="예: 김철수 연구원"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
                        참여 연구진
                      </label>
                      <textarea 
                        className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm h-28 font-sans leading-relaxed"
                        value={currentPost?.researchers || ''}
                        onChange={e => setCurrentPost({...currentPost, researchers: e.target.value})}
                        placeholder="예: 이영희, 박민수, 정수진 (쉼표나 줄바꿈으로 입력 가능)"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
                        대상지 (Site)
                      </label>
                      <input 
                        type="text" 
                        className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                        value={currentPost?.location || currentPost?.site || ''}
                        onChange={e => setCurrentPost({...currentPost, location: e.target.value, site: e.target.value})}
                        placeholder="예: 서울특별시 종로구 OO동"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
                        면적 (Area)
                      </label>
                      <div className="flex items-center border border-gray-100 focus-within:border-black bg-white transition-colors">
                        <input 
                          type="text" 
                          className="flex-1 p-4 outline-none text-sm bg-transparent"
                          value={currentPost?.area ?? ''}
                          onChange={e => setCurrentPost({...currentPost, area: e.target.value})}
                          placeholder="예: 1500"
                        />
                        <div className="px-4 py-4 bg-gray-50 text-gray-500 font-bold text-sm border-l border-gray-100 select-none">
                          ㎡
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400 block">썸네일 및 첨부 이미지 (Thumbnail & Attachments)</label>
                    <p className="text-[9px] text-gray-400 font-medium">※ 리스트 좌측에 노출될 대표 이미지를 첨부 및 지정하세요 (권장 비율: 16:10).</p>
                    <p className="text-[9px] text-[#A3A3A3] font-medium leading-normal pt-1">
                      * 최대 20MB 이하의 이미지 파일(PNG, JPG)만 첨부 가능합니다. (Max file size: 20MB)
                    </p>
                  </div>
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
                                  <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                                    <span className="text-xs font-medium text-gray-600 truncate">{file.name}</span>
                                    <div className="flex items-center gap-6">
                                      {(collectionName === 'projects' || collectionName === 'news') && (
                                        <label className="flex items-center gap-2 cursor-pointer group/thumb">
                                          <input 
                                            type="radio" 
                                            name="thumbnail-selection"
                                            checked={currentPost?.thumbnail === file.url}
                                            onChange={() => setCurrentPost({...currentPost, thumbnail: file.url})}
                                            className="w-3 h-3 accent-black"
                                          />
                                          <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 group-hover/thumb:text-black transition-colors">대표 이미지 지정</span>
                                        </label>
                                      )}
                                      <div className="flex items-center gap-2">
                                        <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400">순서</span>
                                        <input 
                                          type="number"
                                          min="1"
                                          className="w-12 p-1 border border-gray-200 text-xs focus:border-black outline-none bg-white"
                                          value={file.sortOrder || ''}
                                          onChange={(e) => {
                                            const newOrder = parseInt(e.target.value) || 0;
                                            const updated = [...(currentPost?.attachments || [])];
                                            updated[idx] = { ...updated[idx], sortOrder: newOrder };
                                            setCurrentPost({ ...currentPost, attachments: updated });
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => handleRemoveAttachment(idx)}
                                  className="text-red-500 text-[9px] font-bold uppercase tracking-widest hover:underline px-2 cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <div className="relative">
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                  onChange={(e) => handleFileChange(idx, e)}
                                />
                                <div className="p-3 border border-dashed border-gray-300 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:border-black group-hover:text-black transition-all cursor-pointer">
                                  이미지 추가 +
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
                    {collectionName === 'news' ? '본문 내용 (Content)' : '연구 내용 (Description)'}
                  </label>

                  {/* WYSIWYG helper styling for News */}
                  {collectionName === 'news' && (
                    <div className="flex gap-1.5 pb-2 border-b border-gray-100 mb-2">
                      <button 
                        type="button"
                        onClick={() => insertMarkdown('bold')}
                        className="p-1 px-2.5 text-[10px] font-bold bg-gray-50 border border-gray-100 hover:bg-black hover:text-white transition-all rounded shadow-xs cursor-pointer"
                        title="굵게 / Bold"
                      >
                        B
                      </button>
                      <button 
                        type="button"
                        onClick={() => insertMarkdown('italic')}
                        className="p-1 px-2.5 text-[10px] italic bg-gray-50 border border-gray-100 hover:bg-black hover:text-white transition-all rounded shadow-xs cursor-pointer"
                        title="기울임 / Italic"
                      >
                        I
                      </button>
                      <button 
                        type="button"
                        onClick={() => insertMarkdown('header')}
                        className="p-1 px-2.5 text-[10px] font-bold bg-gray-50 border border-gray-100 hover:bg-black hover:text-white transition-all rounded shadow-xs cursor-pointer"
                        title="대제목 / Heading"
                      >
                        H
                      </button>
                      <button 
                        type="button"
                        onClick={() => insertMarkdown('quote')}
                        className="p-1 px-2.5 text-[10px] font-mono bg-gray-50 border border-gray-100 hover:bg-black hover:text-white transition-all rounded shadow-xs cursor-pointer"
                        title="인용구 / Quote"
                      >
                        ”
                      </button>
                      <button 
                        type="button"
                        onClick={() => insertMarkdown('list')}
                        className="p-1 px-2.5 text-[10px] bg-gray-50 border border-gray-100 hover:bg-black hover:text-white transition-all rounded shadow-xs cursor-pointer"
                        title="목록 / Bullet List"
                      >
                        • List
                      </button>
                      <span className="text-[9px] text-gray-400 self-center ml-auto font-medium font-sans">
                        Markdown Toolbar
                      </span>
                    </div>
                  )}

                  <textarea 
                    id="content-textarea"
                    className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm h-64 font-sans leading-relaxed"
                    value={currentPost?.content || ''}
                    onChange={e => setCurrentPost({...currentPost, content: e.target.value})}
                    placeholder={collectionName === 'news' ? "상세 소식 내용을 다양한 양식(Markdown)으로 정성껏 입력하세요." : "연구 목적, 방법, 상세 내용을 기재하세요."}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={saving}
                  className="w-full py-4 bg-black text-white text-[10px] font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors disabled:bg-gray-400 cursor-pointer"
                >
                  {saving ? '저장 중...' : (currentPost?.id ? '수정 완료' : '등록 완료')}
                </button>
              </form>

              {/* Preview Area */}
              <div className="space-y-8 lg:sticky lg:top-0">
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Live Preview</h3>
                  <div className="border border-gray-100 p-8 bg-white shadow-xs">
                    {collectionName === 'projects' ? (
                       <div className="space-y-6">
                         <div className="aspect-[4/3] bg-gray-50 overflow-hidden relative">
                           {currentPost?.thumbnail ? (
                             <img src={currentPost.thumbnail} className="w-full h-full object-cover grayscale" alt="" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-300 uppercase tracking-widest">Preview</div>
                           )}
                         </div>
                         <div className="space-y-2">
                           <h4 className="text-xl font-bold tracking-tight">{currentPost?.title || '한글 제목'}</h4>
                           <p className="text-sm text-gray-400">{currentPost?.titleEn || 'English Title'}</p>
                           <div className="pt-4 border-t border-gray-100 space-y-2">
                             {(currentPost?.affiliation || currentPost?.agency) ? (
                               <div className="flex justify-between text-[10px]">
                                 <span className="font-bold text-gray-300">{currentPost?.agencyType || currentPost?.agency_type || '발주처'}</span>
                                 <span>{currentPost?.affiliation || currentPost?.agency}</span>
                               </div>
                             ) : null}
                             {currentPost?.principalInvestigator && (
                               <div className="flex justify-between text-[10px]">
                                 <span className="font-bold text-gray-300">총괄 책임자</span>
                                 <span>{currentPost.principalInvestigator}</span>
                               </div>
                             )}
                             {currentPost?.coInvestigator && (
                               <div className="flex justify-between text-[10px]">
                                 <span className="font-bold text-gray-300">부책임자</span>
                                 <span>{currentPost.coInvestigator}</span>
                               </div>
                             )}
                             {currentPost?.researchers && (
                               <div className="flex justify-between text-[10px]">
                                 <span className="font-bold text-gray-300">참여 연구진</span>
                                 <span className="truncate max-w-[150px]">{currentPost.researchers}</span>
                               </div>
                             )}
                             {(currentPost?.location || currentPost?.site) && (
                               <div className="flex justify-between text-[10px]">
                                 <span className="font-bold text-gray-300">대상지</span>
                                 <span className="truncate max-w-[150px]">{currentPost.location || currentPost.site}</span>
                               </div>
                             )}
                             {currentPost?.area && (
                               <div className="flex justify-between text-[10px]">
                                 <span className="font-bold text-gray-300">면적</span>
                                 <span>{formatArea(currentPost.area)}</span>
                               </div>
                             )}
                             <div className="flex justify-between text-[10px]">
                               <span className="font-bold text-gray-300">기간</span>
                               <span>{currentPost?.year || '-'}</span>
                             </div>
                           </div>
                         </div>
                       </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-black text-white px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
                          {currentPost?.category || 'Category'}
                        </div>
                        <div className="space-y-1.5">
                          <h4 className="text-lg font-bold tracking-tight text-gray-950">{currentPost?.title || '국문 연구제목'}</h4>
                          {currentPost?.titleEn && (
                            <p className="text-xs text-gray-500 font-normal">{currentPost.titleEn}</p>
                          )}
                          {currentPost?.affiliation && <p className="text-xs text-gray-500 font-medium">{currentPost.affiliation}</p>}
                          <p className="text-[9px] text-gray-400 tracking-wider font-mono">{currentPost?.year || 'Date'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-24 text-gray-300 text-[10px] font-bold uppercase tracking-widest">Loading Items...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-gray-200 text-gray-300 text-[10px] font-bold uppercase tracking-widest">No Posts Found</div>
        ) : (
          posts.map(post => (
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
                  {post.titleEn && (
                    <p className="text-xs text-gray-500 font-normal">{post.titleEn}</p>
                  )}
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">[{post.year}] {post.affiliation}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    const categoryMapping: { [key: string]: string } = {
                      'phd': '박사 학위논문',
                      'master': '석사 학위논문',
                      'intl': '국외 학술논문',
                      'domestic': '국내 학술논문',
                      'general': '연구 프로젝트',
                      'practical': '실무 프로젝트'
                    };
                    
                    const rawCategory = post.category || '';
                    let resolvedCategory = categoryMapping[rawCategory] || rawCategory;
                    
                    // Determine researchType dynamically if missing from Firestore
                    const determinedResearchType = (
                      rawCategory === 'intl' || 
                      rawCategory === 'domestic' || 
                      rawCategory === '국외 학술논문' || 
                      rawCategory === '국내 학술논문' ||
                      post.researchType === 'journal'
                    ) ? 'journal' : 'thesis';

                    // Align category with researchType to avoid empty matches
                    if (!resolvedCategory || resolvedCategory === '') {
                      resolvedCategory = determinedResearchType === 'journal' ? '국외 학술논문' : '박사 학위논문';
                    }

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
                <button 
                  onClick={() => setDeleteId(post.id)}
                  className="p-2 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

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
              해당 카테고리에 포함된 게시물은 '전체(ALL)'(또는 '미분류')로 자동 이동됩니다.
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
