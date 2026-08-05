import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadImageWithFallback } from '../../lib/uploadHelper';
import ProfessorManager from './ProfessorManager';

export default function AboutManager() {
  const [activeTab, setActiveTab] = useState<'info' | 'professor'>('info');

  // Lab Info State
  const [labInfo, setLabInfo] = useState({
    highlightLine: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    refLinkText: '',
    refLinkUrl: '',
    bannerImageUrl: '',
    bodyImageUrl: ''
  });
  const [savingInfo, setSavingInfo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingBody, setUploadingBody] = useState(false);

  useEffect(() => {
    const unsubInfo = onSnapshot(doc(db, 'settings', 'lab'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setLabInfo({
          highlightLine: data.highlightLine || '',
          description: data.description || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          refLinkText: data.refLinkText || '',
          refLinkUrl: data.refLinkUrl || '',
          bannerImageUrl: data.bannerImageUrl || '',
          bodyImageUrl: data.bodyImageUrl || ''
        });
      }
    });

    return () => {
      unsubInfo();
    };
  }, []);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'bannerImageUrl' | 'bodyImageUrl',
    onProgressState: (uploading: boolean) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const storagePath = `settings/lab_${field}_${Date.now()}`;
    const result = await uploadImageWithFallback(file, storagePath, onProgressState);

    if (result.error) {
      if (result.isBase64Fallback) {
        setLabInfo(prev => ({ ...prev, [field]: result.url }));
        alert(`${result.error}\n\n* 안정성 확보를 위해 이미지를 웹상에 로컬 Base64 데이터 형식으로 인코딩하여 임시 저장 완료하였습니다. [연구실 정보 저장하기]를 클릭하시면 최종 저장됩니다.`);
      } else {
        alert(`이미지 업로드 제한: ${result.error}`);
        e.target.value = '';
      }
    } else {
      setLabInfo(prev => ({ ...prev, [field]: result.url }));
      alert('이미지가 임시 업로드되었습니다. 아래의 [연구실 정보 저장하기] 버튼을 누르셔야 데이터베이스에 영구 반영됩니다.');
    }
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      await setDoc(doc(db, 'settings', 'lab'), labInfo);
      alert('연구실 정보가 저장되었습니다.');
    } catch (err) {
      console.error(err);
      alert('저장 중 오류가 발생했습니다.');
    }
    setSavingInfo(false);
  };

  return (
    <div className="space-y-8">
      {/* Tab Switcher */}
      <div className="flex border-b border-gray-100 mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <button 
          onClick={() => setActiveTab('info')}
          className={`px-8 py-4 text-[10px] font-bold tracking-widest uppercase transition-all ${activeTab === 'info' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-black'}`}
        >
          연구실 정보 관리
        </button>
        <button 
          onClick={() => setActiveTab('professor')}
          className={`px-8 py-4 text-[10px] font-bold tracking-widest uppercase transition-all ${activeTab === 'professor' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-black'}`}
        >
          교수님 소개 관리
        </button>
      </div>

      {activeTab === 'professor' ? (
        <ProfessorManager />
      ) : (
        <form onSubmit={handleSaveInfo} className="space-y-8 max-w-4xl">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">강조 한 줄 (Bold Highlight)</label>
              <input 
                type="text" 
                className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm font-bold"
                value={labInfo.highlightLine}
                onChange={e => setLabInfo({...labInfo, highlightLine: e.target.value})}
                placeholder="도시의 본질을 탐구하고 건축의 미래를 설계합니다."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">본문 내용 (Description)</label>
              <textarea 
                className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm h-64 font-sans leading-relaxed"
                value={labInfo.description}
                onChange={e => setLabInfo({...labInfo, description: e.target.value})}
                placeholder="연구실 소개 본문 내용을 입력하세요."
              />
            </div>

            {/* 메인 배너/전경 이미지 업로드 필드 */}
            <div className="space-y-4 p-6 border border-gray-100 rounded-lg bg-gray-50/50">
              <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400 block font-sans">메인 배너/전경 이미지 (Main Banner / Overview Image)</label>
              <p className="text-[11px] text-gray-400 font-sans">※ 연구실 철학 섹션 우측 또는 상단에 배치되는 시각용 대표 전경 이미지입니다.</p>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="w-40 aspect-[4/3] bg-white border border-gray-100 overflow-hidden flex items-center justify-center relative shadow-sm">
                  {labInfo.bannerImageUrl ? (
                    <img 
                      src={labInfo.bannerImageUrl} 
                      alt="Main Banner Preview" 
                      className="w-full h-full object-cover grayscale opacity-90 hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <span className="text-[10px] text-gray-300 font-mono font-bold tracking-widest">NO IMAGE</span>
                  )}
                  {uploadingBanner && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <label className="px-4 py-2.5 bg-black text-white text-[10px] font-bold tracking-widest uppercase cursor-pointer hover:bg-gray-800 transition-colors font-sans">
                      {labInfo.bannerImageUrl ? '변경 (재업로드)' : '이미지 첨부'}
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp" 
                        className="hidden" 
                        onChange={(e) => handleImageUpload(e, 'bannerImageUrl', setUploadingBanner)}
                        disabled={uploadingBanner}
                      />
                    </label>
                    {labInfo.bannerImageUrl && (
                      <button
                        type="button"
                        onClick={() => setLabInfo(prev => ({ ...prev, bannerImageUrl: '' }))}
                        className="px-4 py-2.5 bg-red-600 text-white text-[10px] font-bold tracking-widest uppercase hover:bg-red-700 transition-colors font-sans"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-[#A3A3A3] font-medium leading-normal font-sans">
                    * 최대 20MB 이하 이미지 파일(JPG, PNG, WebP)만 첨부 가능 (Max file size: 20MB)
                  </p>
                </div>
              </div>
            </div>

            {/* 본문 삽입 이미지 업로드 필드 */}
            <div className="space-y-4 p-6 border border-gray-100 rounded-lg bg-gray-50/50">
              <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400 block font-sans">본문 삽입 이미지 (Body Insertion Image)</label>
              <p className="text-[11px] text-gray-400 font-sans">※ 소개 섹션 내부에 위치하거나 글귀 주변에 시각 자료로 삽입되는 개별 이미지입니다.</p>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="w-40 aspect-[4/3] bg-white border border-gray-100 overflow-hidden flex items-center justify-center relative shadow-sm">
                  {labInfo.bodyImageUrl ? (
                    <img 
                      src={labInfo.bodyImageUrl} 
                      alt="Body Insertion Preview" 
                      className="w-full h-full object-cover grayscale opacity-90 hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <span className="text-[10px] text-gray-300 font-mono font-bold tracking-widest">NO IMAGE</span>
                  )}
                  {uploadingBody && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <label className="px-4 py-2.5 bg-black text-white text-[10px] font-bold tracking-widest uppercase cursor-pointer hover:bg-gray-800 transition-colors font-sans">
                      {labInfo.bodyImageUrl ? '변경 (재업로드)' : '이미지 첨부'}
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp" 
                        className="hidden" 
                        onChange={(e) => handleImageUpload(e, 'bodyImageUrl', setUploadingBody)}
                        disabled={uploadingBody}
                      />
                    </label>
                    {labInfo.bodyImageUrl && (
                      <button
                        type="button"
                        onClick={() => setLabInfo(prev => ({ ...prev, bodyImageUrl: '' }))}
                        className="px-4 py-2.5 bg-red-600 text-white text-[10px] font-bold tracking-widest uppercase hover:bg-red-700 transition-colors font-sans"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-[#A3A3A3] font-medium leading-normal font-sans">
                    * 최대 20MB 이하 이미지 파일(JPG, PNG, WebP)만 첨부 가능 (Max file size: 20MB)
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">주소 (Address)</label>
                <input 
                  type="text" 
                  className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                  value={labInfo.address}
                  onChange={e => setLabInfo({...labInfo, address: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">전화번호 (Phone)</label>
                <input 
                  type="text" 
                  className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                  value={labInfo.phone}
                  onChange={e => setLabInfo({...labInfo, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">이메일 (Email)</label>
                <input 
                  type="email" 
                  className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                  value={labInfo.email}
                  onChange={e => setLabInfo({...labInfo, email: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">참고링크 텍스트</label>
                  <input 
                    type="text" 
                    className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                    value={labInfo.refLinkText}
                    onChange={e => setLabInfo({...labInfo, refLinkText: e.target.value})}
                    placeholder="경북대학교 건축학부"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">참고링크 URL</label>
                  <input 
                    type="url" 
                    className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                    value={labInfo.refLinkUrl}
                    onChange={e => setLabInfo({...labInfo, refLinkUrl: e.target.value})}
                    placeholder="https://arch.knu.ac.kr"
                  />
                </div>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={savingInfo}
            className="w-full py-4 bg-black text-white text-[10px] font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors disabled:bg-gray-400"
          >
            {savingInfo ? '저장 중...' : '연구실 정보 저장하기'}
          </button>
        </form>
      )}
    </div>
  );
}
