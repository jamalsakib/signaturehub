const { BlobServiceClient } = require('@azure/storage-blob');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const Asset = require('../models/Asset');
const logger = require('../utils/logger');

let blobServiceClient;

function getBlobClient() {
  if (!blobServiceClient) {
    const connectionString = `DefaultEndpointsProtocol=https;AccountName=${process.env.AZURE_STORAGE_ACCOUNT};AccountKey=${process.env.AZURE_STORAGE_KEY};EndpointSuffix=core.windows.net`;
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }
  return blobServiceClient;
}

async function uploadAsset({ buffer, originalName, mimeType, type, businessUnitId, uploadedBy }) {
  const ext = originalName.split('.').pop().toLowerCase();
  const blobName = `${type}/${uuidv4()}.${ext}`;
  const container = process.env.AZURE_STORAGE_CONTAINER || 'signature-assets';

  const client = getBlobClient();
  const containerClient = client.getContainerClient(container);
  await containerClient.createIfNotExists({ access: 'blob' }); // Public read for images

  // Optimise image before upload
  let uploadBuffer = buffer;
  let width = null;
  let height = null;

  if (mimeType.startsWith('image/') && mimeType !== 'image/gif') {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    width = metadata.width;
    height = metadata.height;

    // Resize logos and banners to sensible maxima
    const maxWidth = type === 'logo' ? 400 : 1200;
    if (width > maxWidth) {
      uploadBuffer = await image.resize({ width: maxWidth }).toBuffer();
    }
  }

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.upload(uploadBuffer, uploadBuffer.length, {
    blobHTTPHeaders: { blobContentType: mimeType },
  });

  const url = blockBlobClient.url;

  const asset = await Asset.create({
    name: originalName.replace(/\.[^.]+$/, ''),
    originalName,
    type,
    url,
    blobName,
    mimeType,
    sizeBytes: uploadBuffer.length,
    width,
    height,
    businessUnit: businessUnitId || null,
    uploadedBy,
  });

  logger.info(`Asset uploaded: ${blobName} (${type})`);
  return asset;
}

async function deleteAsset(assetId) {
  const asset = await Asset.findById(assetId);
  if (!asset) throw new Error('Asset not found');

  const container = process.env.AZURE_STORAGE_CONTAINER || 'signature-assets';
  const client = getBlobClient();
  const containerClient = client.getContainerClient(container);
  const blockBlobClient = containerClient.getBlockBlobClient(asset.blobName);

  await blockBlobClient.deleteIfExists();
  asset.isActive = false;
  await asset.save();

  logger.info(`Asset deleted: ${asset.blobName}`);
  return asset;
}

module.exports = { uploadAsset, deleteAsset };
