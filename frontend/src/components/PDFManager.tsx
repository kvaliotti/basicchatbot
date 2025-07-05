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

  const loadPDFs = async (retries = 3): Promise<PDFInfo[]> => {
    setLoading(true);
    try {
      const uploadedPDFs = await chatService.getUploadedPDFs();
      setPdfs(uploadedPDFs);
      return uploadedPDFs;
    } catch (error) {
      console.error('Error loading PDFs:', error);
      if (retries > 0) {
        // Wait a bit and retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        return loadPDFs(retries - 1);
      }
      setUploadMessage('Error loading PDFs');
      return [];
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
      
      // Add a small delay to ensure backend has committed the PDF
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedPDFs = await loadPDFs(); // Refresh the list
      
      // Validate that the PDF is in the list before selecting it
      const uploadedPDF = updatedPDFs.find(pdf => pdf.filename === result.filename);
      
      if (uploadedPDF) {
        // Auto-select the newly uploaded PDF
        onPDFSelect(result.filename);
      } else {
        setUploadMessage(`⚠️ PDF uploaded but not found in list. Please refresh.`);
      }
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
      <h2 className="text-sm font-semibold text-gray-700 mb-2">📄 PDF Documents</h2>
      
      {/* Upload Section */}
      <div className="mb-2">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          disabled={uploading}
          className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
        {uploading && (
          <div className="mt-1 text-xs text-blue-600 flex items-center">
            <svg className="animate-spin mr-1 h-3 w-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </div>
        )}
        {uploadMessage && (
          <div className={`mt-1 text-xs ${uploadMessage.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
            {uploadMessage}
          </div>
        )}
      </div>

      {/* PDF List */}
      {loading ? (
        <div className="text-center py-2 text-xs text-gray-500">Loading...</div>
      ) : pdfs.length === 0 ? (
        <div className="text-center py-3 text-gray-500">
          <p className="text-xs">No PDFs uploaded yet.</p>
        </div>
      ) : (
        <div className="max-h-20 overflow-y-auto space-y-1">
          {pdfs.map((pdf) => (
            <div
              key={pdf.filename}
              className={`border rounded p-2 cursor-pointer transition-colors text-xs ${
                selectedPDF === pdf.filename
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => onPDFSelect(selectedPDF === pdf.filename ? null : pdf.filename)}
            >
              <div className="flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {pdf.filename}
                  </div>
                  <div className="text-gray-500 flex items-center space-x-2">
                    <span>📊 {pdf.chunks_count}</span>
                    <span>💾 {formatFileSize(pdf.file_size)}</span>
                    {selectedPDF === pdf.filename && (
                      <span className="text-blue-600 font-medium">✓ Active</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePDF(pdf.filename);
                  }}
                  className="ml-2 text-red-500 hover:text-red-700"
                  title="Delete PDF"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPDF && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
          <span className="text-blue-800">
            📚 <strong>{selectedPDF}</strong> context active
            <button
              onClick={() => onPDFSelect(null)}
              className="ml-2 text-blue-600 hover:text-blue-800 underline"
            >
              Remove
            </button>
          </span>
        </div>
      )}
    </div>
  );
}; 