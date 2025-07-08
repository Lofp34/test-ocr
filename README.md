# 🧠 Rational Consulting OCR Intelligence

> Transformez vos documents en données exploitables avec notre IA de pointe

[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18+-blue?logo=react)](https://reactjs.org)
[![Mistral AI](https://img.shields.io/badge/Powered%20by-Mistral%20AI-orange)](https://mistral.ai)

## 🚀 Fonctionnalités

- **OCR Intelligence** : Extraction de texte haute précision avec Mistral AI
- **Interface Premium** : Design glassmorphism moderne et responsive
- **Upload Sécurisé** : Glisser-déposer avec validation PDF
- **Stockage Cloud** : Intégration Supabase pour la persistance
- **Téléchargement Instant** : PDF OCRisé disponible immédiatement

## 🏗️ Architecture

```
rational-consulting-ocr/
├── frontend/          # Interface React avec Vite
├── backend/           # API Node.js/Express
├── vercel.json       # Configuration déploiement
└── README.md         # Documentation
```

## 🛠️ Installation

### Prérequis
- Node.js 18+
- Compte Supabase
- Clé API Mistral AI

### Installation locale

1. **Cloner le projet**
```bash
git clone https://github.com/Lofp34/test-ocr.git
cd test-ocr
```

2. **Installer les dépendances**
```bash
npm run install:all
```

3. **Configuration backend**
```bash
cd backend
cp .env.example .env
# Configurer vos clés API dans .env
```

4. **Lancer en développement**
```bash
npm run dev
```

## 🌐 Déploiement Vercel

### Via GitHub (Recommandé)

1. **Push vers GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Connecter à Vercel**
- Aller sur [vercel.com](https://vercel.com)
- Importer le repository GitHub
- Configurer les variables d'environnement

### Variables d'environnement Vercel

```env
MISTRAL_API_KEY=your_mistral_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NODE_ENV=production
```

## 🔧 Configuration

### Backend (.env)
```env
MISTRAL_API_KEY=your_mistral_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=3001
```

### Supabase Setup
1. Créer un bucket `factures` avec dossiers :
   - `originaux/` (fichiers uploadés)
   - `ocrises/` (fichiers traités)

2. Configurer les politiques RLS pour l'accès public

## 📊 Utilisation

1. **Upload** : Glissez votre PDF ou cliquez pour sélectionner
2. **Traitement** : L'IA Mistral analyse votre document
3. **Téléchargement** : Récupérez votre PDF OCRisé

## 🎨 Interface

- **Design Premium** : Glassmorphism avec animations fluides
- **Responsive** : Optimisé mobile et desktop
- **Accessibilité** : Conforme aux standards WCAG
- **Performance** : Chargement optimisé et lazy loading

## 🔒 Sécurité

- Validation stricte des fichiers PDF
- Chiffrement des données en transit
- Stockage sécurisé Supabase
- Gestion des erreurs robuste

## 📈 Performance

- **Frontend** : Build optimisé Vite
- **Backend** : API Node.js performante
- **CDN** : Distribution Vercel Edge Network
- **Cache** : Stratégies de mise en cache intelligentes

## 🤝 Support

Pour toute question ou support :
- 📧 Email : contact@rational-consulting.fr
- 🌐 Site : [rational-consulting.fr](https://rational-consulting.fr)

## 📄 Licence

MIT License - voir [LICENSE](LICENSE) pour plus de détails.

---

**Développé avec ❤️ par [Rational Consulting](https://rational-consulting.fr)** test

*Propulsé par Mistral AI • Sécurisé et confidentiel* Derniere mise a jour: Tue Jul  8 21:24:04 CEST 2025
