export type AvailabilityStatus = 'available' | 'maybe' | 'unavailable'

export type PollOption = {
  id: string
  label: string
}

export type ExpenseSplit = {
  member_id: string
  amount: number
}

export type Trip = {
  id: string
  name: string
  destination: string | null
  description: string | null
  confirmed_date: string | null
  created_at: string
  created_by_user_id: string | null
  photo_url: string | null
}

export type Member = {
  id: string
  trip_id: string
  display_name: string
  joined_at: string
  user_id: string | null
}

export type Availability = {
  id: string
  member_id: string
  date: string
  status: AvailabilityStatus
}

export type Poll = {
  id: string
  trip_id: string
  created_by: string
  question: string
  options: PollOption[]
  created_at: string
  allow_multiple: boolean
}

export type Vote = {
  id: string
  poll_id: string
  member_id: string
  option_id: string
}

export type Expense = {
  id: string
  trip_id: string
  paid_by: string
  description: string
  amount: number
  splits: ExpenseSplit[]
  created_at: string
}

export type ItineraryItem = {
  id: string
  trip_id: string
  day: string | null
  time: string | null
  activity: string
  sort_order: number
  created_at: string
}

export type TripLink = {
  id: string
  trip_id: string
  label: string
  url: string
  added_by: string | null
}

export type Database = {
  public: {
    Tables: {
      trips: { Row: Trip; Insert: { name: string; destination?: string | null; description?: string | null; confirmed_date?: string | null; created_by_user_id?: string | null; photo_url?: string | null }; Update: Partial<Trip>; Relationships: [] }
      members: { Row: Member; Insert: Omit<Member, 'id' | 'joined_at'>; Update: Partial<Member>; Relationships: [] }
      availability: { Row: Availability; Insert: Omit<Availability, 'id'>; Update: Partial<Availability>; Relationships: [] }
      polls: { Row: Poll; Insert: Omit<Poll, 'id' | 'created_at'>; Update: Partial<Poll>; Relationships: [] }
      votes: { Row: Vote; Insert: Omit<Vote, 'id'>; Update: Partial<Vote>; Relationships: [] }
      expenses: { Row: Expense; Insert: Omit<Expense, 'id' | 'created_at'>; Update: Partial<Expense>; Relationships: [] }
      itinerary_items: { Row: ItineraryItem; Insert: Omit<ItineraryItem, 'id' | 'created_at'>; Update: Partial<ItineraryItem>; Relationships: [] }
      trip_links: { Row: TripLink; Insert: Omit<TripLink, 'id'>; Update: Partial<TripLink>; Relationships: [] }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
