import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MessageBubble = ({ message, isUser }) => {
  return (
    <div className={`d-flex mb-3 ${isUser ? 'justify-content-end' : 'justify-content-start'}`}>
      <div 
        className={`p-3 rounded-4 shadow-sm ${isUser ? 'bg-primary text-white' : 'bg-white text-dark border'}`}
        style={{ maxWidth: '75%', wordBreak: 'break-word' }}
      >
        {typeof message === 'string' ? (
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({node, ...props}) => <p className="mb-2 last-child-mb-0" {...props} />,
              ul: ({node, ...props}) => <ul className="mb-2 ps-3" {...props} />,
              ol: ({node, ...props}) => <ol className="mb-2 ps-3" {...props} />,
              h1: ({node, ...props}) => <h4 className="fw-bold mt-2 mb-2" {...props} />,
              h2: ({node, ...props}) => <h5 className="fw-bold mt-2 mb-2" {...props} />,
              h3: ({node, ...props}) => <h6 className="fw-bold mt-2 mb-2" {...props} />,
              a: ({node, ...props}) => <a className="text-decoration-underline fw-bold" style={{color: 'inherit'}} target="_blank" rel="noopener noreferrer" {...props} />
            }}
          >
            {message}
          </ReactMarkdown>
        ) : (
          message
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
