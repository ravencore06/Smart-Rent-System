# Booking Features Implementation Guide

## Overview
This implementation adds comprehensive booking and payment features to the Smart Rent System, including dynamic price calculations, discount code management, and enhanced payment processing.

## New Features Added

### 1. Dynamic Price Calculator (`backend/utils/priceCalculator.js`)
A robust utility for calculating booking prices with:
- **Service Fee**: 15% of room subtotal
- **Cleaning Fee**: Fixed $50 per booking
- **Taxes**: State-based tax rates (CA: 13%, NY: 8.625%, TX: 8.25%, FL: 7%, default: 10%)
- **Discount Application**: Percentage or fixed amount discounts
- **Price Breakdown**: Detailed itemization of all charges

**Usage Example:**
```javascript
const { calculateBookingPrice } = require('../utils/priceCalculator');

const pricing = calculateBookingPrice({
  nightlyRate: 150,
  numberOfNights: 5,
  state: 'CA',
  discountCode: { type: 'percentage', value: 10, code: 'SAVE10' },
  includeCleaningFee: true
});

// Returns:
// {
//   roomSubtotal: 750,
//   cleaningFee: 50,
//   serviceFee: 112.50,
//   subtotalBeforeTax: 912.50,
//   taxes: 118.625,
//   subtotalAfterTax: 1031.125,
//   discountAmount: 103.1125,
//   totalPrice: 928.01,
//   breakdown: {...}
// }
```

### 2. Discount Code System

#### Models
- **DiscountCode** (`backend/models/discountCode.js`): Stores discount code details with validation

#### Features
- **Code Types**: Percentage-based or fixed amount discounts
- **Validation**: Expiration dates, usage limits, minimum booking amounts
- **Scoping**: Can be limited to specific properties or users
- **Tracking**: Automatically increments usage count

#### Controller (`backend/controllers/discountController.js`)
Endpoints for managing discount codes:

**Admin Endpoints:**
- `POST /api/discounts` - Create discount code
- `GET /api/discounts` - List all discount codes (filterable)
- `PUT /api/discounts/:id` - Update discount code
- `DELETE /api/discounts/:id` - Delete discount code

**Public Endpoints:**
- `GET /api/discounts/code/:code` - Validate and retrieve discount details

### 3. Enhanced Booking Model

Updated fields in `backend/models/booking.js`:

```javascript
priceBreakdown: {
  nightlyRate: Number,
  roomSubtotal: Number,
  cleaningFee: Number,
  serviceFee: Number,
  subtotalBeforeTax: Number,
  taxes: Number,
  subtotalAfterTax: Number,
  discountCode: String,
  discountAmount: Number
},
paymentInfo: {
  method: ['credit_card', 'debit_card', 'paypal', 'stripe', 'razorpay'],
  transactionId: String,
  tax: Number,
  last4Digits: String
},
specialRequests: String,
refundStatus: ['pending', 'processed', 'failed'],
refundDate: Date,
hostApprovalDate: Date,
cancellationReason: String
```

### 4. Enhanced Payment Page (`frontend/src/pages/PaymentPage.jsx`)

**New Features:**
- ✅ Date selection for check-in/check-out
- ✅ Guest count input
- ✅ Special requests field
- ✅ Dynamic price calculations in real-time
- ✅ Discount code application with validation
- ✅ Multiple payment methods (Credit Card, Debit Card, PayPal)
- ✅ Detailed price breakdown display
- ✅ Real-time discount removal

**State Management:**
```javascript
const [bookingDetails, setBookingDetails] = useState({
  checkIn: '',
  checkOut: '',
  guests: 1,
  specialRequests: ''
});

const [appliedDiscount, setAppliedDiscount] = useState(null);
const [priceBreakdown, setPriceBreakdown] = useState(null);
```

## API Integration

### Creating a Booking with Full Price Calculation

**Request:**
```bash
POST /api/bookings
Authorization: Bearer {token}
Content-Type: application/json

{
  "property": "507f1f77bcf86cd799439011",
  "checkIn": "2024-02-15",
  "checkOut": "2024-02-20",
  "numGuests": 4,
  "specialRequests": "Late checkout requested",
  "paymentInfo": {
    "method": "credit_card",
    "transactionId": "TXN-1705483200000",
    "last4Digits": "4242"
  },
  "priceBreakdown": {
    "nightlyRate": 150,
    "numberOfNights": 5,
    "roomSubtotal": 750,
    "cleaningFee": 50,
    "serviceFee": 112.5,
    "subtotalBeforeTax": 912.5,
    "taxes": 91.25,
    "subtotalAfterTax": 1003.75,
    "discountCode": "SAVE10",
    "discountAmount": 100.375,
    "totalPrice": 903.375
  }
}
```

### Validating Discount Code

**Request:**
```bash
GET /api/discounts/code/SAVE10?bookingAmount=1003.75&propertyId=507f1f77bcf86cd799439011
Authorization: Bearer {token}
```

**Response:**
```json
{
  "code": "SAVE10",
  "type": "percentage",
  "value": 10,
  "description": "Save 10% on your booking"
}
```

## Tax Rate Configuration

Located in `priceCalculator.js`:
```javascript
const TAX_RATES = {
  'CA': 0.13,      // California - 13%
  'NY': 0.08625,   // New York - 8.625%
  'TX': 0.0825,    // Texas - 8.25%
  'FL': 0.07,      // Florida - 7%
  'default': 0.10  // Default - 10%
};
```

To add more states, simply extend the `TAX_RATES` object.

## Fee Configuration

In `priceCalculator.js`:
```javascript
const SERVICE_FEE_PERCENTAGE = 0.15; // 15% service fee
const CLEANING_FEE = 50; // Fixed cleaning fee per booking
```

## Usage Examples

