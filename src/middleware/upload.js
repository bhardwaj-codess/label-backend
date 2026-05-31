const multer = require('multer');
const path = require('path');

// Configure memory storage to process file buffer directly without writing to disk
const storage = multer.memoryStorage();

// File filter to allow only Excel spreadsheets
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.xlsx', '.xls'];
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];

  const fileExtension = path.extname(file.originalname).toLowerCase();
  const isAllowedExtension = allowedExtensions.includes(fileExtension);
  const isAllowedMimeType = allowedMimeTypes.includes(file.mimetype);

  if (isAllowedExtension || isAllowedMimeType) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel files (.xlsx or .xls) are allowed!'), false);
  }
};

// Limit file size to 10MB
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
}).single('file');

// Middleware wrapper to handle multer errors gracefully
module.exports = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File is too large. Maximum size allowed is 10MB.' });
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};
