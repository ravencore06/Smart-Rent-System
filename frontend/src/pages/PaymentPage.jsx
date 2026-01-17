import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    name: "",
  });
  const [bookingDetails, setBookingDetails] = useState({
    checkIn: "",
    checkOut: "",
    guests: 1,
    specialRequests: "",
  });
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountError, setDiscountError] = useState("");
  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    // Check if property data is passed through location state
    if (location.state?.property) {
      setProperty(location.state.property);
      setBookingDetails({
        ...location.state.bookingDetails || {},
        checkIn: location.state.bookingDetails?.checkIn || "",
        checkOut: location.state.bookingDetails?.checkOut || "",
        guests: location.state.bookingDetails?.guests || 1,
      });
      setLoading(false);
    } else if (location.state?.propertyId) {
      // If only ID is passed, fetch the property details
      fetchPropertyDetails(location.state.propertyId);
    } else {
      setError(true);
      setLoading(false);
    }
  }, [location]);

  // Calculate price whenever booking details change
  useEffect(() => {
    if (property && bookingDetails.checkIn && bookingDetails.checkOut) {
      calculatePrice();
    }
  }, [bookingDetails, appliedDiscount, property]);

  const calculatePrice = () => {
    setIsCalculating(true);
    try {
      const checkIn = new Date(bookingDetails.checkIn);
      const checkOut = new Date(bookingDetails.checkOut);
      const oneDay = 24 * 60 * 60 * 1000;
      const numberOfNights = Math.round((checkOut - checkIn) / oneDay);

      if (numberOfNights <= 0) {
        setIsCalculating(false);
        return;
      }

      // Calculate base price
      const roomSubtotal = property.price * numberOfNights;
      const cleaningFee = 50;
      const serviceFee = roomSubtotal * 0.15; // 15% service fee
      const subtotalBeforeTax = roomSubtotal + cleaningFee + serviceFee;

      // Calculate tax (10% default, could be dynamic based on location)
      const taxRate = 0.1;
      const taxes = subtotalBeforeTax * taxRate;
      const subtotalAfterTax = subtotalBeforeTax + taxes;

      // Apply discount if available
      let discountAmount = 0;
      if (appliedDiscount) {
        if (appliedDiscount.type === "percentage") {
          discountAmount = subtotalAfterTax * (appliedDiscount.value / 100);
        } else if (appliedDiscount.type === "fixed") {
          discountAmount = appliedDiscount.value;
        }
        discountAmount = Math.min(discountAmount, subtotalAfterTax);
      }

      const totalPrice = subtotalAfterTax - discountAmount;

      setPriceBreakdown({
        nightlyRate: property.price,
        numberOfNights,
        roomSubtotal: parseFloat(roomSubtotal.toFixed(2)),
        cleaningFee,
        serviceFee: parseFloat(serviceFee.toFixed(2)),
        subtotalBeforeTax: parseFloat(subtotalBeforeTax.toFixed(2)),
        taxes: parseFloat(taxes.toFixed(2)),
        subtotalAfterTax: parseFloat(subtotalAfterTax.toFixed(2)),
        discountCode: appliedDiscount?.code || null,
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        totalPrice: parseFloat(totalPrice.toFixed(2)),
      });
    } catch (err) {
      console.error("Error calculating price:", err);
    } finally {
      setIsCalculating(false);
    }
  };

  const fetchPropertyDetails = async (id) => {
    try {
      const baseUrl = process.env.REACT_APP_API_URL || "/api";
      const apiUrl = baseUrl.startsWith("http")
        ? `${baseUrl}/properties/${id}`
        : `http://localhost:8000/api/properties/${id}`;

      const response = await axios.get(apiUrl);
      setProperty(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching property details:", err);
      setError(true);
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!priceBreakdown) {
        alert("Please fill in all booking details");
        return;
      }

      setLoading(true);
      
      // Prepare booking data
      const bookingData = {
        property: property._id,
        checkIn: new Date(bookingDetails.checkIn),
        checkOut: new Date(bookingDetails.checkOut),
        numGuests: bookingDetails.guests,
        message: bookingDetails.specialRequests,
        paymentInfo: {
          method: paymentMethod,
          last4Digits: paymentDetails.cardNumber.slice(-4),
          transactionId: `TXN-${Date.now()}`,
        },
        priceBreakdown,
      };

      // Call booking API
      const response = await axios.post("/api/bookings", bookingData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      // Navigate to success page
      navigate("/trips", {
        state: {
          paymentSuccess: true,
          bookingId: response.data._id,
        },
      });
    } catch (error) {
      console.error("Payment error:", error);
      alert(error.response?.data?.message || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      setDiscountError("Please enter a discount code");
      return;
    }

    try {
      setDiscountError("");
      const response = await axios.get(
        `/api/discounts/code/${discountCode}`,
        {
          params: {
            bookingAmount: priceBreakdown?.subtotalAfterTax || 0,
            propertyId: property._id,
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setAppliedDiscount(response.data);
      setDiscountCode("");
    } catch (err) {
      setDiscountError(
        err.response?.data?.message || "Invalid discount code"
      );
      setAppliedDiscount(null);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountError("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Loading Payment Details...
            </h2>
            <div className="animate-pulse mt-8">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-8 mx-auto"></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Error Loading Payment Details
            </h2>
            <p className="text-gray-600 mb-6">
              We couldn't load the payment details. Please try again.
            </p>
            <button
              onClick={() => navigate(-1)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Form */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Booking & Payment Details
            </h2>
            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              {/* Booking Details */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Booking Information
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Check-in Date
                      </label>
                      <input
                        type="date"
                        value={bookingDetails.checkIn}
                        onChange={(e) =>
                          setBookingDetails({
                            ...bookingDetails,
                            checkIn: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Check-out Date
                      </label>
                      <input
                        type="date"
                        value={bookingDetails.checkOut}
                        onChange={(e) =>
                          setBookingDetails({
                            ...bookingDetails,
                            checkOut: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Guests
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={bookingDetails.guests}
                      onChange={(e) =>
                        setBookingDetails({
                          ...bookingDetails,
                          guests: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Special Requests (Optional)
                    </label>
                    <textarea
                      value={bookingDetails.specialRequests}
                      onChange={(e) =>
                        setBookingDetails({
                          ...bookingDetails,
                          specialRequests: e.target.value,
                        })
                      }
                      placeholder="Late checkout, high chair needed, etc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="2"
                    />
                  </div>
                </div>
              </div>

              {/* Discount Code */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Discount Code
                </h3>
                {appliedDiscount ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          Code Applied: {appliedDiscount.code}
                        </p>
                        <p className="text-sm text-green-700">
                          {appliedDiscount.type === "percentage"
                            ? `${appliedDiscount.value}% off`
                            : `$${appliedDiscount.value} off`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveDiscount}
                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => {
                        setDiscountCode(e.target.value.toUpperCase());
                        setDiscountError("");
                      }}
                      placeholder="Enter discount code"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyDiscount}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                )}
                {discountError && (
                  <p className="text-sm text-red-600 mt-2">{discountError}</p>
                )}
              </div>

              {/* Payment Method */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Payment Method
                </h3>
                <div className="space-y-3">
                  {["credit_card", "debit_card", "paypal"].map((method) => (
                    <label key={method} className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mr-3"
                      />
                      <span className="text-gray-700 capitalize">
                        {method.replace("_", " ")}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Card Details */}
              {paymentMethod !== "paypal" && (
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Card Details
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={paymentDetails.cardNumber}
                      onChange={(e) =>
                        setPaymentDetails({
                          ...paymentDetails,
                          cardNumber: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1234 5678 9012 3456"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        value={paymentDetails.expiryDate}
                        onChange={(e) =>
                          setPaymentDetails({
                            ...paymentDetails,
                            expiryDate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="MM/YY"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CVV
                      </label>
                      <input
                        type="text"
                        value={paymentDetails.cvv}
                        onChange={(e) =>
                          setPaymentDetails({
                            ...paymentDetails,
                            cvv: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="123"
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={paymentDetails.name}
                      onChange={(e) =>
                        setPaymentDetails({
                          ...paymentDetails,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !priceBreakdown}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
              >
                {loading ? "Processing..." : `Pay $${priceBreakdown?.totalPrice?.toFixed(2) || 0}`}
              </button>
            </form>
          </div>

          {/* Booking Summary */}
          <div className="bg-white rounded-xl shadow-sm p-6 h-fit">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Booking Summary
            </h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden">
                  {property?.images && property.images.length > 0 ? (
                    <img
                      src={property.images[0]}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <i className="fas fa-home text-gray-400 text-2xl"></i>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {property?.title}
                  </h3>
                  <p className="text-gray-600">
                    {property?.location?.city}, {property?.location?.country}
                  </p>
                </div>
              </div>

              {priceBreakdown ? (
                <div className="border-t border-gray-200 pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        ${priceBreakdown.nightlyRate} x{" "}
                        {priceBreakdown.numberOfNights} nights
                      </span>
                      <span className="text-gray-900 font-medium">
                        ${priceBreakdown.roomSubtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cleaning fee</span>
                      <span className="text-gray-900 font-medium">
                        ${priceBreakdown.cleaningFee.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service fee (15%)</span>
                      <span className="text-gray-900 font-medium">
                        ${priceBreakdown.serviceFee.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Taxes</span>
                      <span className="text-gray-900 font-medium">
                        ${priceBreakdown.taxes.toFixed(2)}
                      </span>
                    </div>
                    {priceBreakdown.discountAmount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({priceBreakdown.discountCode})</span>
                        <span>-${priceBreakdown.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-4 border-t border-gray-200 font-semibold text-base">
                      <span>Total</span>
                      <span>${priceBreakdown.totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-gray-500 text-sm">
                    Fill in dates to calculate price
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;