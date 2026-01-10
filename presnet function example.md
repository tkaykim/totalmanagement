import React, { useState, useEffect } from 'react';
import { 
  Users, Clock, Coffee, Briefcase, MapPin, 
  CalendarCheck, LogOut, CheckCircle2, AlertCircle,
  MoreHorizontal, Play, Monitor, Sparkles, X, ChevronRight, Zap
} from 'lucide-react';

/**
 * --- Types & Enums ---
 */
type WorkStatus = 'OFF_WORK' | 'WORKING' | 'MEETING' | 'OUTSIDE' | 'BREAK' | 'LEAVE';

interface User {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
  status: WorkStatus;
  currentMeetingId?: string; 
  statusMessage?: string;    
  lastUpdated: Date;
}

interface MeetingRoom {
  id: string;
  name: string;
}

interface MeetingReservation {
  id: string;
  roomId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  attendeeIds: string[];
}

/**
 * --- Mock Data ---
 */
const MOCK_ROOMS: MeetingRoom[] = [
  { id: 'r1', name: 'Main Conf Room' },
  { id: 'r2', name: 'Studio A' },
];

const NOW = new Date();
const ONE_HOUR_LATER = new Date(NOW.getTime() + 60 * 60 * 1000);

const MOCK_RESERVATIONS: MeetingReservation[] = [
  {
    id: 'm1',
    roomId: 'r1',
    title: '주간 콘텐츠 기획 회의',
    startTime: new Date(NOW.getTime() - 1000 * 60 * 30), 
    endTime: new Date(NOW.getTime() + 1000 * 60 * 30),   
    attendeeIds: ['u1', 'u3', 'u4'],
  },
  {
    id: 'm2',
    roomId: 'r2',
    title: '굿즈 제작 단가 미팅',
    startTime: ONE_HOUR_LATER,
    endTime: new Date(ONE_HOUR_LATER.getTime() + 1000 * 60 * 60),
    attendeeIds: ['u1', 'u5'],
  }
];

const INITIAL_USERS: User[] = [
  { id: 'u1', name: '김현준', role: '대표이사', department: 'Management', avatar: 'KH', status: 'OFF_WORK', lastUpdated: new Date() },
  { id: 'u2', name: '오동현', role: '비서실장', department: 'Management', avatar: 'OH', status: 'WORKING', lastUpdated: new Date() },
  { id: 'u3', name: '홍철화', role: '플로우메이커 대표', department: 'Performance', avatar: 'HC', status: 'MEETING', currentMeetingId: 'm1', lastUpdated: new Date() },
  { id: 'u4', name: '권혁준', role: 'PD', department: 'Performance', avatar: 'KH', status: 'MEETING', currentMeetingId: 'm1', lastUpdated: new Date() },
  { id: 'u5', name: '김동현', role: '제작/ERP', department: 'Merch', avatar: 'KD', status: 'OUTSIDE', statusMessage: '공장 실사', lastUpdated: new Date() },
  { id: 'u6', name: '김민정', role: '회계/세무', department: 'Finance', avatar: 'KM', status: 'BREAK', lastUpdated: new Date() },
];

const WELCOME_MESSAGES = [
  "오늘도 힘차게 시작해봐요! 화이팅! 🚀",
  "좋은 아침입니다! 멋진 하루가 될 거예요 ✨",
  "GRIGO의 에너지를 보여주세요! 💪",
  "오늘 하루도 산뜻하게 출발! 🌞",
  "준비되셨나요? 오늘도 대박 납시다! 💎"
];

/**
 * --- Components ---
 */

