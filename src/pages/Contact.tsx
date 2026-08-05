export default function Contact() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-24 space-y-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
        <div className="space-y-12">
          <div className="space-y-4">
            <h3 className="text-xs font-bold tracking-[0.4em] uppercase text-gray-400">Get in Touch</h3>
            <h2 className="text-4xl font-bold tracking-tight">안내 및 문의</h2>
          </div>
          
          <div className="space-y-8">
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Address</h4>
              <p className="text-lg font-medium">서울특별시 OO구 OO로 123, OO빌딩 4층 도시건축연구실</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Contact</h4>
              <p className="text-lg font-medium">T. 02-123-4567</p>
              <p className="text-lg font-medium">E. info@urbanarchlab.com</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Hours</h4>
              <p className="text-lg font-medium">Mon - Fri: 09:00 - 18:00</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-12 space-y-8">
          <h3 className="text-xl font-bold tracking-tight">문의하기</h3>
          <form className="space-y-6" onSubmit={e => e.preventDefault()}>
            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Name</label>
              <input type="text" className="w-full p-4 bg-white border border-gray-100 focus:outline-none focus:border-black text-sm" placeholder="성함" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Email</label>
              <input type="email" className="w-full p-4 bg-white border border-gray-100 focus:outline-none focus:border-black text-sm" placeholder="이메일 주소" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Message</label>
              <textarea className="w-full p-4 bg-white border border-gray-100 focus:outline-none focus:border-black text-sm h-32" placeholder="문의 내용을 입력해주세요."></textarea>
            </div>
            <button className="w-full py-4 bg-black text-white text-[10px] font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors">
              Send Message
            </button>
          </form>
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="w-full h-[50vh] bg-gray-100 flex items-center justify-center grayscale">
        <div className="text-center space-y-4">
          <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-xs font-bold tracking-widest uppercase text-gray-400">Map View Placeholder</p>
        </div>
      </div>
    </div>
  );
}
