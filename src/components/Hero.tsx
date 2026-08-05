import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

interface HeroProps {
  latestContent: any[];
}

export default function Hero() {
  return (
    <section className="relative w-full min-h-[70vh] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Image with Grayscale */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=1920" 
          alt="Urban Landscape"
          className="w-full h-full object-cover grayscale brightness-[0.4]"
          referrerPolicy="no-referrer"
        />
        {/* Visual Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/40"></div>
      </div>

      {/* Hero content removed as per user request to keep visual purely as a background */}
    </section>
  );
}
