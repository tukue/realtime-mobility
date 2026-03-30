export interface Site {
  SiteId: string;
  Name: string;
  Type: string;
  X: string;
  Y: string;
}

export interface Departure {
  line_number: string;
  destination: string;
  display_time: string;
  expected_datetime: string;
  journey_direction: number;
  group_of_line: string;
  transport_mode?: string;
  has_deviations?: boolean;
  deviations: any[];
}

export interface DepartureData {
  buses: Departure[];
  metros: Departure[];
  trains: Departure[];
  trams: Departure[];
  ships: Departure[];
}

export interface FavoriteStop {
  id: string;
  user_id: string;
  site_id: string;
  site_name: string;
  created_at: string;
}
