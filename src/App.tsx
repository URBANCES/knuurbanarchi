import { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Projects from './pages/Projects';
import News from './pages/News';
import Research from './pages/Research';
import ProjectGallery from './pages/ProjectGallery';
import ProjectDetail from './pages/ProjectDetail';
import About from './pages/About';
import Members from './pages/Members';
import Contact from './pages/Contact';
import Admin from './pages/Admin';
import Login from './pages/Login';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, isAdmin: false, loading: true });

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ⭐️ 사이트 전역 색상 설정 적용 로직
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();

        // 1. Background Color 적용
        if (data.backgroundColor) {
          document.body.style.backgroundColor = data.backgroundColor;
          document.documentElement.style.setProperty('--bg-color', data.backgroundColor);
        } else {
          document.body.style.backgroundColor = '';
          document.documentElement.style.removeProperty('--bg-color');
        }

        // 2. Theme Color 적용
        if (data.themeColor) {
          document.documentElement.style.setProperty('--theme-color', data.themeColor);
        } else {
          document.documentElement.style.removeProperty('--theme-color');
        }
      }
    });
    
    return () => unsub();
  }, []);

  if (loading) {
    return (
      // ⭐️ bg-white 제거하고 설정된 배경색이 나오게 수정
      <div className="flex items-center justify-center min-h-screen transition-colors duration-500" style={{ backgroundColor: 'var(--bg-color, #ffffff)' }}>
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading }}>
      <Router>
        {/* ⭐️ 가장 중요한 부분! bg-white를 없애고 var(--bg-color)를 주입합니다. */}
        <div 
          className="flex flex-col min-h-screen font-sans text-black selection:bg-black selection:text-white transition-colors duration-500"
          style={{ backgroundColor: 'var(--bg-color, #ffffff)' }}
        >
          <Header />
          <main className="flex-grow pt-4 md:pt-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/project/detail/:id" element={<ProjectDetail />} />
              <Route path="/project/:category" element={<ProjectGallery />} />
              <Route path="/news" element={<News />} />
              <Route path="/research" element={<Research />} />
              <Route path="/research/thesis" element={<Navigate to="/research?category=thesis" replace />} />
              <Route path="/research/journal" element={<Navigate to="/research?category=journal" replace />} />
              <Route path="/about" element={<About />} />
              <Route path="/professor" element={<Navigate to="/about" replace />} />
              <Route path="/members" element={<Members />} />
              <Route path="/members/current" element={<Navigate to="/members?group=grad" replace />} />
              <Route path="/members/completed" element={<Navigate to="/members?group=grad" replace />} />
              <Route path="/members/graduate" element={<Navigate to="/members?group=grad" replace />} />
              <Route path="/contact" element={<Contact />} />
              
              <Route 
                path="/login" 
                element={isAdmin ? <Navigate to="/admin" replace /> : <Login />} 
              />
              
              <Route 
                path="/admin/*" 
                element={isAdmin ? <Admin /> : <Navigate to="/login" replace />} 
              />
            </Routes>
          </main>
          <Footer />
          <ScrollToTop />
        </div>
      </Router>
    </AuthContext.Provider>
  );
}
