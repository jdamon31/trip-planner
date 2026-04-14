export type AvailabilityStatus = 'available' | 'maybe' | 'unavailable'

export type DateRangeEntry = {
  start: string
  end: string
}

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
  confirmed_dates: string[]
  created_at: string
  created_by_user_id: string | null
  photo_url: string | null
  date_ranges: DateRangeEntry[]
  itinerary_days: number
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
  category: string
  expense_date: string
  notes: string | null
  splits: ExpenseSplit[]
  created_at: string
}

export type ItineraryItem = {
  id: string
  trip_id: string
  day_number: number
  time: string | null
  activity: string
  description: string | null
  location: string | null
  added_by: string | null
  sort_order: number
  created_at: string
}

export type RangeVoteStatus = 'yes' | 'partial' | 'no'

export type RangeVote = {
  id: string
  trip_id: string
  range_start: string
  range_end: string
  member_id: string
  status: RangeVoteStatus
  caveat: string | null
  created_at: string
}

export type Message = {
  id: string
  trip_id: string
  member_id: string
  display_name: string
  content: string
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
      trips: { Row: Trip; Insert: { name: string; destination?: string | null; description?: string | null; confirmed_date?: string | null; created_by_user_id?: string | null; photo_url?: string | null; date_ranges?: DateRangeEntry[] }; Update: Partial<Trip>; Relationships: [] }
      members: { Row: Member; Insert: Omit<Member, 'id' | 'joined_at'>; Update: Partial<Member>; Relationships: [] }
      availability: { Row: Availability; Insert: Omit<Availability, 'id'>; Update: Partial<Availability>; Relationships: [] }
      polls: { Row: Poll; Insert: Omit<Poll, 'id' | 'created_at'>; Update: Partial<Poll>; Relationships: [] }
      votes: { Row: Vote; Insert: Omit<Vote, 'id'>; Update: Partial<Vote>; Relationships: [] }
      expenses: { Row: Expense; Insert: Omit<Expense, 'id' | 'created_at'>; Update: Partial<Expense>; Relationships: [] }
      itinerary_items: { Row: ItineraryItem; Insert: Omit<ItineraryItem, 'id' | 'created_at'>; Update: Partial<ItineraryItem>; Relationships: [] }
      trip_links: { Row: TripLink; Insert: Omit<TripLink, 'id'>; Update: Partial<TripLink>; Relationships: [] }
      messages: { Row: Message; Insert: Omit<Message, 'id' | 'created_at'>; Update: Partial<Message>; Relationships: [] }
      range_votes: { Row: RangeVote; Insert: Omit<RangeVote, 'id' | 'created_at'>; Update: Partial<RangeVote>; Relationships: [] }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
