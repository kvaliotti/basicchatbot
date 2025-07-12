import React from 'react';

interface ResearchStep {
  step_number: number;
  tool_name: string;
  tool_input: string;
  tool_output: string;
  timestamp: string;
}

interface ResearchStepsProps {
  steps: ResearchStep[];
}

const ResearchSteps: React.FC<ResearchStepsProps> = ({ steps }) => {
  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case 'query_enhancer':
        return '🎯';
      case 'tavily_search':
        return '🌐';
      case 'wikipedia_search':
        return '📚';
      case 'pubmed_search':
        return '🔬';
      case 'code_interpreter':
        return '💻';
      case 'pdf_parser':
        return '📄';
      default:
        return '🔧';
    }
  };

  const getToolDisplayName = (toolName: string) => {
    switch (toolName) {
      case 'query_enhancer':
        return 'Query Enhancement & Refinement';
      case 'tavily_search':
        return 'Regulatory News & Updates';
      case 'wikipedia_search':
        return 'Healthcare Knowledge Base';
      case 'pubmed_search':
        return 'Medical Literature';
      case 'code_interpreter':
        return 'Compliance Analysis';
      case 'pdf_parser':
        return 'Regulatory Document Parser';
      default:
        return toolName;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  const parseToolInput = (input: string) => {
    try {
      const parsed = JSON.parse(input);
      if (typeof parsed === 'object') {
        return Object.values(parsed).join(', ');
      }
      return String(parsed);
    } catch {
      return input;
    }
  };

  return (
    <div className="w-80 bg-white shadow-lg border-l border-gray-200 flex flex-col h-full">
      <div className="p-3 border-b border-gray-200 flex-shrink-0">
        <h3 className="text-base font-semibold text-gray-900">🔍 Research Analysis</h3>
        <p className="text-xs text-gray-600">
          {steps.length} step{steps.length !== 1 ? 's' : ''} completed
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Multi-source compliance research
        </p>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0">
        {steps.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="text-4xl mb-2">⚕️</div>
            <p>Healthcare compliance research steps will appear here as the analyst works...</p>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {steps.map((step) => (
                                              <div
                  key={step.step_number}
                  className="bg-gray-50 rounded-lg p-2 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start space-x-2 flex-1 min-w-0">
                      <span className="text-sm flex-shrink-0">{getToolIcon(step.tool_name)}</span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium text-xs text-gray-900 truncate">
                          {getToolDisplayName(step.tool_name)}
                        </span>
                        <span className="text-xs text-gray-500 font-mono truncate">
                          {step.tool_name}
                        </span>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex-shrink-0">
                        #{step.step_number}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {formatTimestamp(step.timestamp)}
                    </span>
                  </div>

                  <div className="text-xs text-gray-700 mb-1">
                    <strong>Input:</strong> <span className="break-words">{parseToolInput(step.tool_input)}</span>
                  </div>

                  <div className="text-xs text-gray-600">
                    <strong>Output:</strong>
                    <div className="mt-1 p-1.5 bg-white rounded border max-h-16 overflow-y-auto text-xs">
                      {step.tool_output}
                    </div>
                  </div>
                </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchSteps; 