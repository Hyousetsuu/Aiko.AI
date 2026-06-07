import React, { useState, useRef } from 'react';

const InputArea = ({ onSendMessage, onSendFile }) => {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedQuality, setSelectedQuality] = useState('50');
  const fileInputRef = useRef(null);

  const handleSend = (e) => {
    e.preventDefault();
    if (selectedFile) {
      onSendFile(selectedFile, selectedQuality);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="miruro-input-area p-3">
      {selectedFile && (
        <div className="container-md mb-2">
          <div className="badge bg-secondary d-flex align-items-center py-2 px-3 shadow-sm border" style={{ width: 'fit-content' }}>
            <i className="bi bi-file-earmark-check-fill me-2 text-success"></i>
            <span>Siap dikirim: <strong>{selectedFile.name}</strong></span>
            <button 
              type="button" 
              className="btn-close btn-close-white ms-2" 
              style={{ fontSize: '0.6rem' }}
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            ></button>
          </div>
        </div>
      )}
      <form onSubmit={handleSend} className="container-md">
        <div className="input-group input-group-lg">
          <input 
            type="file" 
            className="d-none" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            accept="image/*,application/pdf"
          />
          <button 
            type="button" 
            className="btn btn-outline-secondary px-3"
            onClick={() => fileInputRef.current.click()}
          >
            <i className="bi bi-paperclip fs-5"></i>
          </button>
          {selectedFile && (
            <select 
              className="form-select miruro-select ms-2" 
              style={{ maxWidth: '90px' }}
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
              title="Kualitas Kompresi (%)"
            >
              <option value="25">25%</option>
              <option value="50">50%</option>
              <option value="75">75%</option>
            </select>
          )}
          <input
            type="text"
            className="form-control miruro-input ms-2"
            placeholder="Tanya sesuatu atau lampirkan URL..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={selectedFile !== null}
          />
          <button type="submit" className="btn btn-primary px-4 ms-2 rounded-end" disabled={!inputText.trim() && !selectedFile}>
            <i className="bi bi-send-fill"></i>
          </button>
        </div>
      </form>
    </div>
  );
};

export default InputArea;
