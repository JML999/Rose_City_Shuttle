import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS, generateConfirmationCode } from './database';
import { Booking, LuggageItem } from './database';
import { Trip } from './trips';

export interface BookingSubmission {
  tripId: string;
  date: string;
  passengerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  passengerCount: number;
  luggage: LuggageItem[];
  comments?: string;
}

export interface BookingResult {
  success: boolean;
  bookingId?: string;
  confirmationCode?: string;
  error?: string;
}

// Submit a booking to Firestore
export async function submitBooking(submission: BookingSubmission): Promise<BookingResult> {
  try {
    // Get trip details
    const trip = require('./trips').getTripById(submission.tripId);
    if (!trip) {
      return { success: false, error: 'Invalid trip selected' };
    }

    // Generate confirmation code
    const confirmationCode = generateConfirmationCode();

    // Create booking document
    const bookingData: Omit<Booking, 'id'> = {
      tripCombinationId: submission.tripId, // Using tripId as combinationId for single trips
      trips: [{
        id: trip.id,
        direction: trip.direction,
        departureTime: trip.departureTime,
        route: trip.route,
        price: trip.price
      }],
      bookingDate: submission.date,
      totalPrice: trip.price,
      passengerInfo: submission.passengerInfo,
      passengerCount: submission.passengerCount,
      luggage: submission.luggage,
      comments: submission.comments,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      confirmationCode
    };

    // Add booking to Firestore
    const docRef = await addDoc(collection(db, COLLECTIONS.BOOKINGS), bookingData);

    return {
      success: true,
      bookingId: docRef.id,
      confirmationCode
    };

  } catch (error) {
    console.error('Error submitting booking:', error);
    return { 
      success: false, 
      error: 'Failed to submit booking. Please try again.' 
    };
  }
}

// Mock function for development (when Firestore isn't fully set up)
export function submitMockBooking(submission: BookingSubmission): Promise<BookingResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate random success/failure for testing
      const success = Math.random() > 0.1; // 90% success rate
      
      if (success) {
        resolve({
          success: true,
          bookingId: `mock_${Date.now()}`,
          confirmationCode: generateConfirmationCode()
        });
      } else {
        resolve({
          success: false,
          error: 'Mock error: Booking failed'
        });
      }
    }, 1000); // Simulate network delay
  });
}
