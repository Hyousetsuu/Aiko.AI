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

  return (
    <div className="vh-100 d-flex flex-column bg-light font-sans">
      <header className="bg-white p-3 border-bottom shadow-sm text-center sticky-top">
        <h5 className="mb-0 text-primary fw-bold">
          <i className="bi bi-robot me-2"></i> Aiko.AI
        </h5>
      </header>
      
      <ChatContainer>
        {messages.map((msg) => {
          if (msg.isUser || msg.type === 'text' || !msg.type) {
            return <MessageBubble key={msg.id} message={msg.text} isUser={msg.isUser} />;
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
      
      <InputArea onSendMessage={handleSendMessage} />
    </div>
  );
}

export default App;
