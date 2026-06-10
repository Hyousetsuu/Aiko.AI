import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatContainer = ({ children }) => {
  const containerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [children]);

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      // If we are scrolled up more than 150px from bottom, show the button
      if (scrollHeight - scrollTop - clientHeight > 150) {
        setShowScrollButton(true);
      } else {
        setShowScrollButton(false);
      }
    }
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div 
      className="flex-grow-1 overflow-auto p-3 p-md-4 position-relative" 
      ref={containerRef}
      onScroll={handleScroll}
      style={{ minHeight: '0' }}
    >
      <div className="container-md mx-auto pb-4" style={{ maxWidth: '800px' }}>
        {children}
      </div>

      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={scrollToBottom}
            className="btn btn-primary rounded-circle shadow position-fixed d-flex align-items-center justify-content-center"
            style={{ 
              width: '45px', 
              height: '45px', 
              bottom: '120px', 
              right: 'max(20px, calc(50vw - 380px))',
              zIndex: 10 
            }}
          >
            <i className="bi bi-arrow-down fs-5"></i>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatContainer;
