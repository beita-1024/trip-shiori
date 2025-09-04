export interface User {
  createdAt: string | number | Date;
  id: number;
  name: string;
  email: string;
}

export interface Event {
  time: string;
  end_time: string;
  title: string;
  description: string;
  icon: string;
}

export interface Day {
  date?: Date;
  events: Event[];
}

export interface Itinerary {
  title: string;
  subtitle?: string;
  description?: string;
  days: Day[];
}

