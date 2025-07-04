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
    <div className="border-b border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">OpenAI API Key</h2>
        {isSet && !isEditing && (
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Edit
            </button>
            <button
              onClick={handleReset}
              className="text-red-600 hover:text-red-800 font-medium"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter your OpenAI API key"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save API Key
            </button>
            {isSet && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-green-600 font-medium">✓ API Key Set</span>
          <span className="text-gray-500">
            ({apiKey.substring(0, 8)}...{apiKey.substring(apiKey.length - 4)})
          </span>
        </div>
      )}
    </div>
  );
};

export default ApiKeyInput; 