const History = require('../models/History');

exports.getHistory = async (req, res, next) => {
  try {
    console.log('Fetching history for user:', req.user.id);
    const list = await History.find({ user: req.user.id })
                              .sort({ createdAt: -1 }); // Sort by creation date, latest first
    
    console.log(`Found ${list.length} history records`);
    res.json(list);
  } catch (err) {
    console.error('Error in getHistory controller:', err);
    next(err);
  }
};