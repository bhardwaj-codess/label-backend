const Product = require('../models/Product');
const { importProductsFromBuffer } = require('../services/productTransformData');

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
    const products = await Product.find().sort({ createdAt: -1 });
    
    // Format list response to include both standard properties and mapped values for complete clarity
    const formattedProducts = products.map(product => ({
      _id: product._id,
      id: product._id,
      catalogueNumber: product.catalogueNumber,
      name: product.name,
      description: product.description || '',
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));
    
    res.json(formattedProducts);
  } catch (error) {
    console.error('Error listing products:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.importProducts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Please upload an Excel spreadsheet.' });
    }

    const result = await importProductsFromBuffer(req.file.buffer, req.file.originalname);
    
    res.status(200).json({
      message: 'Product import completed.',
      totalRowsProcessed: result.totalRowsProcessed,
      totalRecordsImported: result.totalRecordsImported,
      totalRecordsSkipped: result.totalRecordsSkipped,
      errors: result.errors,
      durationMs: result.durationMs
    });
  } catch (error) {
    console.error('Error importing products:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error during Excel import.' });
  }
};