import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion } from 'motion/react';

export default function NewsManager() {
  const [news, setNews] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageUrl: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'news'), (snapshot) => {
      setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'news'), {
        ...formData,
        createdAt: serverTimestamp()
      });
      setFormData({ title: '', content: '', imageUrl: '', date: new Date().toISOString().split('T')[0] });
      setIsAdding(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      await deleteDoc(doc(db, 'news', id));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold tracking-tight">소식 관리</h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="px-6 py-2 bg-black text-white text-[10px] font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors"
        >
          {isAdding ? '취소' : '새 소식 추가'}
        </button>
      </div>

      {isAdding && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-4 p-6 border border-gray-100 bg-gray-50"
        >
          <input 
            type="text" 
            placeholder="제목" 
            className="w-full p-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-black"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <input 
              type="date" 
              className="p-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-black"
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
              required
            />
            <input 
              type="url" 
              placeholder="이미지 URL (선택)" 
              className="p-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-black"
              value={formData.imageUrl}
              onChange={e => setFormData({...formData, imageUrl: e.target.value})}
            />
          </div>
          <textarea 
            placeholder="내용" 
            className="w-full p-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-black h-32"
            value={formData.content}
            onChange={e => setFormData({...formData, content: e.target.value})}
            required
          />
          <button type="submit" className="w-full py-3 bg-black text-white text-[10px] font-bold tracking-widest uppercase">
            저장하기
          </button>
        </motion.form>
      )}

      <div className="space-y-4">
        {news.map(item => (
          <div key={item.id} className="flex items-center justify-between p-4 border border-gray-100 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 flex items-center justify-center text-[10px] font-bold uppercase">News</div>
              <div>
                <h4 className="text-sm font-bold">{item.title}</h4>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">{item.date}</p>
              </div>
            </div>
            <button 
              onClick={() => handleDelete(item.id)}
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
