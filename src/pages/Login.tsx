import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { KeyRound, Eye, EyeOff, Lock, AlertCircle, Mail } from 'lucide-react'; // ⭐️ Mail 아이콘 추가
import { signInWithEmailAndPassword } from 'firebase/auth'; // ⭐️ 파이어베이스 로그인 기능
import { auth } from '../lib/firebase'; // ⭐️ 우리가 만든 통행증(firebase.ts) 불러오기

export default function Login() {
  const [email, setEmail] = useState(''); // ⭐️ 이메일 저장 공간 추가
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ⭐️ 파이어베이스 전용 로그인 검증 로직으로 완전히 교체
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 파이어베이스 금고 문지기에게 이메일과 비밀번호 확인받기
      await signInWithEmailAndPassword(auth, email, password);
      
      // 성공하면 세션에 기록하고 관리자 페이지로 이동
      sessionStorage.setItem('isAdmin', 'true');
      navigate('/admin');
      
    } catch (err: any) {
      console.error(err);
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md p-8 md:p-12 border border-gray-100 bg-white shadow-sm space-y-8"
      >
        <div className="space-y-3 text-center">
          <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold tracking-widest uppercase">CMS Admin Login</h2>
          <p className="text-[11px] text-gray-400 tracking-wider uppercase font-medium">
            Urban Architecture Lab Management System
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          
          {/* ⭐️ 새로 추가된 이메일 입력 칸 (기존 디자인 완벽 적용) */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400 block">
              관리자 이메일 (Email)
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-4 text-gray-400">
                <Mail className="w-4 h-4" />
              </div>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="관리자 이메일 주소 입력"
                className="w-full pl-11 pr-4 py-4 border border-gray-200 focus:border-black outline-none text-sm transition-colors"
                autoFocus
                required
              />
            </div>
          </div>

          {/* 기존 비밀번호 입력 칸 */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400 block">
              관리자 비밀번호 (Password)
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-4 text-gray-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input 
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="관리자 전용 비밀번호 입력"
                className="w-full pl-11 pr-12 py-4 border border-gray-200 focus:border-black outline-none text-sm transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-gray-400 hover:text-black transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-black text-white text-xs font-bold tracking-[0.2em] uppercase hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              '관리자 인증 및 접속'
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 tracking-wider">
            파이어베이스 보안 시스템을 통해 안전하게 인증됩니다.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