### Creating a Discount Code (Admin Only)

```bash
POST /api/discounts
Authorization: Bearer {admin-token}

{
  "code": "NEWYEAR20",
  "description": "20% off for New Year 2024",
  "type": "percentage",
  "value": 20,
  "maxUses": 100,
  "minBookingAmount": 500,
  "validFrom": "2024-01-01",
  "validUntil": "2024-01-31",
  "isActive": true
}
```

### Updating Discount Code

```bash
PUT /api/discounts/{id}
Authorization: Bearer {admin-token}

{
  "isActive": false
}
```

### Managing Discounts with Restrictions

```bash
POST /api/discounts
Authorization: Bearer {admin-token}

{
  "code": "VIP100",
  "type": "fixed",
  "value": 100,
  "description": "VIP member exclusive",
  "applicableUsers": ["507f1f77bcf86cd799439012"],
  "applicableProperties": ["507f1f77bcf86cd799439013"],
  "validFrom": "2024-01-01",
  "validUntil": "2024-12-31"
}
```

## Frontend Components

### PaymentPage Flow

1. **User fills in booking details** (dates, guests, special requests)
2. **Automatic price calculation** triggered
3. **User optionally applies discount code**
4. **System validates discount in real-time**
5. **Updated price breakdown displayed**
6. **User selects payment method**
7. **Form submitted with complete booking data**

### Key Functions

```javascript
// Calculate price breakdown
const calculatePrice = () => {
  // Computes all fees, taxes, discounts
  setPriceBreakdown(...);
};

// Validate and apply discount
const handleApplyDiscount = async () => {
  // Calls GET /api/discounts/code/{code}
  // Updates appliedDiscount state
};

// Remove applied discount
const handleRemoveDiscount = () => {
  setAppliedDiscount(null);
};

// Submit booking
const handlePaymentSubmit = async (e) => {
  // Calls POST /api/bookings
  // Redirects to trips page on success
};
```

## Database Schema

### Booking Collection
```javascript
{
  property: ObjectId,
  user: ObjectId,
  checkIn: Date,
  checkOut: Date,
  numNights: Number,
  numGuests: Number,
  totalPrice: Number,
  paymentStatus: 'pending' | 'completed' | 'refunded' | 'failed',
  paymentInfo: {
    method: 'credit_card' | 'debit_card' | 'paypal' | 'stripe' | 'razorpay',
    transactionId: String,
    tax: Number,
    last4Digits: String
  },
  priceBreakdown: {
    ... // Complete itemization
  },
  status: 'pending' | 'confirmed' | 'canceled' | 'completed',
  specialRequests: String,
  refundStatus: 'pending' | 'processed' | 'failed',
  refundDate: Date,
  cancellationReason: String,
  createdAt: Date,
  updatedAt: Date
}
```

### DiscountCode Collection
```javascript
{
  code: String (unique, uppercase),
  type: 'percentage' | 'fixed',
  value: Number,
  maxUses: Number (nullable),
  currentUses: Number,
  minBookingAmount: Number,
  validFrom: Date,
  validUntil: Date,
  isActive: Boolean,
  applicableProperties: [ObjectId],
  applicableUsers: [ObjectId],
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

## Error Handling

### Frontend
- Date validation (check-out must be after check-in)
- Discount code validation feedback
- Payment form validation
- Loading states during API calls

### Backend
- Discount code expiration check
- Usage limit validation
- Minimum booking amount check
- Property availability verification
- User authorization checks

## Testing Discount Codes

### Test Case 1: Valid Percentage Discount
```javascript
const discount = {
  code: 'TEST10',
  type: 'percentage',
  value: 10,
  validFrom: new Date('2024-01-01'),
  validUntil: new Date('2024-12-31'),
  maxUses: null,
  isActive: true
};

// On $1000 booking: $100 discount = $900 total
```

### Test Case 2: Fixed Discount
```javascript
const discount = {
  code: 'FIXED50',
  type: 'fixed',
  value: 50,
  validFrom: new Date('2024-01-01'),
  validUntil: new Date('2024-12-31'),
  maxUses: 100,
  isActive: true
};

// On any booking: $50 discount applied
```

## Future Enhancements

1. **Payment Gateway Integration**
   - Stripe integration
   - Razorpay integration
   - PayPal integration

2. **Advanced Tax Calculation**
   - Per-city tax rates
   - International tax support
   - Tax exemption handling

3. **Dynamic Pricing**
   - Seasonal pricing adjustments
   - Demand-based pricing
   - Long-stay discounts

4. **Loyalty Program**
   - Loyalty points system
   - Referral discounts
   - Repeat customer benefits

5. **Refund Management**
   - Cancellation policy enforcement
   - Partial refund support
   - Automated refund processing

## Routes Summary

```
POST   /api/bookings                    - Create booking
GET    /api/bookings                    - Get user's bookings
GET    /api/bookings/:id                - Get booking details
PUT    /api/bookings/:id/cancel         - Cancel booking
POST   /api/bookings/:id/complete       - Complete payment
GET    /api/bookings/:id/invoice        - Generate invoice

POST   /api/discounts                   - Create discount (Admin)
GET    /api/discounts                   - List discounts (Admin)
GET    /api/discounts/code/:code        - Validate discount (Public)
PUT    /api/discounts/:id               - Update discount (Admin)
DELETE /api/discounts/:id               - Delete discount (Admin)
```

## Contributing

When adding new booking features:
1. Update `priceCalculator.js` for calculation changes
2. Update `Booking` model for new fields
3. Update `bookingSchema` in `schema.js` for validation
4. Update `bookingController.js` for business logic
5. Update `PaymentPage.jsx` for UI changes
6. Test with various discount codes and scenarios

---

**Last Updated:** January 17, 2026
**Version:** 1.0.0
