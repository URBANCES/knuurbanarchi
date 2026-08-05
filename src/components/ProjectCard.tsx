import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export interface ProjectCardItem {
  id: string;
  title: string;
  titleEn?: string;
  category?: string;
  thumbnail?: string;
  [key: string]: any;
}

interface ProjectCardProps {
  project: ProjectCardItem;
  layout?: boolean;
  initial?: any;
  whileInView?: any;
  animate?: any;
  exit?: any;
  transition?: any;
  viewport?: any;
  className?: string;
}

export default function ProjectCard({
  project,
  layout,
  initial = { opacity: 0, scale: 0.98 },
  whileInView,
  animate = { opacity: 1, scale: 1 },
  exit = { opacity: 0, scale: 0.98 },
  transition = { duration: 0.4 },
  viewport,
  className = ''
}: ProjectCardProps) {
  const navigate = useNavigate();

  const isPractical = project.category === 'practical' || project.category === '실무 프로젝트';
  const categoryLabel = isPractical ? '실무 프로젝트' : '연구 프로젝트';

  return (
    <motion.div
      layout={layout}
      initial={initial}
      whileInView={whileInView}
      animate={animate}
      exit={exit}
      transition={transition}
      viewport={viewport}
      onClick={() => navigate(`/project/detail/${project.id}`)}
      className={`group relative aspect-[4/3] overflow-hidden bg-black cursor-pointer ${className}`}
    >
      {project.thumbnail ? (
        <img 
          src={project.thumbnail} 
          alt={project.title} 
          className="w-full h-full object-cover grayscale transition-all duration-1000 group-hover:grayscale-0 group-hover:scale-110" 
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-700 uppercase tracking-widest bg-gray-900">
          No Image
        </div>
      )}

      {/* Dark Overlay with Centered Text */}
      <div className="absolute inset-0 bg-black/55 group-hover:bg-black/35 transition-all duration-500 flex flex-col items-center justify-center text-center p-6 pb-12">
        <div className="space-y-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
          <span className="text-[8px] font-bold tracking-widest text-[#eeeeee]/65 uppercase border border-[#eeeeee]/15 bg-white/5 px-2 py-0.5 rounded-sm">
            {categoryLabel}
          </span>
          <h4 className="text-white text-lg font-bold tracking-tight leading-tight block pt-2">
            {project.title}
          </h4>
          {project.titleEn && (
            <p className="text-white/80 text-[10px] font-light uppercase tracking-[0.3em]">
              {project.titleEn}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
