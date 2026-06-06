import React, { useEffect, useRef } from 'react';

const ChatContainer = ({ children }) => {
  const containerRef = useRef(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [children]);

  return (
    <div 
      className="flex-grow-1 overflow-auto p-3 p-md-4" 
      ref={containerRef}
      style={{ minHeight: '0' }}
    >
      <div className="container-md mx-auto" style={{ maxWidth: '800px' }}>
        {children}
      </div>
    </div>
  );
};

export default ChatContainer;
