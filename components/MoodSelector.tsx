import React from 'react';

interface MoodSelectorProps {
  selectedMoods: string[];
  setSelectedMoods: (moods: string[]) => void;
}

const moods = [
  "Inspired ✨", 
  "Nostalgic 🕰️", 
  "Curious 🤔", 
  "Need a laugh 😂",
  "Learn something 🧠",
  "Relax & Unwind 🧘",
  "Feeling Energetic ⚡",
  "Deep Dive 🤿",
  "Heartwarming ❤️",
  "Mind-Bending 🤯",
  "Adventurous 🗺️",
  "Creative 🎨"
];

const MoodSelector: React.FC<MoodSelectorProps> = ({ selectedMoods, setSelectedMoods }) => {
  const handleMoodClick = (mood: string) => {
    const newSelectedMoods = selectedMoods.includes(mood)
      ? selectedMoods.filter((m) => m !== mood)
      : [...selectedMoods, mood];
    setSelectedMoods(newSelectedMoods);
  };

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
      {moods.map((mood) => {
        const parts = mood.split(' ');
        const emoji = parts.pop() || '';
        const text = parts.join(' ');
        
        return (
          <button
            key={mood}
            onClick={() => handleMoodClick(mood)}
            className={`flex flex-col items-center justify-center p-2 aspect-square rounded-2xl border transition-all duration-200 ease-in-out transform focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#181818] ${
              selectedMoods.includes(mood)
                ? 'bg-white text-black border-white font-bold scale-105 shadow-lg'
                : 'bg-white/10 border-white/20 text-gray-200 hover:bg-white/20 hover:border-white/40'
            }`}
          >
            <span className="text-3xl" aria-hidden="true">{emoji}</span>
            <span className="text-xs font-semibold mt-1 text-center">{text}</span>
          </button>
        );
      })}
    </div>
  );
};

export default MoodSelector;