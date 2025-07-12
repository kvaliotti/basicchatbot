import React, { useState } from 'react';

interface ApiKeyInputProps {
  apiKey: string;
  onSubmit: (key: string) => void;
  onReset: () => void;
  isSet: boolean;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ apiKey, onSubmit, onReset, isSet }) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(!isSet);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSubmit(inputValue.trim());
      setIsEditing(false);
    }
  };

  const handleEdit = () => {
    setInputValue(apiKey);
    setIsEditing(true);
  };

  const handleReset = () => {
    setInputValue('');
    setIsEditing(true);
    onReset();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-gray-700">OpenAI API Key</label>
        {isSet && !isEditing && (
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="text-blue-600 hover:text-blue-800 text-xs"
            >
              Edit
            </button>
            <button
              onClick={handleReset}
              className="text-red-600 hover:text-red-800 text-xs"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <div>
            <input
              type="password"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter your OpenAI API key"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-3 py-1.5 text-xs rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
            {isSet && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="bg-gray-300 text-gray-700 px-3 py-1.5 text-xs rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
          <span className="text-green-600 font-medium text-xs">✓ API Key Set</span>
          <span className="text-gray-500 text-xs">
            ({apiKey.substring(0, 8)}...{apiKey.substring(apiKey.length - 4)})
          </span>
        </div>
      )}
      <p className="text-xs text-gray-500 mt-1">
        Get your key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">platform.openai.com</a>
      </p>
    </div>
  );
};

export default ApiKeyInput; 