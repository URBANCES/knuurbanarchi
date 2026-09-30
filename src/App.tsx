import { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore'; // ⭐️ 추가됨
import { auth, db } from './lib/firebase'; // ⭐️ db 추가됨
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

  // 기존 사용자 인증 상태 확인 로직
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

  // ⭐️ 사이트 전역 색상 설정 적용 로직 추가!
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();

        // 1. Background Color 적용 (웹사이트 전체 배경색)
        if (data.backgroundColor) {
          document.body.style.backgroundColor = data.backgroundColor;
          document.documentElement.style.setProperty('--bg-color', data.backgroundColor);
        } else {
          // 기본값 복구
          document.body.style.backgroundColor = '';
          document.documentElement.style.removeProperty('--bg-color');
        }

        // 2. Theme Color 적용 (버튼, 포인트 글씨 색상 등)
        if (data.themeColor) {
          document.documentElement.style.setProperty('--theme-color', data.themeColor);
        } else {
          // 기본값 복구
          document.documentElement.style.removeProperty('--theme-color');
        }
      }
    });
    
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading }}>
      <Router>
        <div className="flex flex-col min-h-screen font-sans text-black bg-white selection:bg-black selection:text-white">
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
              
              {/* VIP 에스코트 규칙 추가! (이미 로그인된 사람이면 /admin으로 즉시 자동 이동) */}
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
