import { Stock, Holding, CalendarEvent, Watchlist, Trade, Portfolio, News } from './types';

// Helper to generate historical price array
const generateHistory = (basePrice: number, changeTrend: number, days: number = 250): { date: string; price: number; volume: number }[] => {
  const result = [];
  let currentPrice = basePrice;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const rand = Math.sin(i * 0.4) * (basePrice * 0.03) + (Math.random() - 0.5) * (basePrice * 0.015);
    currentPrice = currentPrice + (changeTrend / days) + rand;
    result.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: Math.round(currentPrice * 100) / 100,
      volume: Math.floor(Math.random() * 5000000) + 1000000,
    });
  }
  return result;
};

export const INITIAL_STOCKS: Stock[] = [
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    sector: 'Technology',
    industry: 'Semiconductors',
    price: 132.85,
    change: 3.24,
    changePercent: 2.50,
    open: 130.12,
    high: 133.50,
    low: 129.80,
    close: 132.85,
    volume: '45.2M',
    high52W: 140.76,
    low52W: 39.23,
    marketCap: '3.34T',
    pe: 72.45,
    pb: 54.12,
    debtEquity: 0.15,
    roe: 115.6,
    revenueGrowth: 262.0,
    divYield: 0.02,
    sparkline: [122, 124, 123, 126, 125, 128, 127, 130, 129, 132.85],
    history: generateHistory(130, 2.85, 250),
    alerts: [
      'High volatility detected in pre-market trading. Upcoming earnings report scheduled for next week.'
    ],
    news: [
      {
        id: 'nvda-1',
        title: 'Nvidia Blackwell Ultra Chips Set to Dominate AI Infrastructure',
        source: 'Reuters',
        time: '1 hr ago',
        summary: 'Analysts expect Nvidia\'s new Blackwell platform to drive a massive upgrade cycle among hyperscalers throughout the second half of 2026.'
      },
      {
        id: 'nvda-2',
        title: 'Semiconductor Index Surges on Robust Data Center Capex Reports',
        source: 'Bloomberg',
        time: '3 hrs ago',
        summary: 'Major cloud providers reaffirm plans to increase capital expenditures, bringing direct tailwinds to semiconductor market leaders.'
      }
    ],
    technicals: {
      rsi: 62.1,
      rsiStatus: 'Neutral (Bullish Bias)',
      macd: '+1.24',
      macdStatus: 'Bullish Crossover',
      sma50: 128.50,
      sma50Status: 'Above Support'
    },
    analystRating: {
      consensus: 'STRONG BUY',
      targetPrice: 155.00,
      buyPercent: 88,
      holdPercent: 10,
      sellPercent: 2
    }
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    sector: 'Technology',
    industry: 'Infrastructure Software',
    price: 412.55,
    change: 2.34,
    changePercent: 0.57,
    open: 410.20,
    high: 413.80,
    low: 409.50,
    close: 412.55,
    volume: '24.5M',
    high52W: 430.82,
    low52W: 285.50,
    marketCap: '3.1T',
    pe: 36.42,
    pb: 12.14,
    debtEquity: 0.42,
    roe: 38.5,
    revenueGrowth: 17.2,
    divYield: 0.72,
    sparkline: [405, 408, 406, 411, 409, 413, 411, 414, 410, 412.55],
    history: generateHistory(408, 4.55, 250),
    alerts: [
      'New AI features announced for Azure Enterprise Cloud are showing strong initial adoption in pilot groups.'
    ],
    news: [
      {
        id: 'msft-1',
        title: 'Microsoft unveils new AI integrations across enterprise suite',
        source: 'Reuters',
        time: '2 hrs ago',
        summary: 'The software giant announced deeper integration of generative AI components across Office 365 and cloud services, expanding revenue potential.'
      },
      {
        id: 'msft-2',
        title: 'Q2 Earnings preview: Cloud growth expected to drive margins',
        source: 'Bloomberg',
        time: '5 hrs ago',
        summary: 'Azure Cloud revenue is forecasted to climb 28% year-over-year as migration trends persist and custom chip offerings expand.'
      }
    ],
    technicals: {
      rsi: 54.8,
      rsiStatus: 'Neutral',
      macd: '+0.45',
      macdStatus: 'Bullish Crossover',
      sma50: 406.80,
      sma50Status: 'Slightly Above SMA'
    },
    analystRating: {
      consensus: 'BUY',
      targetPrice: 460.00,
      buyPercent: 82,
      holdPercent: 15,
      sellPercent: 3
    }
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    price: 189.45,
    change: -0.80,
    changePercent: -0.42,
    open: 190.50,
    high: 191.20,
    low: 188.90,
    close: 189.45,
    volume: '52.1M',
    high52W: 199.62,
    low52W: 165.00,
    marketCap: '2.9T',
    pe: 29.10,
    pb: 38.45,
    debtEquity: 1.45,
    roe: 145.2,
    revenueGrowth: 8.6,
    divYield: 0.51,
    sparkline: [192, 191, 193, 190, 189, 191, 192, 188, 190, 189.45],
    history: generateHistory(191, -1.55, 250),
    alerts: [],
    news: [
      {
        id: 'aapl-1',
        title: 'Apple Expands Supply Chain Operations in India and Vietnam',
        source: 'Reuters',
        time: '4 hrs ago',
        summary: 'As part of global diversification, iPhone manufacturing hubs are shifting additional capacity to South Asian manufacturing corridors.'
      }
    ],
    technicals: {
      rsi: 45.2,
      rsiStatus: 'Neutral (Bearish Bias)',
      macd: '-0.32',
      macdStatus: 'Bearish Divergence',
      sma50: 191.10,
      sma50Status: 'Below SMA Resistance'
    },
    analystRating: {
      consensus: 'HOLD',
      targetPrice: 202.00,
      buyPercent: 54,
      holdPercent: 38,
      sellPercent: 8
    }
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    sector: 'Consumer Cyclical',
    industry: 'Internet Retail',
    price: 178.45,
    change: 1.95,
    changePercent: 1.11,
    open: 176.20,
    high: 179.10,
    low: 175.80,
    close: 178.45,
    volume: '33.4M',
    high52W: 189.77,
    low52W: 118.35,
    marketCap: '1.85T',
    pe: 42.15,
    pb: 9.35,
    debtEquity: 0.38,
    roe: 22.3,
    revenueGrowth: 12.5,
    divYield: 0.00,
    sparkline: [172, 174, 173, 175, 176, 178, 175, 177, 176, 178.45],
    history: generateHistory(174, 4.45, 250),
    alerts: [],
    news: [
      {
        id: 'amzn-1',
        title: 'AWS Announces Additional $5B Data Center Buildout in Europe',
        source: 'Financial Times',
        time: '8 hrs ago',
        summary: 'Amazon Web Services details capital deployment plans to satisfy expanding localized AI model workloads in Germany.'
      }
    ],
    technicals: {
      rsi: 58.3,
      rsiStatus: 'Neutral (Bullish)',
      macd: '+0.88',
      macdStatus: 'Bullish Trend',
      sma50: 174.20,
      sma50Status: 'Above SMA'
    },
    analystRating: {
      consensus: 'BUY',
      targetPrice: 195.00,
      buyPercent: 85,
      holdPercent: 12,
      sellPercent: 3
    }
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    sector: 'Consumer Cyclical',
    industry: 'Auto Manufacturers',
    price: 195.30,
    change: -4.78,
    changePercent: -2.40,
    open: 200.50,
    high: 201.10,
    low: 194.50,
    close: 195.30,
    volume: '88.2M',
    high52W: 271.00,
    low52W: 138.80,
    marketCap: '620B',
    pe: 56.40,
    pb: 11.20,
    debtEquity: 0.08,
    roe: 14.8,
    revenueGrowth: -3.5,
    divYield: 0.00,
    sparkline: [210, 205, 208, 199, 202, 197, 198, 193, 199, 195.30],
    history: generateHistory(205, -9.70, 250),
    alerts: [
      'Delivery metrics for the quarter showed higher inventory bottlenecks in North American distribution channels.'
    ],
    news: [
      {
        id: 'tsla-1',
        title: 'Tesla Tests Autonomous FSD Fleet in Major Texas Metro Areas',
        source: 'TechCrunch',
        time: '6 hrs ago',
        summary: 'Tesla launches targeted pilot program for Full Self-Driving capabilities in complex urban environments, raising regulatory interest.'
      }
    ],
    technicals: {
      rsi: 38.4,
      rsiStatus: 'Oversold Territory',
      macd: '-2.14',
      macdStatus: 'Bearish Trend',
      sma50: 208.50,
      sma50Status: 'Below SMA Resistance'
    },
    analystRating: {
      consensus: 'HOLD',
      targetPrice: 210.00,
      buyPercent: 41,
      holdPercent: 44,
      sellPercent: 15
    }
  },
  {
    symbol: 'THYAO',
    name: 'Türk Hava Yolları AO',
    sector: 'Transportation',
    industry: 'Airlines',
    price: 312.50,
    change: 4.50,
    changePercent: 1.46,
    open: 308.00,
    high: 315.00,
    low: 307.00,
    close: 312.50,
    volume: '12.4M',
    high52W: 335.00,
    low52W: 180.00,
    marketCap: '431.2B TL',
    pe: 8.24,
    pb: 1.15,
    debtEquity: 1.12,
    roe: 28.4,
    revenueGrowth: 32.5,
    divYield: 0.00,
    sparkline: [298, 302, 301, 305, 304, 309, 308, 311, 310, 312.50],
    history: generateHistory(305, 7.50, 250),
    alerts: ['Güçlü turizm talebi ve genişleyen rota ağı yolcu doluluk oranlarını artırıyor.'],
    news: [
      {
        id: 'thyao-1',
        title: 'THY Yeni Nesil Geniş Gövdeli Uçak Siparişlerini Açıkladı',
        source: 'Kap',
        time: '2 saat önce',
        summary: 'Türk Hava Yolları, filo büyümesini sürdürmek amacıyla Airbus ve Boeing ile ek sipariş görüşmelerini tamamladı.'
      }
    ],
    technicals: {
      rsi: 58.4,
      rsiStatus: 'Alım Bölgesine Yakın',
      macd: '+2.14',
      macdStatus: 'Güçlü Al Sinyali',
      sma50: 298.40,
      sma50Status: '50 Günlük Ortalamanın Üzerinde'
    },
    analystRating: {
      consensus: 'STRONG BUY',
      targetPrice: 380.00,
      buyPercent: 85,
      holdPercent: 12,
      sellPercent: 3
    }
  },
  {
    symbol: 'ASELS',
    name: 'Aselsan Elektronik Sanayi',
    sector: 'Technology',
    industry: 'Defense & Aerospace',
    price: 64.20,
    change: 1.15,
    changePercent: 1.82,
    open: 63.05,
    high: 64.85,
    low: 62.90,
    close: 64.20,
    volume: '22.8M',
    high52W: 72.40,
    low52W: 38.50,
    marketCap: '292.7B TL',
    pe: 14.20,
    pb: 3.10,
    debtEquity: 0.35,
    roe: 21.8,
    revenueGrowth: 42.1,
    divYield: 1.25,
    sparkline: [61.2, 62.0, 61.8, 62.5, 63.1, 62.8, 63.5, 63.2, 63.8, 64.20],
    history: generateHistory(62, 2.20, 250),
    alerts: ['Yeni ihracat sözleşmeleri ile sipariş defteri rekor seviyeye ulaştı.'],
    news: [
      {
        id: 'asels-1',
        title: 'Aselsan Ortadoğu Ülkeleri ile Dev İhracat Sözleşmesi İmzaladı',
        source: 'HaberTürk',
        time: '5 saat önce',
        summary: 'Savunma sanayi devi, sınır güvenliği ve haberleşme sistemleri ihracatı için 124 milyon dolarlık yeni bir kontrat imzaladı.'
      }
    ],
    technicals: {
      rsi: 54.2,
      rsiStatus: 'Nötr',
      macd: '+0.45',
      macdStatus: 'Yükseliş Trendi',
      sma50: 61.80,
      sma50Status: 'Destek Bölgesinin Üzerinde'
    },
    analystRating: {
      consensus: 'BUY',
      targetPrice: 78.50,
      buyPercent: 78,
      holdPercent: 18,
      sellPercent: 4
    }
  },
  {
    symbol: 'EREGL',
    name: 'Ereğli Demir ve Çelik Fabrikaları',
    sector: 'Basic Materials',
    industry: 'Steel',
    price: 51.10,
    change: -0.45,
    changePercent: -0.87,
    open: 51.55,
    high: 51.80,
    low: 50.90,
    close: 51.10,
    volume: '15.1M',
    high52W: 58.20,
    low52W: 36.40,
    marketCap: '178.8B TL',
    pe: 18.50,
    pb: 1.05,
    debtEquity: 0.45,
    roe: 6.8,
    revenueGrowth: 15.2,
    divYield: 4.80,
    sparkline: [52.4, 52.1, 51.8, 52.0, 51.5, 51.9, 51.3, 51.6, 51.2, 51.10],
    history: generateHistory(52.5, -1.40, 250),
    alerts: ['Küresel çelik fiyatlarındaki dalgalanmalar marjları baskılamaya devam ediyor.'],
    news: [
      {
        id: 'eregl-1',
        title: 'Erdemir Karbon Nötr Yeşil Çelik Yatırımlarına Başlıyor',
        source: 'Dünya Gazetesi',
        time: '1 gün önce',
        summary: 'Ereğli Demir Çelik, AB Sınırda Karbon Düzenleme Mekanizmasına uyum kapsamında 1.2 milyar dolarlık dönüşüm planını devreye aldı.'
      }
    ],
    technicals: {
      rsi: 42.1,
      rsiStatus: 'Aşırı Satım Bölgesine Yakın',
      macd: '-0.85',
      macdStatus: 'Düşüş Trendi',
      sma50: 52.90,
      sma50Status: 'Direnç Altında'
    },
    analystRating: {
      consensus: 'HOLD',
      targetPrice: 56.00,
      buyPercent: 35,
      holdPercent: 55,
      sellPercent: 10
    }
  },
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    sector: 'Financial',
    industry: 'Exchange Traded Funds',
    price: 545.20,
    change: 4.12,
    changePercent: 0.76,
    open: 541.08,
    high: 546.10,
    low: 540.50,
    close: 545.20,
    volume: '62.4M',
    high52W: 552.10,
    low52W: 420.15,
    marketCap: '524B',
    pe: 24.20,
    pb: 4.10,
    debtEquity: 0.00,
    roe: 18.5,
    revenueGrowth: 10.4,
    divYield: 1.32,
    sparkline: [535, 538, 536, 540, 539, 542, 541, 544, 543, 545.20],
    history: generateHistory(540, 5.20, 250),
    alerts: ['S&P 500 reaches new heights amid positive macro indicators and easing rate fears.'],
    news: [
      {
        id: 'spy-1',
        title: 'S&P 500 Index Eyes Records as Inflation Softens Faster Than Forecasted',
        source: 'WSJ',
        time: '3 hrs ago',
        summary: 'Inflow into index ETFs accelerates as broad market participation offsets consolidation in tech megacaps.'
      }
    ],
    technicals: {
      rsi: 61.5,
      rsiStatus: 'Bullish Momentum',
      macd: '+4.20',
      macdStatus: 'Al Sinyali',
      sma50: 532.10,
      sma50Status: '50 Günlük Ortalamanın Üzerinde'
    },
    analystRating: {
      consensus: 'BUY',
      targetPrice: 580.00,
      buyPercent: 75,
      holdPercent: 22,
      sellPercent: 3
    }
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust ETF',
    sector: 'Technology',
    industry: 'Exchange Traded Funds',
    price: 478.10,
    change: 5.80,
    changePercent: 1.23,
    open: 472.30,
    high: 479.50,
    low: 471.80,
    close: 478.10,
    volume: '41.2M',
    high52W: 488.50,
    low52W: 335.20,
    marketCap: '242B',
    pe: 31.50,
    pb: 7.80,
    debtEquity: 0.00,
    roe: 25.4,
    revenueGrowth: 12.8,
    divYield: 0.58,
    sparkline: [465, 470, 468, 473, 472, 475, 474, 477, 475, 478.10],
    history: generateHistory(470, 8.10, 250),
    alerts: ['Nasdaq-100 tracker showing tech leadership dominance after semiconductor upgrade cycle.'],
    news: [
      {
        id: 'qqq-1',
        title: 'Tech Inflows Mount as Institutional Investors Double Down on High-Growth Sectors',
        source: 'Financial Times',
        time: '4 hrs ago',
        summary: 'Exchange traded products representing Nasdaq-100 see heavy trade volume matching all-time-high trends.'
      }
    ],
    technicals: {
      rsi: 59.8,
      rsiStatus: 'Alım Ağırlıklı',
      macd: '+3.15',
      macdStatus: 'Yükseliş Trendi',
      sma50: 462.50,
      sma50Status: 'Yükselen Destek Üzerinde'
    },
    analystRating: {
      consensus: 'BUY',
      targetPrice: 510.00,
      buyPercent: 80,
      holdPercent: 16,
      sellPercent: 4
    }
  }
];

