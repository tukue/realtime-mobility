export interface Site {
  SiteId: string;
  Name: string;
  Type: string;
  X: string;
  Y: string;
  distance_meters?: number;
}

export interface Deviation {
  message?: string;
  Text?: string;
  text?: string;
  header?: string;
  details?: string;
  importance_level?: number;
  ImportanceLevel?: number;
  Consequence?: string;
  scope?: unknown;
  id?: string;
}

export interface StopDeviation {
  id: number | string;
  importance_level: number;
  message: string;
  scope?: {
    stop_areas?: Array<{ id: number; name: string }>;
    lines?: Array<{ id: number; designation: string }>;
  };
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
  deviations: Deviation[];
}

export function getDeviationText(d: Deviation): string {
  return d.message || d.Text || d.text || d.header || '';
}

export interface DepartureData {
  buses: Departure[];
  metros: Departure[];
  trains: Departure[];
  trams: Departure[];
  ships: Departure[];
  stop_deviations?: StopDeviation[];
}

export interface FavoriteStop {
  id: string;
  user_id: string;
  site_id: string;
  site_name: string;
  created_at: string;
}

export interface NearbyStopBoard extends Site {
  departures?: DepartureData & {
    error?: string;
    status?: string;
  };
}
