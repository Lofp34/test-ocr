const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { Mistral } = require('@mistralai/mistralai');
const { PDFDocument, StandardFonts } = require('pdf-lib');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Initialisation Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialisation Mistral
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

// Fonction pour créer le bucket s'il n'existe pas
async function ensureBucketExists() {
  try {
    // Vérifier si le bucket existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Erreur lors de la liste des buckets:', listError);
      // Ne pas bloquer si on ne peut pas lister les buckets
      return;
    }
    
    const facturesBucket = buckets.find(bucket => bucket.name === 'factures');
    
    if (!facturesBucket) {
      console.log('Création du bucket factures...');
      const { data, error } = await supabase.storage.createBucket('factures', {
        public: true,
        allowedMimeTypes: ['application/pdf', 'image/*']
      });
      
      if (error) {
        console.error('Erreur création bucket:', error);
        // Si le bucket existe déjà (erreur commune), on continue
        if (error.message && error.message.includes('already exists')) {
          console.log('Le bucket existe déjà, on continue...');
          return;
        }
        throw error;
      }
      console.log('Bucket factures créé avec succès');
    } else {
      console.log('Bucket factures existe déjà');
    }
  } catch (error) {
    console.error('Erreur ensureBucketExists:', error);
    // Ne pas faire planter l'application si le bucket existe déjà
    if (error.message && (error.message.includes('already exists') || error.message.includes('Bucket not found'))) {
      console.log('Problème de bucket résolu, on continue...');
      return;
    }
    throw error;
  }
}

