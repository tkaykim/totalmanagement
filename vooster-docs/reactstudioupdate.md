import React, { useState, useMemo } from 'react';
import { 
  Layout, Calendar, List, CheckSquare, Youtube, FileText, Video, 
  Clock, Users, Bell, Search, Plus, MoreHorizontal, X,
  ChevronLeft, ChevronRight, Upload, Film, Edit3, MonitorPlay,
  Briefcase, Building2, UserCheck, User, Settings, AlertCircle, CheckCircle2, Trash2
} from 'lucide-react';

// --- Utils ---
const calculateDatesFromRelease = (releaseDate) => {
  const date = new Date(releaseDate);
  const formatDate = (d) => d.toISOString().split('T')[0];
  const addDays = (d, days) => {
    const newDate = new Date(d);
    newDate.setDate(d.getDate() + days);
    return newDate;
  };

  return {
    releaseDate, // D-Day
    editFinalDate: formatDate(addDays(date, -1)), // D-1
    edit1Date: formatDate(addDays(date, -3)),     // D-3
    shootDate: formatDate(addDays(date, -7)),     // D-7
    scriptDate: formatDate(addDays(date, -9)),    // D-9
    planDate: formatDate(addDays(date, -11)),     // D-11
  };
};

// --- Constants & Templates ---

const DEFAULT_TASKS_BY_STEP = {
  plan: [
    { title: '아이템/주제 선정', priority: 'High', description: '트렌드 분석 및 주제 확정' },
    { title: '기획안 작성', priority: 'Medium', description: '구성안 및 소구 포인트 정리' }
  ],
  script: [
    { title: '대본 초안 작성', priority: 'High', description: '오프닝/클로징 멘트 포함' },
    { title: '대본 피드백 및 수정', priority: 'Medium', description: '팀 내 피드백 반영' }
  ],
  shoot: [
    { title: '촬영 장소/스튜디오 섭외', priority: 'High', description: '' },
    { title: '장비 체크 (카메라/조명/오디오)', priority: 'High', description: '배터리 및 메모리 확인' },
    { title: '출연진 스케줄 확인', priority: 'Medium', description: '' }
  ],
  edit: [
    { title: '컷 편집 (1차)', priority: 'High', description: 'NG컷 삭제 및 순서 배열' },
    { title: '자막 및 효과 작업', priority: 'Medium', description: '' },
    { title: '썸네일 제작', priority: 'High', description: '클릭률 높은 이미지 제작' },
    { title: '최종 렌더링 및 검수', priority: 'High', description: '오디오 레벨 및 오타 확인' }
  ]
};

// --- Mock Data ---

const CHANNELS = [
  { id: 'all', name: '전체 보기', type: 'system', color: 'bg-gray-500' },
  { id: 'external', name: '단건/외주 프로젝트', type: 'system', color: 'bg-indigo-600' },
  { id: 'ch1', name: 'React Studio Main', type: 'channel', color: 'bg-red-600' },
  { id: 'ch2', name: 'React Vlog', type: 'channel', color: 'bg-blue-500' },
  { id: 'ch3', name: 'Tech Shorts', type: 'channel', color: 'bg-purple-600' },
];

const PARTNERS = [
  { id: 'p1', name: '김편집', type: 'individual', affiliation: 'Freelancer', role: '편집/모션', status: 'active', tags: ['Premiere', 'AfterEffects'] },
  { id: 'p2', name: '스튜디오 A', type: 'team', affiliation: 'Studio A', role: '촬영/조명', status: 'busy', tags: ['CinemaCam', 'Studio'] },
  { id: 'p3', name: '이작가', type: 'individual', affiliation: 'Team Contents', role: '기획/대본', status: 'active', tags: ['Tech', 'Review'] },
  { id: 'p4', name: '박PD', type: 'individual', affiliation: 'React Studio', role: '총괄', status: 'active', tags: ['Director'] },
  { id: 'p5', name: '사운드웍스', type: 'company', affiliation: 'Sound Works Corp', role: '음향/믹싱', status: 'active', tags: ['Mastering'] },
];

