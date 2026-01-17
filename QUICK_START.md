# Booking Features - Quick Start Guide

## 🎯 What's New

Complete booking and payment system with:
- ✅ Dynamic price calculation
- ✅ Discount code management
- ✅ Multiple payment methods
- ✅ Real-time price updates
- ✅ Advanced booking options

## 🚀 Quick Setup

### 1. Backend Setup

No additional dependencies needed! All packages already installed.

**Just run:**
```bash
cd backend
npm run dev
```

### 2. Frontend Setup

**Just run:**
```bash
cd frontend
npm start
```

## 📋 Testing the New Features

### Create a Test Discount Code

**Step 1**: Get Admin Token
- Login as admin user (or create one if needed)
- Keep the token from response

**Step 2**: Create Discount Code
```bash
curl -X POST http://localhost:8000/api/discounts \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TESTDISCOUNT",
    "description": "Test discount for development",
    "type": "percentage",
    "value": 10,
    "maxUses": 100,
    "minBookingAmount": 0,
    "validFrom": "2024-01-01",
    "validUntil": "2025-12-31",
    "isActive": true
  }'
```

### Test a Booking

1. **Open** `http://localhost:3000`
2. **Navigate** to a property
3. **Click** "Book Now" or similar
4. **Fill in**:
   - Check-in date
   - Check-out date
   - Number of guests
   - Special requests (optional)
5. **Apply discount**: TESTDISCOUNT
6. **Select payment method**: Credit Card
7. **Review** price breakdown
8. **Click Pay** to complete

### View Discount Codes (Admin)

```bash
curl http://localhost:8000/api/discounts \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 📊 Price Calculation Example

**Input:**
- Nightly Rate: $150
- Dates: Feb 15-20 (5 nights)
- Discount: 10% (TESTDISCOUNT)

**Breakdown:**
```
Room Subtotal        = $150 × 5 nights        = $750.00
Cleaning Fee         = Fixed                  = $50.00
Service Fee (15%)    = $750 × 0.15            = $112.50
─────────────────────────────────────────────────────
Subtotal Before Tax  =                        = $912.50
Taxes (10% default)  = $912.50 × 0.10         = $91.25
─────────────────────────────────────────────────────
Subtotal After Tax   =                        = $1,003.75
Discount (10%)       = $1,003.75 × 0.10       = -$100.37
─────────────────────────────────────────────────────
TOTAL PRICE          =                        = $903.38
```

## 🔑 Key API Endpoints

### Create Booking (POST)
```
URL: /api/bookings
Method: POST
Auth: Required (User token)

Body:
{
  "property": "property-id",
  "checkIn": "2024-02-15",
  "checkOut": "2024-02-20",
  "numGuests": 4,
  "specialRequests": "Late checkout needed",
  "paymentInfo": {
    "method": "credit_card",
    "transactionId": "TXN-123456",
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
    "discountCode": "TESTDISCOUNT",
    "discountAmount": 100.375,
    "totalPrice": 903.375
  }
}
```

### Validate Discount Code (GET)
```
URL: /api/discounts/code/TESTDISCOUNT
Method: GET
Auth: Required (Any user token)

Query Params:
- bookingAmount=1003.75
- propertyId=property-id

Response:
{
  "code": "TESTDISCOUNT",
  "type": "percentage",
  "value": 10,
  "description": "Test discount for development"
}
```

### Create Discount (Admin Only) (POST)
```
URL: /api/discounts
Method: POST
Auth: Required (Admin token)

