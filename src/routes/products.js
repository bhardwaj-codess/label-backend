const router = require('express').Router();
const ctrl = require('../controllers/productController');
const auth = require('../middleware/auth');
router.post('/create', auth, ctrl.create);
router.get('/', auth, ctrl.list);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, ctrl.delete);
module.exports = router;