const INITIAL_PROJECTS = [
  {
    id: 1,
    type: 'channel', 
    channelId: 'ch1',
    clientName: null,
    title: '여름 휴가 브이로그 특집',
    status: '편집중',
    activeSteps: ['plan', 'script', 'shoot', 'edit'], 
    ...calculateDatesFromRelease('2024-05-30'), 
    assignees: ['p1', 'p4'],
    assets: {
      script: { status: 'completed', version: 'v2.5', link: '#' },
      thumbnail: { status: 'pending', version: '', link: '#' },
      video: { status: 'in-progress', version: 'v0.8', link: '#' },
    },
    tasks: [
        { id: 't1', step: 'plan', title: '아이템 선정', description: '', assignee: 'p4', dueDate: '2024-05-20', priority: 'High', completed: true },
        { id: 't2', step: 'edit', title: '컷 편집', description: '', assignee: 'p1', dueDate: '2024-05-28', priority: 'High', completed: false }
    ]
  },
  {
    id: 2,
    type: 'channel',
    channelId: 'ch2',
    clientName: null,
    title: '신입 사원 OOTD',
    status: '촬영예정',
    activeSteps: ['shoot', 'edit'],
    ...calculateDatesFromRelease('2024-06-05'),
    assignees: ['p4'],
    assets: {
      script: { status: 'none', version: '', link: '#' },
      thumbnail: { status: 'pending', version: '', link: '#' },
      video: { status: 'pending', version: '', link: '#' },
    },
    tasks: []
  },
  {
    id: 101, 
    type: 'external',
    channelId: null,
    clientName: '(주)한국관광공사',
    title: '부산 여행 홍보 바이럴 영상',
    status: '기획단계',
    activeSteps: ['plan', 'script', 'shoot', 'edit'],
    ...calculateDatesFromRelease('2024-06-20'),
    assignees: ['p3', 'p2'],
    assets: {
      script: { status: 'in-progress', version: 'draft', link: '#' },
      thumbnail: { status: 'pending', version: '', link: '#' },
      video: { status: 'pending', version: '', link: '#' },
    },
    tasks: []
  },
  {
    id: 4,
    type: 'channel',
    channelId: 'ch3',
    clientName: null,
    title: '개발자 공감 쇼츠 5편',
    status: '업로드완료',
    activeSteps: ['plan', 'edit'], 
    ...calculateDatesFromRelease('2024-05-15'),
    assignees: ['p1'],
    assets: {
      script: { status: 'completed', version: 'final', link: '#' },
      thumbnail: { status: 'completed', version: 'final', link: '#' },
      video: { status: 'completed', version: 'final', link: '#' },
    },
    tasks: []
  },
];

const STATUS_STEPS = ['기획단계', '대본작업', '촬영예정', '촬영완료', '편집중', '승인대기', '업로드완료'];

// --- Components ---

