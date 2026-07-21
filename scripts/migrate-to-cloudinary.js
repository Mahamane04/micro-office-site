#!/usr/bin/env node
// Script to migrate images from local storage to Cloudinary
// Usage: node scripts/migrate-to-cloudinary.js [source-dir] [cloudinary-folder]

import fs from 'fs';
import path from 'path';
import https from 'https';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

const sourceDir = process.argv[2] || path.join(__dirname, '../src/images');
const cloudinaryFolder = process.argv[3] || 'microoffice';

// Validate credentials
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('❌ Missing Cloudinary credentials');
  console.error('Set: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
  process.exit(1);
}

// Check source directory
if (!fs.existsSync(sourceDir)) {
  console.error(`❌ Source directory not found: ${sourceDir}`);
  process.exit(1);
}

async function uploadToCloudinary(filePath, fileName) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('public_id', path.parse(fileName).name);
    form.append('folder', cloudinaryFolder);
    form.append('resource_type', 'auto');
    form.append('overwrite', true);

    const options = {
      hostname: 'api.cloudinary.com',
      port: 443,
      path: `/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      method: 'POST',
      auth: `${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`,
      headers: form.getHeaders(),
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.public_id) {
            resolve({
              success: true,
              publicId: response.public_id,
              url: response.secure_url,
            });
          } else {
            reject(new Error(response.error?.message || 'Upload failed'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    form.pipe(req);
  });
}

async function migrateImages() {
  console.log(`📂 Scanning directory: ${sourceDir}`);
  console.log(`☁️  Cloudinary folder: ${cloudinaryFolder}`);
  console.log('');

  const files = fs.readdirSync(sourceDir, { recursive: true });
  const imageFiles = files.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
  });

  if (imageFiles.length === 0) {
    console.log('❌ No images found');
    return;
  }

  console.log(`Found ${imageFiles.length} images to migrate\n`);

  let uploaded = 0;
  let failed = 0;

  for (const file of imageFiles) {
    const filePath = path.join(sourceDir, file);
    const fileName = path.relative(sourceDir, filePath);

    try {
      console.log(`⬆️  Uploading: ${fileName}...`);
      const result = await uploadToCloudinary(filePath, file);

      console.log(`✅ Success: ${result.publicId}`);
      console.log(`   URL: ${result.url}\n`);

      uploaded++;
    } catch (error) {
      console.error(`❌ Error: ${error.message}\n`);
      failed++;
    }

    // Rate limit: 1 request per 500ms
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log('');
  console.log(`📊 Migration Summary:`);
  console.log(`   ✅ Uploaded: ${uploaded}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📁 Total: ${imageFiles.length}`);
}

migrateImages().catch((error) => {
  console.error('❌ Migration error:', error);
  process.exit(1);
});
