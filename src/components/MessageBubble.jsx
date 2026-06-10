import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const TypingIndicator = () => {
  return (
    <div className="d-flex align-items-center" style={{ height: '24px' }}>
      {[0, 1, 2].map((dot) => (
        <motion.div
          key={dot}
          style={{
            width: '8px',
            height: '8px',
            backgroundColor: 'var(--accent-secondary)',
            borderRadius: '50%',
            margin: '0 3px'
          }}
          animate={{
            y: ['0%', '-50%', '0%'],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: dot * 0.15
          }}
        />
      ))}
    </div>
  );
};

const CodeBlock = ({ node, inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="position-relative my-3 shadow-sm rounded-3 overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="d-flex justify-content-between align-items-center px-3 py-2 bg-dark text-secondary" style={{ fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <span className="text-uppercase fw-bold text-light">{match[1]}</span>
          <button 
            onClick={handleCopy} 
            className="btn btn-sm text-light p-1 d-flex align-items-center flex-shrink-0"
            style={{ fontSize: '0.8rem', border: 'none', background: 'transparent', whiteSpace: 'nowrap', transition: 'all 0.2s ease' }}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-secondary)'}
            onMouseOut={(e) => e.currentTarget.style.color = ''}
          >
            {copied ? (
              <><i className="bi bi-check2 me-1 text-success"></i> Copied!</>
            ) : (
              <><i className="bi bi-clipboard me-1"></i> Copy Code</>
            )}
          </button>
        </div>
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          customStyle={{ margin: 0, borderRadius: '0 0 0.5rem 0.5rem', background: 'rgba(0, 0, 0, 0.4)' }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    );
  }
  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
};

const MessageBubble = ({ message, isUser, onMediaResult }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  const handleDownload = async (url) => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const response = await fetch('http://localhost:5000/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) {
        throw new Error("Gagal mengunduh media dari tautan.");
      }
      
      const blob = await response.blob();
      
      let filename = 'downloaded_media.mp4';
      const disposition = response.headers.get('content-disposition');
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) { 
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      
      if (onMediaResult) {
        onMediaResult({
          id: Date.now() + Math.random(),
          isUser: false,
          type: 'media_result',
          mediaUrl: downloadUrl,
          mimeType: blob.type,
          fileName: filename
        });
      }
    } catch (err) {
      setDownloadError(err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const Avatar = ({ isUser }) => (
    <div 
      className={`rounded-circle d-flex flex-shrink-0 align-items-center justify-content-center text-white shadow-sm ${isUser ? '' : ''}`} 
      style={{ 
        width: '38px', 
        height: '38px', 
        overflow: 'hidden',
        background: isUser ? 'linear-gradient(135deg, var(--accent-primary), #7434b0)' : 'transparent',
        border: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      {isUser ? (
        <i className="bi bi-person-fill fs-5"></i>
      ) : (
        <img src="/profile.jpg" alt="AI Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`d-flex mb-4 align-items-end ${isUser ? 'justify-content-end' : 'justify-content-start'}`}
    >
      {!isUser && <Avatar isUser={false} />}
      
      <div 
        className={`position-relative p-3 shadow-sm ${isUser ? 'miruro-user-bubble ms-4 me-2' : 'miruro-ai-bubble ms-2 me-4'}`}
        style={{ maxWidth: '75%', wordBreak: 'break-word' }}
      >
        {message && message.type === 'typing_indicator' ? (
          <TypingIndicator />
        ) : typeof message === 'string' ? (
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({node, ...props}) => <p className="mb-2 last-child-mb-0" {...props} />,
              ul: ({node, ...props}) => <ul className="mb-2 ps-3" {...props} />,
              ol: ({node, ...props}) => <ol className="mb-2 ps-3" {...props} />,
              h1: ({node, ...props}) => <h4 className="fw-bold mt-2 mb-2" {...props} />,
              h2: ({node, ...props}) => <h5 className="fw-bold mt-2 mb-2" {...props} />,
              h3: ({node, ...props}) => <h6 className="fw-bold mt-2 mb-2" {...props} />,
              a: ({node, ...props}) => <a className="text-decoration-underline fw-bold" style={{color: 'inherit'}} target="_blank" rel="noopener noreferrer" {...props} />,
              code: CodeBlock
            }}
          >
            {message}
          </ReactMarkdown>
        ) : message && message.type === 'download_ready' ? (
          <div style={{ minWidth: '250px' }}>
            <div className="d-flex align-items-center mb-2">
              <i className="bi bi-cloud-arrow-down fs-4 me-2 text-white"></i>
              <strong className="text-white">Media Terdeteksi</strong>
            </div>
            <p className="small text-muted mb-3" style={{ wordBreak: 'break-all' }}>
              <a href={message.url} target="_blank" rel="noopener noreferrer">{message.url}</a>
            </p>
            {downloadError && <div className="alert alert-danger py-1 px-2 small mb-2">{downloadError}</div>}
            <button 
              className="btn btn-success btn-sm w-100 fw-bold" 
              onClick={() => handleDownload(message.url)}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Memproses...</>
              ) : (
                <><i className="bi bi-download me-2"></i>Proses & Unduh Media</>
              )}
            </button>
          </div>
        ) : message && message.type === 'image' ? (
          <div>
            <img src={message.fileUrl} alt="Preview" className="img-fluid rounded mb-2 shadow-sm border border-light" style={{ maxWidth: '250px' }} />
            <p className="mb-0 small">{message.text}</p>
          </div>
        ) : message && message.type === 'media_result' ? (
          <div>
            <div className="mb-2">
              {message.mimeType.startsWith('image/') ? (
                <img src={message.mediaUrl} alt="Downloaded Media" className="img-fluid rounded border border-light shadow-sm" style={{ maxHeight: '300px' }} />
              ) : message.mimeType.startsWith('video/') ? (
                <video src={message.mediaUrl} controls className="img-fluid rounded border border-light shadow-sm" style={{ maxHeight: '300px' }} />
              ) : message.mimeType === 'application/zip' || message.mimeType === 'application/x-zip-compressed' ? (
                <div className="d-flex align-items-center p-3 rounded border text-light mb-2" style={{ backgroundColor: 'rgba(255,193,7,0.1)', borderColor: 'rgba(255,193,7,0.3) !important' }}>
                  <i className="bi bi-file-earmark-zip-fill fs-2 me-3 text-warning"></i>
                  <div>
                    <h6 className="mb-0 fw-bold">ZIP Archive</h6>
                    <small className="text-muted">{message.fileName}</small>
                  </div>
                </div>
              ) : (
                <div className="d-flex align-items-center p-3 rounded border text-light mb-2" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1) !important' }}>
                  <i className="bi bi-file-earmark-fill fs-2 me-3 text-secondary"></i>
                  <div>
                    <h6 className="mb-0 fw-bold">Document / File</h6>
                    <small className="text-muted">{message.fileName}</small>
                  </div>
                </div>
              )}
            </div>
            <a href={message.mediaUrl} download={message.fileName} className="btn btn-primary btn-sm w-100 fw-bold">
              <i className="bi bi-download me-2"></i>Unduh File ({message.fileName})
            </a>
          </div>
        ) : (
          message
        )}
      </div>

      {isUser && <Avatar isUser={true} />}
    </motion.div>
  );
};

export default MessageBubble;

