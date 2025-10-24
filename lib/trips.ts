export interface Trip {
  id: string;
  direction: 'to-airport' | 'from-airport';
  departureTime: string; // Format: "HH:MM" (24-hour)
  departureTimeDisplay: string; // Format: "4:00 AM"
  price: number;
  route: string;
  duration: string; // Estimated trip duration
  isAvailable: boolean;
}

// Individual trip definitions - one-way trips only
export const TRIPS: Trip[] = [
  // Thomasville to Tallahassee Airport
  {
    id: 'tville-to-tlh-4am',
    direction: 'to-airport',
    departureTime: '04:00',
    departureTimeDisplay: '4:00 AM',
    price: 115,
    route: 'Thomasville → Tallahassee Airport',
    duration: '45 minutes',
    isAvailable: true
  },
  {
    id: 'tville-to-tlh-6am',
    direction: 'to-airport',
    departureTime: '06:00',
    departureTimeDisplay: '6:00 AM',
    price: 95,
    route: 'Thomasville → Tallahassee Airport',
    duration: '45 minutes',
    isAvailable: true
  },
  {
    id: 'tville-to-tlh-8am',
    direction: 'to-airport',
    departureTime: '08:00',
    departureTimeDisplay: '8:00 AM',
    price: 85,
    route: 'Thomasville → Tallahassee Airport',
    duration: '45 minutes',
    isAvailable: true
  },
  
  // Tallahassee Airport to Thomasville
  {
    id: 'tlh-to-tville-12pm',
    direction: 'from-airport',
    departureTime: '12:00',
    departureTimeDisplay: '12:00 PM',
    price: 85,
    route: 'Tallahassee Airport → Thomasville',
    duration: '45 minutes',
    isAvailable: true
  },
  {
    id: 'tlh-to-tville-2pm',
    direction: 'from-airport',
    departureTime: '14:00',
    departureTimeDisplay: '2:00 PM',
    price: 85,
    route: 'Tallahassee Airport → Thomasville',
    duration: '45 minutes',
    isAvailable: true
  },
  {
    id: 'tlh-to-tville-6pm',
    direction: 'from-airport',
    departureTime: '18:00',
    departureTimeDisplay: '6:00 PM',
    price: 85,
    route: 'Tallahassee Airport → Thomasville',
    duration: '45 minutes',
    isAvailable: true
  }
];

// Helper functions
export function getTripsByDirection(direction: 'to-airport' | 'from-airport'): Trip[] {
  return TRIPS.filter(trip => trip.direction === direction);
}

export function getTripById(id: string): Trip | undefined {
  return TRIPS.find(trip => trip.id === id);
}

export function getAvailableTrips(): Trip[] {
  return TRIPS.filter(trip => trip.isAvailable);
}

export function getAvailableTripsByDirection(direction: 'to-airport' | 'from-airport'): Trip[] {
  return TRIPS.filter(trip => trip.direction === direction && trip.isAvailable);
}
