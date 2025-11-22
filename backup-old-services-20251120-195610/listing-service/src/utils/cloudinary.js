const cloudinary = require('cloudinary').v2;
const logger = require('./logger');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload image to Cloudinary
 * @param {Buffer} fileBuffer - Image buffer
 * @param {Object} options - Upload options
 */
const uploadImage = async (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        ...options
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete image from Cloudinary
 * @param {string} imageUrl - Image URL
 */
const deleteImage = async (imageUrl) => {
  try {
    // Extract public ID from URL
    const parts = imageUrl.split('/');
    const filename = parts[parts.length - 1];
    const publicId = filename.split('.')[0];

    // Find the folder if it exists in the URL
    let fullPublicId = publicId;
    if (imageUrl.includes('/listings/')) {
      const startIdx = imageUrl.indexOf('/listings/');
      const endIdx = imageUrl.lastIndexOf('.');
      fullPublicId = imageUrl.substring(startIdx + 1, endIdx);
    }

    const result = await cloudinary.uploader.destroy(fullPublicId);
    logger.info(`Image deleted from Cloudinary: ${fullPublicId}`);
    return result;
  } catch (error) {
    logger.error('Cloudinary delete error:', error);
    throw error;
  }
};

/**
 * Get Cloudinary configuration status
 */
const isConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

module.exports = {
  uploadImage,
  deleteImage,
  isConfigured
};
