import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, storage } from '../../lib/firebase';
import { uploadImageWithFallback } from '../../lib/uploadHelper';

export default function SettingsManager() {
  const [settings, setSettings] = useState({
    themeColor: '#000000',
    mainFont: 'Pretendard',
    logoUrl: '',
    backgroundColor: '#FFFFFF'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  const handleLogoUpload = async (file: File, inputId?: string) => {
    const storagePath = `settings/logo_${Date.now()}_${file.name}`;
    const result = await uploadImageWithFallback(file, storagePath, setUploading);
    
    if (result.error) {
      if (result.isBase64Fallback) {
        setSettings(prev => ({ ...prev, logoUrl: result.url }));
        alert(`${result.error}\n\n* 안정성 확보를 위해 이미지를 웹상에 로컬 Base64 데이터 형식으로 인코딩하여 임시 저장 완료하였습니다. [설정 저장하기]를 클릭하시면 최종 저장됩니다.`);
      } else {
        alert(`로그 이미지 업로드 제한: ${result.error}`);
        if (inputId) {
          const input = document.getElementById(inputId) as HTMLInputElement | null;
          if (input) input.value = '';
        }
      }
    } else {
      setSettings(prev => ({ ...prev, logoUrl: result.url }));
      alert('로고 이미지가 성공적으로 임시 업로드되었습니다. 아래의 [설정 저장하기] 버튼을 누르시면 최종 반영됩니다.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleLogoUpload(file, 'logo-file-input');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoUpload(file, 'logo-file-input');
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as any);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'site'), settings);
      alert('설정이 저장되었습니다.');
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <h3 className="text-xl font-bold tracking-tight">사이트 설정</h3>
      
      <div className="space-y-6 max-w-md">
        <div className="space-y-2">
          <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Theme Color</label>
          <div className="flex gap-4 items-center">
            <input 
              type="color" 
              className="w-12 h-12 p-1 bg-white border border-gray-200 cursor-pointer"
              value={settings.themeColor}
              onChange={e => setSettings({...settings, themeColor: e.target.value})}
            />
            <input 
              type="text" 
              className="flex-grow p-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-black"
              value={settings.themeColor}
              onChange={e => setSettings({...settings, themeColor: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Background Color</label>
          <div className="flex gap-4 items-center">
            <input 
              type="color" 
              className="w-12 h-12 p-1 bg-white border border-gray-200 cursor-pointer"
              value={settings.backgroundColor}
              onChange={e => setSettings({...settings, backgroundColor: e.target.value})}
            />
            <input 
              type="text" 
              className="flex-grow p-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-black"
              value={settings.backgroundColor}
              onChange={e => setSettings({...settings, backgroundColor: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Main Font</label>
          <select 
            className="w-full p-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-black"
            value={settings.mainFont}
            onChange={e => setSettings({...settings, mainFont: e.target.value})}
          >
            <option value="Pretendard">Pretendard</option>
            <option value="Noto Sans KR">Noto Sans KR</option>
            <option value="Inter">Inter</option>
            <option value="Space Grotesk">Space Grotesk</option>
          </select>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">로고 이미지 업로드 (Logo Image Upload)</label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('logo-file-input')?.click()}
              className={`border-2 border-dashed rounded p-8 text-center cursor-pointer transition-all duration-300 ${
                isDragging 
                  ? 'border-black bg-gray-50' 
                  : 'border-gray-200 hover:border-black bg-white'
              }`}
            >
              <input 
                id="logo-file-input"
                type="file" 
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {uploading ? (
                <div className="py-2 text-xs text-gray-400 animate-pulse font-medium">로고 업로드 중...</div>
              ) : settings.logoUrl ? (
                <div className="space-y-4">
                  <div className="flex justify-center bg-gray-50/50 p-6 border border-gray-100 rounded">
                    <img 
                      src={settings.logoUrl} 
                      alt="로고 미리보기" 
                      className="max-h-[60px] md:max-h-[80px] object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold tracking-widest text-[#666666] uppercase">새 파일을 드래그 앤 드롭하거나 클릭하여 변경</p>
                    <p className="text-[8px] text-gray-400 uppercase tracking-widest">Supports transparent PNG, SVG</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 py-4">
                  <div className="text-2xl opacity-40">📁</div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-700">마우스로 로고를 끌어오거나 클릭하여 선택하십시오.</p>
                    <p className="text-[8px] text-gray-400 uppercase tracking-widest">Supports transparent PNG, SVG</p>
                  </div>
                </div>
              )}
            </div>
            <p className="text-[9px] text-[#A3A3A3] font-medium leading-normal">
              * 최대 20MB 이하의 이미지 파일(PNG, JPG, SVG 등)만 첨부 가능합니다. (Max file size: 20MB)
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Logo URL (직접 입력)</label>
            <input 
              type="url" 
              className="w-full p-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-black"
              value={settings.logoUrl}
              onChange={e => setSettings({...settings, logoUrl: e.target.value})}
              placeholder="https://example.com/logo.png"
            />
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-black text-white text-[10px] font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors disabled:bg-gray-400"
        >
          {saving ? '저장 중...' : '설정 저장하기'}
        </button>
      </div>
    </div>
  );
}
