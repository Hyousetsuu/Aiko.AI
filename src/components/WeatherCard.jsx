import React from 'react';

const WeatherCard = ({ data }) => {
  if (!data) return null;

  return (
    <div className="card shadow-sm border-0 mb-3" style={{ maxWidth: '400px' }}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="card-title mb-0 fw-bold text-primary">
            📍 {data.city}
          </h5>
          <img 
            src={`http://openweathermap.org/img/wn/${data.icon}@2x.png`} 
            alt={data.condition} 
            width="50"
          />
        </div>
        
        <h2 className="display-4 fw-bold text-dark mb-0">{Math.round(data.temp)}°C</h2>
        <p className="text-muted text-capitalize mb-3">{data.condition} (Terasa {Math.round(data.feels_like)}°C)</p>
        
        <div className="d-flex text-muted small">
          <div className="me-3">
            💧 {data.humidity}%
          </div>
          <div>
            💨 {data.wind_speed} m/s
          </div>
        </div>

        {data.tomorrow && (
          <div className="mt-3 pt-3 border-top">
            <p className="mb-1 fw-bold small text-secondary">🔮 Prediksi Besok ({data.tomorrow.date})</p>
            <div className="d-flex justify-content-between small">
              <span className="text-capitalize">{data.tomorrow.condition}</span>
              <span className="fw-bold">{data.tomorrow.minTemp}°C - {data.tomorrow.maxTemp}°C</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherCard;
