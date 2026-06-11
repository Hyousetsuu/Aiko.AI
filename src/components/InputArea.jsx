import React, { useState, useRef, useEffect } from 'react';

const InputArea = ({ onSendMessage, onSendFile, droppedFile, clearDroppedFile }) => {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedAction, setSelectedAction] = useState('chat');
  const [selectedQuality, setSelectedQuality] = useState('50');
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (droppedFile) {
      setSelectedFile(droppedFile);
      if (clearDroppedFile) clearDroppedFile();
    }
  }, [droppedFile, clearDroppedFile]);

  const handleSend = (e) => {
    e.preventDefault();
    if (selectedFile) {
      if (selectedAction === 'chat') {
        onSendFile(selectedFile, selectedAction, inputText.trim());
        setInputText('');
        if (textareaRef.current) textareaRef.current.style.height = '44px';
      } else {
        onSendFile(selectedFile, selectedAction, selectedQuality);
      }
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '44px';
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="miruro-input-area p-3 pb-4">
      {selectedFile && (
        <div className="container-md mb-3 ps-5">
          <div className="d-flex align-items-center py-2 px-3 rounded-pill miruro-file-badge mb-2" style={{ width: 'fit-content' }}>
            <div className="d-flex align-items-center me-3">
              <div className="d-flex align-items-center justify-content-center bg-success bg-opacity-25 rounded-circle me-2" style={{ width: '28px', height: '28px' }}>
                <i className="bi bi-file-earmark-check-fill text-success fs-6"></i>
              </div>
              <span className="text-truncate text-light" style={{ maxWidth: '150px', fontSize: '0.9rem' }}>
                File: <strong className="text-white">{selectedFile.name}</strong>
              </span>
            </div>
            
            <div className="dropdown me-2">
              <button 
                className="btn miruro-file-action-select text-start d-flex justify-content-between align-items-center" 
                type="button" 
                data-bs-toggle="dropdown" 
                aria-expanded="false"
                style={{ width: '120px' }}
              >
                {selectedAction === 'chat' ? 'Tanya AI' : selectedAction === 'compress' ? 'Kompresi' : 'Konversi'}
              </button>
              <ul className="dropdown-menu dropdown-menu-dark shadow-lg border-0 rounded-4 p-2" style={{ background: 'rgba(36, 38, 43, 0.95)', backdropFilter: 'blur(10px)', minWidth: '150px' }}>
                <li><button className={`dropdown-item rounded-3 mb-1 miruro-dropdown-item ${selectedAction === 'chat' ? 'active bg-primary' : ''}`} type="button" onClick={() => setSelectedAction('chat')}>Tanya AI</button></li>
                <li><button className={`dropdown-item rounded-3 mb-1 miruro-dropdown-item ${selectedAction === 'compress' ? 'active bg-primary' : ''}`} type="button" onClick={() => setSelectedAction('compress')}>Kompresi</button></li>
                <li><button className={`dropdown-item rounded-3 miruro-dropdown-item ${selectedAction === 'convert' ? 'active bg-primary' : ''}`} type="button" onClick={() => setSelectedAction('convert')}>Konversi</button></li>
              </ul>
            </div>

            {selectedAction === 'compress' && (
              <div className="dropdown me-2">
                <button 
                  className="btn miruro-file-action-select text-start d-flex justify-content-between align-items-center" 
                  type="button" 
                  data-bs-toggle="dropdown" 
                  aria-expanded="false"
                  style={{ width: '90px' }}
                >
                  {selectedQuality}%
                </button>
                <ul className="dropdown-menu dropdown-menu-dark shadow-lg border-0 rounded-4 p-2" style={{ background: 'rgba(36, 38, 43, 0.95)', backdropFilter: 'blur(10px)', minWidth: '100px' }}>
                  <li><button className={`dropdown-item rounded-3 mb-1 miruro-dropdown-item ${selectedQuality === '25' ? 'active bg-primary' : ''}`} type="button" onClick={() => setSelectedQuality('25')}>25%</button></li>
                  <li><button className={`dropdown-item rounded-3 mb-1 miruro-dropdown-item ${selectedQuality === '50' ? 'active bg-primary' : ''}`} type="button" onClick={() => setSelectedQuality('50')}>50%</button></li>
                  <li><button className={`dropdown-item rounded-3 miruro-dropdown-item ${selectedQuality === '75' ? 'active bg-primary' : ''}`} type="button" onClick={() => setSelectedQuality('75')}>75%</button></li>
                </ul>
              </div>
            )}

            <button 
              type="button" 
              className="btn-close btn-close-white ms-2" 
              style={{ fontSize: '0.7rem', opacity: 0.7 }}
              onMouseEnter={(e) => e.target.style.opacity = 1}
              onMouseLeave={(e) => e.target.style.opacity = 0.7}
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            ></button>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSend} className="container-md d-flex align-items-end gap-2">
        <input 
          type="file" 
          className="d-none" 
          ref={fileInputRef} 
          onChange={handleFileChange}
          accept="image/*,application/pdf"
        />
        
        <div className="dropdown dropup mb-1">
          <button 
            type="button" 
            className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center shadow-sm miruro-action-btn flex-shrink-0 p-0"
            style={{ width: '38px', height: '38px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i className="bi bi-plus-lg fs-5"></i>
          </button>
          <ul className="dropdown-menu dropdown-menu-dark shadow-lg miruro-dropdown mb-2 rounded-4 border-0 p-2" style={{ background: 'rgba(36, 38, 43, 0.95)', backdropFilter: 'blur(10px)', minWidth: '240px' }}>
            <li>
              <button className="dropdown-item d-flex align-items-center py-2 px-3 rounded-3 mb-1 miruro-dropdown-item" type="button" onClick={() => fileInputRef.current.click()}>
                <i className="bi bi-paperclip me-3 fs-6 text-light"></i>
                <span className="text-light" style={{ fontSize: '0.9rem', fontWeight: '500' }}>Tambah foto & file</span>
              </button>
            </li>
            <li>
              <button className="dropdown-item d-flex align-items-center py-2 px-3 rounded-3 miruro-dropdown-item" type="button" onClick={() => fileInputRef.current.click()}>
                <i className="bi bi-file-earmark-text me-3 fs-6 text-light"></i>
                <span className="text-light" style={{ fontSize: '0.9rem', fontWeight: '500' }}>Upload File Text</span>
              </button>
            </li>
          </ul>
        </div>
        
        <div className="input-group flex-grow-1 shadow-sm" style={{ borderRadius: '25px', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <textarea
            ref={textareaRef}
            className="form-control text-white border-0 bg-transparent py-2"
            style={{ 
              borderTopLeftRadius: '25px', 
              borderBottomLeftRadius: '25px', 
              paddingLeft: '20px',
              resize: 'none',
              minHeight: '44px',
              maxHeight: '150px',
              overflowY: 'auto',
              lineHeight: '1.5',
              transition: 'height 0.15s ease-out'
            }}
            rows={1}
            placeholder="Ketik pesan Anda..."
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              const target = e.target;
              // Nonaktifkan sementara transition agar scrollHeight dihitung dengan benar
              target.style.transition = 'none';
              target.style.height = '44px';
              const newHeight = Math.min(target.scrollHeight, 150);
              target.style.height = newHeight + 'px';
              // Paksa browser untuk render ulang (reflow)
              target.offsetHeight; 
              // Aktifkan kembali transition
              target.style.transition = 'height 0.15s ease-out';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            disabled={selectedFile !== null && selectedAction !== 'chat'}
          />
          <button 
            type="submit" 
            className="btn btn-primary px-3 border-0 d-flex align-items-center justify-content-center" 
            style={{ borderTopRightRadius: '25px', borderBottomRightRadius: '25px', width: '50px' }}
            disabled={!inputText.trim() && !selectedFile}
          >
            <i className="bi bi-send-fill fs-5"></i>
          </button>
        </div>
      </form>
    </div>
  );
};

export default InputArea;
