export type AvailabilityStatus = 'available' | 'maybe' | 'unavailable'

export interface PollOption {
  id: string
  label: string
}

export interface ExpenseSplit {
  member_id: string
  amount: number
}

export interface Trip {
  id: string
  name: string
  destination: string | null
  description: string | null
  confirmed_date: string | null
  created_at: string
}

export interface Member {
  id: string
  trip_id: string
  display_name: string
  joined_at: string
}

export interface Availability {
  id: string
  member_id: string
  date: string
  status: AvailabilityStatus
}

export interface Poll {
  id: string
  trip_id: string
  created_by: string
  question: string
  options: PollOption[]
  created_at: string
}

export interface Vote {
  id: string
  poll_id: string
  member_id: string
  option_id: string
}

export interface Expense {
  id: string
  trip_id: string
  paid_by: string
  description: string
  amount: number
  splits: ExpenseSplit[]
  created_at: string
}

export interface ItineraryItem {
  id: string
  trip_id: string
  day: string | null
  time: string | null
  activity: string
  sort_order: number
  created_at: string
}

export interface TripLink {
  id: string
  trip_id: string
  label: string
  url: string
  added_by: string | null
}

export type Database = {
  public: {
    Tables: {
      trips: { Row: Trip; Insert: Omit<Trip, 'id' | 'created_at'>; Update: Partial<Trip> }
      members: { Row: Member; Insert: Omit<Member, 'id' | 'joined_at'>; Update: Partial<Member> }
      availability: { Row: Availability; Insert: Omit<Availability, 'id'>; Update: Partial<Availability> }
      polls: { Row: Poll; Insert: Omit<Poll, 'id' | 'created_at'>; Update: Partial<Poll> }
      votes: { Row: Vote; Insert: Omit<Vote, 'id'>; Update: Partial<Vote> }
      expenses: { Row: Expense; Insert: Omit<Expense, 'id' | 'created_at'>; Update: Partial<Expense> }
      itinerary_items: { Row: ItineraryItem; Insert: Omit<ItineraryItem, 'id' | 'created_at'>; Update: Partial<ItineraryItem> }
      trip_links: { Row: TripLink; Insert: Omit<TripLink, 'id'>; Update: Partial<TripLink> }
    }
  }
}
