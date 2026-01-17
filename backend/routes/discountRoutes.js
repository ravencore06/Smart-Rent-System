const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createDiscountCode,
  getDiscountCodes,
  getDiscountByCode,
  updateDiscountCode,
  deleteDiscountCode
} = require('../controllers/discountController');

// All routes require authentication
router.use(protect);

// Public route to validate discount code
router.get('/code/:code', getDiscountByCode);

// Admin only routes
router.post('/', createDiscountCode);
router.get('/', getDiscountCodes);
router.put('/:id', updateDiscountCode);
router.delete('/:id', deleteDiscountCode);

module.exports = router;
