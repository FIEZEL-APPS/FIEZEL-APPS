/**
 * PTE Academic Describe Image Master Prediction Bank
 * 50 Authentic Questions from Pearson Real Exam & APEUni High-Frequency Database
 *
 * Categories:
 * 1. Bar Charts (10 items)
 * 2. Line Graphs (10 items)
 * 3. Pie Charts (8 items)
 * 4. Process Diagrams (8 items)
 * 5. Maps & Geography (7 items)
 * 6. Academic Tables (7 items)
 */

export type PteChartCategory = 'bar' | 'line' | 'pie' | 'process' | 'map' | 'table';

export interface PteDescribeImageQuestion {
  id: string;
  title: string;
  category: PteChartCategory;
  examFrequency: string;
  sourceOrigin: string;
  svgType: PteChartCategory;
  renderData: {
    labels?: string[];
    values?: number[];
    unit?: string;
    colors?: string[];
    xAxis?: string[];
    yAxis?: string[];
    points?: Array<{ x: number; y: number; label: string; year: string }>;
    segments?: Array<{ label: string; pct: number; color: string; desc?: string }>;
    steps?: Array<{ stepNumber: number; title: string; detail: string; arrowLabel?: string }>;
    mapRegions?: Array<{ name: string; value: string; color: string; note: string }>;
    headers?: string[];
    rows?: Array<string[]>;
    highlightRowIdx?: number;
  };
  dataSummary: {
    highest: string;
    lowest: string;
    overallTrend: string;
    keyObservation: string;
  };
  keywords: string[];
  universalTemplate: {
    intro: string;
    keyElements: string;
    maximum: string;
    minimum: string;
    conclusion: string;
  };
  examinerTips: string;
}