Body:
{
  "code": "NEWCODE",
  "description": "New Year Sale",
  "type": "percentage",
  "value": 15,
  "maxUses": 50,
  "minBookingAmount": 500,
  "validFrom": "2024-01-01",
  "validUntil": "2024-12-31",
  "isActive": true
}
```

## 🧪 Test Discount Types

### Percentage Discount
```json
{
  "code": "PERCENT20",
  "type": "percentage",
  "value": 20
  // Result: 20% off total price
}
```

### Fixed Amount Discount
```json
{
  "code": "FIXED100",
  "type": "fixed",
  "value": 100
  // Result: $100 off total price
}
```

## 💾 File Structure

### New Backend Files
```
backend/
├── utils/
│   └── priceCalculator.js          ← Price calculation logic
├── models/
│   └── discountCode.js             ← Discount code schema
├── controllers/
│   └── discountController.js        ← Discount API endpoints
├── routes/
│   └── discountRoutes.js            ← Discount route definitions
└── app.js                           ← Updated with discount routes
```

### Modified Backend Files
```
backend/
├── models/
│   └── booking.js                  ← Enhanced with new fields
├── controllers/
│   └── bookingController.js         ← Updated with price calc
├── schema.js                        ← New discount schema
```

### Modified Frontend Files
```
frontend/src/pages/
└── PaymentPage.jsx                 ← Complete redesign
```

## 🔧 Customization

### Change Service Fee
**File**: `backend/utils/priceCalculator.js`
```javascript
const SERVICE_FEE_PERCENTAGE = 0.15; // Change 0.15 to desired value (e.g., 0.20 for 20%)
```

### Change Cleaning Fee
**File**: `backend/utils/priceCalculator.js`
```javascript
const CLEANING_FEE = 50; // Change 50 to desired amount
```

### Add Tax Rates
**File**: `backend/utils/priceCalculator.js`
```javascript
const TAX_RATES = {
  'CA': 0.13,      // Add new state codes as needed
  'NY': 0.08625,
  'TX': 0.0825,
  'FL': 0.07,
  'OR': 0.0, // Oregon - no sales tax
  'default': 0.10
};
```

## 📱 UI Components

### PaymentPage Sections

1. **Booking Information**
   - Check-in/Check-out date pickers
   - Guest count input
   - Special requests textarea

2. **Discount Code**
   - Code input field
   - Apply/Remove buttons
   - Success/Error messages

3. **Payment Method**
   - Radio buttons: Credit Card, Debit Card, PayPal
   - Method-specific forms

4. **Card Details** (if card selected)
   - Card number input
   - Expiry date input
   - CVV input
   - Cardholder name input

5. **Booking Summary**
   - Property image and info
   - Price breakdown display
   - Real-time total calculation

## 🐛 Troubleshooting

### Discount Code Not Applying

**Check:**
1. Code is active: `isActive: true`
2. Code not expired: `validFrom` < now < `validUntil`
3. Usage not exceeded: `currentUses < maxUses` (if maxUses set)
4. Booking amount meets minimum: `bookingAmount >= minBookingAmount`
5. Code is uppercase in database

**Debug:**
```bash
# List all discount codes
curl http://localhost:8000/api/discounts \
  -H "Authorization: Bearer TOKEN"
```

### Price Calculation Issues

**Check:**
1. Check-in date < Check-out date
2. Nightly rate is positive number
3. Dates in future (not past)
4. Property exists and is active

### Payment Form Issues

**Check:**
1. All dates filled
2. Guest count > 0
3. Payment method selected
4. Card details if card selected
5. Form not submitting? Check browser console

## 📚 Documentation Files

1. **BOOKING_FEATURES.md** - Comprehensive guide
2. **IMPLEMENTATION_SUMMARY.md** - What was changed
3. **This file** - Quick start guide

## ✅ Verification Checklist

- [ ] Backend server running on port 8000
- [ ] Frontend running on port 3000
- [ ] Can create discount codes (as admin)
- [ ] Can validate discount codes
- [ ] Price updates in real-time
- [ ] Discount applies correctly
- [ ] Booking created with full price breakdown
- [ ] Payment methods selectable
- [ ] Special requests saved

## 🎉 You're Ready!

The booking features are fully integrated and ready to use. Start by:

1. Creating a test discount code
2. Booking a property
3. Applying the discount code
4. Reviewing the price breakdown
5. Completing the payment

Happy booking! 🚀
