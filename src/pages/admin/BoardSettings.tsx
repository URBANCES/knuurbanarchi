import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

export interface BoardConfig {
  id: string;
  name: string;
  type: 'table' | 'view';
  description?: string;
  categories?: string[];
  layout: {
    horizontal: number;
    vertical: number;
  };
  pageBlock: number;
  useThumbnail: boolean;
  useItems: {
    email: boolean;
    phone: boolean;
    period: boolean;
  };
  attachments: {
    quantity: number;
    size: number;
    thumbnailSize: {
      width: number;
      height: number;
    };
    allowedExtensions: string;
  };
  operation: {
    useCategory: boolean;
    newIconDuration: number;
    readTarget: 'self' | 'new' | 'gallery';
    defaultAuthor: 'name' | 'nickname';
  };
}

const DEFAULT_CONFIGS: Record<string, Partial<BoardConfig>> = {
  research: {
    name: '연구실적',
    type: 'table',
    layout: { horizontal: 1, vertical: 10 },
    pageBlock: 10,
    useThumbnail: false,
    useItems: { email: false, phone: false, period: false },
    attachments: { quantity: 5, size: 10, thumbnailSize: { width: 100, height: 100 }, allowedExtensions: 'jpg, png, pdf, zip' },
    operation: { useCategory: true, newIconDuration: 24, readTarget: 'self', defaultAuthor: 'name' }
  },
  projects: {
    name: '프로젝트',
    type: 'view',
    layout: { horizontal: 3, vertical: 4 },
    pageBlock: 10,
    useThumbnail: true,
    useItems: { email: false, phone: false, period: true },
    attachments: { quantity: 10, size: 20, thumbnailSize: { width: 800, height: 600 }, allowedExtensions: 'jpg, png, zip' },
    operation: { useCategory: true, newIconDuration: 48, readTarget: 'gallery', defaultAuthor: 'name' }
  },
  about: {
    name: '연구실 소개',
    type: 'view',
    layout: { horizontal: 1, vertical: 1 },
    pageBlock: 1,
    useThumbnail: true,
    useItems: { email: true, phone: true, period: false },
    attachments: { quantity: 1, size: 5, thumbnailSize: { width: 400, height: 600 }, allowedExtensions: 'jpg, png' },
    operation: { useCategory: false, newIconDuration: 0, readTarget: 'self', defaultAuthor: 'name' }
  },
  news: {
    name: '소식',
    type: 'view',
    layout: { horizontal: 1, vertical: 10 },
    pageBlock: 10,
    useThumbnail: true,
    useItems: { email: false, phone: false, period: false },
    attachments: { quantity: 3, size: 10, thumbnailSize: { width: 400, height: 300 }, allowedExtensions: 'jpg, png, pdf' },
    operation: { useCategory: true, newIconDuration: 24, readTarget: 'self', defaultAuthor: 'name' }
  }
};

interface Props {
  boardId: string;
  onClose: () => void;
}

