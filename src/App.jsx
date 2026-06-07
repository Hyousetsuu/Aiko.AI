import React, { useState } from 'react';
import ChatContainer from './components/ChatContainer';
import MessageBubble from './components/MessageBubble';
import InputArea from './components/InputArea';
import WeatherCard from './components/WeatherCard';
import NewsCard from './components/NewsCard';

function App() {
  const [messages, setMessages] = useState([
    { id: 1, text: "Halo! Saya adalah asisten virtual Anda. Ada yang bisa saya bantu hari ini?", isUser: false }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSendFile = (file, quality) => {
    let localUrl = null;
    if (file.type.startsWith('image/')) {
      localUrl = URL.createObjectURL(file);
    }
    
    const newUserMessage = { 
      id: Date.now(), 
      text: `Meminta kompresi gambar: ${file.name} (Kualitas ${quality}%)`, 
      isUser: true,
      type: localUrl ? 'image' : 'text',
      fileUrl: localUrl
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setIsTyping(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('quality', quality);

    fetch('http://localhost:5000/api/compress', {
      method: 'POST',
      body: formData
    })
    .then(async response => {
      if (!response.ok) {
        let errMessage = "Gagal memproses file";
        try {
          const errData = await response.json();
          if (errData.error) errMessage = errData.error;
        } catch (e) {
          // ignore
        }
        throw new Error(errMessage);
      }
      return response.blob();
    })
    .then(blob => {
      const mediaUrl = window.URL.createObjectURL(blob);
      let filename = `compressed_${file.name}`;
      
      const newAiMessage = { 
        id: Date.now() + 1, 
        isUser: false,
        type: 'media_result',
        mediaUrl: mediaUrl,
        mimeType: blob.type,
        fileName: filename
      };
      setMessages((prev) => [...prev, newAiMessage]);
    })
    .catch(error => {
      console.error("Compress Error:", error);
      const newAiMessage = { 
        id: Date.now() + 1, 
        isUser: false,
        type: 'text',
        text: `❌ Gagal mengompres: ${error.message}`
      };
      setMessages((prev) => [...prev, newAiMessage]);
    })
    .finally(() => {
      setIsTyping(false);
    });
  };

  const handleSendMessage = (text) => {
    // Tambahkan pesan user
    const newUserMessage = { id: Date.now(), text, isUser: true };
    setMessages((prev) => [...prev, newUserMessage]);
    setIsTyping(true);
    
    // Panggil API Backend lokal
    fetch('http://localhost:5000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    })
    .then(response => response.json())
    .then(data => {
      const newAiMessage = { 
        id: Date.now() + 1, 
        isUser: false,
        type: data.type || 'text',
        text: data.text || data.reply || "Maaf, format balasan tidak dikenali.",
        payload: data.data
      };
      setMessages((prev) => [...prev, newAiMessage]);
    })
    .catch(error => {
      console.error("Fetch Error:", error);
      const newAiMessage = { 
        id: Date.now() + 1, 
        text: "Terjadi kesalahan saat menghubungi server.", 
        isUser: false 
      };
      setMessages((prev) => [...prev, newAiMessage]);
    })
    .finally(() => {
      setIsTyping(false);
    });
  };

  const handleMediaResult = (mediaObj) => {
    setMessages((prev) => [...prev, mediaObj]);
  };

  return (
    <div className="d-flex flex-column vh-100 pb-3 pt-3 px-3">
      <div className="d-flex flex-column h-100 miruro-container overflow-hidden">
        <header className="miruro-header text-white py-3 px-4 d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold"><i className="bi bi-robot me-2"></i>Aiko Bot</h5>
          <div className="badge bg-light rounded-pill px-3 py-2">Asisten Cerdas</div>
        </header>
      
      <ChatContainer>
        {messages.map((msg) => {
          if (msg.isUser && msg.type === 'image') {
            return <MessageBubble key={msg.id} message={msg} isUser={msg.isUser} />;
          } else if (msg.type === 'media_result') {
            return <MessageBubble key={msg.id} message={msg} isUser={msg.isUser} />;
          } else if (msg.isUser || msg.type === 'text' || !msg.type) {
            return <MessageBubble key={msg.id} message={msg.text} isUser={msg.isUser} />;
          } else if (msg.type === 'download_ready') {
            return <MessageBubble key={msg.id} message={{ type: 'download_ready', url: msg.payload.url }} isUser={false} onMediaResult={handleMediaResult} />;
          } else if (msg.type === 'weather') {
            return (
              <div key={msg.id} className="d-flex mb-3 justify-content-start">
                <WeatherCard data={msg.payload} />
              </div>
            );
          } else if (msg.type === 'news') {
            return (
              <div key={msg.id} className="d-flex mb-3 justify-content-start">
                <NewsCard data={msg.payload} />
              </div>
            );
          }
          return null;
        })}
        {isTyping && (
          <MessageBubble 
            key="typing" 
            message={
              <div className="d-flex align-items-center">
                <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <span className="text-muted fst-italic">AI sedang berpikir...</span>
              </div>
            } 
            isUser={false} 
          />
        )}
      </ChatContainer>
      
      <InputArea onSendMessage={handleSendMessage} onSendFile={handleSendFile} />
      </div>
    </div>
  );
}

export default App;
