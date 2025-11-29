import {motion} from 'motion/react';

export default function Expandable({
  openSection,
  toggleSection,
  title,
  details,
  isFirstRender,
}) {
  return (
    <motion.div
      key={title}
      className="dropdown"
      layout={!isFirstRender ? 'position' : false}
      initial={{height: '40px'}}
      animate={{
        height: openSection === title ? 'auto' : '40px',
      }}
      style={{overflow: 'hidden'}}
    >
      <motion.p
        layout={!isFirstRender ? 'position' : false}
        className={`dropdown-header ${openSection === title ? 'open' : ''}`}
        onClick={() => toggleSection(title)}
      >
        <span className="dropdown-title">{title}</span>
      </motion.p>
      <div style={{overflow: 'hidden'}}>
        <motion.div
          className="dropdown-content"
          initial={{opacity: 0}}
          animate={{opacity: openSection === title ? 1 : 0}}
          key={title}
          transition={{ease: 'easeOut'}}
        >
          {details}
        </motion.div>
      </div>
    </motion.div>
  );
}