export const INITIAL_HOLDINGS: Holding[] = [
  {
    symbol: 'MSFT',
    quantity: 2.0409,
    costPrice: 293.99
  },
  {
    symbol: 'NVDA',
    quantity: 1.9139,
    costPrice: 209.00
  }
];

export const INITIAL_WATCHLISTS: Watchlist[] = [
  {
    id: 'w1',
    name: 'BIST İzleme Listesi',
    symbols: ['THYAO', 'ASELS', 'EREGL']
  },
  {
    id: 'w2',
    name: 'ABD İzleme Listesi',
    symbols: ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA']
  }
];

export const MACRO_CALENDAR: CalendarEvent[] = [
  {
    id: 'cal-1',
    title: 'CPI Data (MoM)',
    date: 'Today',
    time: '14:30',
    importance: 'CRITICAL'
  },
  {
    id: 'cal-2',
    title: 'NVDA Earnings Call',
    date: 'Tomorrow',
    time: '16:00',
    importance: 'HIGH'
  },
  {
    id: 'cal-3',
    title: 'Fed Rate Decision',
    date: 'Wed',
    time: '20:00',
    importance: 'CRITICAL'
  },
  {
    id: 'cal-4',
    title: 'Retail Sales Report',
    date: 'Next Fri',
    time: '15:30',
    importance: 'MEDIUM'
  }
];

