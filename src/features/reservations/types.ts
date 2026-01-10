export type ReservationResourceType = 'meeting_room' | 'equipment' | 'vehicle';
export type ReservationStatus = 'active' | 'cancelled';

export interface MeetingRoom {
  id: number;
  name: string;
  description: string | null;
  capacity: number | null;
  location: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: number;
  name: string;
  license_plate: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Equipment {
  id: number;
  bu_code: string;
  name: string;
  category: string;
  quantity: number;
  serial_number: string | null;
  status: 'available' | 'rented' | 'maintenance' | 'lost';
  location: string | null;
  borrower_id: string | null;
  borrower_name: string | null;
  return_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reserver {
  id: string;
  name: string;
  email: string | null;
  bu_code: string | null;
}

export interface ProjectInfo {
  id: number;
  name: string;
}

export interface TaskInfo {
  id: number;
  title: string;
}

export interface Reservation {
  id: number;
  resource_type: ReservationResourceType;
  resource_id: number;
  reserver_id: string;
  project_id: number | null;
  task_id: number | null;
  title: string;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  quantity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  reserver?: Reserver;
  project?: ProjectInfo | null;
  task?: TaskInfo | null;
}

export interface CreateReservationPayload {
  resource_type: ReservationResourceType;
  resource_id: number;
  project_id?: number | null;
  task_id?: number | null;
  title: string;
  start_time: string;
  end_time: string;
  quantity?: number;
  notes?: string;
}

export interface UpdateReservationPayload {
  project_id?: number | null;
  task_id?: number | null;
  title?: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
  status?: ReservationStatus;
}

export interface CreateMeetingRoomPayload {
  name: string;
  description?: string;
  capacity?: number;
  location?: string;
  is_active?: boolean;
}

export interface CreateVehiclePayload {
  name: string;
  license_plate: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateEquipmentPayload {
  bu_code: string;
  name: string;
  category: string;
  quantity?: number;
  serial_number?: string;
  status?: 'available' | 'rented' | 'maintenance' | 'lost';
  location?: string;
  notes?: string;
}

export const RESOURCE_TYPE_LABELS: Record<ReservationResourceType, string> = {
  meeting_room: '회의실',
  equipment: '장비',
  vehicle: '차량',
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  active: '예약중',
  cancelled: '취소됨',
};
