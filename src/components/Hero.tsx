import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface HeroProps {
  latestContent?: any[];
}

export default function Hero({ latestContent }: HeroProps) {
  const [bannerUrl, setBannerUrl] = useState<string>("https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=1920");

  useEffect(() => {
    // 파이어베이스에서 사이트 설정(settings/site)을 실시간으로 가져옵니다.
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.mainBannerUrl) {
          setBannerUrl(data.mainBannerUrl);
        }
      }
    });
    return () => unsub();
  }, []);

  return (
    <section className="relative w-full min-h-[70vh] flex flex-col items-center justify-center overflow-hidden">
      {/* ⭐️ 파이어베이스에서 가져온 이미지가 여기에 뜹니다! */}
      <div className="absolute inset-0 z-0 bg-black">
        <motion.img 
          initial={{ scale: 1.05, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5 }}
          src={bannerUrl} 
          alt="Urban Landscape"
          className="w-full h-full object-cover grayscale brightness-[0.4]"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/40"></div>
      </div>
    </section>
  );
}
