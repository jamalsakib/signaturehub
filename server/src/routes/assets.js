const router = require('express').Router();
const { listAssets, uploadAssetHandler, deleteAssetHandler, upload } = require('../controllers/assetController');
const { authorize } = require('../middleware/authorize');

router.get('/', listAssets);
router.post('/', authorize('admin', 'marketing'), upload.single('file'), uploadAssetHandler);
router.delete('/:id', authorize('admin'), deleteAssetHandler);

module.exports = router;
