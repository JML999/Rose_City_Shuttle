"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getTripById } from "@/lib/trips";
import { LUGGAGE_OPTIONS, LuggageItem } from "@/lib/database";
import { submitMockBooking, BookingSubmission } from "@/lib/booking";

export default function BookingPage() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get("trip");
  const date = searchParams.get("date");
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    passengerCount: 1,
    comments: ""
  });
  
  const [luggage, setLuggage] = useState<LuggageItem[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<{ success: boolean; confirmationCode?: string; error?: string } | null>(null);
  const [luggageCount, setLuggageCount] = useState(0);
  const [specialItemsCount, setSpecialItemsCount] = useState(0);
  const [specialItemsDescription, setSpecialItemsDescription] = useState("");

  useEffect(() => {
    if (tripId) {
      const trip = getTripById(tripId);
      setSelectedTrip(trip);
    }
  }, [tripId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip || !date) return;

    setIsSubmitting(true);
    setBookingResult(null);

    try {
      const submission: BookingSubmission = {
        tripId: selectedTrip.id,
        date,
        passengerInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone
        },
        passengerCount: formData.passengerCount,
        luggage: [
          ...(luggageCount > 0 ? [{
            id: 'luggage',
            type: 'checked-bag' as const,
            description: 'Standard luggage',
            count: luggageCount
          }] : []),
          ...(specialItemsCount > 0 ? [{
            id: 'special',
            type: 'special' as const,
            description: specialItemsDescription || 'Special items',
            count: specialItemsCount
          }] : [])
        ],
        comments: formData.comments
      };
      // Save draft for payment page
      const draft = {
        tripId: submission.tripId,
        date: submission.date,
        totalPrice: selectedTrip.price,
        passengerInfo: submission.passengerInfo,
        passengerCount: submission.passengerCount,
        luggage: submission.luggage,
        comments: submission.comments
      };
      sessionStorage.setItem('booking_draft', JSON.stringify(draft));
      window.location.href = `/pay`;
    } catch (error) {
      setBookingResult({
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedTrip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Booking</h1>
          <p className="text-gray-600">Please select a valid trip.</p>
          <a href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  // Show success/error message
  if (bookingResult) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            {bookingResult.success ? (
              <div>
                <div className="text-green-600 text-6xl mb-4">✓</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Confirmed!</h1>
                <p className="text-gray-600 mb-4">
                  Your booking has been successfully submitted.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-600 mb-2">Confirmation Code:</p>
                  <p className="text-lg font-mono font-bold text-gray-900">
                    {bookingResult.confirmationCode}
                  </p>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Trip:</strong> {selectedTrip.route} at {selectedTrip.departureTimeDisplay}</p>
                  <p><strong>Date:</strong> {date}</p>
                  <p><strong>Price:</strong> ${selectedTrip.price}</p>
                </div>
                <div className="mt-6">
                  <a
                    href="/"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Book Another Trip
                  </a>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-red-600 text-6xl mb-4">✗</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Failed</h1>
                <p className="text-gray-600 mb-6">
                  {bookingResult.error || 'An error occurred while processing your booking.'}
                </p>
                <div className="space-x-4">
                  <button
                    onClick={() => setBookingResult(null)}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Try Again
                  </button>
                  <a
                    href="/"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Start Over
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Trip Details</h1>
          <div className="text-gray-600">
            <p><strong>Date:</strong> {date}</p>
            <p><strong>Trip:</strong> {selectedTrip.route} at {selectedTrip.departureTimeDisplay}</p>
            <p><strong>Price:</strong> ${selectedTrip.price}</p>
          </div>
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
          {/* Passenger Information */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Passenger Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Trip Details */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Trip Details</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Passengers *
                </label>
                <select
                  name="passengerCount"
                  value={formData.passengerCount}
                  onChange={(e) => setFormData(prev => ({ ...prev, passengerCount: parseInt(e.target.value) }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {[1, 2, 3, 4].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Luggage */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Luggage</h2>
            <div className="space-y-4">
              {/* Regular Luggage */}
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Luggage</h3>
                  <p className="text-sm text-gray-600">Standard bags and suitcases</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setLuggageCount(Math.max(0, luggageCount - 1))}
                    className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-8 text-center">{luggageCount}</span>
                  <button
                    type="button"
                    onClick={() => setLuggageCount(luggageCount + 1)}
                    className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Special Items */}
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Special Items</h3>
                  <p className="text-sm text-gray-600">Sports equipment, musical instruments, etc.</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setSpecialItemsCount(Math.max(0, specialItemsCount - 1))}
                    className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-8 text-center">{specialItemsCount}</span>
                  <button
                    type="button"
                    onClick={() => setSpecialItemsCount(specialItemsCount + 1)}
                    className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Special Items Description */}
              {specialItemsCount > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Items Description *
                  </label>
                  <textarea
                    value={specialItemsDescription}
                    onChange={(e) => setSpecialItemsDescription(e.target.value)}
                    rows={2}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Please describe your special items..."
                  />
                </div>
              )}
            </div>
          </div>

          {/* Comments */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Requests or Comments
            </label>
            <textarea
              name="comments"
              value={formData.comments}
              onChange={handleInputChange}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Any special requests, accessibility needs, or additional information..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-between items-center">
            <a
              href="/"
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back to Selection
            </a>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                isSubmitting
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isSubmitting ? "Processing..." : `Confirm Booking - $${selectedTrip.price}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
