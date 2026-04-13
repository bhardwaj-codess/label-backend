const Product = require('../models/Product');

exports.create = async (req, res) => {
  try {
    // The req.body object is directly passed to Mongoose.
    // Mongoose will validate it against the schema.
    const product = await Product.create(req.body); 
    res.status(201).json(product); // Use 201 for a successful creation
  } catch (error) {
    // Log the full error to your backend terminal for debugging
    console.error('Error creating product:', error); 

    // Handle common Mongoose validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === 11000) { // MongoDB duplicate key error code
      return res.status(409).json({ message: 'Catalogue number already exists.' });
    }

    // Handle any other unexpected server errors
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.list = async (_req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error('Error listing products:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};