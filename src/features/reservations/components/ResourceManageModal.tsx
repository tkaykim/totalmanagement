'use client';

import { useState } from 'react';
import { X, Plus, Pencil, Trash2, Building, Car, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MeetingRoom, Vehicle, Equipment, CreateMeetingRoomPayload, CreateVehiclePayload, CreateEquipmentPayload } from '../types';

type ResourceTab = 'meeting_room' | 'vehicle' | 'equipment';

interface ResourceManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ResourceTab;
  meetingRooms: MeetingRoom[];
  vehicles: Vehicle[];
  equipment: Equipment[];
  onCreateMeetingRoom: (payload: CreateMeetingRoomPayload) => Promise<void>;
  onUpdateMeetingRoom: (id: number, payload: Partial<CreateMeetingRoomPayload>) => Promise<void>;
  onDeleteMeetingRoom: (id: number) => Promise<void>;
  onCreateVehicle: (payload: CreateVehiclePayload) => Promise<void>;
  onUpdateVehicle: (id: number, payload: Partial<CreateVehiclePayload>) => Promise<void>;
  onDeleteVehicle: (id: number) => Promise<void>;
  onCreateEquipment: (payload: CreateEquipmentPayload) => Promise<void>;
  onUpdateEquipment: (id: number, payload: Partial<CreateEquipmentPayload>) => Promise<void>;
  onDeleteEquipment: (id: number) => Promise<void>;
}

const BU_OPTIONS = [
  { code: 'GRIGO', name: '그리고' },
  { code: 'FLOW', name: '플로우' },
  { code: 'REACT', name: '리액트' },
  { code: 'MODOO', name: '모두' },
  { code: 'AST', name: 'AST' },
  { code: 'HEAD', name: '본부' },
];

const EQUIPMENT_CATEGORIES = [
  '카메라',
  '렌즈',
  '조명',
  '오디오',
  '삼각대/짐벌',
  '드론',
  '모니터',
  '메모리/저장장치',
  '기타',
];