export const INITIAL_TRADES: Trade[] = [
  {
    id: 't-1',
    symbol: 'MSFT',
    type: 'BUY',
    quantity: 1.0,
    price: 290.00,
    notes: 'Yüksek bulut büyümesi ve yapay zeka entegrasyonu nedeniyle alım yapıldı.',
    date: '2026-05-12T10:30:00',
    portfolioId: 'port-1'
  },
  {
    id: 't-2',
    symbol: 'MSFT',
    type: 'BUY',
    quantity: 1.0409,
    price: 297.82,
    notes: 'Beklentileri aşan bilançodan sonra pozisyon artırıldı.',
    date: '2026-06-15T11:15:00',
    portfolioId: 'port-1'
  },
  {
    id: 't-3',
    symbol: 'NVDA',
    type: 'BUY',
    quantity: 1.9139,
    price: 209.00,
    notes: 'Yapay zeka çip liderine geliştirici konferansı öncesi giriş yapıldı.',
    date: '2026-06-20T14:45:00',
    portfolioId: 'port-1'
  },
  {
    id: 't-4',
    symbol: 'AAPL',
    type: 'BUY',
    quantity: 5.0,
    price: 175.50,
    notes: 'Güvenli liman ve istikrarlı nakit akışı sebebiyle defansif alım.',
    date: '2026-04-10T10:00:00',
    portfolioId: 'port-2'
  },
  {
    id: 't-5',
    symbol: 'AMZN',
    type: 'BUY',
    quantity: 4.5,
    price: 162.00,
    notes: 'E-ticaret ve AWS bulut büyümesi potansiyeliyle eklendi.',
    date: '2026-04-18T14:30:00',
    portfolioId: 'port-2'
  },
  {
    id: 't-6',
    symbol: 'TSLA',
    type: 'BUY',
    quantity: 10.0,
    price: 205.00,
    notes: 'Otonom sürüş ve robotaksi vizyonuna uzun vadeli yatırım tezi.',
    date: '2026-05-22T09:45:00',
    portfolioId: 'port-3'
  }
];

