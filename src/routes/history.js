// const router = require('express').Router();
// const History = require('../models/History');
// const auth = require('../middleware/auth');

// // GET /api/history  (for the dashboard list)
// router.get('/', auth, async (req, res) => {
//   const list = await History.find({ user: req.user.id })
//                             .populate('product', 'name catalogueNumber')
//                             .sort({ date: -1 });
//   res.json(list);
// });

// module.exports = router;


const router = require('express').Router();
const { getHistory } = require('../controllers/historyController');
const auth = require('../middleware/auth');

router.get('/', auth, getHistory);

module.exports = router;