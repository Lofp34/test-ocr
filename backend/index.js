require('dotenv').config();
const express = require('express');
const cors = require('cors');
const ocrRouter = require('./ocr');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/ocr', ocrRouter);

app.get('/', (req, res) => {
  res.send('API OCR backend opérationnelle');
});

app.listen(PORT, () => {
  console.log(`Serveur backend OCR démarré sur le port ${PORT}`);
}); 