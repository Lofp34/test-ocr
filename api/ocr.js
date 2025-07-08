import formidable from 'formidable';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import MistralClient from '@mistralai/mistralai';

// Configuration Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration Mistral
const mistralClient = new MistralClient(process.env.MISTRAL_API_KEY);

async function processOCRWithMistral(fileBuffer, fileName) {
  try {
    console.log(`🔍 Début du traitement OCR pour: ${fileName} avec le modèle mistral-ocr-latest`);
    
    // Convertir le buffer en base64
    const base64Pdf = fileBuffer.toString('base64');
    const dataUrl = `data:application/pdf;base64,${base64Pdf}`;

    console.log('📡 Envoi de la requête à Mistral OCR API...');
    const ocrResponse = await mistralClient.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        documentUrl: dataUrl
      }
    });
    
    console.log('✅ Réponse Mistral OCR reçue');

    // La réponse contient une liste de pages, chaque page a une liste d'extractions.
    // Nous allons concaténer le texte de toutes les extractions de toutes les pages.
    const extractedText = ocrResponse.pages
      .map(page => page.extractions.map(extraction => extraction.text).join('\\n'))
      .join('\\n\\n');

    if (!extractedText) {
      console.warn('⚠️ Le traitement OCR n\'a retourné aucun texte.');
      return '';
    }

    console.log(`📝 Texte extrait: ${extractedText.length} caractères`);
    return extractedText;

  } catch (error) {
    console.error('❌ Erreur processOCRWithMistral:', error);
    throw error;
  }
}

async function createOCRPDF(extractedText, originalFileName) {
  try {
    console.log('📄 Création du PDF OCRisé...');
    
    // Créer un nouveau document PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 en points
    
    // Configuration du texte
    const fontSize = 12;
    const margin = 50;
    const lineHeight = fontSize * 1.2;
    const maxWidth = page.getWidth() - (margin * 2);
    
    // Diviser le texte en lignes qui tiennent dans la largeur de la page
    const words = extractedText.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = testLine.length * (fontSize * 0.6); // Approximation
      
      if (textWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    
    // Ajouter le texte au PDF
    let y = page.getHeight() - margin;
    let pageCount = 1;
    
    for (const line of lines) {
      if (y < margin + lineHeight) {
        // Nouvelle page nécessaire
        const newPage = pdfDoc.addPage([595.28, 841.89]);
        y = newPage.getHeight() - margin;
        pageCount++;
        
        newPage.drawText(line, {
          x: margin,
          y: y,
          size: fontSize,
          color: rgb(0, 0, 0),
        });
      } else {
        page.drawText(line, {
          x: margin,
          y: y,
          size: fontSize,
          color: rgb(0, 0, 0),
        });
      }
      
      y -= lineHeight;
    }
    
    console.log(`📄 PDF créé avec ${pageCount} page(s)`);
    
    // Générer le PDF en tant que buffer
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
    
  } catch (error) {
    console.error('❌ Erreur createOCRPDF:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Début du traitement OCR');

    // Parse du form-data avec formidable
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    console.log(`📁 Fichier reçu: ${file.originalFilename} (${file.size} bytes)`);

    // Lire le fichier
    const fileBuffer = fs.readFileSync(file.filepath);

    // 1. Upload du fichier original vers Supabase
    const originalFileName = `${Date.now()}_${file.originalFilename}`;
    const originalPath = `originaux/${originalFileName}`;

    console.log('☁️ Upload vers Supabase...');
    const { error: uploadError } = await supabase.storage
      .from('factures')
      .upload(originalPath, fileBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('❌ Erreur upload Supabase:', uploadError);
      throw new Error(`Erreur upload: ${uploadError.message}`);
    }

    // 2. Traitement OCR avec Mistral
    const extractedText = await processOCRWithMistral(fileBuffer, file.originalFilename);

    // 3. Création du PDF OCRisé
    const ocrPdfBuffer = await createOCRPDF(extractedText, file.originalFilename);

    // 4. Upload du PDF OCRisé
    const ocrFileName = `ocr_${originalFileName}`;
    const ocrPath = `ocrises/${ocrFileName}`;

    const { error: ocrUploadError } = await supabase.storage
      .from('factures')
      .upload(ocrPath, ocrPdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });

    if (ocrUploadError) {
      console.error('❌ Erreur upload PDF OCR:', ocrUploadError);
      throw new Error(`Erreur upload OCR: ${ocrUploadError.message}`);
    }

    // 5. Génération de l'URL de téléchargement
    const { data: urlData } = supabase.storage
      .from('factures')
      .getPublicUrl(ocrPath);

    console.log('✅ Traitement OCR terminé avec succès');

    res.json({
      success: true,
      ocrUrl: urlData.publicUrl,
      originalPath,
      ocrPath,
      extractedTextLength: extractedText.length
    });

  } catch (error) {
    console.error('❌ Erreur handler OCR:', error);
    res.status(500).json({
      error: 'Erreur lors du traitement OCR',
      details: error.message
    });
  }
} 