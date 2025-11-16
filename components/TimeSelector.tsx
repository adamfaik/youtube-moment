
import React, { useState, useRef, useEffect, useCallback } from 'react';

interface TimeSelectorProps {
  selectedTime: number;
  setSelectedTime: (time: number) => void;
}

const MIN_TIME = 5;
const MAX_TIME = 120;
const TIME_STEP = 5;

const TimeSelector: React.FC<TimeSelectorProps> = ({ selectedTime, setSelectedTime }) => {
  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const angleToTime = useCallback((angle: number) => {
    const timeRange = MAX_TIME - MIN_TIME;
    let time = MIN_TIME + (angle / 360) * timeRange;
    time = Math.round(time / TIME_STEP) * TIME_STEP;
    return Math.max(MIN_TIME, Math.min(MAX_TIME, time));
  }, []);

  const timeToAngle = useCallback((time: number) => {
    const timeRange = MAX_TIME - MIN_TIME;
    if (timeRange <= 0) return 0;
    const timeNormalized = (time - MIN_TIME) / timeRange;
    return timeNormalized * 360;
  }, []);

  const handleInteraction = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!dialRef.current) return;

    const dial = dialRef.current;
    const rect = dial.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let clientX, clientY;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }
    
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    angle = (angle + 90 + 360) % 360;

    setSelectedTime(angleToTime(angle));
  }, [angleToTime, setSelectedTime]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleInteraction(e);
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (isDragging) {
        handleInteraction(e);
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleInteraction]);

  const currentAngle = timeToAngle(selectedTime);
  const dialSize = "220px";

  return (
    <div 
        className="relative flex items-center justify-center select-none"
        style={{ width: dialSize, height: dialSize }}
    >
      <div
        ref={dialRef}
        className="w-full h-full rounded-full bg-[#101010] border-4 border-gray-700/50 shadow-inner flex items-center justify-center cursor-pointer"
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        <div className="text-center">
            <div className="text-5xl font-bold text-white tracking-tighter">
                {selectedTime}
            </div>
            <div className="text-sm text-gray-400 uppercase tracking-widest">
                Minutes
            </div>
        </div>
        <div 
            className="absolute top-0 left-1/2 w-1 h-1/2 -ml-0.5 origin-bottom"
            style={{ transform: `rotate(${currentAngle}deg)` }}
        >
            <div className="w-4 h-4 -ml-1.5 -mt-2 bg-red-500 rounded-full border-2 border-white/80 shadow-lg"></div>
        </div>
      </div>
    </div>
  );
};

export default TimeSelector;
