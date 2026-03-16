const router = require('express').Router();
const { listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate, previewTemplate, cloneTemplate, importTemplates } = require('../controllers/templateController');
const { authorize } = require('../middleware/authorize');

router.get('/', listTemplates);
router.post('/import', authorize('admin'), importTemplates);
router.get('/:id', getTemplate);
router.post('/', authorize('admin'), createTemplate);
router.put('/:id', authorize('admin'), updateTemplate);
router.delete('/:id', authorize('admin'), deleteTemplate);
router.post('/:id/preview', authorize('admin', 'marketing'), previewTemplate);
router.post('/:id/clone', authorize('admin'), cloneTemplate);

module.exports = router;
