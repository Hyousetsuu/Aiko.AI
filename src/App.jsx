import React, { useState } from 'react';
import ChatContainer from './components/ChatContainer';
import MessageBubble from './components/MessageBubble';
import InputArea from './components/InputArea';
import WeatherCard from './components/WeatherCard';
import NewsCard from './components/NewsCard';

function App() {
  const getInitialGreeting = () => {
    const hour = new Date().getHours();
    let timeGreeting = "Selamat malam";
    if (hour >= 4 && hour < 11) timeGreeting = "Selamat pagi";
    else if (hour >= 11 && hour < 15) timeGreeting = "Selamat siang";
    else if (hour >= 15 && hour < 18) timeGreeting = "Selamat sore";

    return `Halo, ${timeGreeting}! 👋 Saya **Aiko**, asisten virtual cerdas Anda.\n\nSaya siap menemani dan membantu Anda hari ini. Anda bisa bertanya tentang apa saja, atau mencoba fitur-fitur unggulan saya seperti:\n- 📥 Mengunduh video dari sosial media\n- 🗜️ Mengompres ukuran file gambar/PDF\n- 🌤️ Mengecek prakiraan cuaca\n- 📰 Membaca berita terbaru\n\nAda yang bisa saya bantu sekarang?`;
  };

  const [messages, setMessages] = useState([
    { id: 1, text: getInitialGreeting(), isUser: false }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSendFile = (file, action, arg3) => {
    let localUrl = null;
    if (file.type.startsWith('image/')) {
      localUrl = URL.createObjectURL(file);
    }
    
    let textStr = "";
    if (action === 'chat') {
      textStr = arg3 ? `Mengunggah file ${file.name} dan bertanya: "${arg3}"` : `Tolong rangkum/analisa file ${file.name}`;
    } else {
      const actionText = action === 'convert' ? 'konversi' : `kompresi (Kualitas ${arg3}%)`;
      textStr = `Meminta ${actionText} file: ${file.name}`;
    }
    
    const newUserMessage = { 
      id: Date.now(), 
      text: textStr, 
      isUser: true,
      type: localUrl ? 'image' : 'text',
      fileUrl: localUrl
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setIsTyping(true);

    const formData = new FormData();
    formData.append('file', file);
    if (action === 'compress') {
      formData.append('quality', arg3);
    } else if (action === 'chat') {
      formData.append('message', arg3);
    }

    const endpoint = action === 'chat' ? 'http://localhost:5000/api/chat-file' : 
                     (action === 'convert' ? 'http://localhost:5000/api/convert' : 'http://localhost:5000/api/compress');

    fetch(endpoint, {
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
      
      if (action === 'chat') {
        const data = await response.json();
        return { isChat: true, data };
      }
      
      let filename = `${action === 'convert' ? 'converted' : 'compressed'}_${file.name}`;
      const disposition = response.headers.get('content-disposition');
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) { 
          filename = matches[1].replace(/['"]/g, '');
        }
      } else if (action === 'convert') {
        if (file.type.startsWith('image/')) {
          filename = filename.replace(/\.[^/.]+$/, "") + ".pdf";
        } else if (file.type === 'application/pdf') {
          filename = filename.replace(/\.[^/.]+$/, "") + ".zip";
        }
      }
      
      const blob = await response.blob();
      return { isChat: false, blob, filename };
    })
    .then(resData => {
      if (resData.isChat) {
        const newAiMessage = { 
          id: Date.now() + 1, 
          isUser: false,
          type: resData.data.type || 'text',
          text: resData.data.text || resData.data.reply || "Maaf, format balasan tidak dikenali.",
          payload: resData.data.data
        };
        setMessages((prev) => [...prev, newAiMessage]);
      } else {
        const { blob, filename } = resData;
        const mediaUrl = window.URL.createObjectURL(blob);
        
        const newAiMessage = { 
          id: Date.now() + 1, 
          isUser: false,
          type: 'media_result',
          mediaUrl: mediaUrl,
          mimeType: blob.type,
          fileName: filename
        };
        setMessages((prev) => [...prev, newAiMessage]);
      }
    })
    .catch(error => {
      console.error("Process Error:", error);
      const newAiMessage = { 
        id: Date.now() + 1, 
        isUser: false,
        type: 'text',
        text: `❌ Gagal memproses file: ${error.message}`
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
                <span className="text-light opacity-75 fst-italic">AI sedang berpikir...</span>
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
