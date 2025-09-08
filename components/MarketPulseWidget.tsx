import React, { useState } from 'react';
// Fix: Added missing import for MarketAnalysis
import { Vacancy, MarketAnalysis } from '../types';
import { BarChart2, ThumbsDown, ThumbsUp } from './icons/Icons';
import { generateContentWithFallback } from '../utils/gemini';

interface MarketPulseWidgetProps {
  vacancy: Vacancy;
}

const MarketPulseWidget: React.FC<MarketPulseWidgetProps> = ({ vacancy }) => {
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [sources, setSources] = useState<{ uri: string; title: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyzeMarket = async () => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setSources([]);

    try {
      // STEP 1: Get market info with Google Search in natural language
      const marketInfoPrompt = `Act as a market analyst for a recruiter. Based on the following job description and using Google Search, provide a real-time market analysis. Include information about salary range, candidate pool size and location, active competitors, and talent donors. Respond in natural language.
      
      Job Description:
      ---
      ${vacancy.briefText}
      ---
      `;

      const searchResponse = await generateContentWithFallback({
        contents: marketInfoPrompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      
      const searchResultText = searchResponse.text;
      const groundingChunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const fetchedSources = groundingChunks
          ?.map((chunk: any) => ({
              uri: chunk.web.uri,
              title: chunk.web.title,
          }))
          .filter((s: any) => s.uri && s.uri.trim() !== '');

      if (fetchedSources && fetchedSources.length > 0) {
        setSources(fetchedSources);
      }
      
      // STEP 2: Extract structured JSON from the natural language response
      const extractionPrompt = `Extract the following information from the text provided and format it as a JSON object.
      
      The response MUST be a JSON object with the following structure, and nothing else:
      {
        "salaryRange": "e.g., 150 000 - 200 000 RUB",
        "candidatePool": {
          "location": "e.g., Moscow",
          "count": "e.g., ~1,500"
        },
        "activeCompetitors": ["Company A", "Company B"],
        "talentDonors": ["Company C", "Company D"]
      }
      
      If a piece of information is not present in the text, use an empty string or empty array.
      
      Text to analyze:
      ---
      ${searchResultText}
      ---
      `;
      
      const extractionResponse = await generateContentWithFallback({
          contents: extractionPrompt,
          config: {
              responseMimeType: "application/json"
          }
      });
      
      // The response should be clean JSON now.
      const resultJson = JSON.parse(extractionResponse.text.trim());

      if (resultJson) {
        setAnalysis(resultJson);
      } else {
        throw new Error("AI response could not be parsed as valid JSON.");
      }

    } catch (e: any) {
      console.error("Market analysis failed:", e);
      setError(`Ошибка анализа рынка. Ответ от AI не удалось обработать. Попробуйте снова.`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white mt-3">Анализируем рынок...</p>
        </div>
      );
    }
    
    if (error) {
         return (
             <div className="text-center p-4">
                 <p className="text-red-300 mb-4">{error}</p>
                 <button onClick={handleAnalyzeMarket} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                    Попробовать снова
                </button>
             </div>
         );
    }

    if (analysis) {
      return (
        <div className="space-y-4 animate-fade-in-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                <div className="bg-black/20 p-3 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-300">Средняя зарплата</h4>
                    <p className="text-lg font-bold text-white">{analysis.salaryRange}</p>
                </div>
                 <div className="bg-black/20 p-3 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-300">Доступно кандидатов</h4>
                    <p className="text-lg font-bold text-white">{analysis.candidatePool.count} ({analysis.candidatePool.location})</p>
                </div>
            </div>
            
            <div>
                 <h4 className="font-semibold text-gray-200 mb-2 flex items-center gap-2"><ThumbsDown className="w-5 h-5 text-red-400" /> Активные конкуренты</h4>
                 <div className="flex flex-wrap gap-2">
                    {analysis.activeCompetitors.map((c, i) => (
                        <span key={i} className="px-3 py-1 bg-red-900/40 text-red-200 text-sm rounded-full">{c}</span>
                    ))}
                </div>
            </div>

            <div>
                <h4 className="font-semibold text-gray-200 mb-2 flex items-center gap-2"><ThumbsUp className="w-5 h-5 text-green-400" /> Компании-доноры</h4>
                <div className="flex flex-wrap gap-2">
                    {analysis.talentDonors.map((d, i) => (
                        <span key={i} className="px-3 py-1 bg-green-900/40 text-green-200 text-sm rounded-full">{d}</span>
                    ))}
                </div>
            </div>

            {sources.length > 0 && (
                <div className="pt-3 border-t border-white/20">
                    <h4 className="text-sm font-semibold text-gray-300 mb-1">Источники:</h4>
                    <ul className="space-y-1 text-xs">
                    {sources.map((source, i) => (
                        <li key={i} className="truncate">
                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline" title={source.title || source.uri}>
                            {i+1}. {source.title || new URL(source.uri).hostname}
                        </a>
                        </li>
                    ))}
                    </ul>
                </div>
            )}
        </div>
      );
    }

    return (
        <div className="text-center p-4">
            <p className="text-gray-300 mb-4">Получите срез по рынку для этой вакансии на основе данных из открытых источников.</p>
            <button onClick={handleAnalyzeMarket} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                <BarChart2 className="w-5 h-5" />
                Анализировать рынок
            </button>
        </div>
    );
  };

  return (
    <div className="mt-6 pt-6 border-t border-white/20">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <BarChart2 /> Пульс рынка
      </h3>
      <div className="bg-black/20 rounded-lg p-2">
        {renderContent()}
      </div>
    </div>
  );
};

export default MarketPulseWidget;