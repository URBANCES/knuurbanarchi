import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { motion } from 'motion/react';

export default function SettingsManager() {
  const [themeColor, setThemeColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [pointColor, setPointColor] = useState('#000000');
  
  // 1. 연구실 소개 페이지 배너 (단일)
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bodyImageUrl, setBodyImageUrl] = useState('');

  // 2. 홈페이지 첫 화면 배너들 (다중 지원)
  const [homeBannerImageUrls, setHomeBannerImageUrls] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // 색상 설정 (settings/site)
      const siteDocRef = doc(db, 'settings', 'site');
      const siteDocSnap = await getDoc(siteDocRef);
      if (siteDocSnap.exists()) {
        const data = siteDocSnap.data();
        setThemeColor(data.themeColor || '#000000');
        setBackgroundColor(data.backgroundColor || '#ffffff');
        setPointColor(data.pointColor || '#000000');
      }

      // 연구실 소개 배너 (settings/lab)
      const labDocRef = doc(db, 'settings', 'lab');
      const labDocSnap = await getDoc(labDocRef);
      if (labDocSnap.exists()) {
        const data = labDocSnap.data();
        setBannerImageUrl(data.bannerImageUrl || '');
        setBodyImageUrl(data.bodyImageUrl || '');
      }

      // 홈페이지 첫 화면 배너 (settings/home)
      const homeDocRef = doc(db, 'settings', 'home');
      const homeDocSnap = await getDoc(homeDocRef);
      if (homeDocSnap.exists()) {
        const data = homeDocSnap.data();
        setHomeBannerImageUrls(data.homeBannerImageUrls || []);
      }
    } catch (error) {
      console.error('설정 불러오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 이미지 파일 업로드 핸들러 (10MB 미만 제한)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'labBanner' | 'labBody' | 'homeBanner') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setMessage('');

    try {
      const newUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 10MB 용량 제한 체크
        if (file.size > 10 * 1024 * 1024) {
          alert(`"${file.name}" 파일의 용량이 10MB를 초과합니다. 10MB 미만 이미지만 업로드 가능합니다.`);
          continue;
        }

        const storageRef = ref(storage, `site_images/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        newUrls.push(downloadUrl);
      }

      if (target === 'homeBanner') {
        setHomeBannerImageUrls((prev) => [...prev, ...newUrls]);
      } else if (target === 'labBanner' && newUrls.length > 0) {
        setBannerImageUrl(newUrls[0]);
      } else if (target === 'labBody' && newUrls.length > 0) {
        setBodyImageUrl(newUrls[0]);
      }

      setMessage('이미지가 성공적으로 업로드되었습니다.');
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      setMessage('이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // 홈페이지 첫 화면 배너 개별 삭제
  const handleRemoveHomeBanner = (index: number) => {
    setHomeBannerImageUrls((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      // 1. 색상 저장
      await setDoc(doc(db, 'settings', 'site'), {
        themeColor,
        backgroundColor,
        pointColor,
        updatedAt: new Date()
      }, { merge: true });

      // 2. 연구실 소개 배너 저장
      await setDoc(doc(db, 'settings', 'lab'), {
        bannerImageUrl,
        bodyImageUrl,
        updatedAt: new Date()
      }, { merge: true });

      // 3. 홈페이지 첫 화면 배너 저장
      await setDoc(doc(db, 'settings', 'home'), {
        homeBannerImageUrls,
        updatedAt: new Date()
      }, { merge: true });
      
      setMessage('모든 설정이 성공적으로 저장되었습니다.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('설정 저장 실패:', error);
      setMessage('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="border-b border-gray-100 pb-4">
        <h3 className="text-xl font-bold tracking-tight">사이트 설정</h3>
        <p className="text-xs text-gray-400 mt-2">웹사이트 전역 테마 색상, 홈페이지 첫 화면 배너, 연구실 소개 이미지를 관리합니다.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8 max-w-2xl">
        <div className="space-y-8">
          {/* 1. 컬러 테마 설정 */}
          <div className="space-y-6 pb-6 border-b border-gray-100">
            <h4 className="text-xs font-bold uppercase tracking-widest text-black">🎨 컬러 테마 설정</h4>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Theme Color</label>
              <div className="flex gap-4 items-center">
                <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="w-12 h-12 p-1 border border-gray-200 cursor-pointer" />
                <input type="text" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="flex-1 p-2 text-sm border border-gray-200 outline-none uppercase font-mono" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Background Color</label>
              <div className="flex gap-4 items-center">
                <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="w-12 h-12 p-1 border border-gray-200 cursor-pointer" />
                <input type="text" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="flex-1 p-2 text-sm border border-gray-200 outline-none uppercase font-mono" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Point Color</label>
              <div className="flex gap-4 items-center">
                <input type="color" value={pointColor} onChange={(e) => setPointColor(e.target.value)} className="w-12 h-12 p-1 border border-gray-200 cursor-pointer" />
                <input type="text" value={pointColor} onChange={(e) => setPointColor(e.target.value)} className="flex-1 p-2 text-sm border border-gray-200 outline-none uppercase font-mono" />
              </div>
            </div>
          </div>

          {/* 2. ⭐️ 홈페이지 첫 화면 배너 이미지 설정 (다중 선택, 10MB 미만, 삭제 기능) */}
          <div className="space-y-6 pb-6 border-b border-gray-100">
            <h4 className="text-xs font-bold uppercase tracking-widest text-black">🏠 홈페이지 첫 화면 배너 이미지 (다중 선택 가능, 10MB 미만)</h4>
            <div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileUpload(e, 'homeBanner')}
                className="w-full p-2 text-sm border border-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
              />
              <p className="text-[11px] text-gray-400 mt-1">10MB 미만 이미지만 업로드 가능합니다. 여러 장을 선택하여 슬라이드나 목록으로 띄울 수 있습니다.</p>

              {homeBannerImageUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-4 pt-4">
                  {homeBannerImageUrls.map((url, idx) => (
                    <div key={idx} className="relative group aspect-[16/9] bg-gray-100 border border-gray-200 rounded overflow-hidden">
                      <img src={url} alt={`Home Banner ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveHomeBanner(idx)}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-80 hover:opacity-100 transition-opacity cursor-pointer shadow"
                        title="이미지 삭제"
                      >
                        ✕
                      </button>
                      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. 연구실 소개 페이지 배너 이미지 설정 */}
          <div className="space-y-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-black">🖼️ 연구실 소개 페이지 배너 이미지</h4>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">상단 배너 이미지 (단일)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'labBanner')}
                className="w-full p-2 text-sm border border-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
              />
              {bannerImageUrl && (
                <div className="mt-3 relative w-32 aspect-[4/3] bg-gray-100 border border-gray-200 rounded overflow-hidden">
                  <img src={bannerImageUrl} alt="Lab Banner" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setBannerImageUrl('')} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">✕</button>
                </div>
              )}
            </div>

            <div className="pt-2">
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">본문 삽입 이미지 (단일)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'labBody')}
                className="w-full p-2 text-sm border border-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
              />
              {bodyImageUrl && (
                <div className="mt-3 relative w-32 aspect-[16/10] bg-gray-100 border border-gray-200 rounded overflow-hidden">
                  <img src={bodyImageUrl} alt="Body" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setBodyImageUrl('')} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">✕</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {uploading && <div className="text-xs text-blue-600 font-bold">이미지 업로드 중입니다... 잠시만 기다려주세요.</div>}
        {message && <div className={`p-4 text-sm font-bold ${message.includes('오류') ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>{message}</div>}

        <button
          type="submit"
          disabled={saving || uploading}
          className="w-full bg-black text-white font-bold py-4 uppercase tracking-widest text-xs hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? '저장 중...' : '설정 저장'}
        </button>
      </form>
    </motion.div>
  );
}