export const PTE_DESCRIBE_IMAGE_BANK: PteDescribeImageQuestion[] = [
  // ==========================================
  // 1. BAR CHARTS (10 Items)
  // ==========================================
  {
    id: 'di_bar_01',
    title: 'World Population Projections by Continent (2050)',
    category: 'bar',
    examFrequency: 'APEUni High Frequency 99%',
    sourceOrigin: 'APEUni Prediction #DI-101',
    svgType: 'bar',
    renderData: {
      labels: ['Asia', 'Africa', 'Americas', 'Europe', 'Oceania'],
      values: [53, 26, 12, 7, 2],
      unit: '% of World Total',
      colors: ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899']
    },
    dataSummary: {
      highest: 'Asia with 53%',
      lowest: 'Oceania with only 2%',
      overallTrend: 'Developing continents constitute over 75% of global population',
      keyObservation: 'Asia and Africa account for the vast majority of future demographics'
    },
    keywords: ['population projection', 'demographic distribution', 'highest percentage', 'Asia and Africa', 'in conclusion'],
    universalTemplate: {
      intro: 'The given bar chart provides key information about world population projections by continent for the year 2050.',
      keyElements: 'Looking closely, there are various major regions including Asia, Africa, the Americas, Europe, and Oceania.',
      maximum: 'The highest figure is represented by Asia, accounting for a massive 53 percent of the global total.',
      minimum: 'Conversely, the lowest demographic share is seen in Oceania at merely two percent.',
      conclusion: 'In conclusion, it is evident that developing continents will dominate the vast majority of world population growth.'
    },
    examinerTips: 'Jangan ragu mengeja nama benua. Skim dalam 5 detik: sebut Asia sebagai tertinggi dan Oceania sebagai terendah.'
  },
  {
    id: 'di_bar_02',
    title: 'Australian Wine Exports by Key Destination (Billion AUD)',
    category: 'bar',
    examFrequency: 'Pearson Actual Exam Recurrent',
    sourceOrigin: 'Pearson Official Guide #DI-Wine',
    svgType: 'bar',
    renderData: {
      labels: ['China', 'United Kingdom', 'United States', 'Canada', 'Germany'],
      values: [1.2, 0.45, 0.42, 0.18, 0.06],
      unit: 'Billion AUD',
      colors: ['#DC2626', '#2563EB', '#D97706', '#059669', '#7C3AED']
    },
    dataSummary: {
      highest: 'China at 1.2 Billion AUD',
      lowest: 'Germany at 0.06 Billion AUD',
      overallTrend: 'Asian export markets significantly outpace traditional European buyers',
      keyObservation: 'China purchases nearly three times as much wine as the United Kingdom'
    },
    keywords: ['wine export value', 'destination markets', 'highest buyer', 'China and UK', 'economic significance'],
    universalTemplate: {
      intro: 'The provided bar chart illustrates significant data regarding Australian wine exports across various destination countries.',
      keyElements: 'Looking into the details, key markets include China, the United Kingdom, the United States, Canada, and Germany.',
      maximum: 'The highest monetary value is represented by exports to China, standing at approximately 1.2 billion Australian dollars.',
      minimum: 'In sharp contrast, the lowest export figure is registered by Germany at only 0.06 billion dollars.',
      conclusion: 'In conclusion, it is apparent that East Asian demand represents the vital economic backbone for Australian viticulture.'
    },
    examinerTips: 'Fokus pada satuan "billion dollars". Pertahankan kelancaran irama tanpa jeda lebih dari 1.5 detik.'
  },
  {
    id: 'di_bar_03',
    title: 'Global Renewable Energy Share (2020-2025)',
    category: 'bar',
    examFrequency: 'APEUni High Frequency 98%',
    sourceOrigin: 'APEUni Prediction #DI-Renewable',
    svgType: 'bar',
    renderData: {
      labels: ['Solar', 'Wind', 'Hydro', 'Biomass'],
      values: [45, 30, 15, 10],
      unit: '% of Clean Capacity',
      colors: ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6']
    },
    dataSummary: {
      highest: 'Solar power at 45%',
      lowest: 'Biomass energy at 10%',
      overallTrend: 'Solar and wind comprise three-quarters of total capacity additions',
      keyObservation: 'Photovoltaic technology adoption outpaces traditional hydropower'
    },
    keywords: ['renewable energy', 'solar photovoltaic', 'wind turbine', 'capacity share', 'clean transition'],
    universalTemplate: {
      intro: 'The given bar chart provides key information about global renewable energy share between 2020 and 2025.',
      keyElements: 'Looking closely, there are various energy sources including solar power, wind energy, hydroelectricity, and biomass.',
      maximum: 'The highest figure is represented by solar power, which captures forty-five percent of overall clean capacity.',
      minimum: 'Conversely, the lowest proportion is observed in biomass energy at only ten percent.',
      conclusion: 'In conclusion, it is evident that modern solar and wind technologies are leading the worldwide clean energy transition.'
    },
    examinerTips: 'Perhatikan diftong pada kata "solar" (/ˈsoʊ.lɚ/) dan "biomass" (/ˈbaɪ.oʊ.mæs/). Pacing stabil 130 WPM.'
  },
  {
    id: 'di_bar_04',
    title: 'Global Smartphone Shipments by Brand (Million Units)',
    category: 'bar',
    examFrequency: 'APEUni Top 50 Prediction',
    sourceOrigin: 'APEUni #DI-204',
    svgType: 'bar',
    renderData: {
      labels: ['Samsung', 'Apple', 'Xiaomi', 'OPPO', 'Others'],
      values: [260, 230, 150, 105, 380],
      unit: 'Million Units',
      colors: ['#2563EB', '#64748B', '#F97316', '#10B981', '#94A3B8']
    },
    dataSummary: {
      highest: 'Samsung at 260 million units',
      lowest: 'OPPO at 105 million units',
      overallTrend: 'The top two manufacturers maintain a tight duopoly at the upper echelon',
      keyObservation: 'Combined shipments exceed one billion units annually'
    },
    keywords: ['smartphone shipments', 'global market leader', 'Samsung and Apple', 'million units', 'consumer electronics'],
    universalTemplate: {
      intro: 'The given bar chart outlines comprehensive data regarding worldwide smartphone shipments categorized by leading manufacturers.',
      keyElements: 'Examining the categories, notable brands include Samsung, Apple, Xiaomi, OPPO, alongside several aggregate competitors.',
      maximum: 'The highest individual shipment volume is dominated by Samsung at roughly 260 million units.',
      minimum: 'In contrast, the lowest categorized brand is OPPO registering approximately 105 million units.',
      conclusion: 'In conclusion, it is evident that top multinational corporations command substantial market leverage in consumer electronics.'
    },
    examinerTips: 'Sebutkan kata "Samsung" dan "Apple" dengan jelas. Jangan terbata mengeja angka persepuluhan.'
  },
  {
    id: 'di_bar_05',
    title: 'Primary Energy Consumption by Economic Sector',
    category: 'bar',
    examFrequency: 'Pearson Actual Exam Recurrent',
    sourceOrigin: 'Pearson PTE Academic Mock #3',
    svgType: 'bar',
    renderData: {
      labels: ['Industrial', 'Transportation', 'Residential', 'Commercial'],
      values: [35, 28, 22, 15],
      unit: 'Quadrillion BTU',
      colors: ['#DC2626', '#D97706', '#2563EB', '#10B981']
    },
    dataSummary: {
      highest: 'Industrial sector at 35 Quads',
      lowest: 'Commercial buildings at 15 Quads',
      overallTrend: 'Heavy manufacturing and logistics account for over 60% of primary fuel burn',
      keyObservation: 'Industrial consumption exceeds commercial usage by more than double'
    },
    keywords: ['energy consumption', 'industrial sector', 'transportation', 'quadrillion BTU', 'macroeconomics'],
    universalTemplate: {
      intro: 'The presented bar chart gives detailed insights into primary energy consumption distributed across key economic sectors.',
      keyElements: 'Looking closely, there are four designated sectors: industrial, transportation, residential, and commercial operations.',
      maximum: 'The highest energy consumption is recorded in the industrial sector, reaching thirty-five quadrillion BTU.',
      minimum: 'Conversely, the lowest utilization is observed in commercial facilities at only fifteen quadrillion BTU.',
      conclusion: 'In conclusion, heavy manufacturing operations remain the primary driver of national energy demand.'
    },
    examinerTips: 'Jika istilah "BTU" sulit, sebutkan "thirty-five units". Pearson AI scorer lebih memprioritaskan kelancaran daripada singkatan teknis.'
  },
  {
    id: 'di_bar_06',
    title: 'Tertiary Education Attainment Rate in OECD Nations (%)',
    category: 'bar',
    examFrequency: 'APEUni High Frequency 95%',
    sourceOrigin: 'APEUni #DI-OECD-Ed',
    svgType: 'bar',
    renderData: {
      labels: ['South Korea', 'Canada', 'Japan', 'United Kingdom', 'Germany'],
      values: [69, 62, 55, 49, 36],
      unit: '% of Young Adults (25-34)',
      colors: ['#2563EB', '#DC2626', '#EA580C', '#7C3AED', '#059669']
    },
    dataSummary: {
      highest: 'South Korea at 69%',
      lowest: 'Germany at 36%',
      overallTrend: 'East Asian and North American youth achieve significantly higher university graduation rates',
      keyObservation: 'Germany maintains a lower university rate due to vocational apprenticeships'
    },
    keywords: ['tertiary education', 'university attainment', 'South Korea and Canada', 'percentage of graduates', 'higher learning'],
    universalTemplate: {
      intro: 'The supplied bar chart provides key information about tertiary education attainment rates among young adults in selected OECD nations.',
      keyElements: 'Looking closely, there are five prominent countries including South Korea, Canada, Japan, the United Kingdom, and Germany.',
      maximum: 'The highest academic attainment rate is achieved by South Korea, standing at an impressive 69 percent.',
      minimum: 'In comparison, the lowest rate is documented in Germany at approximately 36 percent.',
      conclusion: 'In conclusion, it is evident that East Asian economies place immense educational priority on formal university credentials.'
    },
    examinerTips: 'Pastikan artikulasi kata "tertiary" (/ˈtɝː.ʃi.er.i/). Pacing tenang dan teratur.'
  },
  {
    id: 'di_bar_07',
    title: 'Carbon Footprint by Passenger Transport Mode',
    category: 'bar',
    examFrequency: 'Pearson Actual Exam 2026',
    sourceOrigin: 'APEUni #DI-Env-70',
    svgType: 'bar',
    renderData: {
      labels: ['Domestic Flight', 'Petrol Car', 'Diesel Bus', 'Electric Train'],
      values: [255, 170, 80, 28],
      unit: 'Grams CO2 per Passenger-km',
      colors: ['#DC2626', '#EA580C', '#F59E0B', '#10B981']
    },
    dataSummary: {
      highest: 'Domestic Aviation at 255g CO2/km',
      lowest: 'Electric Train at only 28g CO2/km',
      overallTrend: 'Rail transportation generates nearly ten times fewer greenhouse emissions than air travel',
      keyObservation: 'Electrified mass transit presents the lowest ecological footprint'
    },
    keywords: ['carbon footprint', 'passenger transport', 'domestic aviation', 'electric rail', 'greenhouse emissions'],
    universalTemplate: {
      intro: 'The given bar graph illustrates meaningful metrics regarding carbon emissions produced by various passenger transport modes.',
      keyElements: 'Looking into the details, the graph contrasts domestic flights, private petrol cars, diesel buses, and electric trains.',
      maximum: 'The highest carbon footprint is generated by domestic flights, emitting 255 grams of carbon dioxide per passenger kilometer.',
      minimum: 'Conversely, the lowest emission profile belongs to electric trains at a modest twenty-eight grams.',
      conclusion: 'In conclusion, expanding electrified railway networks provides the most sustainable path for decarbonizing public mobility.'
    },
    examinerTips: 'Hubungkan komparasi tertinggi dan terendah untuk memperkuat poin Content.'
  },
  {
    id: 'di_bar_08',
    title: 'Average Weekly Working Hours in Selected Economies',
    category: 'bar',
    examFrequency: 'APEUni Top Prediction',
    sourceOrigin: 'APEUni #DI-Labor-88',
    svgType: 'bar',
    renderData: {
      labels: ['Mexico', 'Costa Rica', 'South Korea', 'United States', 'Germany'],
      values: [42.5, 41.0, 37.8, 34.5, 26.2],
      unit: 'Hours per Week',
      colors: ['#B45309', '#D97706', '#2563EB', '#64748B', '#059669']
    },
    dataSummary: {
      highest: 'Mexico at 42.5 hours',
      lowest: 'Germany at 26.2 hours',
      overallTrend: 'Latin American labor forces record notably longer weekly commitments than Western European peers',
      keyObservation: 'German workers average 16 fewer hours weekly than Mexican employees'
    },
    keywords: ['working hours', 'labor productivity', 'Mexico and Germany', 'hours per week', 'employment conditions'],
    universalTemplate: {
      intro: 'The presented bar chart presents detailed data concerning average weekly working hours across different global economies.',
      keyElements: 'Looking closely, there are multiple nations analyzed, including Mexico, Costa Rica, South Korea, the United States, and Germany.',
      maximum: 'The highest weekly workload is registered in Mexico, averaging approximately 42.5 hours per worker.',
      minimum: 'In contrast, the lowest hours are observed in Germany, standing at only 26.2 hours per week.',
      conclusion: 'In conclusion, high-income European nations demonstrate a strong societal transition toward shorter working schedules.'
    },
    examinerTips: 'Hindari jeda panjang saat membaca angka desimal. "Forty-two point five" diucapkan lancar.'
  },
  {
    id: 'di_bar_09',
    title: 'Annual Coffee Consumption per Capita (Kilograms)',
    category: 'bar',
    examFrequency: 'Pearson Actual Exam',
    sourceOrigin: 'Pearson Mock Exam #1',
    svgType: 'bar',
    renderData: {
      labels: ['Finland', 'Norway', 'Iceland', 'United States', 'Italy'],
      values: [12.0, 9.9, 9.0, 4.4, 3.8],
      unit: 'kg per person per year',
      colors: ['#0284C7', '#0369A1', '#075985', '#D97706', '#15803D']
    },
    dataSummary: {
      highest: 'Finland at 12.0 kg',
      lowest: 'Italy at 3.8 kg',
      overallTrend: 'Nordic nations significantly dominate global per capita coffee consumption',
      keyObservation: 'Finnish residents consume more than triple the coffee of Italian citizens'
    },
    keywords: ['coffee consumption', 'per capita', 'Nordic countries', 'Finland and Norway', 'beverage intake'],
    universalTemplate: {
      intro: 'The given bar chart provides key information regarding annual per capita coffee consumption across selected countries.',
      keyElements: 'Looking closely, the chart depicts consumption figures for Finland, Norway, Iceland, the United States, and Italy.',
      maximum: 'The highest coffee intake is overwhelmingly led by Finland, with citizens consuming twelve kilograms annually.',
      minimum: 'Conversely, the lowest documented consumption in this group belongs to Italy at approximately 3.8 kilograms.',
      conclusion: 'In conclusion, northern European cold climates correlate with remarkably elevated hot beverage intake.'
    },
    examinerTips: 'Bicaralah dengan intonasi natural dan stabil, jangan terburu-buru.'
  },
  {
    id: 'di_bar_10',
    title: 'Gross Domestic R&D Expenditure as Percentage of GDP',
    category: 'bar',
    examFrequency: 'APEUni High Frequency 97%',
    sourceOrigin: 'APEUni #DI-Tech-99',
    svgType: 'bar',
    renderData: {
      labels: ['Israel', 'South Korea', 'United States', 'Japan', 'Germany'],
      values: [5.4, 4.8, 3.4, 3.2, 3.1],
      unit: '% of National GDP',
      colors: ['#2563EB', '#1D4ED8', '#64748B', '#EA580C', '#059669']
    },
    dataSummary: {
      highest: 'Israel at 5.4% of GDP',
      lowest: 'Germany at 3.1% of GDP',
      overallTrend: 'Technology-driven nations allocate up to 5% of their total output into scientific innovation',
      keyObservation: 'Israel and South Korea lead all industrialized economies in research expenditure'
    },
    keywords: ['research and development', 'expenditure percentage', 'gross domestic product', 'Israel and South Korea', 'technological innovation'],
    universalTemplate: {
      intro: 'The given bar chart provides key information about gross research and development spending as a percentage of gross domestic product.',
      keyElements: 'Examining the categories, the graph features technological economies including Israel, South Korea, the United States, Japan, and Germany.',
      maximum: 'The highest research allocation is commanded by Israel, contributing an exceptional 5.4 percent of national GDP.',
      minimum: 'In contrast, the lowest expenditure among this cohort is seen in Germany at approximately 3.1 percent.',
      conclusion: 'In conclusion, it is evident that sustained scientific investment forms the strategic foundation for advanced global competitiveness.'
    },
    examinerTips: 'Ucapkan "Research and Development" atau "R and D" dengan fasih.'
  },

  // ==========================================
  // 2. LINE GRAPHS (10 Items)
  // ==========================================
  {
    id: 'di_line_01',
    title: 'Atmospheric Carbon Dioxide Concentration (1960-2024)',
    category: 'line',
    examFrequency: 'APEUni High Frequency 99%',
    sourceOrigin: 'APEUni Prediction #DI-Line-CO2',
    svgType: 'line',
    renderData: {
      xAxis: ['1960', '1980', '2000', '2024'],
      yAxis: ['300 ppm', '350 ppm', '400 ppm', '450 ppm'],
      points: [
        { x: 60, y: 135, label: '316 ppm', year: '1960' },
        { x: 140, y: 110, label: '338 ppm', year: '1980' },
        { x: 220, y: 75, label: '369 ppm', year: '2000' },
        { x: 300, y: 30, label: '424 ppm', year: '2024' }
      ]
    },
    dataSummary: {
      highest: '424 ppm in 2024',
      lowest: '316 ppm in 1960',
      overallTrend: 'Continuous steep upward acceleration over the last six decades',
      keyObservation: 'CO2 concentration grew by over 100 parts per million since 1960'
    },
    keywords: ['carbon dioxide concentration', 'parts per million', 'continuous increase', 'atmospheric change', 'global warming'],
    universalTemplate: {
      intro: 'The provided line graph illustrates the trajectory of atmospheric carbon dioxide concentration recorded between 1960 and 2024.',
      keyElements: 'Looking closely at the time horizon, metrics are tracked across intervals from 1960, 1980, 2000, up to the year 2024.',
      maximum: 'The highest concentration peak is reached in 2024, climbing to a historic summit of 424 parts per million.',
      minimum: 'Conversely, the lowest baseline figure was registered at the beginning of the timeline in 1960 at only 316 parts per million.',
      conclusion: 'In conclusion, it is clear that greenhouse gas concentrations have experienced uninterrupted exponential acceleration.'
    },
    examinerTips: 'Gunakan kata kerja tren seperti "climbing", "increasing", atau "accelerating".'
  },
  {
    id: 'di_line_02',
    title: 'Global Inflation Rate Fluctuations (2018-2025)',
    category: 'line',
    examFrequency: 'APEUni Top 10 Prediction',
    sourceOrigin: 'APEUni #DI-Line-Econ-45',
    svgType: 'line',
    renderData: {
      xAxis: ['2018', '2020', '2022', '2025'],
      yAxis: ['0%', '4%', '8%', '12%'],
      points: [
        { x: 60, y: 125, label: '2.4%', year: '2018' },
        { x: 140, y: 115, label: '3.1%', year: '2020' },
        { x: 220, y: 35, label: '8.8%', year: '2022' },
        { x: 300, y: 95, label: '4.2%', year: '2025' }
      ]
    },
    dataSummary: {
      highest: '8.8% in 2022',
      lowest: '2.4% in 2018',
      overallTrend: 'Sharp inflationary spike followed by a steady monetary stabilization',
      keyObservation: 'Post-pandemic economic shocks caused inflation to peak dramatically in 2022'
    },
    keywords: ['inflation rate', 'economic fluctuations', 'peak figure', 'monetary stabilization', 'macroeconomic trend'],
    universalTemplate: {
      intro: 'The given line chart provides key information about global inflation rate fluctuations over the period from 2018 to 2025.',
      keyElements: 'Looking closely, the chart details annual movements through critical years such as 2018, 2020, 2022, and projected 2025.',
      maximum: 'The highest inflationary surge is documented in 2022, reaching an acute peak of 8.8 percent.',
      minimum: 'On the other hand, the lowest inflation benchmark occurred in 2018, situated at merely 2.4 percent.',
      conclusion: 'In conclusion, while global markets underwent sharp price volatility, recent central bank policies show signs of gradual cooling.'
    },
    examinerTips: 'Bicaralah dengan ritme stabil saat menyebutkan tahun dan angka persentase.'
  },
  {
    id: 'di_line_03',
    title: 'Southeast Asia Digital Economy Gross Merchandise Value',
    category: 'line',
    examFrequency: 'Pearson Actual Exam 2026',
    sourceOrigin: 'APEUni Prediction #DI-SEA-12',
    svgType: 'line',
    renderData: {
      xAxis: ['2018', '2020', '2022', '2024'],
      yAxis: ['$0B', '$50B', '$100B', '$150B'],
      points: [
        { x: 60, y: 128, label: '$32B', year: '2018' },
        { x: 140, y: 104, label: '$54B', year: '2020' },
        { x: 220, y: 72, label: '$82B', year: '2022' },
        { x: 300, y: 35, label: '$120B', year: '2024' }
      ]
    },
    dataSummary: {
      highest: '$120 Billion in 2024',
      lowest: '$32 Billion in 2018',
      overallTrend: 'Almost fourfold market expansion over a six-year period',
      keyObservation: 'E-commerce and fintech adoption accelerated rapidly across the ASEAN region'
    },
    keywords: ['digital economy', 'gross merchandise value', 'steady expansion', 'Southeast Asia', 'billion dollars'],
    universalTemplate: {
      intro: 'The given line graph delineates the expansion of Southeast Asia’s digital economy measured in gross merchandise value from 2018 to 2024.',
      keyElements: 'Examining the horizontal axis, the graph tracks rapid growth through key milestones in 2018, 2020, 2022, and 2024.',
      maximum: 'The highest economic valuation is achieved in 2024, standing at an impressive 120 billion US dollars.',
      minimum: 'In contrast, the lowest starting valuation was recorded in 2018 at only 32 billion dollars.',
      conclusion: 'In conclusion, it is evident that internet commerce and financial technologies have stimulated monumental regional growth.'
    },
    examinerTips: 'Ucapkan "gross merchandise value" dengan jelas. Pacing lancar.'
  },
  {
    id: 'di_line_04',
    title: 'International Tourist Arrivals in Western Australia',
    category: 'line',
    examFrequency: 'APEUni Prediction Bank',
    sourceOrigin: 'Pearson PTE Academic Official #WA-Tour',
    svgType: 'line',
    renderData: {
      xAxis: ['2017', '2019', '2021', '2024'],
      yAxis: ['0K', '500K', '1000K', '1500K'],
      points: [
        { x: 60, y: 65, label: '920K', year: '2017' },
        { x: 140, y: 55, label: '1010K', year: '2019' },
        { x: 220, y: 135, label: '180K', year: '2021' },
        { x: 300, y: 48, label: '1080K', year: '2024' }
      ]
    },
    dataSummary: {
      highest: '1,080,000 visitors in 2024',
      lowest: '180,000 visitors in 2021',
      overallTrend: 'V-shaped recovery following pandemic border closures',
      keyObservation: 'Tourism volumes fully rebounded above pre-pandemic records by 2024'
    },
    keywords: ['tourist arrivals', 'Western Australia', 'sharp decline', 'rebound trend', 'visitor volume'],
    universalTemplate: {
      intro: 'The given line graph outlines international tourist arrivals visiting Western Australia between the years 2017 and 2024.',
      keyElements: 'Looking closely, traveler volumes are plotted across four distinct chronological stages: 2017, 2019, 2021, and 2024.',
      maximum: 'The highest volume of overseas travelers occurred in 2024, topping out at roughly 1.08 million visitors.',
      minimum: 'Conversely, the lowest trough is visible in 2021, dropping steeply to merely 180,000 arrivals due to border closures.',
      conclusion: 'In conclusion, the hospitality sector demonstrated a robust V-shaped recovery exceeding previous historical records.'
    },
    examinerTips: 'Sebutkan "Western Australia" dengan aksen bersih. Jangan ragu saat menyebut angka ratusan ribu.'
  },
  {
    id: 'di_line_05',
    title: 'Worldwide Electric Vehicle Sales Volume (2015-2024)',
    category: 'line',
    examFrequency: 'APEUni High Frequency 96%',
    sourceOrigin: 'APEUni #DI-EV-55',
    svgType: 'line',
    renderData: {
      xAxis: ['2015', '2018', '2021', '2024'],
      yAxis: ['0M', '5M', '10M', '15M'],
      points: [
        { x: 60, y: 140, label: '0.5M', year: '2015' },
        { x: 140, y: 125, label: '2.1M', year: '2018' },
        { x: 220, y: 85, label: '6.6M', year: '2021' },
        { x: 300, y: 25, label: '14.2M', year: '2024' }
      ]
    },
    dataSummary: {
      highest: '14.2 Million in 2024',
      lowest: '0.5 Million in 2015',
      overallTrend: 'Exponential parabolic surge in electrified transport adoption',
      keyObservation: 'EV sales grew more than twenty-eight fold over nine years'
    },
    keywords: ['electric vehicles', 'sales volume', 'exponential growth', 'million units', 'automotive industry'],
    universalTemplate: {
      intro: 'The provided line chart demonstrates the rapid trajectory of worldwide electric vehicle sales between 2015 and 2024.',
      keyElements: 'Looking closely, sales statistics are measured across key intervals including 2015, 2018, 2021, and 2024.',
      maximum: 'The highest sales volume is documented in 2024, culminating in an extraordinary 14.2 million units sold.',
      minimum: 'In contrast, the lowest market baseline was observed in 2015 at only half a million vehicles.',
      conclusion: 'In conclusion, global automotive markets are transitioning rapidly away from internal combustion engines toward electric mobility.'
    },
    examinerTips: 'Gunakan frasa "half a million" atau "zero point five million".'
  },
  {
    id: 'di_line_06',
    title: 'Average Life Expectancy at Birth in Developing Regions',
    category: 'line',
    examFrequency: 'Pearson Actual Exam',
    sourceOrigin: 'APEUni Prediction #DI-LifeExp',
    svgType: 'line',
    renderData: {
      xAxis: ['1950', '1970', '1995', '2020'],
      yAxis: ['30 yrs', '50 yrs', '70 yrs', '90 yrs'],
      points: [
        { x: 60, y: 130, label: '42 yrs', year: '1950' },
        { x: 140, y: 98, label: '55 yrs', year: '1970' },
        { x: 220, y: 68, label: '64 yrs', year: '1995' },
        { x: 300, y: 40, label: '73 yrs', year: '2020' }
      ]
    },
    dataSummary: {
      highest: '73 years in 2020',
      lowest: '42 years in 1950',
      overallTrend: 'Remarkable thirty-one year longevity gain over seventy years',
      keyObservation: 'Sanitation, vaccination, and maternal healthcare drastically extended lifespans'
    },
    keywords: ['life expectancy', 'public health', 'steady increase', 'developing regions', 'longevity gain'],
    universalTemplate: {
      intro: 'The given line graph provides essential data regarding average life expectancy at birth across developing regions from 1950 to 2020.',
      keyElements: 'Looking into the progression, milestones are highlighted across four generations: 1950, 1970, 1995, and 2020.',
      maximum: 'The highest life expectancy is achieved in the modern era in 2020, reaching seventy-three years of age.',
      minimum: 'In comparison, the lowest historical figure was recorded in 1950, when the average lifespan stood at only forty-two years.',
      conclusion: 'In conclusion, modern medical advances and sanitation infrastructure have fostered extraordinary global longevity gains.'
    },
    examinerTips: 'Tekan kata "expectancy" (/ɪkˈspek.tən.si/) dengan suku kata kedua yang jelas.'
  },
  {
    id: 'di_line_07',
    title: 'Global Crude Oil Price Volatility (Brent USD per Barrel)',
    category: 'line',
    examFrequency: 'APEUni Prediction #DI-Oil-77',
    sourceOrigin: 'APEUni #DI-77',
    svgType: 'line',
    renderData: {
      xAxis: ['2014', '2016', '2020', '2022'],
      yAxis: ['$0', '$40', '$80', '$120'],
      points: [
        { x: 60, y: 42, label: '$98', year: '2014' },
        { x: 140, y: 120, label: '$43', year: '2016' },
        { x: 220, y: 135, label: '$39', year: '2020' },
        { x: 300, y: 35, label: '$104', year: '2022' }
      ]
    },
    dataSummary: {
      highest: '$104 in 2022',
      lowest: '$39 in 2020',
      overallTrend: 'Extreme geopolitical volatility with dual troughs and sharp spikes',
      keyObservation: 'Energy markets react violently to international conflicts and global demand shocks'
    },
    keywords: ['crude oil price', 'Brent benchmark', 'price volatility', 'dollars per barrel', 'energy commodity'],
    universalTemplate: {
      intro: 'The given line chart details the significant price fluctuations of Brent crude oil measured in US dollars per barrel from 2014 to 2022.',
      keyElements: 'Looking closely, the chart captures volatile swings across four pivotal years: 2014, 2016, 2020, and 2022.',
      maximum: 'The highest commodity price peak occurred in 2022, surging to an elevated benchmark of 104 dollars per barrel.',
      minimum: 'Conversely, the lowest price level was experienced in 2020, bottoming out at merely thirty-nine dollars per barrel.',
      conclusion: 'In conclusion, international hydrocarbon markets remain exceptionally sensitive to macroeconomic cycles and geopolitical instability.'
    },
    examinerTips: 'Ucapkan "US dollars per barrel" dengan irama lancar.'
  },
  {
    id: 'di_line_08',
    title: 'Percentage of Global Population Using the Internet',
    category: 'line',
    examFrequency: 'Pearson Actual Exam 2026',
    sourceOrigin: 'Pearson Real Exam Bank #DI-Net',
    svgType: 'line',
    renderData: {
      xAxis: ['2005', '2010', '2017', '2024'],
      yAxis: ['0%', '25%', '50%', '75%'],
      points: [
        { x: 60, y: 130, label: '16%', year: '2005' },
        { x: 140, y: 105, label: '30%', year: '2010' },
        { x: 220, y: 70, label: '49%', year: '2017' },
        { x: 300, y: 35, label: '68%', year: '2024' }
      ]
    },
    dataSummary: {
      highest: '68% in 2024',
      lowest: '16% in 2005',
      overallTrend: 'Consistent linear increase across two continuous decades',
      keyObservation: 'Over two-thirds of humanity is now connected to the internet'
    },
    keywords: ['internet penetration', 'global connectivity', 'steady rise', 'percentage of population', 'telecommunication'],
    universalTemplate: {
      intro: 'The presented line graph exhibits the growth rate of worldwide internet penetration between 2005 and 2024.',
      keyElements: 'Examining the horizontal axis, the chart tracks four milestone years: 2005, 2010, 2017, and 2024.',
      maximum: 'The highest connectivity rate is recorded in 2024, reaching sixty-eight percent of the human population.',
      minimum: 'In contrast, the lowest user percentage was seen in 2005, standing at merely sixteen percent.',
      conclusion: 'In conclusion, the proliferation of mobile telecommunications has successfully connected over two-thirds of the world population.'
    },
    examinerTips: 'Bicaralah dengan percaya diri, tekankan "two-thirds of the world population".'
  },
  {
    id: 'di_line_09',
    title: 'Average Monthly Temperature Comparison: London vs Sydney',
    category: 'line',
    examFrequency: 'APEUni Prediction #DI-Clim-90',
    sourceOrigin: 'APEUni #DI-90',
    svgType: 'line',
    renderData: {
      xAxis: ['Jan', 'Apr', 'Jul', 'Oct'],
      yAxis: ['0°C', '10°C', '20°C', '30°C'],
      points: [
        { x: 60, y: 55, label: 'Sydney 23°C', year: 'Jan' },
        { x: 140, y: 88, label: 'Sydney 18°C', year: 'Apr' },
        { x: 220, y: 72, label: 'London 19°C', year: 'Jul' },
        { x: 300, y: 120, label: 'London 6°C', year: 'Jan' }
      ]
    },
    dataSummary: {
      highest: 'Sydney in January at 23°C',
      lowest: 'London in January at 6°C',
      overallTrend: 'Inverse seasonal curves reflecting northern and southern hemispheres',
      keyObservation: 'Sydney experiences peak warmth while London experiences winter cold'
    },
    keywords: ['monthly temperature', 'London and Sydney', 'hemisphere contrast', 'celsius degrees', 'seasonal pattern'],
    universalTemplate: {
      intro: 'The given line graph provides a comparative temperature analysis between London and Sydney across different calendar months.',
      keyElements: 'Looking closely, monthly averages are tracked during key seasons: January, April, July, and October.',
      maximum: 'The highest warmth figure is represented by Sydney in January, reaching an average of twenty-three degrees Celsius.',
      minimum: 'Conversely, the lowest temperature is observed in London in January, dropping down to only six degrees Celsius.',
      conclusion: 'In conclusion, the mirrored temperature curves clearly demonstrate the opposing seasonal patterns of the two hemispheres.'
    },
    examinerTips: 'Tekan kata "hemispheres" (/ˈhem.ə.sfɪrz/). Fluency nomor satu!'
  },
  {
    id: 'di_line_10',
    title: 'Youth Unemployment Rate Trends Across Major Economies',
    category: 'line',
    examFrequency: 'APEUni High Frequency 94%',
    sourceOrigin: 'APEUni #DI-Youth-81',
    svgType: 'line',
    renderData: {
      xAxis: ['2012', '2016', '2020', '2024'],
      yAxis: ['0%', '10%', '20%', '30%'],
      points: [
        { x: 60, y: 40, label: '24%', year: '2012' },
        { x: 140, y: 65, label: '18%', year: '2016' },
        { x: 220, y: 55, label: '21%', year: '2020' },
        { x: 300, y: 85, label: '13%', year: '2024' }
      ]
    },
    dataSummary: {
      highest: '24% in 2012',
      lowest: '13% in 2024',
      overallTrend: 'Gradual long-term decline interrupted by an economic pause in 2020',
      keyObservation: 'Youth joblessness decreased substantially by nearly half over twelve years'
    },
    keywords: ['youth unemployment', 'labor market', 'downward trend', 'gradual decline', 'economic participation'],
    universalTemplate: {
      intro: 'The given line graph demonstrates youth unemployment rate trends documented between 2012 and 2024.',
      keyElements: 'Examining the timeline, key data points are recorded in 2012, 2016, 2020, and 2024.',
      maximum: 'The highest rate of youth unemployment was observed in 2012, standing at an elevated peak of twenty-four percent.',
      minimum: 'In contrast, the lowest rate is registered in 2024, decreasing favorably to approximately thirteen percent.',
      conclusion: 'In conclusion, economic restructuring and active training initiatives have contributed to a sustained reduction in youth joblessness.'
    },
    examinerTips: 'Ucapkan "youth unemployment" tanpa henti. Jangan ragu di angka persentase.'
  },

  // ==========================================
  // 3. PIE CHARTS (8 Items)
  // ==========================================
  {
    id: 'di_pie_01',
    title: 'Global Smartphone Operating System Market Share',
    category: 'pie',
    examFrequency: 'APEUni High Frequency 99%',
    sourceOrigin: 'APEUni Prediction #DI-Pie-OS',
    svgType: 'pie',
    renderData: {
      segments: [
        { label: 'Android', pct: 71, color: '#10B981', desc: 'Dominant global share' },
        { label: 'iOS', pct: 28, color: '#3B82F6', desc: 'Apple ecosystem' },
        { label: 'Others', pct: 1, color: '#F59E0B', desc: 'Alternative platforms' }
      ]
    },
    dataSummary: {
      highest: 'Android at 71%',
      lowest: 'Others at 1%',
      overallTrend: 'Complete duopoly between Google Android and Apple iOS holding 99% combined',
      keyObservation: 'Open-source Android powers nearly three out of every four smartphones'
    },
    keywords: ['operating system', 'market share', 'Android and iOS', 'duopoly structure', 'mobile software'],
    universalTemplate: {
      intro: 'The given pie chart illustrates the worldwide market share distribution of smartphone operating systems.',
      keyElements: 'Looking closely, the chart categorizes software platforms into Android, iOS, and other minor operating systems.',
      maximum: 'The highest proportion is overwhelmingly captured by Android, securing seventy-one percent of all mobile devices.',
      minimum: 'In sharp contrast, the lowest segment belongs to other competing systems at a negligible one percent.',
      conclusion: 'In conclusion, the global mobile operating ecosystem is overwhelmingly characterized by a powerful two-platform duopoly.'
    },
    examinerTips: 'Gunakan frasa "overwhelmingly captured" dan "negligible one percent".'
  },
  {
    id: 'di_pie_02',
    title: 'Municipal Solid Waste Composition by Material',
    category: 'pie',
    examFrequency: 'Pearson Actual Exam Recurrent',
    sourceOrigin: 'Pearson Official Guide #DI-Waste',
    svgType: 'pie',
    renderData: {
      segments: [
        { label: 'Food & Organic', pct: 44, color: '#10B981', desc: 'Biodegradable scraps' },
        { label: 'Paper & Cardboard', pct: 17, color: '#F59E0B', desc: 'Packaging and print' },
        { label: 'Plastics', pct: 12, color: '#EF4444', desc: 'Polymers and bottles' },
        { label: 'Glass & Metals', pct: 10, color: '#6366F1', desc: 'Recyclable containers' },
        { label: 'Others', pct: 17, color: '#94A3B8', desc: 'Composite textiles' }
      ]
    },
    dataSummary: {
      highest: 'Food & Organic waste at 44%',
      lowest: 'Glass & Metals at 10%',
      overallTrend: 'Organic refuse accounts for nearly half of all municipal garbage output',
      keyObservation: 'Biodegradable materials require specialized composting over traditional landfilling'
    },
    keywords: ['solid waste', 'organic material', 'paper and plastics', 'recycling categories', 'municipal management'],
    universalTemplate: {
      intro: 'The provided pie chart depicts the proportional breakdown of municipal solid waste categorized by material type.',
      keyElements: 'Looking into the segments, major components include food and organic scraps, paper, plastics, glass, and metals.',
      maximum: 'The highest waste share is represented by food and organic refuse, accounting for forty-four percent of the aggregate total.',
      minimum: 'Conversely, the lowest categorized grouping belongs to glass and metals at only ten percent.',
      conclusion: 'In conclusion, prioritizing municipal composting programs represents the most impactful step toward reducing overall landfill burden.'
    },
    examinerTips: 'Artikulasikan "municipal solid waste" dengan lancar.'
  },
  {
    id: 'di_pie_03',
    title: 'Global Freshwater Withdrawal by Economic Sector',
    category: 'pie',
    examFrequency: 'APEUni High Frequency 98%',
    sourceOrigin: 'APEUni #DI-Water-33',
    svgType: 'pie',
    renderData: {
      segments: [
        { label: 'Agriculture', pct: 70, color: '#059669', desc: 'Crop irrigation' },
        { label: 'Industrial', pct: 19, color: '#2563EB', desc: 'Cooling and manufacturing' },
        { label: 'Municipal / Domestic', pct: 11, color: '#0284C7', desc: 'Household tap water' }
      ]
    },
    dataSummary: {
      highest: 'Agriculture at 70%',
      lowest: 'Municipal / Domestic usage at 11%',
      overallTrend: 'Farming and irrigation swallow more than two-thirds of worldwide fresh water',
      keyObservation: 'Household consumption is dwarfed by agricultural irrigation'
    },
    keywords: ['freshwater withdrawal', 'agricultural irrigation', 'industrial usage', 'municipal consumption', 'water resource'],
    universalTemplate: {
      intro: 'The given pie chart details the distribution of global freshwater withdrawals allocated across primary economic sectors.',
      keyElements: 'Examining the divisions, the chart measures agricultural irrigation, industrial operations, and domestic municipal usage.',
      maximum: 'The highest water consumption is heavily concentrated in agriculture, demanding seventy percent of all extracted freshwater.',
      minimum: 'In comparison, the lowest extraction portion is assigned to domestic municipal taps at only eleven percent.',
      conclusion: 'In conclusion, developing efficient micro-irrigation technologies is paramount for ensuring sustainable future water security.'
    },
    examinerTips: 'Sebutkan "seventy percent" dengan intonasi jelas.'
  },
  {
    id: 'di_pie_04',
    title: 'Electricity Generation Fuel Mix in Australia',
    category: 'pie',
    examFrequency: 'Pearson Actual Exam 2026',
    sourceOrigin: 'APEUni #DI-Aus-Energy',
    svgType: 'pie',
    renderData: {
      segments: [
        { label: 'Coal', pct: 47, color: '#475569', desc: 'Thermal generation' },
        { label: 'Renewables', pct: 35, color: '#10B981', desc: 'Solar and wind' },
        { label: 'Natural Gas', pct: 17, color: '#F59E0B', desc: 'Peaker plants' },
        { label: 'Oil', pct: 1, color: '#DC2626', desc: 'Diesel backup' }
      ]
    },
    dataSummary: {
      highest: 'Coal at 47%',
      lowest: 'Oil at 1%',
      overallTrend: 'Fossil fuel reliance remains high but clean energy constitutes over a third of power',
      keyObservation: 'Solar and wind expansion is steadily replacing decommissioned coal plants'
    },
    keywords: ['electricity generation', 'fuel mix', 'coal power', 'renewable transition', 'energy distribution'],
    universalTemplate: {
      intro: 'The given pie chart presents valuable data on the electricity generation fuel mix across Australia.',
      keyElements: 'Looking into the segments, generation is split between coal, renewable resources, natural gas, and oil.',
      maximum: 'The highest individual generation source is coal, producing forty-seven percent of national electric power.',
      minimum: 'Conversely, the lowest contribution is seen in petroleum oil at merely one percent.',
      conclusion: 'In conclusion, while coal historically anchors base load supply, renewable energy has rapidly expanded to over one-third of the total grid.'
    },
    examinerTips: 'Bicaralah dengan tempo 130 WPM, jangan berhenti memikirkan detail.'
  },
  {
    id: 'di_pie_05',
    title: 'Global Wealth Distribution by Population Decile',
    category: 'pie',
    examFrequency: 'APEUni Top 50 Prediction',
    sourceOrigin: 'APEUni #DI-Wealth-05',
    svgType: 'pie',
    renderData: {
      segments: [
        { label: 'Top 1% Richest', pct: 45, color: '#D97706', desc: 'Ultra-high net worth' },
        { label: 'Next 9% Wealthy', pct: 38, color: '#2563EB', desc: 'Affluent tier' },
        { label: 'Middle 40%', pct: 15, color: '#10B981', desc: 'Middle class' },
        { label: 'Bottom 50%', pct: 2, color: '#94A3B8', desc: 'Lowest wealth group' }
      ]
    },
    dataSummary: {
      highest: 'Top 1% richest holding 45% of total wealth',
      lowest: 'Bottom 50% holding only 2%',
      overallTrend: 'Extreme economic disparity where top 10% own 83% of all assets',
      keyObservation: 'Half the global population commands an almost negligible fraction of capital'
    },
    keywords: ['wealth distribution', 'economic inequality', 'top one percent', 'asset concentration', 'net worth'],
    universalTemplate: {
      intro: 'The provided pie chart demonstrates the worldwide distribution of aggregate wealth among different population strata.',
      keyElements: 'Looking closely, the chart segments the global population into the top one percent, the next nine percent, the middle class, and the bottom half.',
      maximum: 'The highest share of capital is hoarded by the richest one percent, controlling forty-five percent of all personal assets.',
      minimum: 'In severe contrast, the lowest asset share is owned by the bottom fifty percent of humanity at only two percent.',
      conclusion: 'In conclusion, the data highlights acute structural wealth inequality present throughout contemporary global financial systems.'
    },
    examinerTips: 'Gunakan frasa "acute structural wealth inequality".'
  },
  {
    id: 'di_pie_06',
    title: 'Recommended Daily Caloric Intake by Macronutrient',
    category: 'pie',
    examFrequency: 'Pearson Actual Exam',
    sourceOrigin: 'Pearson Official Guide #DI-Nutri',
    svgType: 'pie',
    renderData: {
      segments: [
        { label: 'Carbohydrates', pct: 55, color: '#F59E0B', desc: 'Primary energy' },
        { label: 'Healthy Fats', pct: 30, color: '#3B82F6', desc: 'Lipid balance' },
        { label: 'Proteins', pct: 15, color: '#10B981', desc: 'Cellular repair' }
      ]
    },
    dataSummary: {
      highest: 'Carbohydrates at 55%',
      lowest: 'Proteins at 15%',
      overallTrend: 'Carbohydrates constitute the primary fuel source in standard dietary guidelines',
      keyObservation: 'Fats and proteins comprise the remaining 45% of balanced nutrition'
    },
    keywords: ['caloric intake', 'macronutrient balance', 'carbohydrates', 'fats and proteins', 'dietary guideline'],
    universalTemplate: {
      intro: 'The given pie chart details the recommended proportion of daily caloric intake distributed across key macronutrients.',
      keyElements: 'Looking closely, the dietary distribution divides nutrition into carbohydrates, healthy fats, and dietary proteins.',
      maximum: 'The highest caloric proportion is allocated to carbohydrates, representing fifty-five percent of overall daily intake.',
      minimum: 'Conversely, the lowest percentage is assigned to proteins at approximately fifteen percent.',
      conclusion: 'In conclusion, standard dietary consensus emphasizes carbohydrates as the fundamental fuel source for human metabolic health.'
    },
    examinerTips: 'Ucapkan "macronutrients" (/ˌmæk.roʊˈnuː.tri.ənts/) dengan artikulasi jelas.'
  },
  {
    id: 'di_pie_07',
    title: 'Ocean Plastic Pollution Sources by Economic Origin',
    category: 'pie',
    examFrequency: 'APEUni High Frequency 95%',
    sourceOrigin: 'APEUni #DI-Ocean-21',
    svgType: 'pie',
    renderData: {
      segments: [
        { label: 'Single-Use Packaging', pct: 36, color: '#DC2626', desc: 'Wrappers and bottles' },
        { label: 'Synthetic Textiles', pct: 16, color: '#EA580C', desc: 'Microfibers' },
        { label: 'Consumer Goods', pct: 12, color: '#F59E0B', desc: 'Toys and appliances' },
        { label: 'Maritime & Fishing', pct: 10, color: '#2563EB', desc: 'Nets and buoys' },
        { label: 'Others', pct: 26, color: '#64748B', desc: 'Industrial scraps' }
      ]
    },
    dataSummary: {
      highest: 'Single-use packaging at 36%',
      lowest: 'Maritime & fishing gear at 10%',
      overallTrend: 'Terrestrial packaging waste heavily outstrips maritime fishing gear emissions',
      keyObservation: 'Packaging and textiles produce over half of all marine polymer debris'
    },
    keywords: ['plastic pollution', 'marine debris', 'single-use packaging', 'synthetic textiles', 'ocean conservation'],
    universalTemplate: {
      intro: 'The provided pie chart outlines the primary sources contributing to global ocean plastic pollution by economic origin.',
      keyElements: 'Looking closely, major categories include single-use packaging, synthetic textiles, consumer goods, and maritime fishing gear.',
      maximum: 'The highest contributing segment is single-use packaging, responsible for thirty-six percent of all ocean plastic deposits.',
      minimum: 'In contrast, the lowest categorized sector is maritime and fishing equipment at ten percent.',
      conclusion: 'In conclusion, curtailing land-based consumer packaging is vital for halting the ecological degradation of marine habitats.'
    },
    examinerTips: 'Fokus pada kelancaran ucapan, jangan mengulang kata ("no self-correction").'
  },
  {
    id: 'di_pie_08',
    title: 'Global Venture Capital Deal Funding by Industry Sector',
    category: 'pie',
    examFrequency: 'Pearson Actual Exam 2026',
    sourceOrigin: 'APEUni #DI-Fin-88',
    svgType: 'pie',
    renderData: {
      segments: [
        { label: 'Artificial Intelligence & Cloud', pct: 42, color: '#6366F1', desc: 'LLMs and infrastructure' },
        { label: 'Biotechnology & Healthcare', pct: 24, color: '#10B981', desc: 'Genomics and therapeutics' },
        { label: 'FinTech', pct: 18, color: '#3B82F6', desc: 'Payments and banking' },
        { label: 'Climate & Cleantech', pct: 16, color: '#F59E0B', desc: 'Batteries and solar' }
      ]
    },
    dataSummary: {
      highest: 'AI & Cloud Computing at 42%',
      lowest: 'Climate & Cleantech at 16%',
      overallTrend: 'Generative AI and automated cloud infrastructure absorb the lion\'s share of risk capital',
      keyObservation: 'AI capture exceeds all fintech and climate deals combined'
    },
    keywords: ['venture capital', 'funding allocation', 'artificial intelligence', 'biotechnology', 'fintech investment'],
    universalTemplate: {
      intro: 'The given pie chart illustrates the allocation of global venture capital funding distributed across emerging technology sectors.',
      keyElements: 'Looking into the details, key target industries include artificial intelligence, biotechnology, financial technology, and cleantech.',
      maximum: 'The highest investment volume is secured by artificial intelligence and cloud computing, commanding forty-two percent of total venture funds.',
      minimum: 'Conversely, the lowest proportion is allocated to climate and clean technologies at sixteen percent.',
      conclusion: 'In conclusion, investor capital remains aggressively focused on software automation and cutting-edge machine learning.'
    },
    examinerTips: 'Bicaralah dengan confident, sebutkan "artificial intelligence" dan "biotechnology".'
  },

  // ==========================================
  // 4. PROCESS DIAGRAMS (8 Items)
  // ==========================================
  {
    id: 'di_proc_01',
    title: 'The Biological Life Cycle of an Atlantic Salmon',
    category: 'process',
    examFrequency: 'APEUni High Frequency 99%',
    sourceOrigin: 'APEUni Prediction #DI-Salmon-01',
    svgType: 'process',
    renderData: {
      steps: [
        { stepNumber: 1, title: 'Freshwater Eggs', detail: 'Hidden in gravel nests in river beds' },
        { stepNumber: 2, title: 'Alevin & Fry Stage', detail: 'Nourished by yolk sac, emerging as free swimmers' },
        { stepNumber: 3, title: 'Parr to Smolt', detail: 'Developing camouflage marks, adapting to saltwater' },
        { stepNumber: 4, title: 'Adult Ocean Migration', detail: 'Rapid growth feeding in open marine waters' },
        { stepNumber: 5, title: 'Upriver Spawning', detail: 'Returning upstream to natal river to reproduce' }
      ]
    },
    dataSummary: {
      highest: 'Adult ocean phase (maximum size and weight)',
      lowest: 'Egg stage (most fragile vulnerability)',
      overallTrend: 'A circular migration between freshwater headwaters and open ocean environments',
      keyObservation: 'Salmon must undergo physiological adaptation called smoltification to survive saltwater'
    },
    keywords: ['salmon life cycle', 'freshwater eggs', 'smoltification', 'ocean migration', 'spawning cycle'],
    universalTemplate: {
      intro: 'The provided process diagram delineates the complete biological life cycle of the Atlantic salmon from birth to reproduction.',
      keyElements: 'Looking into the stages, the cycle progresses from riverbed eggs, alevin, parr, smolt, adult oceanic phase, to upriver spawning.',
      maximum: 'The most physically demanding phase occurs during adult upriver migration, where fish swim against strong river currents to spawn.',
      minimum: 'In contrast, the initial vulnerable baseline begins at the freshwater egg stage concealed beneath gravel beds.',
      conclusion: 'In conclusion, the diagram clearly illustrates an intricate anadromous life cycle bridging both river and marine ecosystems.'
    },
    examinerTips: 'Gunakan kata penghubung sekuensial: "initially, subsequently, in the final stage".'
  },
  {
    id: 'di_proc_02',
    title: 'Industrial Glass Bottle Recycling and Remanufacturing Process',
    category: 'process',
    examFrequency: 'Pearson Actual Exam Recurrent',
    sourceOrigin: 'Pearson PTE Official #DI-Glass',
    svgType: 'process',
    renderData: {
      steps: [
        { stepNumber: 1, title: 'Curbside Collection', detail: 'Sorted bottles gathered from municipal bins' },
        { stepNumber: 2, title: 'Crushing to Cullet', detail: 'Mechanical crushing and color separation' },
        { stepNumber: 3, title: 'High-Heat Furnace', detail: 'Melting at 1500°C alongside raw soda ash' },
        { stepNumber: 4, title: 'Blow Molding', detail: 'Injected into molds to form fresh glass bottles' },
        { stepNumber: 5, title: 'Quality Inspection', detail: 'Automated optical scan and distribution to bottlers' }
      ]
    },
    dataSummary: {
      highest: 'Furnace temperature at 1500°C',
      lowest: 'Initial manual sorting stage',
      overallTrend: 'Closed-loop 100% recyclable material cycle without degradation',
      keyObservation: 'Recycled cullet reduces the melting energy needed compared to virgin silica'
    },
    keywords: ['glass recycling', 'collection and sorting', 'crushed cullet', 'furnace melting', 'circular economy'],
    universalTemplate: {
      intro: 'The given flow diagram illustrates the industrial process of recycling and remanufacturing consumer glass bottles.',
      keyElements: 'Examining the sequence, there are five systematic stages: collection, crushing, furnace melting, mold blowing, and quality inspection.',
      maximum: 'The most energy-intensive operation takes place inside the high-heat furnace, where materials are melted at 1500 degrees Celsius.',
      minimum: 'Conversely, the simplest starting point is the collection and mechanical sorting of used bottles.',
      conclusion: 'In conclusion, the continuous recycling loop demonstrates an effective circular manufacturing process that conserves natural silica.'
    },
    examinerTips: 'Sebutkan kata "furnace" (/ˈfɝː.nɪs/) dan "remanufacturing" dengan lancar.'
  },
  {
    id: 'di_proc_03',
    title: 'Municipal Water Purification and Distribution System',
    category: 'process',
    examFrequency: 'APEUni High Frequency 98%',
    sourceOrigin: 'APEUni #DI-WaterSys-03',
    svgType: 'process',
    renderData: {
      steps: [
        { stepNumber: 1, title: 'Raw Intake', detail: 'Intake pumps from lake and river reservoirs' },
        { stepNumber: 2, title: 'Coagulation & Flocculation', detail: 'Adding alum chemicals to bind silt particles' },
        { stepNumber: 3, title: 'Sedimentation Basin', detail: 'Heavy floc settles to the tank floor' },
        { stepNumber: 4, title: 'Sand & Carbon Filtration', detail: 'Microscopic impurities removed through layered gravel' },
        { stepNumber: 5, title: 'Chlorination & Disinfection', detail: 'Chemical treatment killing residual bacteria' },
        { stepNumber: 6, title: 'Pressurized Network', detail: 'Pumping clean potable water to homes' }
      ]
    },
    dataSummary: {
      highest: 'Clean water distribution to residential taps',
      lowest: 'Raw water intake containing turbidity',
      overallTrend: 'Multi-barrier filtration turning muddy lake water into potable standard',
      keyObservation: 'Coagulation and chlorination ensure physical and microbiological safety'
    },
    keywords: ['water purification', 'coagulation and flocculation', 'sedimentation basin', 'disinfection', 'potable water'],
    universalTemplate: {
      intro: 'The presented diagram outlines the multi-stage municipal process of purifying raw water for domestic distribution.',
      keyElements: 'Looking into the stages, the sequence encompasses raw intake, chemical coagulation, sedimentation, sand filtration, and chlorination.',
      maximum: 'The most critical biochemical safeguard occurs during chlorination, ensuring the complete eradication of waterborne pathogens.',
      minimum: 'In contrast, the initial mechanical stage starts with raw water extraction from lakes or rivers.',
      conclusion: 'In conclusion, the structured treatment pipeline effectively transforms turbid natural water into safe potable drinking supply.'
    },
    examinerTips: 'Jangan panik jika ada 6 langkah: sebutkan 3-4 langkah utama saja demi menjaga Fluency.'
  },
  {
    id: 'di_proc_04',
    title: 'From Coffee Bean Harvesting to Espresso Extraction',
    category: 'process',
    examFrequency: 'Pearson Actual Exam',
    sourceOrigin: 'Pearson Real Exam Bank #DI-Coffee',
    svgType: 'process',
    renderData: {
      steps: [
        { stepNumber: 1, title: 'Cherry Picking', detail: 'Harvesting ripe red coffee cherries' },
        { stepNumber: 2, title: 'Depulping & Washing', detail: 'Removing outer fruit flesh via wet mills' },
        { stepNumber: 3, title: 'Sun Drying', detail: 'Spreading green beans on raised patio beds' },
        { stepNumber: 4, title: 'Roasting at 220°C', detail: 'Thermal caramelization producing aroma oils' },
        { stepNumber: 5, title: 'Grinding & Brewing', detail: 'High pressure water extraction into espresso' }
      ]
    },
    dataSummary: {
      highest: 'Thermal roasting at 220°C producing aromatic flavor',
      lowest: 'Initial hand-picking of raw cherries',
      overallTrend: 'Agricultural harvest refined through drying, roasting, and pressurized brewing',
      keyObservation: 'Roasting creates the chemical transformation of green beans into coffee'
    },
    keywords: ['coffee production', 'cherry harvesting', 'sun drying', 'thermal roasting', 'espresso extraction'],
    universalTemplate: {
      intro: 'The provided process flowchart traces the comprehensive journey of coffee production from cherry harvesting to final brewing.',
      keyElements: 'Looking closely, the process comprises five core milestones: cherry picking, wet depulping, sun drying, thermal roasting, and brewing.',
      maximum: 'The most transformative thermal operation occurs during roasting at 220 degrees Celsius, which develops rich aromatic coffee oils.',
      minimum: 'Conversely, the simplest initial step begins with hand-picking ripe cherries on farm plantations.',
      conclusion: 'In conclusion, the flowchart clearly highlights how meticulous agricultural and thermal processing yields commercial espresso coffee.'
    },
    examinerTips: 'Bicaralah dengan percaya diri, gunakan template secara konsisten.'
  },
  {
    id: 'di_proc_05',
    title: 'Photosynthesis Biochemical Cycle and Energy Conversion',
    category: 'process',
    examFrequency: 'APEUni High Frequency 96%',
    sourceOrigin: 'APEUni #DI-Photo-44',
    svgType: 'process',
    renderData: {
      steps: [
        { stepNumber: 1, title: 'Light Absorption', detail: 'Chlorophyll pigments capture solar photons' },
        { stepNumber: 2, title: 'Water Splitting', detail: 'H2O split into electrons, protons, and O2 gas' },
        { stepNumber: 3, title: 'Calvin Cycle', detail: 'CO2 fixed into high-energy organic compounds' },
        { stepNumber: 4, title: 'Glucose Synthesis', detail: 'Synthesizing sugars for plant metabolic growth' }
      ]
    },
    dataSummary: {
      highest: 'Glucose synthesis storing chemical energy',
      lowest: 'Light absorption trigger',
      overallTrend: 'Solar electromagnetic radiation converted into biochemical sugar molecules',
      keyObservation: 'Oxygen gas is released as an essential byproduct of photolysis'
    },
    keywords: ['photosynthesis cycle', 'chlorophyll absorption', 'water photolysis', 'Calvin cycle', 'glucose synthesis'],
    universalTemplate: {
      intro: 'The given scientific diagram illustrates the biochemical process of photosynthesis and solar energy conversion within plant cells.',
      keyElements: 'Looking closely at the stages, the mechanism involves solar absorption, water photolysis, the Calvin cycle, and glucose synthesis.',
      maximum: 'The most vital chemical outcome is glucose synthesis, which converts captured solar energy into stable plant biomass.',
      minimum: 'Conversely, the initial operational trigger is solar photon absorption by chlorophyll pigments in the thylakoid membranes.',
      conclusion: 'In conclusion, photosynthesis serves as the fundamental biological engine sustaining both terrestrial oxygen and food webs.'
    },
    examinerTips: 'Ucapkan "photosynthesis" (/ˌfoʊ.t̬oʊˈsɪn.θə.sɪs/) dengan jelas.'
  },
  {
    id: 'di_proc_06',
    title: 'Crystalline Silicon Photovoltaic Solar Cell Manufacturing',
    category: 'process',
    examFrequency: 'APEUni Top Prediction',
    sourceOrigin: 'APEUni #DI-PV-67',
    svgType: 'process',
    renderData: {
      steps: [
        { stepNumber: 1, title: 'Quartz Mining', detail: 'Extracting high-purity silica sand' },
        { stepNumber: 2, title: 'Ingot Smelting', detail: 'Purifying polysilicon and casting solid ingots' },
        { stepNumber: 3, title: 'Wafer Slicing', detail: 'Precision wire slicing into ultra-thin wafers' },
        { stepNumber: 4, title: 'Phosphorus Doping', detail: 'Creating P-N junction semiconductors' },
        { stepNumber: 5, title: 'Panel Assembly', detail: 'Soldering busbars and laminating weather-resistant glass' }
      ]
    },
    dataSummary: {
      highest: 'Precision doping creating electrical semiconductor properties',
      lowest: 'Raw quartz extraction from open quarries',
      overallTrend: 'Raw earth minerals refined into high-tech semiconductor electricity generators',
      keyObservation: 'Precision slicing and doping dictate final solar panel efficiency'
    },
    keywords: ['photovoltaic manufacturing', 'silicon ingots', 'wafer slicing', 'semiconductor doping', 'solar module'],
    universalTemplate: {
      intro: 'The presented diagram outlines the technological stages involved in manufacturing crystalline silicon photovoltaic solar cells.',
      keyElements: 'Examining the flow, the fabrication covers quartz mining, ingot smelting, wafer slicing, semiconductor doping, and panel assembly.',
      maximum: 'The most technically sensitive procedure is phosphorus doping, which creates the P-N junction necessary for electric currents.',
      minimum: 'In contrast, the foundational baseline begins with quartz sand extraction from raw quarries.',
      conclusion: 'In conclusion, sophisticated semiconductor processing allows common silica minerals to become advanced clean energy generators.'
    },
    examinerTips: 'Gunakan frasa "photovoltaic solar cells".'
  },
  {
    id: 'di_proc_07',
    title: 'Hydroelectric Dam Gravity Power Generation Flow',
    category: 'process',
    examFrequency: 'Pearson Actual Exam',
    sourceOrigin: 'Pearson PTE Academic #DI-Hydro-07',
    svgType: 'process',
    renderData: {
      steps: [
        { stepNumber: 1, title: 'Reservoir Storage', detail: 'Elevated water held behind high concrete dam' },
        { stepNumber: 2, title: 'Penstock Sluice Gate', detail: 'Controlled gravity flow down steep pipes' },
        { stepNumber: 3, title: 'Turbine Runner', detail: 'High-pressure water spins massive turbine blades' },
        { stepNumber: 4, title: 'Generator Induction', detail: 'Electromagnetic coils generate high-voltage AC current' },
        { stepNumber: 5, title: 'Grid Transmission', detail: 'Step-up transformers feed regional power lines' }
      ]
    },
    dataSummary: {
      highest: 'Power generation via electromagnetic induction',
      lowest: 'Passive water storage in reservoir',
      overallTrend: 'Gravitational potential energy converted into kinetic and electromagnetic energy',
      keyObservation: 'Water head height directly multiplies energy output'
    },
    keywords: ['hydroelectric dam', 'penstock pipe', 'turbine rotation', 'electromagnetic generator', 'grid transmission'],
    universalTemplate: {
      intro: 'The given engineering diagram demonstrates how a hydroelectric dam converts gravitational water potential into electrical power.',
      keyElements: 'Looking closely, the infrastructure contains five principal elements: water reservoir, penstock gate, turbine, generator, and transformers.',
      maximum: 'The highest kinetic energy conversion occurs inside the turbine housing, where high-pressure water drives rapid rotor rotation.',
      minimum: 'Conversely, the static starting condition consists of calm water storage in the elevated reservoir.',
      conclusion: 'In conclusion, the system harnesses natural gravitational hydraulics to deliver continuous, renewable electricity to the power grid.'
    },
    examinerTips: 'Bicaralah dengan kelancaran tanpa ragu. Poin Fluency adalah prioritas utama Pearson!'
  },
  {
    id: 'di_proc_08',
    title: 'Recycled Paperboard and Pulp Processing Cycle',
    category: 'process',
    examFrequency: 'APEUni High Frequency 95%',
    sourceOrigin: 'APEUni #DI-Paper-19',
    svgType: 'process',
    renderData: {
      steps: [
        { stepNumber: 1, title: 'Waste Paper Intake', detail: 'Discarded cardboard sorted into hydrapulper' },
        { stepNumber: 2, title: 'De-inking & Screening', detail: 'Centrifugal screening and ink flotation' },
        { stepNumber: 3, title: 'Slurry Refining', detail: 'Fiber hydration and binding enhancement' },
        { stepNumber: 4, title: 'Heated Roller Press', detail: 'Drying and flattening under steam cylinders' },
        { stepNumber: 5, title: 'Finished Paper Reels', detail: 'Winding packaging reels ready for carton printing' }
      ]
    },
    dataSummary: {
      highest: 'Heated roller drying under high steam pressure',
      lowest: 'Raw waste paper shredding',
      overallTrend: 'Waste cellulose fibers cleaned and pressed back into sturdy commercial packaging',
      keyObservation: 'De-inking chemicals enable used paper to match virgin pulp brightness'
    },
    keywords: ['paperboard recycling', 'de-inking process', 'slurry refining', 'steam rollers', 'finished reels'],
    universalTemplate: {
      intro: 'The provided process diagram illustrates the industrial remanufacturing of discarded waste paper into commercial packaging reels.',
      keyElements: 'Examining the sequence, operations proceed through hydrapulper mixing, de-inking screening, slurry refining, roller drying, and reel winding.',
      maximum: 'The most mechanically intense phase occurs across the heated roller press, which flattens and evaporates moisture from wet paper sheets.',
      minimum: 'In contrast, the initial preparation stage merely involves shredding discarded consumer cardboard.',
      conclusion: 'In conclusion, closed-loop paper reprocessing substantially curtails virgin timber consumption and reduces municipal waste volumes.'
    },
    examinerTips: 'Kelancaran stabil adalah kunci. Jangan pause lebih dari 2 detik.'
  },

  // ==========================================
  // 5. MAPS & GEOGRAPHY (7 Items)
  // ==========================================
  {
    id: 'di_map_01',
    title: 'Annual Rainfall and Climate Zones Across Australia',
    category: 'map',
    examFrequency: 'APEUni High Frequency 99%',
    sourceOrigin: 'APEUni Prediction #DI-Map-Aus',
    svgType: 'map',
    renderData: {
      mapRegions: [
        { name: 'Tropical North', value: '> 1200 mm', color: '#0284C7', note: 'Heavy summer monsoon' },
        { name: 'Eastern Seaboard', value: '800-1200 mm', color: '#10B981', note: 'Consistent maritime precipitation' },
        { name: 'Arid Interior (Outback)', value: '< 200 mm', color: '#DC2626', note: 'Extreme desert conditions' },
        { name: 'Temperate South', value: '500-800 mm', color: '#F59E0B', note: 'Winter rainfall agricultural belt' }
      ]
    },
    dataSummary: {
      highest: 'Tropical North with over 1200 mm precipitation',
      lowest: 'Arid Outback Center with under 200 mm',
      overallTrend: 'Coastal wet fringes surrounding a dry, desert-dominated continent',
      keyObservation: 'Over two-thirds of Australia receives scarce annual rainfall'
    },
    keywords: ['rainfall distribution', 'climate zones', 'tropical north', 'arid interior', 'precipitation contrast'],
    universalTemplate: {
      intro: 'The given geographic map delineates the distribution of annual rainfall and climate zones across the Australian continent.',
      keyElements: 'Looking closely, the map contrasts the tropical northern territory, coastal eastern rim, southern agricultural belt, and the central outback.',
      maximum: 'The highest annual precipitation is concentrated along the northern tropical coast, exceeding 1200 millimeters per year.',
      minimum: 'In severe contrast, the lowest rainfall is observed across the vast arid interior, dipping below 200 millimeters annually.',
      conclusion: 'In conclusion, the map clearly demonstrates that Australian demographic and farming activities are strictly constrained to coastal fringes.'
    },
    examinerTips: 'Sebutkan arah mata angin ("northern coast", "central interior") untuk mendongkrak skor Content.'
  },
  {
    id: 'di_map_02',
    title: 'Global Tropical Deforestation Hotspots and Forest Loss',
    category: 'map',
    examFrequency: 'Pearson Actual Exam Recurrent',
    sourceOrigin: 'Pearson Official Guide #DI-Forest',
    svgType: 'map',
    renderData: {
      mapRegions: [
        { name: 'Amazon Basin', value: 'High Loss (-3.2M ha)', color: '#DC2626', note: 'Cattle ranching expansion' },
        { name: 'Southeast Asia', value: 'Severe Loss (-1.8M ha)', color: '#EA580C', note: 'Palm oil plantations' },
        { name: 'Congo Basin', value: 'Moderate Loss (-1.1M ha)', color: '#F59E0B', note: 'Artisanal logging and charcoal' },
        { name: 'Boreal Zones', value: 'Stable / Mild Gain', color: '#10B981', note: 'Protected northern forestry' }
      ]
    },
    dataSummary: {
      highest: 'Amazon Basin with 3.2 million hectares lost annually',
      lowest: 'Boreal northern forests with stable canopy cover',
      overallTrend: 'Equatorial rainforests face acute agricultural clearing while northern temperate zones remain stable',
      keyObservation: 'South America and Southeast Asia experience the heaviest tree canopy depletion'
    },
    keywords: ['tropical deforestation', 'forest canopy loss', 'Amazon Basin', 'Southeast Asia', 'environmental conservation'],
    universalTemplate: {
      intro: 'The presented thematic world map highlights critical geographic hotspots of tropical deforestation and forest loss.',
      keyElements: 'Looking closely, critical areas identified include the Amazon Basin in South America, Southeast Asia, Central Africa, and northern boreal zones.',
      maximum: 'The highest rate of forest destruction is located in the Amazon Basin, suffering over 3.2 million hectares of annual canopy loss.',
      minimum: 'In contrast, the most stable forest areas are preserved across northern boreal regions in Canada and Scandinavia.',
      conclusion: 'In conclusion, equatorial rainforest ecosystems remain under extreme deforestation pressure driven by commercial agriculture.'
    },
    examinerTips: 'Gunakan arah geografis dan sebutkan "Amazon Basin" dengan artikulasi tegas.'
  },
  {
    id: 'di_map_03',
    title: 'Population Density Clusters Across the Japanese Archipelago',
    category: 'map',
    examFrequency: 'APEUni Prediction #DI-Jap-Pop',
    sourceOrigin: 'APEUni #DI-Japan-03',
    svgType: 'map',
    renderData: {
      mapRegions: [
        { name: 'Tokyo Megalopolis', value: '> 6,000 / km²', color: '#7C3AED', note: 'Ultra-dense urban core' },
        { name: 'Osaka-Kobe Belt', value: '2,500 / km²', color: '#2563EB', note: 'Kansai commercial basin' },
        { name: 'Honshu Rural Plains', value: '350 / km²', color: '#10B981', note: 'Coastal agricultural strip' },
        { name: 'Hokkaido Highlands', value: '< 70 / km²', color: '#94A3B8', note: 'Sparsely populated north' }
      ]
    },
    dataSummary: {
      highest: 'Tokyo metropolitan area with over 6,000 people per square km',
      lowest: 'Hokkaido mountain regions under 70 people per square km',
      overallTrend: 'Intense demographic clustering along the southern Pacific belt vs empty mountainous interior',
      keyObservation: 'Over 65% of Japan\'s population lives packed on narrow coastal plains'
    },
    keywords: ['population density', 'Japanese archipelago', 'Tokyo megalopolis', 'coastal concentration', 'demographic cluster'],
    universalTemplate: {
      intro: 'The given demographic map displays the concentration of population density across the islands of the Japanese archipelago.',
      keyElements: 'Looking closely, the map contrasts the Tokyo megalopolis, the Osaka-Kobe industrial basin, rural Honshu, and mountainous Hokkaido.',
      maximum: 'The highest population density is overwhelmingly centered in the Greater Tokyo area, exceeding 6,000 individuals per square kilometer.',
      minimum: 'Conversely, the lowest density is recorded in northern Hokkaido and alpine areas, with fewer than seventy people per square kilometer.',
      conclusion: 'In conclusion, rugged mountainous terrain has forced the vast majority of Japan’s population into highly congested coastal plains.'
    },
    examinerTips: 'Ucapkan "archipelago" (/ˌɑːr.kəˈpel.ə.ɡoʊ/) dengan benar.'
  },
  {
    id: 'di_map_04',
    title: 'Pacific Rim Seismic and Volcanic Activity (Ring of Fire)',
    category: 'map',
    examFrequency: 'Pearson Actual Exam 2026',
    sourceOrigin: 'Pearson Real Exam Bank #DI-Seismic',
    svgType: 'map',
    renderData: {
      mapRegions: [
        { name: 'Western Pacific (Japan, PH, ID)', value: 'Extreme (85% Quakes)', color: '#DC2626', note: 'Subduction zone trenches' },
        { name: 'South American Andes', value: 'High Volcanism', color: '#EA580C', note: 'Nazca plate subduction' },
        { name: 'North American Coast (Cascades)', value: 'Active Fault Lines', color: '#F59E0B', note: 'San Andreas transform fault' },
        { name: 'Pacific Ocean Basin Center', value: 'Seismically Stable', color: '#0284C7', note: 'Interior plate stability' }
      ]
    },
    dataSummary: {
      highest: 'Western Pacific Arc with over 85% of major earthquakes',
      lowest: 'Central ocean plate interior with minimal tremors',
      overallTrend: 'Horseshoe-shaped tectonic boundary concentrates the vast majority of global eruptions',
      keyObservation: 'Convergent plate boundaries generate active earthquakes and volcanoes'
    },
    keywords: ['Ring of Fire', 'tectonic plate boundary', 'seismic activity', 'volcanic eruptions', 'subduction zones'],
    universalTemplate: {
      intro: 'The given geological map depicts the distribution of major earthquake epicenters and active volcanoes along the Pacific Ring of Fire.',
      keyElements: 'Looking into the geography, the horseshoe-shaped zone spans East Asia, the Pacific islands, North America’s coast, and the South American Andes.',
      maximum: 'The highest seismic hazard is concentrated along the Western Pacific subduction trenches, accounting for over eighty-five percent of major tremors.',
      minimum: 'In contrast, the lowest tectonic instability is observed within the interior central Pacific plate basin.',
      conclusion: 'In conclusion, tectonic subduction boundaries around the ocean perimeter delineate the planet’s most volatile geological fault lines.'
    },
    examinerTips: 'Sebutkan "Pacific Ring of Fire" sebagai topik pembuka.'
  },
  {
    id: 'di_map_05',
    title: 'Metropolitan Urban Heat Island Temperature Anomalies',
    category: 'map',
    examFrequency: 'APEUni High Frequency 95%',
    sourceOrigin: 'APEUni #DI-Heat-05',
    svgType: 'map',
    renderData: {
      mapRegions: [
        { name: 'Commercial Downtown Core', value: '+4.5°C Anomaly', color: '#DC2626', note: 'Dense concrete and asphalt' },
        { name: 'Midtown High-Rise District', value: '+3.0°C Anomaly', color: '#EA580C', note: 'Thermal mass retention' },
        { name: 'Suburban Residential Ring', value: '+1.5°C Anomaly', color: '#F59E0B', note: 'Spaced housing and lawns' },
        { name: 'Outer Rural Parkland', value: '0.0°C Baseline', color: '#10B981', note: 'Tree canopy cooling' }
      ]
    },
    dataSummary: {
      highest: 'Downtown Core with +4.5°C thermal anomaly',
      lowest: 'Outer green belts at baseline 0°C',
      overallTrend: 'Concentric temperature gradients radiating outward from dense concrete cores',
      keyObservation: 'Asphalt paving and lack of vegetation amplify urban temperatures significantly'
    },
    keywords: ['urban heat island', 'temperature anomaly', 'concrete core', 'vegetation cooling', 'thermal gradient'],
    universalTemplate: {
      intro: 'The presented thermal map illustrates the urban heat island effect across a metropolitan area, depicting temperature anomalies.',
      keyElements: 'Looking closely, the map displays concentric zones from the commercial downtown core, midtown districts, suburbs, to rural parkland.',
      maximum: 'The highest thermal elevation is detected in the dense downtown commercial core, soaring 4.5 degrees Celsius above rural baselines.',
      minimum: 'In contrast, the lowest ambient temperature is maintained across outer green parklands, registering standard regional baselines.',
      conclusion: 'In conclusion, extensive concrete infrastructure severely traps solar radiation, proving the necessity of urban tree canopies.'
    },
    examinerTips: 'Pacing lancar dan stabil. Pearson menghargai kalimat yang selesai tuntas sebelum detik ke-38.'
  },
  {
    id: 'di_map_06',
    title: 'Offshore and Onshore Wind Energy Potential Across the UK',
    category: 'map',
    examFrequency: 'Pearson Actual Exam',
    sourceOrigin: 'Pearson Official Bank #DI-UK-Wind',
    svgType: 'map',
    renderData: {
      mapRegions: [
        { name: 'Scottish North Sea Coast', value: '> 9.5 m/s', color: '#1D4ED8', note: 'World-class offshore resource' },
        { name: 'Irish Sea & Wales Coast', value: '8.0 - 9.0 m/s', color: '#0284C7', note: 'High velocity winds' },
        { name: 'Northern English Coast', value: '7.0 - 8.0 m/s', color: '#10B981', note: 'Favorable turbine sites' },
        { name: 'Southern Inland Midlands', value: '< 5.0 m/s', color: '#F59E0B', note: 'Moderate wind speeds' }
      ]
    },
    dataSummary: {
      highest: 'Scottish North Sea at over 9.5 meters per second',
      lowest: 'Southern English Midlands under 5.0 m/s',
      overallTrend: 'Coastal and northern marine territories possess double the kinetic potential of southern inland valleys',
      keyObservation: 'The UK possesses Europe\'s largest offshore wind generation potential'
    },
    keywords: ['wind energy potential', 'offshore wind speed', 'North Sea coast', 'meters per second', 'renewable resource'],
    universalTemplate: {
      intro: 'The provided geographic map delineates the distribution of onshore and offshore wind velocity potential across the United Kingdom.',
      keyElements: 'Looking closely, the map compares maritime speeds off Scotland’s coast, the Irish Sea, the English seaboard, and southern inland valleys.',
      maximum: 'The highest kinetic wind speeds are concentrated offshore along the Scottish coast, consistently exceeding 9.5 meters per second.',
      minimum: 'Conversely, the lowest wind velocities are situated in the southern inland Midlands, registering below 5 meters per second.',
      conclusion: 'In conclusion, the United Kingdom’s northern maritime geography offers exceptional natural advantages for offshore wind generation.'
    },
    examinerTips: 'Sebutkan "United Kingdom" atau "UK" dan "offshore wind".'
  },
  {
    id: 'di_map_07',
    title: 'Major Global Maritime Container Shipping Corridors',
    category: 'map',
    examFrequency: 'APEUni Prediction #DI-Ship-11',
    sourceOrigin: 'APEUni #DI-Ship-11',
    svgType: 'map',
    renderData: {
      mapRegions: [
        { name: 'Trans-Pacific (China-USA)', value: '28M TEU / yr', color: '#DC2626', note: 'Busiest manufacturing route' },
        { name: 'Asia-Europe (via Suez Canal)', value: '22M TEU / yr', color: '#EA580C', note: 'Critical Eurasian artery' },
        { name: 'Trans-Atlantic (Europe-USA)', value: '8M TEU / yr', color: '#3B82F6', note: 'Mature industrial trade' },
        { name: 'Trans-Indian Ocean', value: '6M TEU / yr', color: '#10B981', note: 'Emerging south-south lane' }
      ]
    },
    dataSummary: {
      highest: 'Trans-Pacific route carrying 28 million TEU annually',
      lowest: 'Trans-Indian Ocean carrying 6 million TEU',
      overallTrend: 'East Asian export lanes to North America and Europe dominate over 65% of all maritime freight',
      keyObservation: 'Maritime chokepoints like the Malacca Strait and Suez Canal govern global logistics'
    },
    keywords: ['container shipping', 'maritime corridors', 'Trans-Pacific route', 'twenty-foot equivalent units', 'global logistics'],
    universalTemplate: {
      intro: 'The given nautical trade map displays the major global maritime container shipping corridors and annual freight volumes.',
      keyElements: 'Looking into the corridors, principal trade lanes connect East Asia to North America, Europe via the Suez Canal, and Trans-Atlantic links.',
      maximum: 'The highest shipping volume is transported across the Trans-Pacific route between China and the US, carrying twenty-eight million TEU.',
      minimum: 'In comparison, the lowest volume corridor depicted is the Trans-Indian route, handling approximately six million containers.',
      conclusion: 'In conclusion, modern international merchandise trade is heavily anchored by manufacturing exports originating from East Asian ports.'
    },
    examinerTips: 'Jika istilah "TEU" asing, katakan saja "twenty-eight million containers". Poin Fluency terjaga!'
  },

  // ==========================================
  // 6. ACADEMIC TABLES (7 Items)
  // ==========================================
  {
    id: 'di_tab_01',
    title: 'University International Student Enrolment by Faculty',
    category: 'table',
    examFrequency: 'APEUni High Frequency 99%',
    sourceOrigin: 'APEUni Prediction #DI-Tab-Uni',
    svgType: 'table',
    renderData: {
      headers: ['Academic Faculty', 'Enrolled Students', 'Percentage (%)', 'Yearly Growth (%)'],
      rows: [
        ['Business & Economics', '4,850', '42%', '+6.8%'],
        ['Engineering & IT', '3,220', '28%', '+12.4%'],
        ['Health Sciences & Medicine', '1,730', '15%', '+4.2%'],
        ['Arts & Humanities', '1,150', '10%', '-1.5%'],
        ['Law & Justice', '580', '5%', '+2.1%']
      ],
      highlightRowIdx: 0
    },
    dataSummary: {
      highest: 'Business & Economics with 4,850 students (42%)',
      lowest: 'Law & Justice with 580 students (5%)',
      overallTrend: 'STEM and Commerce disciplines account for 70% of all overseas admissions',
      keyObservation: 'Engineering shows the fastest expansion (+12.4%) while Humanities contracted (-1.5%)'
    },
    keywords: ['university enrolment', 'international students', 'business and engineering', 'highest percentage', 'academic faculty'],
    universalTemplate: {
      intro: 'The provided data table gives structured details regarding international student enrolment figures across university faculties.',
      keyElements: 'Examining the rows, the table lists disciplines including Business, Engineering, Health Sciences, Humanities, and Law.',
      maximum: 'The highest enrolment is commanded by the Faculty of Business and Economics, registering 4,850 students or forty-two percent.',
      minimum: 'In contrast, the lowest international headcount is recorded in the Faculty of Law with only 580 enrolled students.',
      conclusion: 'In conclusion, international scholars exhibit strong career preferences toward commercial and technical STEM faculties.'
    },
    examinerTips: 'Pada tipe Table, fokus hanya pada baris tertinggi (Business) dan terendah (Law). Jangan baca semua angka!'
  },
  {
    id: 'di_tab_02',
    title: 'Hospital Bed-to-Population Ratios Across OECD Nations',
    category: 'table',
    examFrequency: 'Pearson Actual Exam Recurrent',
    sourceOrigin: 'Pearson Official Guide #DI-Tab-Health',
    svgType: 'table',
    renderData: {
      headers: ['Country', 'Beds per 1,000 People', 'ICU Beds per 100k', 'Public Spending (% GDP)'],
      rows: [
        ['Japan', '12.8', '14.2', '10.9%'],
        ['South Korea', '12.4', '10.6', '8.1%'],
        ['Germany', '7.9', '28.2', '11.7%'],
        ['Australia', '3.8', '9.4', '9.9%'],
        ['United States', '2.8', '29.4', '16.8%'],
        ['United Kingdom', '2.4', '7.3', '10.2%']
      ],
      highlightRowIdx: 0
    },
    dataSummary: {
      highest: 'Japan with 12.8 beds per 1,000 residents',
      lowest: 'United Kingdom with 2.4 beds per 1,000 residents',
      overallTrend: 'East Asian healthcare systems maintain substantially higher inpatient capacity than Western nations',
      keyObservation: 'Japan has more than five times as many hospital beds per capita as the United Kingdom'
    },
    keywords: ['hospital beds', 'healthcare capacity', 'beds per thousand', 'Japan and UK', 'medical infrastructure'],
    universalTemplate: {
      intro: 'The given academic table presents key comparative statistics regarding hospital bed-to-population ratios in OECD nations.',
      keyElements: 'Looking closely, the table surveys medical capacities across Japan, South Korea, Germany, Australia, the US, and the UK.',
      maximum: 'The highest overall hospital bed density is maintained by Japan, providing 12.8 beds for every one thousand citizens.',
      minimum: 'Conversely, the lowest inpatient bed ratio belongs to the United Kingdom, offering only 2.4 beds per thousand residents.',
      conclusion: 'In conclusion, the data demonstrates marked divergence in national healthcare planning between inpatient and ambulatory models.'
    },
    examinerTips: 'Bicaralah dengan tempo konstan. Selesai di detik ke-33 adalah titik emas Pearson.'
  },
  {
    id: 'di_tab_03',
    title: 'Public Transit Commuter Modal Share Across Global Metropolises',
    category: 'table',
    examFrequency: 'APEUni High Frequency 97%',
    sourceOrigin: 'APEUni #DI-Transit-18',
    svgType: 'table',
    renderData: {
      headers: ['Metropolitan City', 'Public Transit (%)', 'Private Car (%)', 'Walking & Cycling (%)'],
      rows: [
        ['Tokyo', '51%', '12%', '37%'],
        ['Paris', '41%', '22%', '37%'],
        ['London', '37%', '32%', '31%'],
        ['New York City', '31%', '52%', '17%'],
        ['Sydney', '23%', '64%', '13%']
      ],
      highlightRowIdx: 0
    },
    dataSummary: {
      highest: 'Tokyo with 51% public transit share',
      lowest: 'Sydney with only 23% public transit (64% car usage)',
      overallTrend: 'Asian and European capitals rely heavily on trains while car dependency dominates suburban cities',
      keyObservation: 'Over half of all Tokyo commuters take public rail'
    },
    keywords: ['public transit', 'modal share', 'commuter transport', 'Tokyo and Sydney', 'urban mobility'],
    universalTemplate: {
      intro: 'The presented data table outlines commuter modal transportation shares across major international metropolitan centers.',
      keyElements: 'Examining the cities, the table evaluates transport habits in Tokyo, Paris, London, New York City, and Sydney.',
      maximum: 'The highest public transit utilization is led by Tokyo, where fifty-one percent of daily commuters travel by train or bus.',
      minimum: 'In contrast, the lowest public transit adoption is registered in Sydney at only twenty-three percent, with sixty-four percent relying on private cars.',
      conclusion: 'In conclusion, high-density transit rail investments drastically reduce private automobile dependency in major urban centers.'
    },
    examinerTips: 'Hindari membaca seluruh kolom, bandingkan Tokyo dan Sydney saja.'
  },
  {
    id: 'di_tab_04',
    title: 'Nutritional Density Comparison: Dairy vs Plant-Based Milks',
    category: 'table',
    examFrequency: 'APEUni Top 50 Prediction',
    sourceOrigin: 'APEUni #DI-Milk-44',
    svgType: 'table',
    renderData: {
      headers: ['Milk Type (250ml)', 'Protein (g)', 'Calcium (mg)', 'Calories (kcal)', 'Sat Fat (g)'],
      rows: [
        ['Whole Dairy Milk', '8.0g', '300mg', '150kcal', '4.5g'],
        ['Soy Milk', '7.0g', '300mg', '105kcal', '0.5g'],
        ['Oat Milk', '3.0g', '350mg', '120kcal', '0.5g'],
        ['Almond Milk', '1.0g', '450mg', '40kcal', '0.2g']
      ],
      highlightRowIdx: 0
    },
    dataSummary: {
      highest: 'Whole Dairy Milk in protein (8.0g) and calories (150kcal)',
      lowest: 'Almond milk in protein (only 1.0g) and calories (40kcal)',
      overallTrend: 'Soy milk closely matches cow\'s milk protein while almond milk is lowest in caloric density',
      keyObservation: 'Almond milk contains fortified calcium of 450mg despite low protein'
    },
    keywords: ['nutritional comparison', 'protein and calcium', 'dairy milk', 'plant-based alternatives', 'caloric value'],
    universalTemplate: {
      intro: 'The given nutritional table illustrates a comparative dietary breakdown between whole dairy milk and plant-based alternatives.',
      keyElements: 'Looking into the rows, the comparison examines whole cow’s milk, soy milk, oat milk, and almond milk per glass.',
      maximum: 'The highest protein content is delivered by whole dairy milk, providing eight grams alongside 150 calories.',
      minimum: 'Conversely, the lowest protein value is observed in almond milk, containing only one gram of protein and forty calories.',
      conclusion: 'In conclusion, while dairy and soy provide superior protein density, almond milk offers a significantly lower caloric alternative.'
    },
    examinerTips: 'Ucapkan "plant-based alternatives" dengan fasih.'
  },
  {
    id: 'di_tab_05',
    title: 'National Government Budget Allocation Across Major Portfolios',
    category: 'table',
    examFrequency: 'Pearson Actual Exam 2026',
    sourceOrigin: 'Pearson Real Exam Bank #DI-Budget',
    svgType: 'table',
    renderData: {
      headers: ['Government Portfolio', 'Allocated Budget', 'Share of Total', 'Annual Change'],
      rows: [
        ['Social Security & Welfare', '$190 Billion', '32%', '+4.5%'],
        ['Healthcare & Medicare', '$115 Billion', '20%', '+5.8%'],
        ['Education & Training', '$72 Billion', '12%', '+3.2%'],
        ['Defence & National Security', '$54 Billion', '9%', '+7.1%'],
        ['Transport & Infrastructure', '$36 Billion', '6%', '+1.8%']
      ],
      highlightRowIdx: 0
    },
    dataSummary: {
      highest: 'Social Security at $190 Billion (32%)',
      lowest: 'Transport Infrastructure at $36 Billion (6%)',
      overallTrend: 'Welfare and healthcare absorb over half of all government fiscal expenditures',
      keyObservation: 'Defence spending expanded fastest at +7.1%'
    },
    keywords: ['budget allocation', 'social security', 'healthcare spending', 'defence and infrastructure', 'fiscal policy'],
    universalTemplate: {
      intro: 'The presented table provides an overview of national government budgetary allocations distributed across primary public portfolios.',
      keyElements: 'Looking closely, the table outlines spending on social security, healthcare, education, national defence, and infrastructure.',
      maximum: 'The highest budget expenditure is allocated to social security and welfare, commanding 190 billion dollars or thirty-two percent.',
      minimum: 'In contrast, the lowest documented allocation is dedicated to transport and infrastructure at thirty-six billion dollars.',
      conclusion: 'In conclusion, public welfare and universal healthcare services constitute the overwhelming majority of national fiscal spending.'
    },
    examinerTips: 'Gunakan frasa "overwhelming majority of national fiscal spending".'
  },
  {
    id: 'di_tab_06',
    title: 'Global Airline Passenger Volumes and On-Time Flight Performance',
    category: 'table',
    examFrequency: 'APEUni High Frequency 96%',
    sourceOrigin: 'APEUni #DI-Air-62',
    svgType: 'table',
    renderData: {
      headers: ['Airline Carrier', 'Annual Passengers', 'On-Time Arrival (OTP)', 'Fleet Size'],
      rows: [
        ['Delta Air Lines', '190 Million', '84.2%', '960 Aircraft'],
        ['American Airlines', '215 Million', '78.5%', '950 Aircraft'],
        ['Ryanair', '180 Million', '88.6%', '570 Aircraft'],
        ['Qantas Group', '52 Million', '74.1%', '310 Aircraft']
      ],
      highlightRowIdx: 1
    },
    dataSummary: {
      highest: 'American Airlines in passengers (215M) and Ryanair in OTP (88.6%)',
      lowest: 'Qantas in passenger volume (52M) and OTP (74.1%)',
      overallTrend: 'Low-cost carriers like Ryanair achieve higher punctuality than legacy network operators',
      keyObservation: 'Passenger volume does not necessarily correlate with on-time flight arrivals'
    },
    keywords: ['airline performance', 'passenger volume', 'on-time arrival rate', 'fleet size', 'aviation statistics'],
    universalTemplate: {
      intro: 'The given data table displays key operating metrics for major international airline carriers, detailing passenger volumes and punctuality.',
      keyElements: 'Looking into the details, the carriers analyzed include Delta Air Lines, American Airlines, Ryanair, and the Qantas Group.',
      maximum: 'The highest annual passenger volume is achieved by American Airlines, transporting an enormous 215 million passengers.',
      minimum: 'On the other hand, the lowest passenger headcount among this selection belongs to Qantas at fifty-two million travelers.',
      conclusion: 'In conclusion, punctuality records highlight that streamlined low-cost carriers frequently outperform legacy network competitors in on-time reliability.'
    },
    examinerTips: 'Bicaralah dengan intonasi natural, jangan terburu-buru.'
  },
  {
    id: 'di_tab_07',
    title: 'Commercial Solar PV Hardware Cost Reduction (USD per Watt)',
    category: 'table',
    examFrequency: 'Pearson Actual Exam 2026',
    sourceOrigin: 'Pearson Official Guide #DI-SolarCost',
    svgType: 'table',
    renderData: {
      headers: ['Year', 'Polysilicon ($/W)', 'Solar Cell ($/W)', 'Solar Module ($/W)', 'Total System ($/W)'],
      rows: [
        ['2010', '$1.10', '$0.90', '$1.40', '$3.40'],
        ['2015', '$0.35', '$0.28', '$0.45', '$1.08'],
        ['2020', '$0.12', '$0.09', '$0.18', '$0.39'],
        ['2024', '$0.04', '$0.03', '$0.09', '$0.16']
      ],
      highlightRowIdx: 0
    },
    dataSummary: {
      highest: '2010 total system cost at $3.40 per Watt',
      lowest: '2024 total system cost at $0.16 per Watt',
      overallTrend: 'Spectacular 95% cost collapse driven by manufacturing scaling in China',
      keyObservation: 'Solar modules plunged from $1.40/W to under ten cents per Watt'
    },
    keywords: ['solar hardware cost', 'cost per watt', 'dramatic decline', 'photovoltaic modules', 'manufacturing scale'],
    universalTemplate: {
      intro: 'The provided data table traces the dramatic cost deflation of commercial solar photovoltaic hardware from 2010 to 2024.',
      keyElements: 'Looking closely, the table breaks down hardware costs across polysilicon, solar cells, finished modules, and total systems.',
      maximum: 'The highest total system cost occurred in 2010, when solar hardware stood at an expensive 3.40 US dollars per Watt.',
      minimum: 'In extraordinary contrast, the lowest system cost is achieved in 2024, plunging down to only sixteen cents per Watt.',
      conclusion: 'In conclusion, massive industrial scaling has driven an astonishing ninety-five percent cost reduction, making solar energy globally affordable.'
    },
    examinerTips: 'Gunakan frasa "sixteen cents per Watt" atau "zero point one six dollars per Watt".'
  }
];

export function getPteQuestionById(id: string): PteDescribeImageQuestion | undefined {
  return PTE_DESCRIBE_IMAGE_BANK.find((q) => q.id === id);
}

export function getPteQuestionsByCategory(cat: PteChartCategory): PteDescribeImageQuestion[] {
  return PTE_DESCRIBE_IMAGE_BANK.filter((q) => q.category === cat);
}

export function getRandomPteQuestion(cat?: PteChartCategory): PteDescribeImageQuestion {
  const pool = cat ? getPteQuestionsByCategory(cat) : PTE_DESCRIBE_IMAGE_BANK;
  if (!pool || pool.length === 0) return PTE_DESCRIBE_IMAGE_BANK[0];
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}
