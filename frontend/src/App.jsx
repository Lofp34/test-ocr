import React, { useState } from 'react';
import axios from 'axios';
import { 
  Upload, 
  FileText, 
  Download, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Sparkles,
  Brain,
  Zap
} from 'lucide-react';

// Configuration de l'API
const API_BASE_URL = import.meta.env.PROD 
  ? '/api'  // En production, Vercel route vers /backend
  : 'http://localhost:3001'; // En développement, serveur local

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ocrUrl, setOcrUrl] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setOcrUrl('');
    setError('');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setOcrUrl('');
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setOcrUrl('');
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(`${API_BASE_URL}/ocr`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setOcrUrl(response.data.ocrUrl);
      setLoading(false);
    } catch (error) {
      console.error('Erreur OCR:', error);
      if (error.code === 'ECONNABORTED') {
        setError('Timeout: Le traitement OCR prend trop de temps. Vérifiez vos logs backend.');
      } else if (error.response) {
        setError(`Erreur: ${error.response.data.error || error.response.data.details || 'Erreur inconnue'}`);
      } else {
        setError(`Erreur de connexion: ${error.message}`);
      }
      setLoading(false);
    }
  };

  return (
    <div className="container">
      {/* Background Pattern */}
      <div className="background-pattern">
        <div className="bubble bubble-1"></div>
        <div className="bubble bubble-2"></div>
        <div className="bubble bubble-3"></div>
      </div>

      <div className="card">
        {/* Header avec Logo */}
        <div className="header">
          <div className="logo-container">
            <Brain className="logo-icon" />
            <h1 className="logo-text">Rational Consulting</h1>
            <Sparkles style={{ width: '24px', height: '24px', marginLeft: '12px', color: '#0ea5e9' }} />
          </div>
          <div className="subtitle-container">
            <Zap className="subtitle-icon" />
            <span className="subtitle">OCR Intelligence</span>
          </div>
          <p className="description">
            Transformez vos documents en données exploitables avec notre IA de pointe
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form">
          {/* Zone de Drop */}
          <div 
            className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="file-input"
              disabled={loading}
            />
            
            <div>
              <Upload className="upload-icon" />
              
              {file ? (
                <div className="file-selected">
                  <div className="file-info">
                    <CheckCircle style={{ width: '20px', height: '20px', marginRight: '8px' }} />
                    <span>Fichier sélectionné</span>
                  </div>
                  <p className="file-name">{file.name}</p>
                  <p className="file-size">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="upload-text">
                    Glissez votre PDF ici ou cliquez pour sélectionner
                  </p>
                  <p className="upload-hint">
                    Formats supportés: PDF • Taille max: 10MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bouton de traitement */}
          <button
            type="submit"
            disabled={!file || loading}
            className="submit-button"
          >
            {loading ? (
              <>
                <Loader2 style={{ width: '20px', height: '20px', marginRight: '8px' }} className="loading-icon" />
                <span>Traitement OCR en cours...</span>
              </>
            ) : (
              <>
                <FileText style={{ width: '20px', height: '20px', marginRight: '8px' }} />
                <span>Lancer l'OCR Intelligence</span>
              </>
            )}
          </button>

          {/* Messages de statut */}
          {loading && (
            <div className="loading-container">
              <Brain className="loading-icon" />
              <p className="loading-title">IA en action...</p>
              <p className="loading-text">
                Notre intelligence artificielle analyse votre document
              </p>
              <div className="progress-bar">
                <div className="progress-fill"></div>
              </div>
            </div>
          )}

          {error && (
            <div className="error-container">
              <AlertCircle className="error-icon" />
              <span className="error-text">{error}</span>
            </div>
          )}

          {ocrUrl && (
            <div className="success-container">
              <CheckCircle className="success-icon" />
              
              <h3 className="success-title">
                OCR terminé avec succès !
              </h3>
              <p className="success-text">
                Votre document a été analysé et converti
              </p>
              
              <a
                href={ocrUrl}
                download
                className="download-button"
              >
                <Download style={{ width: '20px', height: '20px', marginRight: '8px' }} />
                Télécharger le PDF OCRisé
              </a>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="footer">
          <p>
            Propulsé par <span className="footer-highlight">Mistral AI</span> • 
            Sécurisé et confidentiel • 
            <span className="footer-logo"> Rational Consulting</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
