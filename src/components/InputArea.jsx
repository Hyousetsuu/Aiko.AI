import React, { useState } from 'react';

const InputArea = ({ onSendMessage }) => {
  const [inputText, setInputText] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <div className="bg-white p-3 border-top shadow-sm">
      <form onSubmit={handleSend} className="container-md">
        <div className="input-group input-group-lg">
          <input
            type="text"
            className="form-control border-primary"
            placeholder="Ketik pesan Anda di sini..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button 
            type="submit" 
            className="btn btn-primary px-4 fw-bold" 
            disabled={!inputText.trim()}
          >
            Kirim
          </button>
        </div>
      </form>
    </div>
  );
};

export default InputArea;
