const Address = require('../models/Address');

// Get all addresses for a user
exports.getAddresses = async (req, res, next) => {
  try {
    const addresses = await Address.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(addresses);
  } catch (err) {
    next(err);
  }
};

// Create a new address
exports.createAddress = async (req, res, next) => {
  try {
    const { name, email, phone_number, address } = req.body;
    
    const newAddress = new Address({
      user: req.user.id,
      name,
      email,
      phone_number,
      address
    });

    const savedAddress = await newAddress.save();
    res.status(201).json(savedAddress);
  } catch (err) {
    next(err);
  }
};

// Update an address
exports.updateAddress = async (req, res, next) => {
  try {
    const { name, email, phone_number, address } = req.body;
    
    const updatedAddress = await Address.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { name, email, phone_number, address },
      { new: true, runValidators: true }
    );

    if (!updatedAddress) {
      return res.status(404).json({ message: 'Address not found' });
    }

    res.json(updatedAddress);
  } catch (err) {
    next(err);
  }
};

// Delete an address
exports.deleteAddress = async (req, res, next) => {
  try {
    const address = await Address.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    res.json({ message: 'Address deleted successfully' });
  } catch (err) {
    next(err);
  }
};
