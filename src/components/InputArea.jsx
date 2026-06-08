import React, { useState, useRef } from 'react';

const InputArea = ({ onSendMessage, onSendFile }) => {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedQuality, setSelectedQuality] = useState('50');
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const handleSend = (e) => {
    e.preventDefault();
    if (selectedFile) {
      onSendFile(selectedFile, selectedQuality);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
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
          <div className="badge bg-secondary d-flex align-items-center py-2 px-3 shadow-sm border rounded-pill" style={{ width: 'fit-content', background: 'rgba(255,255,255,0.1)' }}>
            <i className="bi bi-file-earmark-check-fill me-2 text-success fs-5"></i>
            <span className="me-2">File: <strong>{selectedFile.name}</strong></span>
            
            <select 
              className="form-select form-select-sm bg-dark text-white border-secondary rounded-pill me-2" 
              style={{ width: '80px', fontSize: '0.8rem' }}
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
              title="Kualitas Kompresi"
            >
              <option value="25">25%</option>
              <option value="50">50%</option>
              <option value="75">75%</option>
            </select>

            <button 
              type="button" 
              className="btn-close btn-close-white ms-1" 
              style={{ fontSize: '0.6rem' }}
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
              lineHeight: '1.5'
            }}
            rows={1}
            placeholder="Ketik pesan Anda..."
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            disabled={selectedFile !== null}
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
