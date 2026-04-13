// const mongoose = require('mongoose');

// module.exports = mongoose.model('Product', new mongoose.Schema({
//   name: { type: String, required: true },
//   catalogueNumber: { type: String, required: true, unique: true },
// }));



const mongoose = require('mongoose');

module.exports = mongoose.model('Product', new mongoose.Schema({
  name: { type: String, required: true },
  catalogueNumber: { type: String, required: true, unique: true },
}));