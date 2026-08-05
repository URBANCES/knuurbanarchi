import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface FooterData {
  title: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  copyright: string;
}

export default function FooterManager() {
  const [data, setData] = useState<FooterData>({
    title: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    copyright: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'footer'), (snapshot) => {
      if (snapshot.exists()) {
        setData(snapshot.data() as FooterData);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'footer'), data);
      alert('푸터 설정이 저장되었습니다.');
    } catch (err) {
      console.error(err);
      alert('저장 중 오류가 발생했습니다.');
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-center text-xs tracking-widest text-gray-400 uppercase">Loading Footer Settings...</div>;

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end border-b border-gray-100 pb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">푸터 설정</h2>
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Manage Global Website Footer</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="px-10 py-4 bg-black text-white text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-gray-800 transition-all disabled:bg-gray-400 shadow-xl"
        >
          {saving ? '저장 중...' : '동적 푸터 저장하기'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-400">기본 정보 (Primary Info)</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-600 uppercase">연구실 명칭 (Title)</label>
                <input 
                  type="text" 
                  className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm transition-all"
                  value={data.title}
                  onChange={e => setData({...data, title: e.target.value})}
                  placeholder="예: URBAN ARCHITECTURE LAB"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-600 uppercase">연구실 한 줄 소개 (Description)</label>
                <textarea 
                  className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm h-32 leading-relaxed transition-all"
                  value={data.description}
                  onChange={e => setData({...data, description: e.target.value})}
                  placeholder="연구실의 핵심 가치나 간단한 소개를 입력하세요."
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-8 border-t border-gray-50">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-400">하단 저작권 (Copyright)</h3>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-600 uppercase">Copyright 문구</label>
              <input 
                type="text" 
                className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm transition-all"
                value={data.copyright}
                onChange={e => setData({...data, copyright: e.target.value})}
                placeholder="예: © 2026 URBAN ARCHITECTURE LAB. ALL RIGHTS RESERVED."
              />
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-400">연락처 및 주소 (Contact Info)</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-600 uppercase">주소 (Address)</label>
                <input 
                  type="text" 
                  className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm transition-all"
                  value={data.address}
                  onChange={e => setData({...data, address: e.target.value})}
                  placeholder="예: 대구 북구 대학로 80 경북대학교..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-600 uppercase">유선전화 (Phone)</label>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400">T.</span>
                  <input 
                    type="text" 
                    className="flex-grow p-4 border border-gray-100 focus:border-black outline-none text-sm transition-all"
                    value={data.phone}
                    onChange={e => setData({...data, phone: e.target.value})}
                    placeholder="053-950-5595"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-600 uppercase">이메일 (Email)</label>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400">E.</span>
                  <input 
                    type="text" 
                    className="flex-grow p-4 border border-gray-100 focus:border-black outline-none text-sm transition-all"
                    value={data.email}
                    onChange={e => setData({...data, email: e.target.value})}
                    placeholder="example@knu.ac.kr"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-8 bg-gray-50 border border-gray-100 space-y-4">
            <h4 className="text-[10px] font-bold tracking-widest uppercase text-black">Preview Tip</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed font-light">
              입력하신 정보는 모든 페이지의 최하단 푸터에 즉각 반영됩니다. <br/> 
              정갈하고 미니멀한 디자인 유지를 위해 가급적 간결하게 입력해 주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
