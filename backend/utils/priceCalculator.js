/**
 * Price Calculator Utility
 * Handles all pricing calculations including fees, taxes, and discounts
 */

const TAX_RATES = {
  'CA': 0.13,      // California - 13%
  'NY': 0.08625,   // New York - 8.625%
  'TX': 0.0825,    // Texas - 8.25%
  'FL': 0.07,      // Florida - 7%
  'default': 0.10  // Default - 10%
};

const SERVICE_FEE_PERCENTAGE = 0.15; // 15% service fee
const CLEANING_FEE = 50; // Fixed cleaning fee

/**
 * Get tax rate based on state/region
 * @param {string} state - State code
 * @returns {number} Tax rate as decimal
 */
const getTaxRate = (state) => {
  return TAX_RATES[state?.toUpperCase()] || TAX_RATES.default;
};

/**
 * Calculate service fee
 * @param {number} basePrice - Base nightly price
 * @returns {number} Service fee amount
 */
const calculateServiceFee = (basePrice) => {
  return Math.round(basePrice * SERVICE_FEE_PERCENTAGE * 100) / 100;
};

/**
 * Calculate tax
 * @param {number} subtotal - Subtotal before tax
 * @param {string} state - State code
 * @returns {number} Tax amount
 */
const calculateTax = (subtotal, state = 'default') => {
  const taxRate = getTaxRate(state);
  return Math.round(subtotal * taxRate * 100) / 100;
};

/**
 * Apply discount code
 * @param {number} amount - Amount to discount
 * @param {object} discountCode - Discount code object {code, type, value}
 * @returns {object} {discountAmount, finalAmount}
 */
const applyDiscount = (amount, discountCode) => {
  if (!discountCode || !discountCode.value) {
    return { discountAmount: 0, finalAmount: amount };
  }

  let discountAmount = 0;
  
  if (discountCode.type === 'percentage') {
    discountAmount = Math.round(amount * (discountCode.value / 100) * 100) / 100;
  } else if (discountCode.type === 'fixed') {
    discountAmount = discountCode.value;
  }

  // Ensure discount doesn't exceed the amount
  discountAmount = Math.min(discountAmount, amount);

  return {
    discountAmount,
    finalAmount: Math.round((amount - discountAmount) * 100) / 100
  };
};

/**
 * Calculate complete booking price breakdown
 * @param {object} params - Calculation parameters
 * @returns {object} Complete price breakdown
 */
const calculateBookingPrice = ({
  nightlyRate,
  numberOfNights,
  state = 'default',
  discountCode = null,
  includeCleaningFee = true
}) => {
  // Validate inputs
  if (nightlyRate <= 0 || numberOfNights <= 0) {
    throw new Error('Invalid nightly rate or number of nights');
  }

  // Calculate base price
  const roomSubtotal = Math.round(nightlyRate * numberOfNights * 100) / 100;

  // Add cleaning fee
  const cleaningFee = includeCleaningFee ? CLEANING_FEE : 0;

  // Calculate service fee (on room subtotal only, not cleaning)
  const serviceFee = calculateServiceFee(roomSubtotal);

  // Subtotal before tax
  const subtotalBeforeTax = roomSubtotal + cleaningFee + serviceFee;

  // Calculate tax
  const taxes = calculateTax(subtotalBeforeTax, state);

  // Subtotal after tax
  const subtotalAfterTax = subtotalBeforeTax + taxes;

  // Apply discount code
  const { discountAmount, finalAmount } = applyDiscount(
    subtotalAfterTax,
    discountCode
  );

  return {
    roomSubtotal,
    numberOfNights,
    nightlyRate,
    cleaningFee,
    serviceFee,
    subtotalBeforeTax,
    taxes,
    subtotalAfterTax,
    discountCode: discountCode?.code || null,
    discountAmount,
    totalPrice: finalAmount,
    breakdown: {
      'Nightly Rate': `$${nightlyRate.toFixed(2)} x ${numberOfNights} nights`,
      'Room Subtotal': `$${roomSubtotal.toFixed(2)}`,
      'Cleaning Fee': `$${cleaningFee.toFixed(2)}`,
      'Service Fee (15%)': `$${serviceFee.toFixed(2)}`,
      'Subtotal': `$${subtotalBeforeTax.toFixed(2)}`,
      'Taxes': `$${taxes.toFixed(2)}`,
      ...(discountAmount > 0 && { 'Discount': `-$${discountAmount.toFixed(2)}` }),
      'Total': `$${finalAmount.toFixed(2)}`
    }
  };
};

/**
 * Validate discount code format
 * @param {string} code - Discount code
 * @returns {boolean} Is valid format
 */
const isValidDiscountFormat = (code) => {
  // Should be alphanumeric, 3-20 characters
  return /^[A-Z0-9]{3,20}$/.test(code);
};

/**
 * Generate discount code
 * @returns {string} Random discount code
 */
const generateDiscountCode = () => {
  return Math.random().toString(36).substring(2, 15).toUpperCase();
};

module.exports = {
  getTaxRate,
  calculateServiceFee,
  calculateTax,
  applyDiscount,
  calculateBookingPrice,
  isValidDiscountFormat,
  generateDiscountCode,
  TAX_RATES,
  SERVICE_FEE_PERCENTAGE,
  CLEANING_FEE
};
