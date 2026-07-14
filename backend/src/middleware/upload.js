// Multer upload middleware placeholder - MaintainIQ
const multer = require('multer');
const os = require('os');
const path = require('path');

const upload = multer({ dest: path.join(os.tmpdir(), 'maintainiq-uploads') });

module.exports = upload;