router.post('/', upload.single('file'), async (req, res) => {
  console.log('=== DÉBUT TRAITEMENT OCR ===');
  
  try {
    // 1. Vérifier le fichier reçu
    const file = req.file;
    if (!file) {
      console.log('Erreur: Aucun fichier reçu');
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    
    console.log('Fichier reçu:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // 2. S'assurer que le bucket existe (DÉSACTIVÉ - bucket créé manuellement)
    // console.log('Vérification du bucket...');
    // await ensureBucketExists();

    // 3. Upload du fichier original dans Supabase Storage
    console.log('Upload du fichier original...');
    const fileName = `${Date.now()}_${file.originalname}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('factures')
      .upload(`originaux/${fileName}`, file.buffer, {
        contentType: file.mimetype
      });

    if (uploadError) {
      console.error('Erreur upload Supabase:', uploadError);
      throw uploadError;
    }
    
    console.log('Fichier uploadé avec succès:', uploadData.path);

    // 4. Appel à l'API Mistral OCR (VERSION RÉELLE)
    console.log('Appel à l\'API Mistral OCR...');
    
    try {
      // Upload du fichier vers Mistral
      console.log('Upload du fichier vers Mistral...');
      const uploadedFile = await mistral.files.upload({
        file: {
          fileName: file.originalname,
          content: file.buffer,
        },
        purpose: 'ocr',
      });
      
      console.log('Fichier uploadé vers Mistral, ID:', uploadedFile.id);

      // Récupération de l'URL signée
      console.log('Récupération de l\'URL signée...');
      const signedUrl = await mistral.files.getSignedUrl({
        fileId: uploadedFile.id,
      });
      
      console.log('URL signée obtenue');

      // Lancement de l'OCR
      console.log('Lancement de l\'OCR Mistral...');
      const ocrResponse = await mistral.ocr.process({
        model: 'mistral-ocr-latest',
        document: {
          type: 'document_url',
          documentUrl: signedUrl.url,
        },
        includeImageBase64: false,
      });

      console.log('OCR terminé, nombre de pages:', ocrResponse.pages?.length || 0);

      // Extraction du texte markdown de toutes les pages
      let ocrText = '';
      if (ocrResponse.pages && ocrResponse.pages.length > 0) {
        ocrText = ocrResponse.pages.map(page => page.markdown).join('\n\n---\n\n');
        console.log('Texte OCR extrait (longueur):', ocrText.length);
      } else {
        throw new Error('Aucune page OCRisée retournée par Mistral');
      }

      // 5. Génération du PDF OCRisé
      console.log('Génération du PDF OCRisé...');
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      // Ajouter un en-tête avec les informations du fichier
      const headerText = `Fichier OCRisé: ${file.originalname}\nDate: ${new Date().toLocaleString('fr-FR')}\nTraité par: Mistral OCR\n\n${'='.repeat(80)}\n\n`;
      const fullText = headerText + ocrText;
      
      // Découper le texte en lignes pour le PDF
      const lines = fullText.split('\n');
      let currentPage = pdfDoc.addPage([595.28, 841.89]); // A4
      let yPosition = 800;
      const lineHeight = 15;
      const margin = 50;
      const pageWidth = 595.28 - (margin * 2);

      for (const line of lines) {
        // Vérifier si on a besoin d'une nouvelle page
        if (yPosition < 50) {
          currentPage = pdfDoc.addPage([595.28, 841.89]);
          yPosition = 800;
        }

        // Gérer les lignes trop longues
        if (line.length > 80) {
          const words = line.split(' ');
          let currentLine = '';
          
          for (const word of words) {
            if ((currentLine + word).length > 80) {
              if (currentLine) {
                currentPage.drawText(currentLine.trim(), {
                  x: margin,
                  y: yPosition,
                  size: 10,
                  font: font,
                });
                yPosition -= lineHeight;
                
                if (yPosition < 50) {
                  currentPage = pdfDoc.addPage([595.28, 841.89]);
                  yPosition = 800;
                }
              }
              currentLine = word + ' ';
            } else {
              currentLine += word + ' ';
            }
          }
          
          if (currentLine.trim()) {
            currentPage.drawText(currentLine.trim(), {
              x: margin,
              y: yPosition,
              size: 10,
              font: font,
            });
            yPosition -= lineHeight;
          }
        } else {
          currentPage.drawText(line, {
            x: margin,
            y: yPosition,
            size: 10,
            font: font,
          });
          yPosition -= lineHeight;
        }
      }

      const pdfBytes = await pdfDoc.save();
      console.log('PDF généré (taille):', pdfBytes.length);

      // 6. Upload du PDF OCRisé dans Supabase
      console.log('Upload du PDF OCRisé...');
      const ocrFileName = `ocr_${fileName.replace(/\.[^/.]+$/, '')}.pdf`;
      const { data: ocrUploadData, error: ocrUploadError } = await supabase.storage
        .from('factures')
        .upload(`ocrises/${ocrFileName}`, pdfBytes, {
          contentType: 'application/pdf'
        });

      if (ocrUploadError) {
        console.error('Erreur upload PDF OCRisé:', ocrUploadError);
        throw ocrUploadError;
      }

      console.log('PDF OCRisé uploadé:', ocrUploadData.path);

      // 7. Génération de l'URL publique
      const { data: urlData } = supabase.storage
        .from('factures')
        .getPublicUrl(ocrUploadData.path);

      console.log('URL publique générée:', urlData.publicUrl);
      console.log('=== FIN TRAITEMENT OCR (SUCCÈS) ===');

      res.json({
        success: true,
        ocrUrl: urlData.publicUrl,
        message: 'OCR terminé avec succès',
        pages: ocrResponse.pages?.length || 0
      });

    } catch (mistralError) {
      console.error('Erreur Mistral OCR:', mistralError);
      throw new Error(`Erreur Mistral OCR: ${mistralError.message}`);
    }

  } catch (error) {
    console.error('=== ERREUR TRAITEMENT OCR ===');
    console.error('Type d\'erreur:', error.constructor.name);
    console.error('Message d\'erreur:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('=== FIN ERREUR ===');
    
    res.status(500).json({
      error: 'Erreur lors du traitement OCR',
      details: error.message
    });
  }
});

module.exports = router; 