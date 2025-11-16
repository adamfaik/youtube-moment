import React, { useState, useCallback } from 'react';
import TimeSelector from './components/TimeSelector';
import MoodSelector from './components/MoodSelector';
import SuggestionCard from './components/SuggestionCard';
import SparkleIcon from './components/icons/SparkleIcon';
import { fetchVideoSuggestion } from './services/geminiService';
import type { VideoSuggestion } from './types';

const App: React.FC = () => {
  const [selectedTime, setSelectedTime] = useState<number>(15);
  const [selectedMoods, setSelectedMoods] = useState<string[]>(['Curious 🤔']);
  const [suggestion, setSuggestion] = useState<VideoSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFindMoment = useCallback(async () => {
    if (selectedMoods.length === 0) {
      setError('Please select at least one mood.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const result = await fetchVideoSuggestion(selectedTime, selectedMoods);
      setSuggestion(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTime, selectedMoods]);

  const handleReset = () => {
    setSuggestion(null);
    setError(null);
    setIsLoading(false);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center text-gray-300 flex flex-col items-center gap-4 animate-fade-in">
           <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-lg">Finding your perfect moment...</p>
           <p className="text-sm text-gray-400">This can take a few seconds.</p>
        </div>
      );
    }

    if (error) {
        return (
            <div className="w-full max-w-md mx-auto text-center bg-red-900/50 border border-red-700 p-6 rounded-lg animate-fade-in">
                <h3 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h3>
                <p className="text-red-200 mb-4">{error}</p>
                <button
                    onClick={handleReset}
                    className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (suggestion) {
      return <SuggestionCard suggestion={suggestion} onReset={handleReset} />;
    }

    return (
      <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-white">Moment</h1>
            <p className="mt-2 text-lg text-gray-400 font-light">Your YouTube discovery companion.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-8 md:gap-12">
            {/* Left Column */}
            <div className="md:w-2/5 space-y-4">
              <h2 className="text-center md:text-left font-semibold text-gray-200 text-lg">How much time do you have?</h2>
              <div className="flex justify-center md:justify-start">
                <TimeSelector selectedTime={selectedTime} setSelectedTime={setSelectedTime} />
              </div>
            </div>

            {/* Right Column */}
            <div className="md:w-3/5 space-y-4">
              <h2 className="text-center font-semibold text-gray-200 text-lg">What's your mood?</h2>
              <MoodSelector selectedMoods={selectedMoods} setSelectedMoods={setSelectedMoods} />
            </div>
          </div>
          
          <div className="pt-4">
            <button
              onClick={handleFindMoment}
              disabled={isLoading || selectedMoods.length === 0}
              className="w-full max-w-sm mx-auto flex items-center justify-center gap-3 px-8 py-4 bg-red-600 text-white font-bold text-lg rounded-full shadow-lg shadow-red-900/50 hover:bg-red-700 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:bg-gray-600 disabled:shadow-none disabled:cursor-not-allowed disabled:scale-100 focus:outline-none focus:ring-4 focus:ring-red-500/50"
            >
              <SparkleIcon className="w-6 h-6" />
              <span>Find my Moment</span>
            </button>
          </div>
      </div>
    );
  };
  
  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-b from-[#181818] to-[#121212]">
      <div className="w-full">
        {renderContent()}
      </div>
    </main>
  );
};

export default App;