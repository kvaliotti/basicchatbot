import os
import tempfile
import asyncio
from typing import List, Optional, Dict, Any
from fastapi import UploadFile
import numpy as np

from aimakerspace.text_utils import PDFLoader, CharacterTextSplitter
from aimakerspace.openai_utils.embedding import EmbeddingModel
from aimakerspace.vectordatabase import VectorDatabase


class RAGService:
    def __init__(self):
        self.embedding_model = EmbeddingModel()
        self.text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        self.vector_databases: Dict[str, VectorDatabase] = {}  # filename -> VectorDatabase
        self.document_metadata: Dict[str, Dict[str, Any]] = {}  # filename -> metadata
        
    async def process_pdf(self, file: UploadFile) -> Dict[str, Any]:
        """
        Process uploaded PDF file and create vector database for RAG
        """
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Load PDF using aimakerspace
            pdf_loader = PDFLoader(temp_file_path)
            documents = pdf_loader.load_documents()
            
            if not documents:
                raise ValueError("No content could be extracted from PDF")
            
            # Split text into chunks
            chunks = self.text_splitter.split_texts(documents)
            
            if not chunks:
                raise ValueError("No text chunks could be created from PDF")
            
            # Create vector database and build from chunks
            vector_db = VectorDatabase(self.embedding_model)
            await vector_db.abuild_from_list(chunks)
            
            # Store vector database and metadata
            filename = file.filename
            self.vector_databases[filename] = vector_db
            self.document_metadata[filename] = {
                "filename": filename,
                "chunks_count": len(chunks),
                "total_length": sum(len(chunk) for chunk in chunks),
                "file_size": len(content)
            }
            
            return {
                "filename": filename,
                "chunks_count": len(chunks),
                "status": "processed",
                "message": f"Successfully processed {filename} into {len(chunks)} chunks"
            }
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    def get_relevant_context(self, filename: str, query: str, k: int = 3) -> List[str]:
        """
        Retrieve relevant context from the PDF for a given query
        """
        if filename not in self.vector_databases:
            return []
        
        vector_db = self.vector_databases[filename]
        # Get search results as text-score tuples, then extract just the text
        search_results = vector_db.search_by_text(query, k=k, return_as_text=False)
        relevant_texts = [result[0] for result in search_results] if search_results else []
        return relevant_texts
    
    def get_uploaded_files(self) -> List[Dict[str, Any]]:
        """
        Get list of uploaded files and their metadata
        """
        return [
            {
                "filename": filename,
                **metadata
            }
            for filename, metadata in self.document_metadata.items()
        ]
    
    def delete_file(self, filename: str) -> bool:
        """
        Delete uploaded file and its vector database
        """
        if filename in self.vector_databases:
            del self.vector_databases[filename]
        if filename in self.document_metadata:
            del self.document_metadata[filename]
            return True
        return False 