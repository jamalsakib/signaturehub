const router = require('express').Router();
const { listUsers, getUser, updateUser, syncUser, deactivateUser } = require('../controllers/userController');
const { authorize } = require('../middleware/authorize');

router.get('/', authorize('admin'), listUsers);
router.get('/:id', authorize('admin', 'marketing'), getUser);
router.patch('/:id', authorize('admin'), updateUser);
router.post('/:id/sync', authorize('admin'), syncUser);
router.delete('/:id', authorize('admin'), deactivateUser);

module.exports = router;