const StatusBadge = ({ status }) => {
  const colors = {
    '기획단계': 'bg-gray-100 text-gray-800 border-gray-200',
    '대본작업': 'bg-blue-50 text-blue-700 border-blue-200',
    '촬영예정': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    '촬영완료': 'bg-green-50 text-green-700 border-green-200',
    '편집중': 'bg-purple-50 text-purple-700 border-purple-200',
    '승인대기': 'bg-orange-50 text-orange-700 border-orange-200',
    '업로드완료': 'bg-slate-800 text-white border-slate-700',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colors[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  );
};

const AssigneeBadge = ({ assigneeId }) => {
  const partner = PARTNERS.find(p => p.id === assigneeId);
  if (!partner) return null;
  
  return (
    <div className="flex items-center gap-1.5 bg-white border px-2 py-1 rounded-full text-xs text-gray-700 shadow-sm" title={partner.role}>
       {partner.type === 'company' && <Building2 size={10} className="text-gray-400" />}
       {partner.type === 'team' && <Users size={10} className="text-blue-400" />}
       {partner.type === 'individual' && <User size={10} className="text-green-400" />}
       <span className="font-medium">{partner.name}</span>
    </div>
  );
};

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-800">상세 정보</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function YoutubeERP() {
  const [activeTab, setActiveTab] = useState('board');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [selectedProject, setSelectedProject] = useState(null);

  const filteredProjects = useMemo(() => {
    if (selectedChannel === 'all') return projects;
    if (selectedChannel === 'external') return projects.filter(p => p.type === 'external');
    return projects.filter(p => p.channelId === selectedChannel);
  }, [projects, selectedChannel]);

  const stats = useMemo(() => {
    return {
      total: filteredProjects.length,
      external: filteredProjects.filter(p => p.type === 'external').length,
      upcomingShoot: filteredProjects.filter(p => p.status === '촬영예정').length,
      editing: filteredProjects.filter(p => p.status === '편집중').length,
    };
  }, [filteredProjects]);

  const handleStatusChange = (projectId, newStatus) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
  };

  const handleDateChange = (type, value) => {
    if (!selectedProject) return;
    if (type === 'releaseDate') {
        const newDates = calculateDatesFromRelease(value);
        setSelectedProject(prev => ({ ...prev, ...newDates }));
    } else {
        setSelectedProject(prev => ({ ...prev, [type]: value }));
    }
  };

  // --- Task Management Logic ---

  const toggleStep = (step) => {
    if (!selectedProject) return;
    const currentSteps = selectedProject.activeSteps || [];
    let newSteps;
    let newTasks = [...(selectedProject.tasks || [])];

    if (currentSteps.includes(step)) {
        // Step Disabled
        newSteps = currentSteps.filter(s => s !== step);
    } else {
        // Step Enabled
        newSteps = [...currentSteps, step];
        
        // Prevent duplication: Only add default tasks if no tasks exist for this step
        // 이 부분을 수정하여 중복 생성을 막습니다.
        const hasExistingTasks = newTasks.some(t => t.step === step);
        
        if (!hasExistingTasks) {
            const templates = DEFAULT_TASKS_BY_STEP[step] || [];
            const tasksToAdd = templates.map((tmpl, idx) => ({
                id: `new-${step}-${Date.now()}-${idx}`,
                step: step,
                title: tmpl.title,
                description: tmpl.description,
                priority: tmpl.priority,
                assignee: '',
                dueDate: '', 
                completed: false
            }));
            newTasks = [...newTasks, ...tasksToAdd];
        }
    }
    
    setSelectedProject(prev => ({ ...prev, activeSteps: newSteps, tasks: newTasks }));
  };

  const handleTaskChange = (taskId, field, value) => {
    setSelectedProject(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t)
    }));
  };

  const handleDeleteTask = (taskId) => {
      setSelectedProject(prev => ({
          ...prev,
          tasks: prev.tasks.filter(t => t.id !== taskId)
      }));
  };

  const handleAddTask = () => {
      const newTask = {
          id: `manual-${Date.now()}`,
          step: 'manual',
          title: '새로운 할 일',
          description: '',
          priority: 'Medium',
          assignee: '',
          dueDate: '',
          completed: false
      };
      setSelectedProject(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
  };


  const saveProjectChanges = () => {
     setProjects(prev => prev.map(p => p.id === selectedProject.id ? selectedProject : p));
     setSelectedProject(null);
  };

  const openProjectDetail = (project) => {
    const p = { 
        ...project, 
        activeSteps: project.activeSteps || ['plan', 'script', 'shoot', 'edit'],
        tasks: project.tasks || [] 
    };
    setSelectedProject(p);
  };

  // --- Views ---

  const PartnerView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
           <h3 className="font-bold text-gray-700 flex items-center gap-2">
             <Briefcase size={20} /> 인력 풀 (Partners & Freelancers)
           </h3>
           <button className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded hover:bg-slate-700 flex items-center gap-2">
              <Plus size={14}/> 파트너 등록
           </button>
        </div>
        <table className="w-full text-sm text-left">
            <thead className="bg-white text-gray-500 font-medium border-b">
                <tr>
                    <th className="p-4">이름/팀명</th>
                    <th className="p-4">구분</th>
                    <th className="p-4">소속</th>
                    <th className="p-4">주요 역할</th>
                    <th className="p-4">보유 기술/태그</th>
                    <th className="p-4">상태</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {PARTNERS.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                        <td className="p-4 font-bold text-gray-800">{p.name}</td>
                        <td className="p-4">
                           {p.type === 'individual' && <span className="flex items-center gap-1 text-gray-600"><User size={14}/> 개인</span>}
                           {p.type === 'team' && <span className="flex items-center gap-1 text-blue-600"><Users size={14}/> 팀</span>}
                           {p.type === 'company' && <span className="flex items-center gap-1 text-purple-600"><Building2 size={14}/> 기업</span>}
                        </td>
                        <td className="p-4 text-gray-500">{p.affiliation || '-'}</td>
                        <td className="p-4">{p.role}</td>
                        <td className="p-4">
                            <div className="flex gap-1 flex-wrap">
                                {p.tags.map(t => <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded">{t}</span>)}
                            </div>
                        </td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {p.status === 'active' ? '투입가능' : '참여중'}
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );

  const KanbanBoard = () => {
    const columns = [
      { id: '기획', title: '기획 & 대본', statuses: ['기획단계', '대본작업'] },
      { id: '촬영', title: '촬영 일정', statuses: ['촬영예정', '촬영완료'] },
      { id: '후반', title: '편집 & 승인', statuses: ['편집중', '승인대기'] },
      { id: '완료', title: '업로드 완료', statuses: ['업로드완료'] },
    ];

    return (
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {columns.map(col => (
          <div key={col.id} className="min-w-[320px] flex-1 bg-gray-50 rounded-xl p-3 h-fit max-h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                {col.id === '기획' && <FileText size={18} />}
                {col.id === '촬영' && <Film size={18} />}
                {col.id === '후반' && <Edit3 size={18} />}
                {col.id === '완료' && <Upload size={18} />}
                {col.title}
              </h3>
              <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full text-gray-600">
                {filteredProjects.filter(p => col.statuses.includes(p.status)).length}
              </span>
            </div>
            
            <div className="space-y-3">
              {filteredProjects
                .filter(p => col.statuses.includes(p.status))
                .map(project => (
                  <div 
                    key={project.id} 
                    onClick={() => openProjectDetail(project)}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      {project.type === 'external' ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium text-white bg-indigo-600 flex items-center gap-1">
                             <Briefcase size={8} /> 외주
                        </span>
                      ) : (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium text-white ${CHANNELS.find(c => c.id === project.channelId)?.color}`}>
                            {CHANNELS.find(c => c.id === project.channelId)?.name}
                        </span>
                      )}
                      
                      <MoreHorizontal className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                    </div>
                    
                    <h4 className="font-semibold text-gray-800 mb-1 line-clamp-2">{project.title}</h4>
                    {project.clientName && (
                        <p className="text-xs text-indigo-600 mb-2 font-medium">Client: {project.clientName}</p>
                    )}
                    
                    <div className="space-y-1 mb-3 mt-2">
                      {col.id === '촬영' && (project.activeSteps?.includes('shoot') !== false) && (
                         <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                           <Video size={12} />
                           <span>촬영: {project.shootDate}</span>
                         </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock size={12} />
                        <span>{project.type === 'external' ? '납품' : '업로드'}: {project.releaseDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
                      <div className="flex -space-x-1 overflow-hidden max-w-[50%]">
                        {project.assignees.map((id, i) => {
                            const partner = PARTNERS.find(p => p.id === id);
                            return partner ? (
                                <div key={i} className="w-6 h-6 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0" title={partner.name}>
                                    {partner.name[0]}
                                </div>
                            ) : null;
                        })}
                      </div>
                      <StatusBadge status={project.status} />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const CalendarView = () => {
    const days = Array.from({ length: 35 }, (_, i) => {
        const day = i - 2; 
        return day > 0 && day <= 30 ? day : null;
    });

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-bold text-lg">2024년 6월</h3>
            <div className="flex gap-2">
                <button className="p-1 hover:bg-gray-100 rounded"><ChevronLeft size={20}/></button>
                <button className="p-1 hover:bg-gray-100 rounded"><ChevronRight size={20}/></button>
            </div>
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200 flex-1">
            {['일','월','화','수','목','금','토'].map(d => (
                <div key={d} className="bg-gray-50 p-2 text-center text-sm font-bold text-gray-500">{d}</div>
            ))}
            {days.map((day, idx) => (
                <div key={idx} className={`bg-white p-2 min-h-[100px] ${day ? '' : 'bg-gray-50'}`}>
                    {day && (
                        <>
                            <span className="text-sm font-medium text-gray-700">{day}</span>
                            <div className="mt-1 space-y-1">
                                {filteredProjects.map(p => {
                                    const d = parseInt(p.releaseDate.split('-')[2]);
                                    const s = parseInt(p.shootDate.split('-')[2]);
                                    const isExternal = p.type === 'external';
                                    const hasShoot = p.activeSteps?.includes('shoot') !== false;
                                    
                                    if (d === day) return (
                                        <div key={`rel-${p.id}`} className={`text-[10px] px-1 py-0.5 rounded truncate cursor-pointer ${isExternal ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`} onClick={() => openProjectDetail(p)}>
                                            {isExternal ? '📦' : '🚀'} {p.title}
                                        </div>
                                    );
                                    if (hasShoot && s === day) return (
                                        <div key={`sht-${p.id}`} className="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-700 truncate cursor-pointer" onClick={() => openProjectDetail(p)}>
                                            🎥 {p.title}
                                        </div>
                                    );
                                    return null;
                                })}
                            </div>
                        </>
                    )}
                </div>
            ))}
        </div>
      </div>
    );
  };

  const ListView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                <tr>
                    <th className="p-4">유형</th>
                    <th className="p-4">제목/클라이언트</th>
                    <th className="p-4">상태</th>
                    <th className="p-4">촬영일</th>
                    <th className="p-4">업로드/납품일</th>
                    <th className="p-4">투입 인력</th>
                    <th className="p-4">자산체크</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {filteredProjects.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openProjectDetail(p)}>
                        <td className="p-4">
                            {p.type === 'external' ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium text-white bg-indigo-600">외주</span>
                            ) : (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium text-white ${CHANNELS.find(c => c.id === p.channelId)?.color}`}>
                                    {CHANNELS.find(c => c.id === p.channelId)?.name}
                                </span>
                            )}
                        </td>
                        <td className="p-4">
                            <div className="font-medium text-gray-800">{p.title}</div>
                            {p.clientName && <div className="text-xs text-indigo-500">{p.clientName}</div>}
                        </td>
                        <td className="p-4"><StatusBadge status={p.status} /></td>
                        <td className="p-4 text-gray-500">
                            {p.activeSteps?.includes('shoot') ? p.shootDate : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="p-4 text-gray-500">{p.releaseDate}</td>
                        <td className="p-4">
                             <div className="flex gap-1 flex-wrap">
                                {p.assignees.map(id => {
                                    const partner = PARTNERS.find(pt => pt.id === id);
                                    return partner ? <span key={id} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{partner.name}</span> : null;
                                })}
                             </div>
                        </td>
                        <td className="p-4">
                            <div className="flex gap-2">
                                {p.activeSteps?.includes('script') && (
                                    <span title="대본" className={p.assets.script.status === 'completed' ? 'text-green-500' : 'text-gray-300'}><FileText size={16}/></span>
                                )}
                                {p.activeSteps?.includes('edit') && (
                                    <span title="영상" className={p.assets.video.status === 'completed' ? 'text-green-500' : 'text-gray-300'}><MonitorPlay size={16}/></span>
                                )}
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
        <div className="p-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Youtube className="text-red-500" />
            React Studio
          </h1>
          <p className="text-xs text-slate-400 mt-1">Channel ERP System</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <div className="text-xs font-semibold text-slate-500 px-3 py-2 uppercase tracking-wider">Dashboard</div>
          <button 
            onClick={() => setActiveTab('board')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'board' ? 'bg-red-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <Layout size={18} /> 프로젝트 보드
          </button>
          <button 
            onClick={() => setActiveTab('calendar')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'calendar' ? 'bg-red-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <Calendar size={18} /> 캘린더 (일정)
          </button>
          <button 
            onClick={() => setActiveTab('list')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'list' ? 'bg-red-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <List size={18} /> 전체 리스트
          </button>
           <button 
            onClick={() => setActiveTab('partners')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'partners' ? 'bg-red-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <UserCheck size={18} /> 인력/파트너 관리
          </button>

          <div className="mt-8 text-xs font-semibold text-slate-500 px-3 py-2 uppercase tracking-wider">Project Type</div>
          {CHANNELS.map(ch => (
             <button
                key={ch.id}
                onClick={() => {
                    setSelectedChannel(ch.id);
                    if(activeTab === 'partners') setActiveTab('board');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${selectedChannel === ch.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
             >
                <div className={`w-2 h-2 rounded-full ${ch.color}`} />
                {ch.name}
             </button>
          ))}
        </nav>

        {/* ... (Admin section omitted for brevity) ... */}
         <div className="p-4 border-t border-slate-800">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                 <Users size={16} />
              </div>
              <div className="text-sm">
                 <div className="font-medium">Admin</div>
                 <div className="text-xs text-slate-500">Master Account</div>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
           <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-gray-800">
                {activeTab === 'board' && '프로젝트 진행 현황'}
                {activeTab === 'calendar' && '월간 촬영 및 업로드 일정'}
                {activeTab === 'list' && '전체 프로젝트 리스트'}
                {activeTab === 'partners' && '외부 인력 및 파트너 관리'}
              </h2>
              {activeTab !== 'partners' && (
                  <span className={`px-3 py-1 rounded-full text-xs text-white ${CHANNELS.find(c => c.id === selectedChannel)?.color}`}>
                     {CHANNELS.find(c => c.id === selectedChannel)?.name}
                  </span>
              )}
           </div>

           <div className="flex items-center gap-3">
             <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="검색..." 
                  className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 w-64"
                />
             </div>
             {/* ... Buttons ... */}
             <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                <Plus size={16} /> 새 프로젝트
             </button>
           </div>
        </header>

        {/* Status Summary Bar (Hide in Partners view) */}
        {activeTab !== 'partners' && (
            <div className="px-6 py-4 grid grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-500 mb-1">총 프로젝트</p>
                    <p className="text-xl font-bold text-gray-800">{stats.total}건</p>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Layout size={20}/></div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-500 mb-1">외주/납품 건</p>
                    <p className="text-xl font-bold text-indigo-600">{stats.external}건</p>
                </div>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Briefcase size={20}/></div>
            </div>
            {/* ... Other stats ... */}
             <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-500 mb-1">편집중</p>
                    <p className="text-xl font-bold text-purple-600">{stats.editing}건</p>
                </div>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Edit3 size={20}/></div>
            </div>
            </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2">
           {activeTab === 'board' && <KanbanBoard />}
           {activeTab === 'calendar' && <CalendarView />}
           {activeTab === 'list' && <ListView />}
           {activeTab === 'partners' && <PartnerView />}
        </div>
      </main>

      {/* Project Detail Modal */}
      {selectedProject && (
        <Modal isOpen={!!selectedProject} onClose={() => setSelectedProject(null)}>
           <div className="space-y-6">
              {/* Header Info */}
              <div>
                 <div className="flex items-center gap-2 mb-2">
                    {selectedProject.type === 'external' ? (
                         <span className="text-xs px-2 py-0.5 rounded font-bold text-white bg-indigo-600">외주 프로젝트</span>
                    ) : (
                        <span className={`text-xs px-2 py-0.5 rounded font-bold text-white ${CHANNELS.find(c => c.id === selectedProject.channelId)?.color}`}>
                            {CHANNELS.find(c => c.id === selectedProject.channelId)?.name}
                        </span>
                    )}
                    <span className="text-sm text-gray-500">ID: #{selectedProject.id}</span>
                 </div>
                 
                 {selectedProject.type === 'external' && (
                     <div className="mb-2">
                        <label className="text-[10px] uppercase text-gray-500 font-bold">Client</label>
                        <input type="text" value={selectedProject.clientName} readOnly className="w-full text-indigo-700 font-bold border-none p-0 focus:ring-0 text-lg" />
                     </div>
                 )}

                 <input 
                    type="text" 
                    value={selectedProject.title} 
                    readOnly
                    className="text-2xl font-bold text-gray-900 w-full border-none p-0 focus:ring-0"
                    placeholder="프로젝트명"
                 />
              </div>

              {/* Status & Dates */}
              <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
                 <div>
                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">현재 상태</label>
                    <select 
                       className="w-full bg-white border border-gray-300 text-sm rounded-lg p-2.5"
                       value={selectedProject.status}
                       onChange={(e) => handleStatusChange(selectedProject.id, e.target.value)}
                    >
                       {STATUS_STEPS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">투입 인력 (Partners)</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                       {selectedProject.assignees.map(aId => (
                          <AssigneeBadge key={aId} assigneeId={aId} />
                       ))}
                    </div>
                    <button className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        <Plus size={12}/> 인력 추가
                    </button>
                 </div>
              </div>

              {/* Step Configuration */}
              <div>
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                     <Settings size={18} /> 진행 단계 설정 (Step Config)
                  </h3>
                  <div className="flex gap-2 bg-gray-100 p-2 rounded-lg">
                      {[
                        { id: 'plan', label: '기획' }, 
                        { id: 'script', label: '대본' }, 
                        { id: 'shoot', label: '촬영' }, 
                        { id: 'edit', label: '편집' }
                      ].map(step => {
                        const isActive = selectedProject.activeSteps?.includes(step.id);
                        return (
                            <button 
                                key={step.id}
                                onClick={() => toggleStep(step.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-colors ${
                                    isActive 
                                    ? 'bg-white text-gray-800 shadow-sm border border-gray-200' 
                                    : 'text-gray-400 hover:bg-gray-200'
                                }`}
                            >
                                {isActive ? <CheckSquare size={16} className="text-blue-600"/> : <X size={16}/>}
                                {step.label}
                            </button>
                        );
                      })}
                  </div>
              </div>

              {/* Tasks Section */}
              <div className="space-y-3">
                  <div className="flex items-center justify-between">
                     <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <CheckSquare size={18} /> 할 일 및 업무 분장 (Tasks)
                     </h3>
                     <button onClick={handleAddTask} className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded hover:bg-gray-700 flex items-center gap-1">
                        <Plus size={12}/> 할일 추가
                     </button>
                  </div>
                  
                  <div className="bg-white border rounded-xl overflow-hidden">
                      {selectedProject.tasks && selectedProject.tasks.length > 0 ? (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium">
                                <tr>
                                    <th className="p-3 w-10"></th>
                                    <th className="p-3">업무명 / 내용</th>
                                    <th className="p-3 w-32">담당자</th>
                                    <th className="p-3 w-32">마감일</th>
                                    <th className="p-3 w-24">중요도</th>
                                    <th className="p-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {selectedProject.tasks.map(task => (
                                    <tr key={task.id} className="hover:bg-gray-50">
                                        <td className="p-3 text-center">
                                            <button 
                                                onClick={() => handleTaskChange(task.id, 'completed', !task.completed)}
                                                className={`rounded-full w-5 h-5 flex items-center justify-center border transition-colors ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-500'}`}
                                            >
                                                {task.completed && <CheckSquare size={12}/>}
                                            </button>
                                        </td>
                                        <td className="p-3">
                                            <input 
                                                type="text" 
                                                value={task.title}
                                                onChange={(e) => handleTaskChange(task.id, 'title', e.target.value)}
                                                className={`w-full bg-transparent border-none p-0 focus:ring-0 font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}
                                                placeholder="업무명을 입력하세요"
                                            />
                                            <input 
                                                type="text" 
                                                value={task.description}
                                                onChange={(e) => handleTaskChange(task.id, 'description', e.target.value)}
                                                className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs text-gray-500 mt-0.5"
                                                placeholder="상세 내용을 입력하세요"
                                            />
                                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                                                {task.step === 'plan' ? '기획' : task.step === 'script' ? '대본' : task.step === 'shoot' ? '촬영' : task.step === 'edit' ? '편집' : '기타'}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <select 
                                                value={task.assignee}
                                                onChange={(e) => handleTaskChange(task.id, 'assignee', e.target.value)}
                                                className="w-full text-xs border-gray-200 rounded p-1.5 bg-gray-50 focus:border-blue-500"
                                            >
                                                <option value="">담당자 선택</option>
                                                {PARTNERS.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-3">
                                            <input 
                                                type="date"
                                                value={task.dueDate}
                                                onChange={(e) => handleTaskChange(task.id, 'dueDate', e.target.value)}
                                                className="w-full text-xs border-gray-200 rounded p-1.5 bg-gray-50 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <select 
                                                value={task.priority}
                                                onChange={(e) => handleTaskChange(task.id, 'priority', e.target.value)}
                                                className={`w-full text-xs border-none rounded p-1.5 font-medium ${
                                                    task.priority === 'High' ? 'bg-red-50 text-red-600' :
                                                    task.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-100 text-gray-600'
                                                }`}
                                            >
                                                <option value="High">높음 (High)</option>
                                                <option value="Medium">중간 (Med)</option>
                                                <option value="Low">낮음 (Low)</option>
                                            </select>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => handleDeleteTask(task.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                                <Trash2 size={16}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                      ) : (
                          <div className="p-8 text-center text-gray-400 text-sm bg-gray-50">
                              등록된 할일이 없습니다. <br/>진행 단계를 켜거나 '할일 추가' 버튼을 눌러보세요.
                          </div>
                      )}
                  </div>
              </div>

              {/* Timeline Grid */}
              <div className="space-y-3">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Calendar size={18} /> 주요 일정 관리
                 </h3>
                 <div className="bg-white border rounded-xl p-4 shadow-sm">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                        {/* Left Column: Pre-production */}
                        <div className="space-y-4">
                            {selectedProject.activeSteps?.includes('plan') && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1">기획 확정 (D-11)</label>
                                    <input 
                                        type="date" 
                                        value={selectedProject.planDate} 
                                        onChange={(e) => handleDateChange('planDate', e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                                    />
                                </div>
                            )}
                            {selectedProject.activeSteps?.includes('script') && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1">대본 확정 (D-9)</label>
                                    <input 
                                        type="date" 
                                        value={selectedProject.scriptDate} 
                                        onChange={(e) => handleDateChange('scriptDate', e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                                    />
                                </div>
                            )}
                            {selectedProject.activeSteps?.includes('shoot') && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1">촬영 확정 (D-7)</label>
                                    <input 
                                        type="date" 
                                        value={selectedProject.shootDate} 
                                        onChange={(e) => handleDateChange('shootDate', e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Right Column: Post-production & Release */}
                        <div className="space-y-4">
                             {selectedProject.activeSteps?.includes('edit') && (
                                <>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 block mb-1">1차 편집 확정 (D-3)</label>
                                        <input 
                                            type="date" 
                                            value={selectedProject.edit1Date || ''} 
                                            onChange={(e) => handleDateChange('edit1Date', e.target.value)}
                                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 block mb-1">최종 편집 확정 (D-1)</label>
                                        <input 
                                            type="date" 
                                            value={selectedProject.editFinalDate || ''} 
                                            onChange={(e) => handleDateChange('editFinalDate', e.target.value)}
                                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                                        />
                                    </div>
                                </>
                             )}
                            <div className="bg-red-50 p-2 rounded-lg -mx-2">
                                <label className="text-xs font-bold text-red-600 block mb-1">
                                    {selectedProject.type === 'external' ? '최종 납품 예정일' : '업로드 예정일'} (기준일)
                                </label>
                                <input 
                                    type="date" 
                                    value={selectedProject.releaseDate} 
                                    onChange={(e) => handleDateChange('releaseDate', e.target.value)}
                                    className="w-full text-sm border-red-300 rounded-lg focus:ring-red-500 focus:border-red-500 font-bold text-red-700"
                                />
                                <p className="text-[10px] text-red-500 mt-1">* 날짜 변경 시 D-Day 역산하여 전체 일정 자동 조정</p>
                            </div>
                        </div>
                    </div>
                 </div>
              </div>

              {/* Asset Management */}
              <div className="space-y-3">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <FileText size={18} /> 제작 자산 관리
                 </h3>
                 <div className="border rounded-xl divide-y">
                    {selectedProject.activeSteps?.includes('script') && (
                        <div className="p-3 flex items-center justify-between hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${selectedProject.assets.script.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    <FileText size={20}/>
                                </div>
                                <div>
                                    <p className="font-medium text-sm">대본 (Script)</p>
                                    <p className="text-xs text-gray-500">
                                        {selectedProject.assets.script.version || '미등록'} 
                                        {selectedProject.assets.script.status === 'completed' && ' • 최종확인됨'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="text-xs bg-white border px-3 py-1.5 rounded hover:bg-gray-50">보기</button>
                                <button className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">업로드</button>
                            </div>
                        </div>
                    )}

                    {selectedProject.activeSteps?.includes('edit') && (
                        <div className="p-3 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${selectedProject.assets.video.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                <Video size={20}/>
                            </div>
                            <div>
                                <p className="font-medium text-sm">최종 편집본 (Master)</p>
                                <p className="text-xs text-gray-500">
                                    {selectedProject.assets.video.version || '편집중'}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="text-xs bg-white border px-3 py-1.5 rounded hover:bg-gray-50">링크</button>
                            <button className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">등록</button>
                        </div>
                        </div>
                    )}
                 </div>
              </div>

           </div>
           <div className="mt-6 pt-4 border-t flex justify-end gap-3">
              <button onClick={() => setSelectedProject(null)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">닫기</button>
              <button onClick={saveProjectChanges} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">변경사항 저장</button>
           </div>
        </Modal>
      )}
    </div>
  );
}