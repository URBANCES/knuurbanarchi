import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface HeroProps {
  latestContent?: any[];
}

export default function Hero({ latestContent }: HeroProps) {
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [isReady, setIsReady] = useState(false); // ⭐️ 데이터를 다 불렀는지 확인하는 신호등

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.mainBannerUrl) {
          setBannerUrl(data.mainBannerUrl);
        } else {
          // 저장된 배너가 없을 때 띄울 기본 이미지
          setBannerUrl("https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=1920");
        }
      } else {
        setBannerUrl("https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=1920");
      }
      setIsReady(true); // 데이터를 다 가져왔으니 화면을 켜라는 신호!
    });
    return () => unsub();
  }, []);

  // ⭐️ 파이어베이스가 응답하기 전(약 0.2초)에는 까만 배경만 보여주어 번쩍임을 막습니다.
  if (!isReady) {
    return <section className="relative w-full min-h-[70vh] bg-black"></section>;
  }

  return (
    <section className="relative w-full min-h-[70vh] flex flex-col items-center justify-center overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <motion.img 
          initial={{ scale: 1.05, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5 }}
          src={bannerUrl} 
          alt="Urban Landscape"
          // 👇 원하시는 대로 grayscale(흑백)이나 brightness(밝기)를 수정해 둔 상태라면 그대로 유지해 주세요!
          className="w-full h-full object-cover grayscale brightness-[0.4]" 
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/40"></div>
      </div>
    </section>
  );
}
