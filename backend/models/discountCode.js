const mongoose = require('mongoose');

const discountCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Discount code is required'],
      unique: true,
      uppercase: true,
      minlength: 3,
      maxlength: 20
    },
    description: {
      type: String,
      maxlength: 500
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
      default: 'percentage'
    },
    value: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: 0,
      max: 100 // For percentage, max 100%; for fixed, can be any amount
    },
    maxUses: {
      type: Number,
      default: null // null = unlimited
    },
    currentUses: {
      type: Number,
      default: 0
    },
    minBookingAmount: {
      type: Number,
      default: 0 // Minimum booking total to apply discount
    },
    applicableProperties: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Property',
      default: [] // Empty array means applicable to all properties
    },
    applicableUsers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [] // Empty array means applicable to all users
    },
    validFrom: {
      type: Date,
      required: true
    },
    validUntil: {
      type: Date,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Index for faster lookups
discountCodeSchema.index({ code: 1, isActive: 1 });
discountCodeSchema.index({ validFrom: 1, validUntil: 1 });

// Virtual for checking if discount is expired
discountCodeSchema.virtual('isExpired').get(function() {
  return new Date() > this.validUntil;
});

// Virtual for checking if discount is maxed out
discountCodeSchema.virtual('isMaxedOut').get(function() {
  return this.maxUses !== null && this.currentUses >= this.maxUses;
});

// Method to check if discount can be applied
discountCodeSchema.methods.canBeApplied = function(bookingAmount, userId, propertyId) {
  // Check if active
  if (!this.isActive) return false;

  // Check if expired
  const now = new Date();
  if (now < this.validFrom || now > this.validUntil) return false;

  // Check if maxed out
  if (this.maxUses !== null && this.currentUses >= this.maxUses) return false;

  // Check minimum booking amount
  if (bookingAmount < this.minBookingAmount) return false;

  // Check if applicable to specific users
  if (this.applicableUsers.length > 0 && !this.applicableUsers.includes(userId)) {
    return false;
  }

  // Check if applicable to specific properties
  if (this.applicableProperties.length > 0 && !this.applicableProperties.includes(propertyId)) {
    return false;
  }

  return true;
};

// Method to increment usage
discountCodeSchema.methods.incrementUsage = async function() {
  this.currentUses += 1;
  return this.save();
};

const DiscountCode = mongoose.model('DiscountCode', discountCodeSchema);

module.exports = DiscountCode;
