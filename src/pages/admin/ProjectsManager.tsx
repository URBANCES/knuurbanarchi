import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion } from 'motion/react';

export default function ProjectsManager() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    imageUrl: '',
    description: '',
    content: ''
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'projects'), (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'projects'), {
        ...formData,
        createdAt: serverTimestamp()
      });
      setFormData({ title: '', category: '', imageUrl: '', description: '', content: '' });
      setIsAdding(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      await deleteDoc(doc(db, 'projects', id));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold tracking-tight">프로젝트 관리</h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="px-6 py-2 bg-black text-white text-[10px] font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors"
        >
          {isAdding ? '취소' : '새 프로젝트 추가'}
        </button>
      </div>

      {isAdding && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-4 p-6 border border-gray-100 bg-gray-50"
        >
          <div className="grid grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="제목" 
              className="p-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-black"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              required
            />
            <input 
              type="text" 
              placeholder="카테고리 (예: Urban Design)" 
              className="p-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-black"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
              required
            />
          </div>
          <input 
            type="url" 
            placeholder="이미지 URL" 
            className="w-full p-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-black"
            value={formData.imageUrl}
            onChange={e => setFormData({...formData, imageUrl: e.target.value})}
            required
          />
          <textarea 
            placeholder="간략한 설명" 
            className="w-full p-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-black h-24"
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />
          <button type="submit" className="w-full py-3 bg-black text-white text-[10px] font-bold tracking-widest uppercase">
            저장하기
          </button>
        </motion.form>
      )}

      <div className="space-y-4">
        {projects.map(project => (
          <div key={project.id} className="flex items-center justify-between p-4 border border-gray-100 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <img src={project.imageUrl} className="w-12 h-12 object-cover grayscale" alt="" />
              <div>
                <h4 className="text-sm font-bold">{project.title}</h4>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">{project.category}</p>
              </div>
            </div>
            <button 
              onClick={() => handleDelete(project.id)}
              className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:underline"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
