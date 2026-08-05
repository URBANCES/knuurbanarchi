import { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
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
    // 1. Check sessionStorage for password auth token
    const hasSessionToken = sessionStorage.getItem('isAdmin') === 'true' || !!sessionStorage.getItem('adminToken');
    if (hasSessionToken) {
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    // 2. Firebase Auth fallback check
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Check if user is admin
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
        } else if (user.email === 'cces1022@gmail.com') {
          // Default admin
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
              <Route path="/members" element={<Members defaultStatus="all" />} />
              <Route path="/members/current" element={<Members defaultStatus="current" />} />
              <Route path="/members/graduate" element={<Members defaultStatus="graduate" />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
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
