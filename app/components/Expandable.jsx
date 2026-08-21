import {useEffect, useId, useRef, useState} from 'react';
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
  const headerBtnRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(40);

  useEffect(() => {
    if (headerBtnRef.current) {
      setHeaderHeight(headerBtnRef.current.offsetHeight);
    }
  }, [headerBtnRef?.current?.offsetHeight]);

  return (
    <motion.div
      key={title}
      className="dropdown"
      layout={!isFirstRender ? 'position' : false}
      initial={{height: `${headerHeight}px`}}
      animate={{
        height: isOpen ? 'auto' : `${headerHeight}px`,
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
        ref={headerBtnRef}
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