const StatusBadge = ({ status, className = "" }: { status: WorkStatus, className?: string }) => {
  const config = {
    OFF_WORK: { color: 'bg-gray-100 text-gray-500', icon: LogOut, label: '퇴근/부재' },
    WORKING: { color: 'bg-green-100 text-green-700', icon: Monitor, label: '업무중' },
    MEETING: { color: 'bg-red-100 text-red-700', icon: Users, label: '미팅중' },
    OUTSIDE: { color: 'bg-blue-100 text-blue-700', icon: MapPin, label: '외근' },
    BREAK: { color: 'bg-orange-100 text-orange-700', icon: Coffee, label: '휴식/식사' },
    LEAVE: { color: 'bg-purple-100 text-purple-700', icon: CalendarCheck, label: '휴가' },
  };

  const { color, icon: Icon, label } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${color} ${className}`}>
      <Icon size={12} />
      {label}
    </span>
  );
};

const AttendanceSystem = () => {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]); 
  
  // States for UI Logic
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  
  // Welcome Animation States
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeMsg, setWelcomeMsg] = useState('');
  const [welcomeTitle, setWelcomeTitle] = useState('환영합니다!');

  // Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Helpers
  const formatTimeDetail = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };
  
  const formatDateDetail = (date: Date) => {
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
  };

  const formatTimeSimple = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  // Logic
  const activeMeetings = MOCK_RESERVATIONS.filter(m => {
    const now = new Date();
    return now >= m.startTime && now <= m.endTime;
  });

  const handleStatusChange = (newStatus: WorkStatus) => {
    // 1. Meeting Check
    if (newStatus === 'MEETING') {
      setShowMeetingModal(true);
      return;
    }

    // 2. Logout Confirmation Check
    if (newStatus === 'OFF_WORK') {
      setShowLogoutConfirm(true);
      return;
    }

    // 3. Clock In Welcome Check (OFF_WORK -> WORKING)
    if (currentUser.status === 'OFF_WORK' && newStatus === 'WORKING') {
      triggerWelcome("출근 완료!", WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]);
    }

    // 4. Return from Break Welcome Check (BREAK -> WORKING)
    if (currentUser.status === 'BREAK' && newStatus === 'WORKING') {
      triggerWelcome("업무 복귀!", "잘 쉬고 오셨나요? 다시 화이팅 해봅시다! 🔥");
    }
    
    updateUserStatus(newStatus);
  };

  const confirmLogout = () => {
    updateUserStatus('OFF_WORK');
    setShowLogoutConfirm(false);
  };

  const triggerWelcome = (title: string, msg: string) => {
    setWelcomeTitle(title);
    setWelcomeMsg(msg);
    setShowWelcome(true);
    setTimeout(() => setShowWelcome(false), 3500);
  };

  const updateUserStatus = (status: WorkStatus, meetingId?: string, note?: string) => {
    const updatedUser = {
      ...currentUser,
      status,
      currentMeetingId: meetingId,
      statusMessage: note,
      lastUpdated: new Date()
    };

    setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
    setCurrentUser(updatedUser);
    setShowMeetingModal(false);
    setStatusNote('');
  };

  // Status Options Configuration
  const STATUS_BUTTONS = [
    { id: 'WORKING', label: '업무중', icon: Monitor, activeColor: 'bg-green-600 text-white shadow-green-200 shadow-lg ring-2 ring-green-600 ring-offset-2', inactiveColor: 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200' },
    { id: 'MEETING', label: '미팅', icon: Users, activeColor: 'bg-red-500 text-white shadow-red-200 shadow-lg ring-2 ring-red-500 ring-offset-2', inactiveColor: 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200' },
    { id: 'OUTSIDE', label: '외근', icon: MapPin, activeColor: 'bg-blue-500 text-white shadow-blue-200 shadow-lg ring-2 ring-blue-500 ring-offset-2', inactiveColor: 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200' },
    { id: 'BREAK', label: '휴식', icon: Coffee, activeColor: 'bg-orange-400 text-white shadow-orange-200 shadow-lg ring-2 ring-orange-400 ring-offset-2', inactiveColor: 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200' },
  ];

  // --- RENDER: INTRO VIEW (Before Work) ---
  if (currentUser.status === 'OFF_WORK') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        
        {/* Background Accents */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
           <div className="absolute top-10 left-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
           <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="z-10 text-center max-w-lg w-full">
          <div className="mb-2 text-slate-400 font-medium text-lg tracking-wide">
            {formatDateDetail(currentTime)}
          </div>
          <div className="text-7xl md:text-9xl font-bold font-mono tracking-tight text-white mb-12 tabular-nums">
            {formatTimeDetail(currentTime)}
          </div>

          <div className="bg-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xl border-2 border-slate-600">
                {currentUser.avatar}
              </div>
              <div className="text-left">
                <h2 className="text-2xl font-bold">안녕하세요, {currentUser.name}님</h2>
                <p className="text-slate-400">오늘 업무를 시작하시겠습니까?</p>
              </div>
            </div>

            <button 
              onClick={() => handleStatusChange('WORKING')}
              className="w-full group relative flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-5 rounded-xl text-xl font-bold transition-all shadow-lg hover:shadow-blue-500/30 active:scale-95"
            >
              <Play size={24} className="fill-current" />
              출근하기
              <span className="absolute right-5 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </button>
          </div>
          
          <p className="mt-8 text-slate-500 text-sm">
            GRIGO ENTERTAINMENT Workspace
          </p>
        </div>
      </div>
    );
  }

  // --- RENDER: BREAK MODE (Resting) ---
  if (currentUser.status === 'BREAK') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-900 via-slate-900 to-slate-900 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        
        {/* Background Accents for Break Mode */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
           <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
           <div className="absolute bottom-10 right-10 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="z-10 text-center max-w-lg w-full">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 text-orange-200 rounded-full mb-8 backdrop-blur-sm border border-orange-500/30">
            <Coffee size={18} />
            <span className="text-sm font-bold">현재 휴식 중입니다</span>
          </div>

          <div className="mb-2 text-slate-400 font-medium text-lg tracking-wide">
            {formatDateDetail(currentTime)}
          </div>
          <div className="text-7xl md:text-9xl font-bold font-mono tracking-tight text-white mb-8 tabular-nums">
            {formatTimeDetail(currentTime)}
          </div>

          <div className="bg-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10 shadow-2xl">
            <h2 className="text-2xl font-bold mb-2">에너지 충전 중... ⚡️</h2>
            <p className="text-slate-300 mb-8 leading-relaxed">
              잠시 머리를 식히고 오세요.<br/>
              충분한 휴식은 더 좋은 성과를 만듭니다.
            </p>

            <button 
              onClick={() => handleStatusChange('WORKING')}
              className="w-full group relative flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-white px-8 py-5 rounded-xl text-xl font-bold transition-all shadow-lg hover:shadow-green-500/30 active:scale-95"
            >
              <Zap size={24} className="fill-current" />
              근무 재개하기
              <span className="absolute right-5 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: DASHBOARD VIEW (Working) ---
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      
      {/* Welcome Toast Overlay */}
      {showWelcome && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 backdrop-blur-md shadow-2xl rounded-2xl p-8 max-w-md text-center border-2 border-blue-100 animate-in zoom-in fade-in slide-in-from-bottom-10 duration-500">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Sparkles size={32} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">{welcomeTitle}</h3>
            <p className="text-lg text-slate-600 font-medium">{welcomeMsg}</p>
          </div>
        </div>
      )}

      {/* Header Area with CLOCK & STATUS BAR */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          
          {/* Logo & Clock Area */}
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">GRIGO Workspace</h1>
              <p className="text-slate-500 text-xs mt-1">그리고 엔터테인먼트 전사 현황판</p>
            </div>
            
            <div className="hidden md:flex flex-col justify-center px-5 py-2 bg-white rounded-xl border border-slate-200 shadow-sm min-w-[140px]">
              <span className="text-xs text-slate-400 font-medium">{formatDateDetail(currentTime)}</span>
              <span className="text-2xl font-bold text-slate-800 font-mono tabular-nums tracking-tight">
                {formatTimeDetail(currentTime)}
              </span>
            </div>
          </div>
          
          {/* Main Status Control Bar */}
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-2 md:gap-4 overflow-x-auto">
            
            {/* User Profile */}
            <div className="flex items-center gap-3 px-2 min-w-max">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-md">
                {currentUser.avatar}
              </div>
              <div className="hidden md:block pr-2">
                <div className="text-sm font-bold text-slate-900">{currentUser.name}</div>
                <div className="text-xs text-slate-500">{currentUser.role}</div>
              </div>
            </div>
            
            <div className="hidden md:block h-8 w-px bg-slate-100"></div>

            {/* Status Buttons Group */}
            <div className="flex items-center gap-2 w-full md:w-auto p-1 overflow-x-auto no-scrollbar">
              {STATUS_BUTTONS.map((btn) => {
                const isActive = currentUser.status === btn.id;
                return (
                  <button
                    key={btn.id}
                    onClick={() => handleStatusChange(btn.id as WorkStatus)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap
                      ${isActive ? btn.activeColor : btn.inactiveColor}
                      ${!isActive ? 'border' : 'border-transparent'}
                    `}
                  >
                    <btn.icon size={16} className={isActive ? 'animate-pulse' : 'text-slate-400'} />
                    {btn.label}
                  </button>
                );
              })}
            </div>

            <div className="hidden md:block h-8 w-px bg-slate-100"></div>

            {/* Logout Button (Separate) */}
            <button 
              onClick={() => handleStatusChange('OFF_WORK')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap ml-auto md:ml-0"
            >
              <LogOut size={16} />
              <span className="hidden md:inline">퇴근</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Clock (Visible only on small screens) */}
      <div className="md:hidden bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 text-center">
        <div className="text-xs text-slate-500 mb-1">{formatDateDetail(currentTime)}</div>
        <div className="text-3xl font-bold text-slate-800 font-mono tabular-nums">
          {formatTimeDetail(currentTime)}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Team Status */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Status Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '전체 인원', count: 12, color: 'text-slate-900' },
              { label: '업무중', count: users.filter(u => u.status === 'WORKING').length, color: 'text-green-600' },
              { label: '미팅/외근', count: users.filter(u => ['MEETING', 'OUTSIDE'].includes(u.status)).length, color: 'text-blue-600' },
              { label: '부재/휴가', count: users.filter(u => ['OFF_WORK', 'LEAVE'].includes(u.status)).length, color: 'text-gray-400' },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
                <div className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.count}</div>
              </div>
            ))}
          </div>

          {/* Employee List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">팀 현황</h2>
              <span className="text-xs text-slate-400">실시간 업데이트됨</span>
            </div>
            
            <div className="divide-y divide-slate-50">
              {users.map(user => {
                const meetingInfo = user.currentMeetingId 
                  ? MOCK_RESERVATIONS.find(m => m.id === user.currentMeetingId) 
                  : null;

                return (
                  <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 
                        ${user.status === 'WORKING' ? 'border-green-500 bg-white text-green-700' : 
                          user.status === 'OFF_WORK' ? 'border-transparent bg-slate-100 text-slate-400' :
                          'border-transparent bg-slate-100 text-slate-600'}`}>
                        {user.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${user.status === 'OFF_WORK' ? 'text-slate-400' : 'text-slate-900'}`}>
                            {user.name}
                          </span>
                          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{user.role}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          {user.department} 
                          <span className="text-slate-300">•</span> 
                          {formatTimeSimple(user.lastUpdated)} 업데이트
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <StatusBadge status={user.status} />
                      
                      {/* Contextual Info Display */}
                      {user.status === 'MEETING' && meetingInfo && (
                        <div className="text-xs text-slate-500 mt-1 flex items-center justify-end gap-1">
                          <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse"></span>
                          {meetingInfo.title} ({MOCK_ROOMS.find(r => r.id === meetingInfo.roomId)?.name})
                        </div>
                      )}
                      
                      {user.status === 'OUTSIDE' && user.statusMessage && (
                        <div className="text-xs text-slate-500 mt-1">
                          📍 {user.statusMessage}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Meeting Rooms & Quick Info */}
        <div className="space-y-6">
          
          {/* Meeting Rooms Status */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CalendarCheck size={18} />회의실 현황
            </h3>
            
            <div className="space-y-4">
              {MOCK_ROOMS.map(room => {
                const currentMeeting = MOCK_RESERVATIONS.find(m => 
                  m.roomId === room.id && 
                  NOW >= m.startTime && 
                  NOW <= m.endTime
                );

                return (
                  <div key={room.id} className={`p-3 rounded-lg border ${currentMeeting ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm text-slate-700">{room.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${currentMeeting ? 'bg-red-200 text-red-700' : 'bg-green-200 text-green-700'}`}>
                        {currentMeeting ? '사용중' : '비어있음'}
                      </span>
                    </div>
                    {currentMeeting ? (
                      <div className="text-xs text-slate-600">
                        <div className="font-medium truncate">{currentMeeting.title}</div>
                        <div className="text-slate-500 mt-1">
                          {formatTimeSimple(currentMeeting.startTime)} ~ {formatTimeSimple(currentMeeting.endTime)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">
                        현재 예약된 회의가 없습니다.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <button className="w-full mt-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
              + 회의실 예약하기
            </button>
          </div>

          {/* Quick Stats or Notices could go here */}
          <div className="bg-slate-900 rounded-xl p-5 text-white">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-800 rounded-lg">
                <AlertCircle size={20} className="text-yellow-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm">자동 퇴근 알림</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  퇴근 버튼을 누르지 않으면 새벽 4시에 자동으로 퇴근 처리됩니다. (야근 수당 미포함)
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Logout Confirmation Modal (New) */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut size={32} />
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">퇴근 하시겠습니까?</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                오늘 하루도 수고하셨습니다!<br/>
                정말 퇴근 처리할까요?
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  취소
                </button>
                <button 
                  onClick={confirmLogout}
                  className="flex-1 py-3 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  네, 퇴근합니다
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Selection Modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-lg">어떤 미팅에 참석하시나요?</h3>
              <p className="text-sm text-slate-500">예약된 회의를 선택하거나 직접 입력하세요.</p>
            </div>
            
            <div className="p-5 space-y-4">
              {/* Active Meetings List */}
              {activeMeetings.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">진행 중인 회의</label>
                  <div className="space-y-2">
                    {activeMeetings.map(m => (
                      <button
                        key={m.id}
                        onClick={() => updateUserStatus('MEETING', m.id)}
                        className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                      >
                        <div className="font-bold text-slate-800 group-hover:text-blue-700">{m.title}</div>
                        <div className="text-xs text-slate-500 mt-1 flex justify-between">
                          <span>{MOCK_ROOMS.find(r => r.id === m.roomId)?.name}</span>
                          <span>{formatTimeSimple(m.startTime)} - {formatTimeSimple(m.endTime)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual Input */}
              <div>
                <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">기타 / 외부 미팅</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="예: 클라이언트 미팅 (성수동)" 
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                  />
                  <button 
                    onClick={() => updateUserStatus('MEETING', undefined, statusNote)}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800"
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
              <button onClick={() => setShowMeetingModal(false)} className="text-sm text-slate-500 hover:text-slate-800">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AttendanceSystem;