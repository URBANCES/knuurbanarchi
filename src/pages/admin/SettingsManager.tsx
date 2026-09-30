import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion } from 'motion/react';

export default function SettingsManager() {
  const [themeColor, setThemeColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [pointColor, setPointColor] = useState('#000000');
  
  // ⭐️ 배너 이미지 설정 상태 추가
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bodyImageUrl, setBodyImageUrl] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // 1. 색상 설정 불러오기 (settings/site)
      const siteDocRef = doc(db, 'settings', 'site');
      const siteDocSnap = await getDoc(siteDocRef);

      if (siteDocSnap.exists()) {
        const data = siteDocSnap.data();
        setThemeColor(data.themeColor || '#000000');
        setBackgroundColor(data.backgroundColor || '#ffffff');
        setPointColor(data.pointColor || '#000000');
      }

      // 2. 배너 이미지 설정 불러오기 (settings/lab)
      const labDocRef = doc(db, 'settings', 'lab');
      const labDocSnap = await getDoc(labDocRef);

      if (labDocSnap.exists()) {
        const data = labDocSnap.data();
        setBannerImageUrl(data.bannerImageUrl || '');
        setBodyImageUrl(data.bodyImageUrl || '');
      }
    } catch (error) {
      console.error('설정 불러오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      // 1. 색상 설정 저장 (settings/site)
      await setDoc(doc(db, 'settings', 'site'), {
        themeColor,
        backgroundColor,
        pointColor,
        updatedAt: new Date()
      }, { merge: true });

      // 2. 배너 이미지 설정 저장 (settings/lab)
      await setDoc(doc(db, 'settings', 'lab'), {
        bannerImageUrl,
        bodyImageUrl,
        updatedAt: new Date()
      }, { merge: true });
      
      setMessage('사이트 및 배너 설정이 성공적으로 저장되었습니다.');
      
      setTimeout(() => {
        setMessage('');
      }, 3000);
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="border-b border-gray-100 pb-4">
        <h3 className="text-xl font-bold tracking-tight">사이트 설정</h3>
        <p className="text-xs text-gray-400 mt-2">
          웹사이트 전체의 색상 테마와 소개 페이지 배너 이미지를 관리합니다.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8 max-w-2xl">
        <div className="space-y-8">
          {/* 색상 설정 구역 */}
          <div className="space-y-6 pb-6 border-b border-gray-100">
            <h4 className="text-xs font-bold uppercase tracking-widest text-black">🎨 컬러 테마 설정</h4>
            
            {/* THEME COLOR */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Theme Color (헤더 드롭다운 등)</label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="w-12 h-12 p-1 border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="flex-1 p-2 text-sm border border-gray-200 outline-none uppercase font-mono"
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* BACKGROUND COLOR */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Background Color (사이트 배경색)</label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-12 h-12 p-1 border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1 p-2 text-sm border border-gray-200 outline-none uppercase font-mono"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            {/* POINT COLOR */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Point Color (스크롤 버튼 및 가름선 등)</label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  value={pointColor}
                  onChange={(e) => setPointColor(e.target.value)}
                  className="w-12 h-12 p-1 border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={pointColor}
                  onChange={(e) => setPointColor(e.target.value)}
                  className="flex-1 p-2 text-sm border border-gray-200 outline-none uppercase font-mono"
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>

          {/* ⭐️ 배너 이미지 설정 구역 (다시 추가됨) */}
          <div className="space-y-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-black">🖼️ 소개 페이지 배너 이미지 설정</h4>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">상단 배너 이미지 URL (Banner Image URL)</label>
              <input
                type="text"
                value={bannerImageUrl}
                onChange={(e) => setBannerImageUrl(e.target.value)}
                className="w-full p-2 text-sm border border-gray-200 outline-none font-mono"
                placeholder="https://images.unsplash.com/..."
              />
              <p className="text-[11px] text-gray-400 mt-1">연구실 소개 페이지 우측 상단에 표시되는 메인 이미지 주소입니다.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">본문 삽입 이미지 URL (Body Image URL)</label>
              <input
                type="text"
                value={bodyImageUrl}
                onChange={(e) => setBodyImageUrl(e.target.value)}
                className="w-full p-2 text-sm border border-gray-200 outline-none font-mono"
                placeholder="https://images.unsplash.com/..."
              />
              <p className="text-[11px] text-gray-400 mt-1">철학 및 비전 소개 하단에 추가로 삽입되는 이미지 주소입니다. (비워두면 숨겨집니다)</p>
            </div>
          </div>
        </div>

        {message && (
          <div className={`p-4 text-sm font-bold ${message.includes('오류') ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-black text-white font-bold py-4 uppercase tracking-widest text-xs hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? '저장 중...' : '설정 저장'}
        </button>
      </form>
    </motion.div>
  );
}
