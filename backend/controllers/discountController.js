const DiscountCode = require('../models/discountCode');
const { discountCodeSchema } = require('../schema');

// @desc    Create a new discount code
// @route   POST /api/discounts
// @access  Private (Admin)
const createDiscountCode = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create discount codes' });
    }

    // Validate request data
    const { error, value } = discountCodeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Check if code already exists
    const existingCode = await DiscountCode.findOne({ code: value.code.toUpperCase() });
    if (existingCode) {
      return res.status(400).json({ message: 'Discount code already exists' });
    }

    // Create discount code
    const discountCode = new DiscountCode({
      ...value,
      code: value.code.toUpperCase(),
      createdBy: req.user._id
    });

    const savedCode = await discountCode.save();
    res.status(201).json(savedCode);
  } catch (error) {
    console.error('Error creating discount code:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all discount codes
// @route   GET /api/discounts
// @access  Private (Admin)
const getDiscountCodes = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view discount codes' });
    }

    const { isActive, search } = req.query;
    let filter = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (search) {
      filter.code = { $regex: search, $options: 'i' };
    }

    const codes = await DiscountCode.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .populate('applicableProperties', 'title')
      .populate('applicableUsers', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json(codes);
  } catch (error) {
    console.error('Error fetching discount codes:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get discount code by code
// @route   GET /api/discounts/code/:code
// @access  Public
const getDiscountByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const { bookingAmount, propertyId } = req.query;

    const discountCode = await DiscountCode.findOne({
      code: code.toUpperCase(),
      isActive: true
    });

    if (!discountCode) {
      return res.status(404).json({ message: 'Discount code not found' });
    }

    // Check if discount can be applied
    const canApply = discountCode.canBeApplied(
      parseFloat(bookingAmount) || 0,
      req.user?._id,
      propertyId
    );

    if (!canApply) {
      return res.status(400).json({
        message: 'This discount code cannot be applied',
        code: discountCode.code,
        reason: discountCode.isExpired ? 'expired' :
                discountCode.isMaxedOut ? 'maxed-out' :
                bookingAmount < discountCode.minBookingAmount ? 'minimum-amount' :
                'not-applicable'
      });
    }

    res.status(200).json({
      code: discountCode.code,
      type: discountCode.type,
      value: discountCode.value,
      description: discountCode.description
    });
  } catch (error) {
    console.error('Error fetching discount code:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update discount code
// @route   PUT /api/discounts/:id
// @access  Private (Admin)
const updateDiscountCode = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update discount codes' });
    }

    let discountCode = await DiscountCode.findById(req.params.id);
    if (!discountCode) {
      return res.status(404).json({ message: 'Discount code not found' });
    }

    // Update fields
    const { code, description, value, maxUses, minBookingAmount, validFrom, validUntil, isActive } = req.body;

    if (code && code.toUpperCase() !== discountCode.code) {
      // Check if new code already exists
      const existingCode = await DiscountCode.findOne({ code: code.toUpperCase() });
      if (existingCode) {
        return res.status(400).json({ message: 'Discount code already exists' });
      }
      discountCode.code = code.toUpperCase();
    }

    if (description !== undefined) discountCode.description = description;
    if (value !== undefined) discountCode.value = value;
    if (maxUses !== undefined) discountCode.maxUses = maxUses;
    if (minBookingAmount !== undefined) discountCode.minBookingAmount = minBookingAmount;
    if (validFrom !== undefined) discountCode.validFrom = validFrom;
    if (validUntil !== undefined) discountCode.validUntil = validUntil;
    if (isActive !== undefined) discountCode.isActive = isActive;

    const updatedCode = await discountCode.save();
    res.status(200).json(updatedCode);
  } catch (error) {
    console.error('Error updating discount code:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete discount code
// @route   DELETE /api/discounts/:id
// @access  Private (Admin)
const deleteDiscountCode = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete discount codes' });
    }

    const discountCode = await DiscountCode.findByIdAndDelete(req.params.id);
    if (!discountCode) {
      return res.status(404).json({ message: 'Discount code not found' });
    }

    res.status(200).json({ message: 'Discount code deleted successfully' });
  } catch (error) {
    console.error('Error deleting discount code:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  createDiscountCode,
  getDiscountCodes,
  getDiscountByCode,
  updateDiscountCode,
  deleteDiscountCode
};
