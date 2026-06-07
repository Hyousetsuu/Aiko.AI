export function extractCity(text) {
    const textLower = text.toLowerCase();
    const matchDi = textLower.match(/cuaca(?:[\w\s]+)?\bdi\s+([a-zA-Z\s]+)/);
    if (matchDi) {
        return matchDi[1].trim().replace("hari ini", "").replace("besok", "").trim() || "Jakarta";
    }
    const matchLangsung = textLower.match(/cuaca\s+(?!di\b)([a-zA-Z\s]+)/);
    if (matchLangsung) {
        const city = matchLangsung[1].trim().replace("hari ini", "").replace("besok", "").trim();
        return city ? city : "Jakarta";
    }
    return "Jakarta";
}

export async function getWeather(city) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) throw new Error("OPENWEATHER_API_KEY belum dikonfigurasi di file .env");
    
    const currentRes = await fetch(`http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=id`);
    const currentData = await currentRes.json();
    
    if (currentData.cod != 200) {
        throw new Error(currentData.message || "Kota tidak ditemukan");
    }

    const forecastRes = await fetch(`http://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric&lang=id`);
    const forecastData = await forecastRes.json();
    
    let tomorrowForecast = null;
    if (forecastData.cod == "200") {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const tomorrowStr = d.toISOString().split('T')[0];
        
        let temps = [];
        let conditions = {};
        for (let item of forecastData.list) {
            if (item.dt_txt.includes(tomorrowStr)) {
                temps.push(item.main.temp);
                const cond = item.weather[0].description;
                conditions[cond] = (conditions[cond] || 0) + 1;
            }
        }
        
        if (temps.length > 0) {
            const minTemp = Math.min(...temps).toFixed(1);
            const maxTemp = Math.max(...temps).toFixed(1);
            const mostCommonCondition = Object.keys(conditions).reduce((a, b) => conditions[a] > conditions[b] ? a : b);
            tomorrowForecast = {
                date: tomorrowStr,
                minTemp,
                maxTemp,
                condition: mostCommonCondition
            };
        }
    }

    return {
        city: currentData.name,
        temp: currentData.main.temp,
        feels_like: currentData.main.feels_like,
        condition: currentData.weather[0].description,
        icon: currentData.weather[0].icon,
        humidity: currentData.main.humidity,
        wind_speed: currentData.wind.speed,
        tomorrow: tomorrowForecast
    };
}
