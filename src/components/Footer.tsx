import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface FooterData {
  title?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  copyright?: string;
}

export default function Footer() {
  const [data, setData] = useState<FooterData | null>(null);

  useEffect(() => {
    // Listening to settings/footer as defined in blueprint
    const unsub = onSnapshot(doc(db, 'settings', 'footer'), (snapshot) => {
      if (snapshot.exists()) {
        setData(snapshot.data() as FooterData);
      }
    });
    return () => unsub();
  }, []);

  return (
    <footer className="bg-white border-t border-gray-100 py-16 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
        <div className="space-y-4">
          <h2 className="text-lg font-bold tracking-widest uppercase font-sans">
            {data?.title || 'Urban Architecture Lab'}
          </h2>
          <p className="text-sm text-gray-500 max-w-md leading-relaxed font-light whitespace-pre-wrap">
            {data?.description || '도시와 건축의 관계를 탐구하며, 지속 가능한 도시 환경을 위한 혁신적인 디자인과 연구를 수행합니다.'}
          </p>
        </div>
        
        <div className="text-sm md:text-right space-y-4">
          <h3 className="font-bold tracking-widest uppercase font-sans text-xs">Contact</h3>
          <ul className="space-y-2 text-gray-500 font-light">
            <li className="max-w-xs md:max-w-none ml-auto">
              {data?.address || '대구 북구 대학로 80 경북대학교 공대2호관 405-2호실'}
            </li>
            {data?.phone && (
              <li>T. {data.phone}</li>
            )}
            {!data?.phone && (
              <li>T. 053-950-5595</li>
            )}
            {data?.email && (
              <li>E. {data.email}</li>
            )}
            {!data?.email && (
              <li>E. example@knu.ac.kr</li>
            )}
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-[10px] text-gray-400 tracking-widest uppercase">
          {data?.copyright || `© ${new Date().getFullYear()} URBAN ARCHITECTURE LAB. ALL RIGHTS RESERVED.`}
        </div>
        {/* Management link removed but flex-row justify-between and spacer div used to maintain layout */}
        <div className="hidden md:block w-24"></div>
      </div>
    </footer>
  );
}
