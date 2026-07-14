const QRCode = require('qrcode');
const cloudinary = require('../config/cloudinary');

/**
 * Generate a QR code for the given URL and upload to Cloudinary.
 * Falls back to a base64 data URL if Cloudinary upload fails (e.g. in dev without credentials).
 * @param {string} publicUrl - The public URL to encode in the QR
 * @param {string} assetCode - Used to name the file on Cloudinary
 * @returns {Promise<string>} Cloudinary secure URL, or base64 data URL as fallback
 */
const generateAndUploadQR = async (publicUrl, assetCode) => {
  // Generate QR code as a base64 PNG data URL
  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  // Attempt Cloudinary upload — fall back to base64 data URL if it fails
  try {
    const uploadResult = await cloudinary.uploader.upload(qrDataUrl, {
      folder: 'maintainiq/qr-codes',
      public_id: `qr_${assetCode.toLowerCase().replace('-', '_')}`,
      overwrite: true,
      format: 'png',
    });
    return uploadResult.secure_url;
  } catch (uploadErr) {
    console.warn(`[QR] Cloudinary upload failed for ${assetCode} — using base64 fallback. Reason: ${uploadErr.message}`);
    // Return the base64 data URL directly — works in browser without Cloudinary
    return qrDataUrl;
  }
};

module.exports = { generateAndUploadQR };
