import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from './database';
import { Trip } from './trips';

export interface AvailabilityCheck {
  tripId: string;
  isAvailable: boolean;
  reason?: string;
}

// Check if a specific trip is available on a given date
export async function checkTripAvailability(tripId: string, date: string): Promise<AvailabilityCheck> {
  try {
    // Check if there's already a booking for this trip on this date
    const bookingsRef = collection(db, COLLECTIONS.BOOKINGS);
    const q = query(
      bookingsRef,
      where('bookingDate', '==', date),
      where('trips', 'array-contains', { id: tripId })
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { tripId, isAvailable: true };
    } else {
      return { 
        tripId, 
        isAvailable: false, 
        reason: 'Already booked for this date' 
      };
    }
  } catch (error) {
    console.error('Error checking trip availability:', error);
    return { tripId, isAvailable: false, reason: 'Error checking availability' };
  }
}

// Check availability for multiple trips on a given date
export async function checkMultipleTripAvailability(tripIds: string[], date: string): Promise<AvailabilityCheck[]> {
  const promises = tripIds.map(tripId => checkTripAvailability(tripId, date));
  return Promise.all(promises);
}

// Get trips with availability status for a specific direction and date
export async function getTripsWithAvailability(
  direction: 'to-airport' | 'from-airport', 
  date: string
): Promise<(Trip & { isAvailable: boolean; reason?: string })[]> {
  try {
    // Get all trips for the direction
    const trips = require('./trips').getTripsByDirection(direction);
    
    // Check availability for each trip
    const availabilityChecks = await checkMultipleTripAvailability(
      trips.map(trip => trip.id), 
      date
    );
    
    // Combine trip data with availability status
    return trips.map(trip => {
      const availability = availabilityChecks.find(check => check.tripId === trip.id);
      return {
        ...trip,
        isAvailable: availability?.isAvailable ?? false,
        reason: availability?.reason
      };
    });
  } catch (error) {
    console.error('Error getting trips with availability:', error);
    return [];
  }
}

// Mock function for development (when Firestore isn't set up yet)
export function getMockTripsWithAvailability(
  direction: 'to-airport' | 'from-airport', 
  date: string
): (Trip & { isAvailable: boolean; reason?: string })[] {
  const trips = require('./trips').getTripsByDirection(direction);
  
  // For development, randomly mark some trips as unavailable
  // In production, this would check actual Firestore data
  return trips.map(trip => ({
    ...trip,
    isAvailable: Math.random() > 0.3, // 70% chance of being available
    reason: Math.random() > 0.3 ? undefined : 'Sold out'
  }));
}
