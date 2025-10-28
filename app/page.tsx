"use client";
import { useState, useEffect } from "react";
import { TRIPS, getTripsByDirection, Trip } from "@/lib/trips";
import { formatBookingDate } from "@/lib/database";
import { getMockTripsWithAvailability } from "@/lib/availability";

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedRoute, setSelectedRoute] = useState<'to-airport' | 'from-airport' | ''>('');
  const [selectedTrip, setSelectedTrip] = useState<string>("");
  const [availableTrips, setAvailableTrips] = useState<(Trip & { isAvailable: boolean; reason?: string })[]>([]);
  const [loading, setLoading] = useState(false);

  // Get tomorrow's date as default
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = formatBookingDate(tomorrow);

  // Load available trips when route or date changes
  useEffect(() => {
    const loadAvailableTrips = async () => {
      if (selectedRoute && selectedDate) {
        setLoading(true);
        try {
          // For now, use mock data. In production, use: getTripsWithAvailability(selectedRoute, selectedDate)
          const trips = getMockTripsWithAvailability(selectedRoute, selectedDate);
          setAvailableTrips(trips);
        } catch (error) {
          console.error('Error loading trips:', error);
          setAvailableTrips([]);
        } finally {
          setLoading(false);
        }
      } else {
        setAvailableTrips([]);
      }
    };

    loadAvailableTrips();
  }, [selectedRoute, selectedDate]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedTrip(""); // Reset trip selection when date changes
  };

  const handleRouteChange = (route: 'to-airport' | 'from-airport') => {
    setSelectedRoute(route);
    setSelectedTrip(""); // Reset trip selection when route changes
  };

  const handleTripSelect = (tripId: string) => {
    setSelectedTrip(tripId);
  };

  const handleBookNow = () => {
    if (selectedTrip) {
      // Find the trip object
      const trip = availableTrips.find(t => t.id === selectedTrip);
      const tripDisplay = trip ? `${trip.departureTimeDisplay} - $${trip.price}` : 'selected trip';
      // Show alert that booking is being set up
      alert(`Booking feature coming soon! Selected: ${tripDisplay} on ${selectedDate}. This site is currently being configured.`);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')"
        }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      
      {/* Content - Minimal and Centered */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-xl shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Rose City Shuttle
            </h1>
            <p className="text-sm text-gray-600">
              Thomasville ↔ Tallahassee Shuttle Service
            </p>
          </div>

          {/* Form - Minimal Column */}
          <div className="space-y-4">
            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={selectedDate || defaultDate}
                onChange={(e) => handleDateChange(e.target.value)}
                min={formatBookingDate(new Date())}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Route Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Route
              </label>
              <select
                value={selectedRoute}
                onChange={(e) => handleRouteChange(e.target.value as 'to-airport' | 'from-airport')}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Select Route</option>
                <option value="to-airport">To Tallahassee</option>
                <option value="from-airport">To Thomasville</option>
              </select>
            </div>

            {/* Trip Options - Dynamically populated based on route and date */}
            {selectedRoute && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trip Options
                </label>
                {loading ? (
                  <div className="text-center py-4 text-sm text-gray-500">
                    Checking availability...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableTrips.length > 0 ? (
                      availableTrips.map((trip) => (
                        <div
                          key={trip.id}
                          className={`p-2 border rounded-md cursor-pointer transition-all text-sm ${
                            selectedTrip === trip.id
                              ? "border-blue-500 bg-blue-50"
                              : trip.isAvailable
                              ? "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                              : "border-gray-200 bg-gray-100 opacity-60"
                          }`}
                          onClick={() => trip.isAvailable && handleTripSelect(trip.id)}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{trip.departureTimeDisplay}</span>
                            <div className="text-right">
                              <span className="font-semibold">${trip.price}</span>
                              {!trip.isAvailable && (
                                <div className="text-xs text-red-600">Sold Out</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-sm text-gray-500">
                        No trips available for this route and date
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Book Button */}
            <div className="pt-2">
              <button
                onClick={handleBookNow}
                disabled={!selectedTrip}
                className={`w-full py-2 rounded-md font-medium text-sm transition-all ${
                  selectedTrip
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {selectedTrip ? "Book Now" : "Select a Trip"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
