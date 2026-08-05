import { Routes, Route, Link, useLocation } from 'react-router-dom';
import CMSManager from './admin/CMSManager';
import SettingsManager from './admin/SettingsManager';
import AboutManager from './admin/AboutManager';
import MembersManager from './admin/MembersManager';
import FooterManager from './admin/FooterManager';

export default function Admin() {
  const location = useLocation();

  const menuItems = [
    { name: '대시보드', path: '/admin' },
    { name: '연구실 소개 관리', path: '/admin/about' },
    { 
      name: '연구활동 관리', 
      path: '#',
      subItems: [
        { name: '실적 관리', path: '/admin/research' },
        { name: '프로젝트 관리', path: '/admin/projects' },
      ]
    },
    { name: '구성원 관리', path: '/admin/members' },
    { name: '소식 관리', path: '/admin/news' },
    { name: '푸터 설정', path: '/admin/footer' },
    { name: '사이트 설정', path: '/admin/settings' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-12">
      {/* Sidebar */}
      <aside className="w-full md:w-64 space-y-8">
        <div className="space-y-2">
          <Link to="/admin" className="block hover:opacity-80">
            <h2 className="text-xl font-bold tracking-widest uppercase">UAL CMS</h2>
            <p className="text-xs text-gray-400 tracking-widest uppercase">Admin Control Panel</p>
          </Link>
        </div>

        <nav>
          <ul className="space-y-1">
            {menuItems.map((item, idx) => (
              <li key={idx} className="space-y-1">
                {item.subItems ? (
                  <div className="space-y-1">
                    <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-gray-400 font-bold border-l-2 border-transparent">
                      {item.name}
                    </div>
                    <ul className="pl-4 space-y-1 border-l border-gray-100">
                      {item.subItems.map((sub, sIdx) => {
                        const isActive = location.pathname === sub.path;
                        return (
                          <li key={sIdx}>
                            <Link
                              to={sub.path}
                              className={`block px-4 py-2 text-[11px] font-bold tracking-widest uppercase transition-all ${
                                isActive 
                                  ? 'text-black translate-x-1 font-extrabold' 
                                  : 'text-gray-500 hover:text-black hover:translate-x-1'
                              }`}
                            >
                              - {sub.name}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <Link
                    to={item.path}
                    className={`block px-4 py-3 text-xs font-bold tracking-widest uppercase transition-all border-l-2 ${
                      location.pathname === item.path 
                        ? 'bg-black text-white border-black' 
                        : 'hover:bg-gray-50 text-gray-500 border-transparent'
                    }`}
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            ))}
            <li className="pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  sessionStorage.removeItem('isAdmin');
                  sessionStorage.removeItem('adminToken');
                  window.location.href = '/login';
                }}
                className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest uppercase text-red-500 hover:bg-red-50 transition-all border-l-2 border-transparent flex items-center justify-between"
              >
                <span>로그아웃 (Logout)</span>
                <span>↳</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-grow bg-white border border-gray-100 p-8 min-h-[60vh]">
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/research" element={<CMSManager collectionName="research" title="연구실적" />} />
          <Route path="/projects" element={<CMSManager collectionName="projects" title="프로젝트" />} />
          <Route path="/about" element={<AboutManager />} />
          <Route path="/members" element={<MembersManager />} />
          <Route path="/footer" element={<FooterManager />} />
          <Route path="/news" element={<CMSManager collectionName="news" title="소식" />} />
          <Route path="/settings" element={<SettingsManager />} />
        </Routes>
      </main>
    </div>
  );
}

function AdminDashboard() {
  const [activeBoardSettings, setActiveBoardSettings] = useState<string | null>(null);

  const boards = [
    { id: 'research', name: '연구실적', icon: '📄' },
    { id: 'projects', name: '프로젝트', icon: '🏗️' },
    { id: 'about', name: '연구실 소개', icon: '👥' },
    { id: 'news', name: '소식', icon: '📢' },
  ];

  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <h3 className="text-2xl font-bold tracking-tight">관리자 대시보드</h3>
        <p className="text-sm text-gray-500 leading-relaxed">
          도시건축연구실 웹사이트의 모든 동적 콘텐츠를 관리할 수 있는 CMS입니다.
          사이드바의 메뉴를 통해 각 카테고리의 게시물을 등록, 수정, 삭제하세요.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Research" collectionName="research" />
        <StatCard title="Total Projects" collectionName="projects" />
        <StatCard title="Total News" collectionName="news" />
      </div>

      <div className="space-y-6 pt-12 border-t border-gray-100">
        <div className="space-y-1">
          <h4 className="text-lg font-bold tracking-tight">표준 게시판 설정</h4>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Standard Board Configuration</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => setActiveBoardSettings(board.id)}
              className="p-8 border border-gray-100 hover:border-black transition-all group text-left space-y-4"
            >
              <div className="text-3xl grayscale group-hover:grayscale-0 transition-all">{board.icon}</div>
              <div className="space-y-1">
                <p className="text-sm font-bold tracking-tight">{board.name}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Configure Board</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {activeBoardSettings && (
          <BoardSettings 
            boardId={activeBoardSettings} 
            onClose={() => setActiveBoardSettings(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useEffect, useState } from 'react';
import BoardSettings from './admin/BoardSettings';
import { AnimatePresence } from 'motion/react';

function StatCard({ title, collectionName }: { title: string; collectionName: string }) {
  const [count, setCount] = useState<number | string>('--');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, collectionName), (snapshot) => {
      setCount(snapshot.size);
    });
    return () => unsub();
  }, [collectionName]);

  return (
    <div className="p-6 border border-gray-100 space-y-2">
      <h4 className="text-[10px] font-bold tracking-widest uppercase text-gray-400">{title}</h4>
      <p className="text-3xl font-bold">{count}</p>
    </div>
  );
}
