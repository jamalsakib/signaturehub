const router = require('express').Router();
const { listRules, getRule, createRule, updateRule, deleteRule, testRule, reapplyRules } = require('../controllers/rulesController');
const { authorize } = require('../middleware/authorize');

router.get('/', listRules);
router.get('/:id', getRule);
router.post('/test', authorize('admin'), testRule);
router.post('/reapply', authorize('admin'), reapplyRules);
router.post('/', authorize('admin'), createRule);
router.put('/:id', authorize('admin'), updateRule);
router.delete('/:id', authorize('admin'), deleteRule);

module.exports = router;
