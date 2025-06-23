// src/config/multerConfig.js

const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3'); // Importa o S3Client da v3
const path = require('path');

require('dotenv').config();


const s3Client = new S3Client({
    region: process.env.AWS_BUCKET_REGION
});

const upload = multer({
    storage: multerS3({
        s3: s3Client, // Passa o cliente v3 para o multer-s3
        bucket: process.env.AWS_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'public-read',
        key: (req, file, cb) => {
            const fileName = `${Date.now().toString()}-${file.originalname}`;
            cb(null, fileName);
        }
    }),
    limits: { fileSize: 1024 * 1024 * 5 },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/pjpeg', 'image/png', 'image/gif'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo inválido.'));
        }
    }
});

module.exports = upload;