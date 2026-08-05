import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface SubItem {
  name: string;
  path: string;
}

interface NavItem {
  name: string;
  path: string;
  subItems?: SubItem[];
}

export default function Header() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [maxExpandedHeight, setMaxExpandedHeight] = useState<number>(190);
  const headerRef = useRef<HTMLDivElement>(null);

  // Measure expanded header height to keep a stable placeholder div in document flow
  useLayoutEffect(() => {
    if (!isScrolled && headerRef.current) {
      const h = headerRef.current.offsetHeight;
      if (h > 120) {
        setMaxExpandedHeight(prev => Math.max(prev, h));
      }
    }
  }, [isScrolled, logoUrl]);

  // Handle ResizeObserver to keep maxExpandedHeight precisely updated
  useEffect(() => {
    if (!headerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (!isScrolled && entry.target) {
          const h = (entry.target as HTMLElement).offsetHeight;
          if (h > 120) {
            setMaxExpandedHeight(prev => Math.max(prev, h));
          }
        }
      }
    });

    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, [isScrolled]);

  // Advanced scroll handler with direction recognition, hysteresis, and immediate top restoration
  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // 1. Immediately expand header to 100% full size at or near top
      if (currentScrollY <= 10) {
        setIsScrolled(false);
        lastScrollY = currentScrollY;
        return;
      }

      const diff = Math.abs(currentScrollY - lastScrollY);
      // Require a small minimum scroll movement (3px) to prevent micro-flicker
      if (diff < 3) {
        return;
      }

      const isScrollingDown = currentScrollY > lastScrollY;

      if (isScrollingDown) {
        // Scrolling DOWN: collapse when scrollY exceeds 70px threshold
        if (currentScrollY > 70) {
          setIsScrolled(true);
        }
      } else {
        // Scrolling UP: expand header when approaching top (scrollY < 30px)
        if (currentScrollY < 30) {
          setIsScrolled(false);
        }
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Ensure header resets to expanded state on route navigation if at top
  useEffect(() => {
    if (window.scrollY <= 10) {
      setIsScrolled(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.logoUrl) {
          setLogoUrl(data.logoUrl);
        } else {
          setLogoUrl('');
        }
      }
    });
    return () => unsub();
  }, []);

  const navItems: NavItem[] = [
    { 
      name: '연구실 소개', 
      path: '/about'
    },
    { 
      name: '연구활동', 
      path: '/research',
      subItems: [
        { name: '연구실적', path: '/research' },
        { name: '프로젝트', path: '/projects' },
      ]
    },
    { 
      name: '구성원', 
      path: '/members',
      subItems: [
        { name: '재학생', path: '/members/current' },
        { name: '졸업생', path: '/members/graduate' },
      ]
    },
    { 
      name: '소식', 
      path: '/news' 
    },
  ];

  return (
    <>
      <header 
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ease-in-out border-b border-gray-100 ${
          isScrolled 
            ? 'bg-white/95 backdrop-blur-md shadow-sm' 
            : 'bg-white'
        }`}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <div 
          className={`max-w-7xl mx-auto px-6 transition-all duration-300 ease-in-out ${
            isScrolled ? 'py-3.5 md:py-4' : 'py-5 md:py-6'
          }`}
        >
          {/* Collapsible Logo Section */}
          <div 
            className={`flex flex-col items-center overflow-hidden transition-all duration-300 ease-in-out ${
              isScrolled 
                ? 'max-h-0 opacity-0 mb-0 pointer-events-none' 
                : 'max-h-[200px] opacity-100 mb-4 md:mb-5 pointer-events-auto'
            }`}
          >
            <Link to="/" className="text-center group flex flex-col items-center cursor-pointer">
              {logoUrl && (
                <img 
                  src={logoUrl} 
                  alt="도시건축연구실 로고" 
                  className="w-auto max-w-full object-contain transition-all duration-300 ease-in-out group-hover:scale-[1.02] cursor-pointer max-h-[50px] md:max-h-[64px] mb-3"
                  referrerPolicy="no-referrer"
                />
              )}
              <h1 className="font-bold tracking-[0.25em] text-black cursor-pointer transition-all duration-300 ease-in-out text-xl md:text-2xl mb-1 whitespace-nowrap">
                도시건축연구실
              </h1>
              <p className="font-light tracking-[0.35em] text-gray-400 group-hover:text-black transition-all duration-300 ease-in-out uppercase cursor-pointer text-[9px] md:text-[10px] whitespace-nowrap">
                URBAN ARCHITECTURE LAB
              </p>
            </Link>
          </div>

          {/* Navigation Bar */}
          <nav className="flex justify-center relative">
            <ul className="flex justify-center gap-8 md:gap-16">
                {navItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.path) || 
                    item.subItems?.some(sub => location.pathname === sub.path || location.pathname.startsWith(sub.path + '/'));
                  return (
                    <li 
                      key={item.name}
                      onMouseEnter={() => setHoveredItem(item.name)}
                      className="relative"
                    >
                      <Link 
                        to={item.path}
                        className="block text-xs font-bold tracking-[0.25em] uppercase group transition-all duration-300 ease-in-out py-1"
                        onFocus={() => setHoveredItem(item.name)}
                      >
                        {item.name}
                        <motion.div 
                          className="absolute bottom-0 left-0 w-full h-[2px] bg-black origin-left"
                          initial={{ scaleX: isActive ? 1 : 0 }}
                          animate={{ scaleX: isActive ? 1 : 0 }}
                          whileHover={{ scaleX: 1 }}
                          transition={{ duration: 0.3 }}
                        />
                      </Link>
                    </li>
                  );
                })}
            </ul>

            {/* Discreet Admin/Login Link */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden md:block">
              <Link 
                to={isAdmin ? "/admin" : "/login"}
                className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-200 hover:text-gray-500 transition-colors duration-500"
              >
                {isAdmin ? 'Admin' : 'Log in'}
              </Link>
            </div>
          </nav>
        </div>

        {/* Full-width Dropdown Bar */}
        <AnimatePresence>
          {hoveredItem && navItems.find(i => i.name === hoveredItem)?.subItems && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="absolute left-0 w-full bg-black text-white overflow-hidden z-[99] shadow-lg"
            >
              <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="flex justify-center gap-12 md:gap-16">
                  {navItems.find(i => i.name === hoveredItem)?.subItems?.map((sub) => (
                    <Link
                      key={sub.name}
                      to={sub.path}
                      className="text-[10px] font-bold tracking-[0.35em] uppercase hover:text-gray-400 transition-colors py-1.5"
                      onClick={() => setHoveredItem(null)}
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Invisible placeholder element matching the maximum expanded header height to preserve document flow */}
      <div 
        aria-hidden="true" 
        style={{ height: `${maxExpandedHeight}px` }}
        className="w-full shrink-0 pointer-events-none transition-all duration-300 ease-in-out"
      />
    </>
  );
}

