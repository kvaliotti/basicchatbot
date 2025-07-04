import React, { useState, useEffect } from 'react';
import { chatService } from '../services/chatService';
import { PDFInfo, PDFUploadResponse } from '../types/chat';

interface PDFManagerProps {
  selectedPDF: string | null;
  onPDFSelect: (filename: string | null) => void;
}

export const PDFManager: React.FC<PDFManagerProps> = ({ selectedPDF, onPDFSelect }) => {
  const [pdfs, setPdfs] = useState<PDFInfo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPDFs();
  }, []);

  const loadPDFs = async () => {
    setLoading(true);
    try {
      const uploadedPDFs = await chatService.getUploadedPDFs();
      setPdfs(uploadedPDFs);
    } catch (error) {
      console.error('Error loading PDFs:', error);
      setUploadMessage('Error loading PDFs');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadMessage('Please select a PDF file');
      return;
    }

    setUploading(true);
    setUploadMessage('');

    try {
      const result: PDFUploadResponse = await chatService.uploadPDF(file);
      setUploadMessage(`✅ ${result.message}`);
      await loadPDFs(); // Refresh the list
      
      // Auto-select the newly uploaded PDF
      onPDFSelect(result.filename);
    } catch (error: any) {
      console.error('Error uploading PDF:', error);
      setUploadMessage(`❌ Upload failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setUploading(false);
      // Clear the input
      event.target.value = '';
    }
  };

  const handleDeletePDF = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      const result = await chatService.deletePDF(filename);
      if (result.success) {
        setUploadMessage(`✅ ${result.message}`);
        await loadPDFs();
        
        // If the deleted PDF was selected, clear selection
        if (selectedPDF === filename) {
          onPDFSelect(null);
        }
      } else {
        setUploadMessage(`❌ ${result.message}`);
      }
    } catch (error: any) {
      console.error('Error deleting PDF:', error);
      setUploadMessage(`❌ Delete failed: ${error.response?.data?.detail || error.message}`);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">📄 PDF Documents</h2>
      
      {/* Upload Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload PDF for RAG Chat
        </label>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          disabled={uploading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
        {uploading && (
          <div className="mt-2 text-sm text-blue-600">
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing PDF...
            </div>
          </div>
        )}
        {uploadMessage && (
          <div className={`mt-2 text-sm ${uploadMessage.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
            {uploadMessage}
          </div>
        )}
      </div>

      {/* PDF List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Uploaded Documents</h3>
        {loading ? (
          <div className="text-center py-4 text-gray-500">Loading...</div>
        ) : pdfs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No PDFs uploaded yet.</p>
            <p className="text-sm">Upload a PDF to start chatting with your documents!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pdfs.map((pdf) => (
              <div
                key={pdf.filename}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedPDF === pdf.filename
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => onPDFSelect(selectedPDF === pdf.filename ? null : pdf.filename)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {pdf.filename}
                    </h4>
                    <div className="mt-1 text-xs text-gray-500 space-y-1">
                      <div>📊 {pdf.chunks_count} chunks • {formatFileSize(pdf.file_size)}</div>
                      <div>📄 {pdf.total_length.toLocaleString()} characters</div>
                    </div>
                    {selectedPDF === pdf.filename && (
                      <div className="mt-2 text-xs text-blue-600 font-medium">
                        ✓ Selected for RAG chat
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePDF(pdf.filename);
                    }}
                    className="ml-2 text-red-500 hover:text-red-700 text-sm"
                    title="Delete PDF"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPDF && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            📚 <strong>Document Context Active:</strong> The expert consultants will use content from "{selectedPDF}" to inform their discussion and provide more specific insights.
            <button
              onClick={() => onPDFSelect(null)}
              className="ml-2 text-blue-600 hover:text-blue-800 underline"
            >
              Remove document context
            </button>
          </p>
        </div>
      )}
    </div>
  );
}; 