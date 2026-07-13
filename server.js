const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const uploadDir = path.join(__dirname, 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDir);
  },
  filename: (_req, file, callback) => {
    const safeFileName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}___${safeFileName}`;
    callback(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const mime = file.mimetype.toLowerCase();
    if (mime.startsWith('image/') || mime.startsWith('video/')) {
      callback(null, true);
      return;
    }

    callback(new Error('Only image and video files are allowed.'));
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'fileshareapp' });
});

app.get('/api/files', (_req, res) => {
  const files = fs.readdirSync(uploadDir)
    .filter((item) => fs.statSync(path.join(uploadDir, item)).isFile())
    .map((file) => {
      const displayName = file.includes('___') ? file.split('___').slice(1).join('___') : file;
      const fullPath = path.join(uploadDir, file);
      return {
        fileName: file,
        displayName,
        size: fs.statSync(fullPath).size,
        createdAt: fs.statSync(fullPath).mtime.toISOString(),
        downloadUrl: `/api/download/${encodeURIComponent(file)}`
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(files);
});

app.get('/api/download/:fileName', (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(uploadDir, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const displayName = fileName.includes('___') ? fileName.split('___').slice(1).join('___') : fileName;
  return res.download(filePath, displayName);
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please select an image or video file.' });
  }

  return res.json({
    message: 'File uploaded successfully',
    file: {
      fileName: req.file.filename,
      displayName: req.file.originalname,
      size: req.file.size,
      downloadUrl: `/api/download/${encodeURIComponent(req.file.filename)}`
    }
  });
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }

  if (err) {
    return res.status(400).json({ error: err.message });
  }

  return res.status(500).json({ error: 'Unexpected server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`File share app running on http://0.0.0.0:${PORT}`);
});
