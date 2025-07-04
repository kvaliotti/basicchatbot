import React from 'react';
import { ChatMode, ChatModeInfo } from '../types/chat';

interface ModeSelectorProps {
  selectedMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

const CHAT_MODES: ChatModeInfo[] = [
  {
    id: 'general',
    label: 'General',
    description: 'Expert consultant discussion format',
    icon: '💼'
  },
  {
    id: 'research_reviewer',
    label: 'Research Article Reviewer',
    description: 'Research analysis with next-step recommendations',
    icon: '🔬'
  }
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({ selectedMode, onModeChange }) => {
  const selectedModeInfo = CHAT_MODES.find(mode => mode.id === selectedMode);

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-blue-200 p-4">
      <label htmlFor="mode-selector" className="block text-lg font-semibold text-gray-800 mb-3">
        🔧 Chat Mode
      </label>
      
      <div className="relative">
        <select
          id="mode-selector"
          value={selectedMode}
          onChange={(e) => onModeChange(e.target.value as ChatMode)}
          className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
        >
          {CHAT_MODES.map((mode) => (
            <option key={mode.id} value={mode.id}>
              {mode.icon} {mode.label}
            </option>
          ))}
        </select>
        
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {/* Mode description */}
      {selectedModeInfo && (
        <p className="mt-3 text-sm text-gray-700 font-medium">
          {selectedModeInfo.icon} {selectedModeInfo.description}
        </p>
      )}
    </div>
  );
}; 