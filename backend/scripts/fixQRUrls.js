require('dotenv').config();
const mongoose = require('mongoose');
const Asset = require('../src/models/Asset');
const { generateAndUploadQR } = require('../src/services/qr.service');
const connectDB = require('../src/config/db');

const fixQRUrls = async () => {
  await connectDB();

  const frontendDomain = process.env.FRONTEND_URL;
  if (!frontendDomain || frontendDomain.includes('localhost')) {
    console.error('❌ ERROR: FRONTEND_URL must be set to your production Vercel frontend URL');
    console.error('Example: FRONTEND_URL=https://your-app.vercel.app node scripts/fixQRUrls.js');
    process.exit(1);
  }

  // Find all assets with localhost QR URLs
  const assets = await Asset.find({ qrCodeUrl: { $regex: /localhost/ } });
  console.log(`Found ${assets.length} assets with localhost QR URLs. Regenerating...`);

  for (const asset of assets) {
    const publicUrl = `${frontendDomain}/public/asset/${asset.publicSlug}`;
    try {
      const newQrUrl = await generateAndUploadQR(publicUrl, asset.assetCode);
      await Asset.findByIdAndUpdate(asset._id, { qrCodeUrl: newQrUrl });
      console.log(`✅ Fixed: ${asset.assetCode} → ${publicUrl}`);
    } catch (err) {
      console.error(`❌ Failed: ${asset.assetCode} — ${err.message}`);
    }
  }

  console.log('Done!');
  process.exit(0);
};

fixQRUrls().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