export default function BoardSettings({ boardId, onClose }: Props) {
  const [config, setConfig] = useState<BoardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'boardConfigs', boardId), (snapshot) => {
      if (snapshot.exists()) {
        setConfig({ id: boardId, ...snapshot.data() } as BoardConfig);
      } else {
        setConfig({ id: boardId, ...DEFAULT_CONFIGS[boardId] } as BoardConfig);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [boardId]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'boardConfigs', boardId), config);
      alert('설정이 저장되었습니다.');
    } catch (err) {
      console.error(err);
      alert('저장 중 오류가 발생했습니다.');
    }
    setSaving(false);
  };

  if (loading || !config) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">{config.name} 설정</h2>
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Board Configuration Dashboard</p>
          </div>
          <button onClick={onClose} className="text-xs font-bold tracking-widest uppercase hover:underline">Close</button>
        </div>

        <div className="flex-grow flex overflow-hidden">
          {/* Form Area */}
          <div className="flex-grow overflow-y-auto p-8 space-y-12 border-r border-gray-100">
            
            {/* Section 1: 기본 설정 */}
            <section className="space-y-6">
              <h3 className="text-xs font-bold tracking-[0.3em] uppercase text-black border-l-2 border-black pl-3">Section 1: 기본 설정</h3>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">게시판 이름</label>
                  <input 
                    type="text" 
                    className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                    value={config.name}
                    onChange={e => setConfig({...config, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">타입 선택</label>
                  <div className="flex gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="type" 
                        checked={config.type === 'table'} 
                        onChange={() => setConfig({...config, type: 'table'})}
                        className="accent-black"
                      />
                      <span className="text-xs font-medium">테이블형</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="type" 
                        checked={config.type === 'view'} 
                        onChange={() => setConfig({...config, type: 'view'})}
                        className="accent-black"
                      />
                      <span className="text-xs font-medium">뷰형</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">정렬 수량 (가로/세로)</label>
                  <div className="flex gap-4">
                    <input 
                      type="number" 
                      className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                      value={config.layout.horizontal}
                      onChange={e => setConfig({...config, layout: {...config.layout, horizontal: parseInt(e.target.value)}})}
                      placeholder="가로"
                    />
                    <input 
                      type="number" 
                      className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                      value={config.layout.vertical}
                      onChange={e => setConfig({...config, layout: {...config.layout, vertical: parseInt(e.target.value)}})}
                      placeholder="세로"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">페이지 블럭 수량</label>
                  <input 
                    type="number" 
                    className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                    value={config.pageBlock}
                    onChange={e => setConfig({...config, pageBlock: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </section>

            {/* Section 2: 기능 설정 */}
            <section className="space-y-6">
              <h3 className="text-xs font-bold tracking-[0.3em] uppercase text-black border-l-2 border-black pl-3">Section 2: 기능 설정</h3>
              <div className="flex items-center gap-4 p-4 border border-gray-100">
                <input 
                  type="checkbox" 
                  id="useThumbnail"
                  checked={config.useThumbnail}
                  onChange={e => setConfig({...config, useThumbnail: e.target.checked})}
                  className="w-4 h-4 accent-black"
                />
                <label htmlFor="useThumbnail" className="text-xs font-medium cursor-pointer">섬네일 기능 사용 여부</label>
              </div>
            </section>

            {/* Section 3: 사용 항목 설정 */}
            <section className="space-y-6">
              <h3 className="text-xs font-bold tracking-[0.3em] uppercase text-black border-l-2 border-black pl-3">Section 3: 사용 항목 설정</h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(config.useItems).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-4 p-4 border border-gray-100">
                    <input 
                      type="checkbox" 
                      id={`use-${key}`}
                      checked={val}
                      onChange={e => setConfig({
                        ...config, 
                        useItems: {...config.useItems, [key]: e.target.checked}
                      })}
                      className="w-4 h-4 accent-black"
                    />
                    <label htmlFor={`use-${key}`} className="text-xs font-medium uppercase cursor-pointer">{key}</label>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 4: 첨부파일 설정 */}
            <section className="space-y-6">
              <h3 className="text-xs font-bold tracking-[0.3em] uppercase text-black border-l-2 border-black pl-3">Section 4: 첨부파일 설정</h3>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">첨부파일 수량</label>
                  <input 
                    type="number" 
                    className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                    value={config.attachments.quantity}
                    onChange={e => setConfig({...config, attachments: {...config.attachments, quantity: parseInt(e.target.value)}})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">첨부파일 용량 (Mb)</label>
                  <input 
                    type="number" 
                    className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                    value={config.attachments.size}
                    onChange={e => setConfig({...config, attachments: {...config.attachments, size: parseInt(e.target.value)}})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">섬네일 크기 (W/H px)</label>
                  <div className="flex gap-4">
                    <input 
                      type="number" 
                      className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                      value={config.attachments.thumbnailSize.width}
                      onChange={e => setConfig({...config, attachments: {...config.attachments, thumbnailSize: {...config.attachments.thumbnailSize, width: parseInt(e.target.value)}}})}
                      placeholder="W"
                    />
                    <input 
                      type="number" 
                      className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                      value={config.attachments.thumbnailSize.height}
                      onChange={e => setConfig({...config, attachments: {...config.attachments, thumbnailSize: {...config.attachments.thumbnailSize, height: parseInt(e.target.value)}}})}
                      placeholder="H"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">허용 확장자</label>
                  <input 
                    type="text" 
                    className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                    value={config.attachments.allowedExtensions}
                    onChange={e => setConfig({...config, attachments: {...config.attachments, allowedExtensions: e.target.value}})}
                    placeholder="jpg, png, pdf..."
                  />
                </div>
              </div>
            </section>

            {/* Section 5: 운영 설정 */}
            <section className="space-y-6 pb-12">
              <h3 className="text-xs font-bold tracking-[0.3em] uppercase text-black border-l-2 border-black pl-3">Section 5: 운영 설정</h3>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">카테고리 형태</label>
                  <div className="flex gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="useCategory" 
                        checked={config.operation.useCategory} 
                        onChange={() => setConfig({...config, operation: {...config.operation, useCategory: true}})}
                        className="accent-black"
                      />
                      <span className="text-xs font-medium">사용</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="useCategory" 
                        checked={!config.operation.useCategory} 
                        onChange={() => setConfig({...config, operation: {...config.operation, useCategory: false}})}
                        className="accent-black"
                      />
                      <span className="text-xs font-medium">미사용</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">새 글 아이콘 출력 시간 (Hours)</label>
                  <input 
                    type="number" 
                    className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm"
                    value={config.operation.newIconDuration}
                    onChange={e => setConfig({...config, operation: {...config.operation, newIconDuration: parseInt(e.target.value)}})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">읽기 타겟 설정</label>
                  <select 
                    className="w-full p-4 border border-gray-100 focus:border-black outline-none text-sm bg-white"
                    value={config.operation.readTarget}
                    onChange={e => setConfig({...config, operation: {...config.operation, readTarget: e.target.value as any}})}
                  >
                    <option value="self">자기창</option>
                    <option value="new">새창</option>
                    <option value="gallery">큰그림보기-갤러리</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">기본 작성자 출력</label>
                  <div className="flex gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="defaultAuthor" 
                        checked={config.operation.defaultAuthor === 'name'} 
                        onChange={() => setConfig({...config, operation: {...config.operation, defaultAuthor: 'name'}})}
                        className="accent-black"
                      />
                      <span className="text-xs font-medium">이름</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="defaultAuthor" 
                        checked={config.operation.defaultAuthor === 'nickname'} 
                        onChange={() => setConfig({...config, operation: {...config.operation, defaultAuthor: 'nickname'}})}
                        className="accent-black"
                      />
                      <span className="text-xs font-medium">닉네임</span>
                    </label>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Preview Area */}
          <div className="w-96 bg-gray-50 p-8 flex flex-col">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-8">Layout Preview</h3>
            <div className="flex-grow flex items-center justify-center">
              <div className="w-full space-y-4">
                <div 
                  className="grid gap-2"
                  style={{ 
                    gridTemplateColumns: `repeat(${config.layout.horizontal}, 1fr)`,
                  }}
                >
                  {Array.from({ length: Math.min(config.layout.horizontal * config.layout.vertical, 12) }).map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-200 border border-gray-300 flex items-center justify-center">
                      <span className="text-[8px] text-gray-400">{i + 1}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-[10px] font-bold text-black uppercase tracking-widest">{config.name}</p>
                  <p className="text-[8px] text-gray-400 uppercase tracking-widest">
                    {config.type} Mode | {config.layout.horizontal}x{config.layout.vertical} Grid
                  </p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 bg-black text-white text-[10px] font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors disabled:bg-gray-400 mt-8 shadow-lg"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
