
import React from 'react';
import type { VideoSuggestion } from '../types';

interface SuggestionCardProps {
  suggestion: VideoSuggestion;
  onReset: () => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onReset }) => {
  return (
    <div className="w-full max-w-lg mx-auto bg-[#282828] rounded-xl shadow-2xl overflow-hidden animate-fade-in">
      <div className="relative">
        <img src={suggestion.thumbnailUrl} alt={suggestion.title} className="w-full h-auto object-cover aspect-video" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
        <h2 className="absolute bottom-4 left-4 right-4 text-xl md:text-2xl font-bold text-white drop-shadow-lg">
          {suggestion.title}
        </h2>
      </div>
      <div className="p-5 md:p-6 space-y-4">
        <p className="text-sm text-gray-400 -mt-3">
          {suggestion.channelName} &bull; {suggestion.duration}
        </p>

        <div className="flex flex-wrap gap-2">
            {suggestion.tags.map((tag) => (
                <span key={tag} className="bg-white/10 text-gray-300 text-xs font-medium px-2.5 py-1 rounded-full">
                    {tag}
                </span>
            ))}
        </div>

        <p className="text-gray-300 pt-1">{suggestion.promotionalSummary}</p>
        
        <div className="flex flex-col items-center gap-4 pt-2">
          <a
            href={suggestion.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-center px-6 py-3 bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#282828]"
          >
            Watch on YouTube
          </a>
          <button
            onClick={onReset}
            className="text-gray-400 hover:text-white transition-colors text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 rounded"
          >
            Find Another
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuggestionCard;