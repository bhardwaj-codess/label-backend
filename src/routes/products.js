const router = require('express').Router();
const ctrl = require('../controllers/productController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/create', auth, ctrl.create);
router.post('/import', auth, upload, ctrl.importProducts);
router.get('/', auth, ctrl.list);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, ctrl.delete);

module.exports = router;