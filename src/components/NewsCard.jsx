import React from 'react';

const NewsCard = ({ data }) => {
  if (!data || !data.articles || data.articles.length === 0) {
    return (
      <div className="alert alert-warning mb-3" style={{ maxWidth: '600px' }}>
        Tidak ada berita ditemukan untuk topik ini.
      </div>
    );
  }

  return (
    <div className="card shadow-sm border-0 mb-3" style={{ maxWidth: '600px' }}>
      <div className="card-header bg-primary text-white fw-bold">
        📰 Berita: {data.topic}
      </div>
      <div className="list-group list-group-flush">
        {data.articles.map((article, idx) => {
          const date = new Date(article.published).toLocaleDateString('id-ID', { 
            day: 'numeric', month: 'short', year: 'numeric' 
          });

          return (
            <a 
              key={idx} 
              href={article.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="list-group-item list-group-item-action py-3"
            >
              <h6 className="mb-1 text-dark fw-bold">{article.title}</h6>
              <small className="text-muted">
                🏢 {article.source} • {date}
              </small>
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default NewsCard;
