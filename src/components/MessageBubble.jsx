import React from 'react';

const MessageBubble = ({ message, isUser }) => {
  return (
    <div className={`d-flex mb-3 ${isUser ? 'justify-content-end' : 'justify-content-start'}`}>
      <div 
        className={`p-3 rounded-4 shadow-sm ${isUser ? 'bg-primary text-white' : 'bg-white text-dark border'}`}
        style={{ maxWidth: '75%', wordBreak: 'break-word' }}
      >
        {message}
      </div>
    </div>
  );
};

export default MessageBubble;
