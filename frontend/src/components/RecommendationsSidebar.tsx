import React from 'react';
import { Recommendation } from '../types/chat';

interface RecommendationsSidebarProps {
  recommendations: Recommendation[];
  onClearRecommendations?: () => void;
}

export const RecommendationsSidebar: React.FC<RecommendationsSidebarProps> = ({ 
  recommendations, 
  onClearRecommendations 
}) => {
  if (recommendations.length === 0) {
    return (
      <div className="w-80 bg-gray-50 border-l border-gray-200 p-4 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center">
            💡 Recommendations
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-xs text-center">
            No recommendations yet. Ask about research or documents to get next-step suggestions!
          </p>
        </div>
      </div>
    );
  }

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center">
          💡 Recommendations
          <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            {recommendations.length}
          </span>
        </h3>
        {onClearRecommendations && recommendations.length > 0 && (
          <button
            onClick={onClearRecommendations}
            className="text-gray-500 hover:text-gray-700 text-xs underline"
          >
            Clear
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-2">
        {recommendations.map((recommendation) => (
          <div
            key={recommendation.id}
            className="bg-white rounded p-2 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-1">
              <span className="text-xs text-gray-500 flex items-center">
                🔍 {formatTime(recommendation.timestamp)}
              </span>
            </div>
            
            <p className="text-xs text-gray-800 leading-relaxed">
              {recommendation.content}
            </p>
            
            {recommendation.sourceMessage && (
              <div className="mt-1 pt-1 border-t border-gray-100">
                <p className="text-xs text-gray-400 italic truncate">
                  From: "{recommendation.sourceMessage.substring(0, 40)}..."
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Instructions - Fixed at bottom */}
      <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200 flex-shrink-0">
        <p className="text-xs text-blue-700">
          <strong>💡 Tip:</strong> Recommendations are automatically extracted when the AI provides 
          next-step suggestions or research directions.
        </p>
      </div>
    </div>
  );
}; 