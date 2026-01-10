import type {
  MeetingRoom,
  Vehicle,
  Equipment,
  Reservation,
  CreateReservationPayload,
  UpdateReservationPayload,
  CreateMeetingRoomPayload,
  CreateVehiclePayload,
  CreateEquipmentPayload,
  ReservationResourceType,
} from './types';

const API_BASE = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export async function fetchMeetingRooms(): Promise<MeetingRoom[]> {
  const response = await fetch(`${API_BASE}/meeting-rooms`);
  return handleResponse<MeetingRoom[]>(response);
}

export async function createMeetingRoom(payload: CreateMeetingRoomPayload): Promise<MeetingRoom> {
  const response = await fetch(`${API_BASE}/meeting-rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<MeetingRoom>(response);
}

export async function updateMeetingRoom(id: number, payload: Partial<CreateMeetingRoomPayload>): Promise<MeetingRoom> {
  const response = await fetch(`${API_BASE}/meeting-rooms/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<MeetingRoom>(response);
}

export async function deleteMeetingRoom(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/meeting-rooms/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<void>(response);
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  const response = await fetch(`${API_BASE}/vehicles`);
  return handleResponse<Vehicle[]>(response);
}

export async function createVehicle(payload: CreateVehiclePayload): Promise<Vehicle> {
  const response = await fetch(`${API_BASE}/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Vehicle>(response);
}

export async function updateVehicle(id: number, payload: Partial<CreateVehiclePayload>): Promise<Vehicle> {
  const response = await fetch(`${API_BASE}/vehicles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Vehicle>(response);
}

export async function deleteVehicle(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/vehicles/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<void>(response);
}

export async function fetchEquipment(): Promise<Equipment[]> {
  const response = await fetch(`${API_BASE}/equipment`);
  return handleResponse<Equipment[]>(response);
}

export async function createEquipment(payload: CreateEquipmentPayload): Promise<Equipment> {
  const response = await fetch(`${API_BASE}/equipment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Equipment>(response);
}

export async function updateEquipment(id: number, payload: Partial<CreateEquipmentPayload>): Promise<Equipment> {
  const response = await fetch(`${API_BASE}/equipment/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Equipment>(response);
}

export async function deleteEquipment(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/equipment/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<void>(response);
}

interface FetchReservationsParams {
  resource_type?: ReservationResourceType;
  resource_id?: number;
  start_date?: string;
  end_date?: string;
  status?: 'active' | 'cancelled';
}

export async function fetchReservations(params?: FetchReservationsParams): Promise<Reservation[]> {
  const searchParams = new URLSearchParams();
  if (params?.resource_type) searchParams.set('resource_type', params.resource_type);
  if (params?.resource_id) searchParams.set('resource_id', String(params.resource_id));
  if (params?.start_date) searchParams.set('start_date', params.start_date);
  if (params?.end_date) searchParams.set('end_date', params.end_date);
  if (params?.status) searchParams.set('status', params.status);

  const queryString = searchParams.toString();
  const url = queryString ? `${API_BASE}/reservations?${queryString}` : `${API_BASE}/reservations`;
  
  const response = await fetch(url);
  return handleResponse<Reservation[]>(response);
}

export async function createReservation(payload: CreateReservationPayload): Promise<Reservation> {
  const response = await fetch(`${API_BASE}/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Reservation>(response);
}

export async function updateReservation(id: number, payload: UpdateReservationPayload): Promise<Reservation> {
  const response = await fetch(`${API_BASE}/reservations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Reservation>(response);
}

export async function cancelReservation(id: number): Promise<Reservation> {
  const response = await fetch(`${API_BASE}/reservations/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<Reservation>(response);
}
