const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  console.warn('Warning: sharp library could not be loaded. Resizing and WebP conversion will be bypassed.', err.message);
}

const MAX_UPLOAD_BYTES = Number(process.env.ADMIN_UPLOAD_MAX_BYTES || 1024 * 1024);
const ALLOWED_UPLOAD_FOLDERS = new Set(['images', 'posters', 'backdrops', 'avatars', 'banners']);

function resolveUploadDirectory() {
  const configuredPath = process.env.ADMIN_UPLOAD_DIR;
  if (configuredPath) return configuredPath;

  const productionPath = '/var/www/html/portal/uploads';
  if (fs.existsSync('/var/www/html/portal') || process.platform !== 'win32') {
    return productionPath;
  }

  return path.resolve(__dirname, '../../../frontend/public/uploads');
}

function sanitizeUploadFolder(folder) {
  const safe = String(folder || 'images').replace(/[^a-z0-9_-]/gi, '');
  return ALLOWED_UPLOAD_FOLDERS.has(safe) ? safe : 'images';
}

/**
 * Optimizes an image buffer if sharp is available.
 * @param {Buffer} buffer - The raw image buffer.
 * @param {string} folder - The upload folder (e.g. 'posters', 'banners', 'backdrops').
 * @param {string} mimeType - The original image mime type.
 * @returns {Promise<{buffer: Buffer, filename: string}>} - The optimized buffer and filename.
 */
async function optimizeImageIfPossible(buffer, folder, mimeType) {
  const now = Date.now();
  const randomStr = Math.random().toString(36).slice(2, 10);

  if (!sharp || !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType.toLowerCase())) {
    const extensionMap = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/svg+xml': '.svg',
    };
    const extension = extensionMap[mimeType.toLowerCase()] || '.jpg';
    return {
      buffer,
      filename: `${now}-${randomStr}${extension}`
    };
  }

  try {
    let pipeline = sharp(buffer);
    
    // Determine sizing
    if (folder === 'posters') {
      // Limit max-width to 400px, fit inside maintaining aspect ratio, don't enlarge
      pipeline = pipeline.resize({ width: 400, fit: 'inside', withoutEnlargement: true });
    } else if (folder === 'backdrops' || folder === 'banners') {
      // Limit max-width to 1000px, fit inside maintaining aspect ratio, don't enlarge
      pipeline = pipeline.resize({ width: 1000, fit: 'inside', withoutEnlargement: true });
    }
    
    // Convert to webp with quality 80
    const optimizedBuffer = await pipeline.webp({ quality: 80 }).toBuffer();
    return {
      buffer: optimizedBuffer,
      filename: `${now}-${randomStr}.webp`
    };
  } catch (err) {
    console.error('Image optimization failed, falling back to raw save:', err.message);
    const extensionMap = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/svg+xml': '.svg',
    };
    const extension = extensionMap[mimeType.toLowerCase()] || '.jpg';
    return {
      buffer,
      filename: `${now}-${randomStr}${extension}`
    };
  }
}

async function saveDataUrlAsset(dataUrl, folder = 'images') {
  folder = sanitizeUploadFolder(folder);
  const match = String(dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid image payload.');

  const mimeType = match[1].toLowerCase();
  const extensionMap = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
  };
  const extension = extensionMap[mimeType];
  if (!extension) throw new Error('Unsupported image type.');

  const base64Payload = String(match[2] || '');
  const payloadBytes = Buffer.byteLength(base64Payload, 'base64');
  if (!Number.isFinite(payloadBytes) || payloadBytes <= 0) throw new Error('Invalid image payload.');
  if (payloadBytes > MAX_UPLOAD_BYTES) throw new Error(`Image is too large. Max size is ${MAX_UPLOAD_BYTES} bytes.`);

  const buffer = Buffer.from(base64Payload, 'base64');
  const uploadRoot = resolveUploadDirectory();
  const targetDir = path.join(uploadRoot, folder);
  fs.mkdirSync(targetDir, { recursive: true });

  const { buffer: finalBuffer, filename } = await optimizeImageIfPossible(buffer, folder, mimeType);
  const absolutePath = path.join(targetDir, filename);
  fs.writeFileSync(absolutePath, finalBuffer);

  return `/portal/uploads/${folder}/${filename}`;
}

async function saveBufferAsset(file, folder = 'images') {
  folder = sanitizeUploadFolder(folder);
  const mimeType = String(file?.mimetype || '').toLowerCase();
  const extensionMap = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
  };
  const extension = extensionMap[mimeType];
  if (!extension) throw new Error('Unsupported image type.');

  const size = Number(file?.size || 0);
  if (!Number.isFinite(size) || size <= 0) throw new Error('Invalid image payload.');
  if (size > MAX_UPLOAD_BYTES) throw new Error(`Image is too large. Max size is ${MAX_UPLOAD_BYTES} bytes.`);

  const uploadRoot = resolveUploadDirectory();
  const targetDir = path.join(uploadRoot, folder);
  fs.mkdirSync(targetDir, { recursive: true });

  const { buffer: finalBuffer, filename } = await optimizeImageIfPossible(file.buffer, folder, mimeType);
  const absolutePath = path.join(targetDir, filename);
  fs.writeFileSync(absolutePath, finalBuffer);

  return `/portal/uploads/${folder}/${filename}`;
}

module.exports = {
  saveDataUrlAsset,
  saveBufferAsset,
  MAX_UPLOAD_BYTES,
  resolveUploadDirectory,
};