export const INITIAL_PORTFOLIOS: Portfolio[] = [
  {
    id: 'port-1',
    name: 'Teknoloji Portföyüm',
    holdings: [
      { symbol: 'MSFT', quantity: 2.0409, costPrice: 293.99 },
      { symbol: 'NVDA', quantity: 1.9139, costPrice: 209.00 }
    ]
  },
  {
    id: 'port-2',
    name: 'Defansif Varlıklar',
    holdings: [
      { symbol: 'AAPL', quantity: 5.0, costPrice: 175.50 },
      { symbol: 'AMZN', quantity: 4.5, costPrice: 162.00 }
    ]
  },
  {
    id: 'port-3',
    name: 'Yüksek Volatilite',
    holdings: [
      { symbol: 'TSLA', quantity: 10.0, costPrice: 205.00 }
    ]
  }
];

export const MOCK_NEWS: News[] = [
  {
    id: 'n1',
    title: 'Fed Faiz Kararı Açıklanıyor: Küresel Piyasalar Eylül İndirimini Fiyatlıyor',
    source: 'Bloomberg HT',
    time: '15 dk önce',
    summary: 'Amerikan Merkez Bankası Fed\'in bu akşamki faiz toplantısında faiz oranlarını sabit tutması ancak sonbahar için net faiz indirimi takvimi sunması bekleniyor.',
    category: 'macro',
    url: 'https://www.bloomberght.com'
  },
  {
    id: 'n2',
    title: 'Nvidia Blackwell Ultra Sevkiyatları Başlıyor: AI Çipleri Yok Satıyor',
    source: 'Borsa Gündem',
    time: '45 dk önce',
    summary: 'Analistler, Nvidia\'nın yeni Blackwell Ultra yapay zeka çip mimarisinin 2026\'nın ikinci yarısında tedarik zinciri liderliğini pekiştirerek rekor marjlar getireceğini öngörüyor.',
    category: 'stock',
    symbol: 'NVDA',
    url: 'https://www.borsagundem.com'
  },
  {
    id: 'n3',
    title: 'ABD Enflasyon Verileri Sonrası S&P 500 ve Nasdaq Vadelilerinde Alıcılı Seyir',
    source: 'Reuters Türkçe',
    time: '2 saat önce',
    summary: 'Tüketici fiyat endeksinin beklentilere paralel gelmesi küresel risk iştahını artırdı. Yatırımcıların faiz indirimi beklentileri pekişiyor.',
    category: 'macro',
    url: 'https://www.reuters.com'
  },
  {
    id: 'n4',
    title: 'Microsoft Azure Bulut Gelirlerinde Yapay Zeka Desteği ile Büyük Sıçrama',
    source: 'Ekonomi Gazetesi',
    time: '3 saat önce',
    summary: 'Microsoft\'un OpenAI ortaklığıyla geliştirdiği Azure AI Enterprise bulut servisleri, Fortune 500 şirketlerinin %65\'i tarafından aktif olarak lisanslandı.',
    category: 'stock',
    symbol: 'MSFT',
    url: 'https://www.ekonomim.com'
  },
  {
    id: 'n5',
    title: 'Apple Tedarik Zincirini Hindistan ve Vietnam\'a Kaydırarak Bağımlılığı Azaltıyor',
    source: 'Dünya Gazetesi',
    time: '5 saat önce',
    summary: 'Apple, global üretim ağını çeşitlendirme planı kapsamında, yeni nesil iPhone montaj hatlarının ek kapasitesini Güneydoğu Asya fabrikalarına taşımaya başladı.',
    category: 'stock',
    symbol: 'AAPL',
    url: 'https://www.dunya.com'
  },
  {
    id: 'n6',
    title: 'Amazon Web Services (AWS), Avrupa Yapay Zeka Veri Merkezleri İçin 5 Milyar Euro Yatıracak',
    source: 'CNBC-e',
    time: '7 saat önce',
    summary: 'AWS, Avrupa Birliği sınırları içinde artan yerel yapay zeka veri işleme mevzuatlarına uyum sağlamak için Almanya merkezli altyapısını genişletiyor.',
    category: 'stock',
    symbol: 'AMZN',
    url: 'https://www.cnbce.com'
  },
  {
    id: 'n7',
    title: 'Tesla Austin Tesislerinde FSD V12 Otonom Sürüş Testlerini Hızlandırıyor',
    source: 'Webrazzi',
    time: '9 saat önce',
    summary: 'Tesla, tam otonom sürüş (FSD) yazılımının yeni uçtan uca sinir ağı tabanlı sürümünü Teksas sokaklarında daha fazla kullanıcıyla buluşturarak lisanslama aşamasına yaklaştı.',
    category: 'stock',
    symbol: 'TSLA',
    url: 'https://webrazzi.com'
  },
  {
    id: 'n8',
    title: 'Yarı İletken Sektöründe Birleşme ve Satın Almalarda Canlanma Beklentisi',
    source: 'Investing.com',
    time: '12 saat önce',
    summary: 'Yapay zeka devriminin özel çiplere olan talebi katlaması, büyük teknoloji holdinglerinin orta ölçekli yarı iletken firmalarını satın alma planlarını tetikliyor.',
    category: 'tech',
    url: 'https://tr.investing.com'
  },
  {
    id: 'n9',
    title: 'Teknolojide Yapay Zeka İstihdamı Rekor Kırarken Klasik Yazılımcı Kadroları Daralıyor',
    source: 'TechInside',
    time: '1 gün önce',
    summary: 'Büyük teknoloji firmaları genel organizasyonel sadeleşmeye giderken, LLM eğitimi, veritabanı optimizasyonu ve GPU mühendisliği pozisyonlarında rekor maaşlarla işe alım yapıyor.',
    category: 'tech',
    url: 'https://www.techinside.com'
  }
];
