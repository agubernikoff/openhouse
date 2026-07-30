import {useId} from 'react';
import {motion} from 'motion/react';

export default function Expandable({
  openSection,
  toggleSection,
  title,
  details,
  isFirstRender,
}) {
  const contentId = useId();
  const isOpen = openSection === title;

  return (
    <motion.div
      key={title}
      className="dropdown"
      layout={!isFirstRender ? 'position' : false}
      initial={{height: '40px'}}
      animate={{
        height: isOpen ? 'auto' : '40px',
      }}
      style={{overflow: 'hidden'}}
    >
      <motion.button
        type="button"
        layout={!isFirstRender ? 'position' : false}
        className={`dropdown-header ${isOpen ? 'open' : ''}`}
        onClick={() => toggleSection(title)}
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <span className="dropdown-title">{title}</span>
      </motion.button>
      <div style={{overflow: 'hidden'}}>
        <motion.div
          id={contentId}
          className="dropdown-content"
          initial={{opacity: 0}}
          animate={{opacity: isOpen ? 1 : 0}}
          key={title}
          transition={{ease: 'easeOut'}}
        >
          {details}
        </motion.div>
      </div>
    </motion.div>
  );
}