export function ResourceManageModal({
  isOpen,
  onClose,
  type,
  meetingRooms,
  vehicles,
  equipment,
  onCreateMeetingRoom,
  onUpdateMeetingRoom,
  onDeleteMeetingRoom,
  onCreateVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onCreateEquipment,
  onUpdateEquipment,
  onDeleteEquipment,
}: ResourceManageModalProps) {
  const [activeTab, setActiveTab] = useState<ResourceTab>(type);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capacity: '',
    location: '',
    license_plate: '',
    is_active: true,
    bu_code: 'HEAD',
    category: '카메라',
    quantity: '1',
    serial_number: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      capacity: '',
      location: '',
      license_plate: '',
      is_active: true,
      bu_code: 'HEAD',
      category: '카메라',
      quantity: '1',
      serial_number: '',
      notes: '',
    });
    setIsAdding(false);
    setEditingId(null);
    setError('');
  };

  const startEdit = (item: MeetingRoom | Vehicle | Equipment) => {
    if ('capacity' in item) {
      setFormData({
        name: item.name,
        description: item.description || '',
        capacity: item.capacity?.toString() || '',
        location: item.location || '',
        license_plate: '',
        is_active: item.is_active,
        bu_code: 'HEAD',
        category: '카메라',
        quantity: '1',
        serial_number: '',
        notes: '',
      });
    } else if ('license_plate' in item) {
      setFormData({
        name: item.name,
        description: item.description || '',
        capacity: '',
        location: '',
        license_plate: item.license_plate,
        is_active: item.is_active,
        bu_code: 'HEAD',
        category: '카메라',
        quantity: '1',
        serial_number: '',
        notes: '',
      });
    } else {
      setFormData({
        name: item.name,
        description: '',
        capacity: '',
        location: item.location || '',
        license_plate: '',
        is_active: true,
        bu_code: item.bu_code,
        category: item.category,
        quantity: item.quantity?.toString() || '1',
        serial_number: item.serial_number || '',
        notes: item.notes || '',
      });
    }
    setEditingId(item.id);
    setIsAdding(false);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }

    if (activeTab === 'vehicle' && !formData.license_plate.trim()) {
      setError('차량 번호를 입력해주세요.');
      return;
    }

    if (activeTab === 'equipment' && !formData.category.trim()) {
      setError('카테고리를 선택해주세요.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      if (activeTab === 'meeting_room') {
        const payload: CreateMeetingRoomPayload = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          capacity: formData.capacity ? Number(formData.capacity) : undefined,
          location: formData.location.trim() || undefined,
          is_active: formData.is_active,
        };
        if (editingId) {
          await onUpdateMeetingRoom(editingId, payload);
        } else {
          await onCreateMeetingRoom(payload);
        }
      } else if (activeTab === 'vehicle') {
        const payload: CreateVehiclePayload = {
          name: formData.name.trim(),
          license_plate: formData.license_plate.trim(),
          description: formData.description.trim() || undefined,
          is_active: formData.is_active,
        };
        if (editingId) {
          await onUpdateVehicle(editingId, payload);
        } else {
          await onCreateVehicle(payload);
        }
      } else {
        const payload: CreateEquipmentPayload = {
          bu_code: formData.bu_code,
          name: formData.name.trim(),
          category: formData.category,
          quantity: formData.quantity ? Number(formData.quantity) : 1,
          serial_number: formData.serial_number.trim() || undefined,
          location: formData.location.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        };
        if (editingId) {
          await onUpdateEquipment(editingId, payload);
        } else {
          await onCreateEquipment(payload);
        }
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말로 삭제하시겠습니까? 관련 예약도 함께 삭제될 수 있습니다.')) return;

    setIsSubmitting(true);
    try {
      if (activeTab === 'meeting_room') {
        await onDeleteMeetingRoom(id);
      } else if (activeTab === 'vehicle') {
        await onDeleteVehicle(id);
      } else {
        await onDeleteEquipment(id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const getItems = () => {
    if (activeTab === 'meeting_room') return meetingRooms;
    if (activeTab === 'vehicle') return vehicles;
    return equipment;
  };
  const items = getItems();

  const getTabLabel = () => {
    if (activeTab === 'meeting_room') return '회의실';
    if (activeTab === 'vehicle') return '차량';
    return '장비';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">리소스 관리</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex gap-1 p-2">
            <button
              onClick={() => {
                setActiveTab('meeting_room');
                resetForm();
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition',
                activeTab === 'meeting_room'
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
              )}
            >
              <Building className="h-4 w-4" />
              회의실
            </button>
            <button
              onClick={() => {
                setActiveTab('equipment');
                resetForm();
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition',
                activeTab === 'equipment'
                  ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
              )}
            >
              <Package className="h-4 w-4" />
              장비
            </button>
            <button
              onClick={() => {
                setActiveTab('vehicle');
                resetForm();
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition',
                activeTab === 'vehicle'
                  ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
              )}
            >
              <Car className="h-4 w-4" />
              차량
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {(isAdding || editingId) && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {editingId ? '수정' : '새로 추가'}
              </h3>
              <div className="grid gap-3">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="이름 *"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                />
                {activeTab === 'vehicle' && (
                  <input
                    type="text"
                    value={formData.license_plate}
                    onChange={(e) => setFormData((p) => ({ ...p, license_plate: e.target.value }))}
                    placeholder="차량 번호 * (예: 70하 7690)"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                  />
                )}
                {activeTab === 'meeting_room' && (
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData((p) => ({ ...p, capacity: e.target.value }))}
                      placeholder="수용 인원"
                      className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                      placeholder="위치"
                      className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                    />
                  </div>
                )}
                {activeTab === 'equipment' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={formData.bu_code}
                        onChange={(e) => setFormData((p) => ({ ...p, bu_code: e.target.value }))}
                        className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                      >
                        {BU_OPTIONS.map((bu) => (
                          <option key={bu.code} value={bu.code}>
                            {bu.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                        className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                      >
                        {EQUIPMENT_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="number"
                        min="1"
                        value={formData.quantity}
                        onChange={(e) => setFormData((p) => ({ ...p, quantity: e.target.value }))}
                        placeholder="수량 *"
                        className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={formData.serial_number}
                        onChange={(e) => setFormData((p) => ({ ...p, serial_number: e.target.value }))}
                        placeholder="시리얼 넘버"
                        className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                        placeholder="보관 위치"
                        className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                      />
                    </div>
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="비고"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                    />
                  </>
                )}
                {activeTab !== 'equipment' && (
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    placeholder="설명"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                  />
                )}
                {activeTab !== 'equipment' && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">활성화</span>
                  </label>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={resetForm}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  취소
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          )}

          {!isAdding && !editingId && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 w-full rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 p-4 text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
            >
              <Plus className="h-4 w-4" />
              {getTabLabel()} 추가
            </button>
          )}

          <div className="space-y-2">
            {items.map((item) => {
              const isActive = 'is_active' in item ? item.is_active : true;
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-4 transition',
                    isActive
                      ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 opacity-60'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {activeTab === 'meeting_room' && (
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                        <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                    {activeTab === 'equipment' && (
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                        <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    )}
                    {activeTab === 'vehicle' && (
                      <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                        <Car className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {'license_plate' in item ? item.license_plate : ''}
                        {'capacity' in item && item.capacity ? `${item.capacity}명` : ''}
                        {'category' in item ? `${item.category}` : ''}
                        {'quantity' in item && item.quantity ? ` · ${item.quantity}개` : ''}
                        {'serial_number' in item && item.serial_number ? ` · ${item.serial_number}` : ''}
                        {'description' in item && item.description ? ` · ${item.description}` : ''}
                        {'location' in item && item.location ? ` · ${item.location}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {'status' in item && item.status !== 'available' && (
                      <span className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded',
                        item.status === 'rented' && 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400',
                        item.status === 'maintenance' && 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400',
                        item.status === 'lost' && 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400',
                      )}>
                        {item.status === 'rented' ? '대여중' : item.status === 'maintenance' ? '정비중' : '분실'}
                      </span>
                    )}
                    {!isActive && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                        비활성
                      </span>
                    )}
                    <button
                      onClick={() => startEdit(item)}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                      <Pencil className="h-4 w-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={isSubmitting}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-8">
                등록된 {getTabLabel()}이 없습니다.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 dark:border-slate-700 p-6">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
