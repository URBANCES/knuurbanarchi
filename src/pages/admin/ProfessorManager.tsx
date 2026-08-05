import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { uploadImageWithFallback } from '../../lib/uploadHelper';
import { db, storage } from '../../lib/firebase';
import { motion } from 'motion/react';

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
  introduction: string;
  specs: Spec[];
  sections: Section[];
}

export default function ProfessorManager() {
  const [data, setData] = useState<ProfessorData>({
    name: '',
    image: '',
    introduction: '',
    specs: [
      { label: '학력', content: '' },
      { label: '경력', content: '' },
      { label: '수상경력 및 자격증', content: '' },
    ],
    sections: [
      { title: '주요 논문', items: [] },
      { title: '도시재생 관련 활동이력', items: [] },
    ]
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'about', 'professor'), (snapshot) => {
      if (snapshot.exists()) {
        setData(snapshot.data() as ProfessorData);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'about', 'professor'), {
        ...data,
        updatedAt: serverTimestamp()
      });
      alert('교수님 소개 정보가 성공적으로 저장되었습니다.');
    } catch (err) {
      console.error(err);
      alert('저장 중 오류가 발생했습니다.');
    }
    setSaving(false);
  };

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
      const storagePath = `about/professor_${Date.now()}`;
      const result = await uploadImageWithFallback(file, storagePath, setSaving);
      
      if (result.error) {
        if (result.isBase64Fallback) {
          setData({ ...data, image: result.url });
          alert(`${result.error}\n\n* 안정성 확보를 위해 프로필 이미지를 로컬 Base64 데이터 형식으로 인코딩하여 임시 저장 완료하였습니다. [저장하기]를 클릭하시면 최종 저장됩니다.`);
        } else {
          alert(`프로필 사진 업로드 제한: ${result.error}`);
          const input = document.getElementById('profile-file-input') as HTMLInputElement | null;
          if (input) input.value = '';
        }
      } else {
        setData({ ...data, image: result.url });
        alert('프로필 사진이 성공적으로 임시 업로드되었습니다.');
      }
    }
  };

  const updateSpec = (index: number, field: 'label' | 'content', value: string) => {
    const newSpecs = [...data.specs];
    newSpecs[index] = { ...newSpecs[index], [field]: value };
    setData({ ...data, specs: newSpecs });
  };

  const addSection = () => {
    setData({
      ...data,
      sections: [...data.sections, { title: '새 섹션', items: [] }]
    });
  };

  const removeSection = (index: number) => {
    if (confirm('이 섹션을 삭제하시겠습니까?')) {
      const newSections = [...data.sections];
      newSections.splice(index, 1);
      setData({ ...data, sections: newSections });
    }
  };

  const updateSectionTitle = (index: number, title: string) => {
    const newSections = [...data.sections];
    newSections[index].title = title;
    setData({ ...data, sections: newSections });
  };

  const updateSectionItems = (index: number, text: string) => {
    const newSections = [...data.sections];
    // Split by new line and filter empty lines
    newSections[index].items = text.split('\n').map(item => item.trim()).filter(item => item.length > 0);
    setData({ ...data, sections: newSections });
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-12 pb-24">
      <div className="flex justify-between items-center border-b border-gray-100 pb-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">교수님 소개 관리</h2>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Manage Professor Profile</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-black text-white text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-gray-800 transition-colors disabled:bg-gray-400"
        >
          {saving ? '저장 중...' : '변경사항 저장'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Left: General Info & Specs */}
        <div className="space-y-10">
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-400">01 / 프로필 기본 정보</h3>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">성함 (Name)</label>
              <input 
                type="text" 
                className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                value={data.name}
                onChange={e => setData({...data, name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">프로필 사진 (Profile Photo)</label>
              <div className="relative group">
                <input 
                  id="profile-file-input"
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="p-10 border-2 border-dashed border-gray-100 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 group-hover:border-black group-hover:text-black transition-all">
                  {data.image ? '사진 변경하기' : '사진 업로드 +'}
                </div>
              </div>
              <p className="text-[11px] text-[#A3A3A3] font-medium leading-normal">
                * 최대 20MB 이하의 이미지 파일(PNG, JPG)만 첨부 가능합니다. (Max file size: 20MB)
              </p>
              {data.image && (
                <div className="mt-4 aspect-[3/4] w-32 border border-gray-100 overflow-hidden">
                  <img src={data.image} className="w-full h-full object-cover grayscale" alt="Preview" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 pt-10 border-t border-gray-50">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-400">02 / 주요 스펙 (좌측 하단 배치)</h3>
            <div className="space-y-8">
              {data.specs.map((spec, idx) => (
                <div key={idx} className="p-6 border border-gray-50 space-y-4 bg-gray-50/30">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">스펙 제목 (BOLD)</label>
                    <input 
                      type="text" 
                      className="w-full p-3 border border-gray-100 focus:border-black outline-none text-xs font-bold"
                      value={spec.label}
                      onChange={e => updateSpec(idx, 'label', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">세부 내용 (MULTILINE)</label>
                    <textarea 
                      className="w-full p-3 border border-gray-100 focus:border-black outline-none text-xs h-32 leading-relaxed"
                      value={spec.content}
                      onChange={e => updateSpec(idx, 'content', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Detailed Records */}
        <div className="space-y-10">
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-400">03 / 상세 이력 및 소개</h3>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">대표 인사말 (Introduction)</label>
              <textarea 
                className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm h-48 leading-relaxed font-sans"
                value={data.introduction}
                onChange={e => setData({...data, introduction: e.target.value})}
                placeholder="교수님의 대표적인 인사말이나 철학을 입력하세요."
              />
            </div>

            <div className="space-y-8 pt-10 border-t border-gray-50">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-bold tracking-widest uppercase text-gray-400">상세 섹션 (논문, 프로젝트 등)</h4>
                <button 
                  onClick={addSection}
                  className="text-[10px] font-bold text-black border-b border-black hover:opacity-50 transition-opacity"
                >
                  + 섹션 추가
                </button>
              </div>

              {data.sections.map((section, idx) => (
                <div key={idx} className="p-6 border border-gray-100 space-y-4 relative group">
                  <button 
                    onClick={() => removeSection(idx)}
                    className="absolute top-4 right-4 text-[10px] font-bold text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                  >
                    REMOVE
                  </button>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">섹션 제목 (Header Bold)</label>
                    <input 
                      type="text" 
                      className="w-full p-3 border border-gray-100 focus:border-black outline-none text-xs font-bold"
                      value={section.title}
                      onChange={e => updateSectionTitle(idx, e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">이력 목록 (한 줄에 하나씩 입력)</label>
                    <p className="text-[9px] text-blue-500 mb-2">Tip: "2024 | 연구 제목" 형식으로 입력하면 연도가 정렬되어 보입니다.</p>
                    <textarea 
                      className="w-full p-4 border border-gray-100 focus:border-black outline-none text-xs h-64 leading-relaxed font-sans"
                      value={section.items.join('\n')}
                      onChange={e => updateSectionItems(idx, e.target.value)}
                      placeholder="이력 내용을 줄바꿈으로 구분하여 입력하세요."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="pt-12 border-t border-gray-100">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full py-5 bg-black text-white text-[11px] font-bold tracking-[0.4em] uppercase hover:bg-gray-800 transition-colors disabled:bg-gray-400"
        >
          {saving ? '저장 중...' : '데이터 최종 동기화 및 저장'}
        </button>
      </div>
    </div>
  );
}
