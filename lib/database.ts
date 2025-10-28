import { Timestamp, FieldValue } from 'firebase/firestore';

// Database structure for Firestore collections

export interface Booking {
  id: string;
  // Trip information
  tripCombinationId: string;
  trips: {
    id: string;
    direction: 'to-airport' | 'from-airport';
    departureTime: string;
    route: string;
    price: number;
  }[];
  
  // Booking details
  bookingDate: string; // Format: "YYYY-MM-DD"
  totalPrice: number;
  
  // Passenger information
  passengerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  
  // Trip details
  passengerCount: number;
  luggage: LuggageItem[];
  comments?: string;
  
  // System fields
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: FieldValue | Timestamp;
  updatedAt: FieldValue | Timestamp;
  confirmationCode: string; // Unique booking reference
}

export interface LuggageItem {
  id: string;
  type: 'carry-on' | 'checked-bag' | 'oversized' | 'special';
  description: string;
  count: number;
}

export interface DailyAvailability {
  id: string; // Format: "YYYY-MM-DD"
  date: string; // Format: "YYYY-MM-DD"
  
  // Track which trip combinations are booked for this date
  bookedCombinations: string[]; // Array of tripCombinationId
  
  // Individual trip availability (for reference)
  bookedTrips: {
    [tripId: string]: boolean; // true = booked, false = available
  };
  
  // System fields
  createdAt: FieldValue | Timestamp;
  updatedAt: FieldValue | Timestamp;
}

export interface TripSchedule {
  id: string;
  tripId: string;
  date: string; // Format: "YYYY-MM-DD"
  isAvailable: boolean;
  bookingId?: string; // If booked, reference the booking
  createdAt: FieldValue | Timestamp;
  updatedAt: FieldValue | Timestamp;
}

// Luggage options for the booking form
export const LUGGAGE_OPTIONS = [
  { id: 'carry-on', label: 'Carry-on Bag', description: 'Small bag that fits under seat' },
  { id: 'checked-bag', label: 'Checked Bag', description: 'Standard suitcase' },
  { id: 'oversized', label: 'Oversized Bag', description: 'Large or heavy items' },
  { id: 'special', label: 'Special Items', description: 'Sports equipment, musical instruments, etc.' }
];

// Helper functions for database operations
export function generateConfirmationCode(): string {
  // Generate a 6-character alphanumeric code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatBookingDate(date: Date): string {
  return date.toISOString().split('T')[0]; // Returns "YYYY-MM-DD"
}

export function isValidBookingDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

// Database collection names
export const COLLECTIONS = {
  BOOKINGS: 'bookings',
  DAILY_AVAILABILITY: 'dailyAvailability',
  TRIP_SCHEDULES: 'tripSchedules'
} as const;
