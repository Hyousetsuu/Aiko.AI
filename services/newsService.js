import Parser from 'rss-parser';
const parser = new Parser();

export function extractNewsParams(text) {
    const countMatch = text.match(/\b(\d+)\s*(?:berita|artikel|kabar)?\b/i);
    let count = countMatch ? parseInt(countMatch[1]) : 5;
    count = Math.max(1, Math.min(count, 10));

    let rawTopicMatch = text.match(/berita\s+(.*)/i);
    let rawTopic = rawTopicMatch ? rawTopicMatch[1].toLowerCase() : "";
    rawTopic = rawTopic.replace(/\b\d+\b/g, '').replace(/[^\w\s]/g, '');
    
    const stopWords = ["tentang", "topik", "terkini", "hari ini", "di ", "yang", "minta", "berikan"];
    for (let word of stopWords) {
        rawTopic = rawTopic.replace(new RegExp(`\\b${word}\\b`, 'gi'), " ");
    }
    
    rawTopic = rawTopic.split(/\s+/).filter(Boolean).join(" ");
    return { topic: rawTopic || "indonesia", count };
}

export async function getNews(topic, count) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=id&gl=ID&ceid=ID:id`;
    const feed = await parser.parseURL(url);
    
    const newsList = feed.items.slice(0, count).map(item => {
        const titleParts = item.title.split(' - ');
        const source = titleParts.length > 1 ? titleParts.pop() : 'Google News';
        const title = titleParts.join(' - ');
        return {
            title,
            source,
            link: item.link,
            published: item.pubDate
        };
    });
    
    return {
        topic: topic || "Terkini",
        articles: newsList
    };
}
