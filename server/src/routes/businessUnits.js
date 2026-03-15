const router = require('express').Router();
const { listBusinessUnits, getBusinessUnit, createBusinessUnit, updateBusinessUnit, deleteBusinessUnit } = require('../controllers/businessUnitController');
const { authorize } = require('../middleware/authorize');

router.get('/', listBusinessUnits);
router.get('/:id', getBusinessUnit);
router.post('/', authorize('admin'), createBusinessUnit);
router.put('/:id', authorize('admin'), updateBusinessUnit);
router.delete('/:id', authorize('admin'), deleteBusinessUnit);

module.exports = router;
