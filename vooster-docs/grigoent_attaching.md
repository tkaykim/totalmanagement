import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Calendar, 
  CreditCard, 
  Briefcase, 
  PieChart, 
  AlertCircle, 
  Plus, 
  Search, 
  Globe, 
  ShieldCheck, 
  ExternalLink,
  MoreVertical,
  LogOut,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckSquare,
  Building2,
  DollarSign,
  UserPlus,
  Filter,
  ArrowUpRight,
  LayoutDashboard,
  FileText,
  Zap,
  Trash2,
  CheckCircle2,
  Timer,
  Info,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  BookOpen,
  FileCheck,
  Download,
  Paperclip,
  PlayCircle,
  Folder,
  FolderOpen,
  Star,
  Lightbulb,
  ZapOff,
  Layout,
  MessageSquare,
  Siren,
  Camera,
  Menu
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';

// --- Firebase Configuration ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'grigo-management-v9';

// --- Constants & Data Models ---
const TEAM_MEMBERS = [
  { id: 'oh', name: '오동현', role: '총괄 핸들러', team: '운영' },
  { id: 'hong', name: '홍철화', role: '플로우메이커 대표', team: '기획' },
  { id: 'kang', name: '강준오', role: '공연기획 PD', team: '공연' },
  { id: 'kwon', name: '권혁준', role: '공연기획 PD', team: '공연' },
  { id: 'hwang', name: '황여경', role: '공연기획 PD', team: '공연' },
  { id: 'kim_d', name: '김대성', role: '콘텐츠 PD', team: '콘텐츠' },
  { id: 'shin', name: '신재민', role: '편집/인턴', team: '콘텐츠' },
  { id: 'kim_acc', name: '김민정', role: '회계 및 세무', team: '경영' }
];

const VISA_TYPES = ['N/A (내국인)', 'E-6 (예술흥행)', 'F-2 (거주)', 'F-4 (재외동포)'];
const PROJECT_STATUS = ['Planning', 'Ongoing', 'Completed', 'Paused'];
const PARTNER_CATEGORIES = ['Entertainment', 'Brand', 'Government', 'Agency', 'Vendor'];
// 매뉴얼 카테고리 구성
const MANUAL_CATEGORIES = ['All', '전사 공통/ERP', '아티스트 관리', '행정/비자', '현장/제작', '재무/정산'];

// --- Utility Components ---
const StatusBadge = ({ type, text }) => {
  const styles = {
    active: "bg-green-100 text-green-700",
    ongoing: "bg-blue-100 text-blue-700",
    planning: "bg-purple-100 text-purple-700",
    completed: "bg-gray-100 text-gray-500",
    paused: "bg-yellow-100 text-yellow-700",
    warning: "bg-orange-100 text-orange-700",
    danger: "bg-red-100 text-red-700",
    vip: "bg-amber-100 text-amber-700",
    default: "bg-gray-100 text-gray-700"
  };
  
  const key = type?.toLowerCase() || 'default';
  
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${styles[key] || styles.default}`}>
      {text}
    </span>
  );
};

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizeClasses = {
    md: 'max-w-lg',
    lg: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-white rounded-[2rem] w-full ${sizeClasses[size]} shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]`}>
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
          <h3 className="font-black text-lg text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={18} className="text-gray-500"/>
          </button>
        </div>
        <div className="p-0 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Main Application ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeManual, setActiveManual] = useState(null); 
  
  // Data States
  const [dancers, setDancers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [partners, setPartners] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [manuals, setManuals] = useState([]);

  // Auth & Sync
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const cols = ['dancers', 'projects', 'settlements', 'partners', 'tasks', 'manuals'];
    const unsubscribes = cols.map(c => {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', c));
      return onSnapshot(q, (snap) => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (c === 'tasks') data.sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
        if (c === 'dancers') setDataState(setDancers, data);
        if (c === 'projects') setDataState(setProjects, data);
        if (c === 'settlements') setDataState(setSettlements, data);
        if (c === 'partners') setDataState(setPartners, data);
        if (c === 'tasks') setTasks(data);
        if (c === 'manuals') setManuals(data);
      });
    });
    return () => unsubscribes.forEach(u => u());
  }, [user]);

  const setDataState = (setter, data) => setter(data);

  // --- Handlers ---
  const handleCreate = async (collectionName, data) => {
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', collectionName), {
        ...data,
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (collectionName, id) => {
    if(confirm('정말 삭제하시겠습니까?')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, id));
    }
  };

  const seedAllData = async () => {
    if (isSeeding) return;
    setIsSeeding(true);
    
    try {
      // Data seeding logic
      const dancerData = [
        { name: "무릎", nationality: "KOR", visa: "N/A (내국인)", contractStart: "2024-01-01", contractEnd: "2026-12-31", visaStart: "N/A", visaEnd: "9999-12-31", role: "댄스팀 한야", status: "Active" },
        { name: "유메키", nationality: "JPN", visa: "E-6 (예술흥행)", contractStart: "2024-10-01", contractEnd: "2026-09-30", visaStart: "2024-12-11", visaEnd: "2025-12-11", role: "전속 안무가", status: "Active" },
        { name: "에밀리", nationality: "USA", visa: "E-6 (예술흥행)", contractStart: "2024-11-01", contractEnd: "2026-10-31", visaStart: "2024-12-25", visaEnd: "2025-12-25", role: "전속 안무가", status: "Active" },
      ];
      const partnerData = [
        { name: "HYBE", category: "Entertainment", manager: "최민수 팀장", contact: "02-123-4567", email: "contact@hybe.co.kr", status: "VIP" },
        { name: "현대자동차", category: "Brand", manager: "박성훈 매니저", contact: "02-987-6543", email: "mkt@hyundai.com", status: "Active" },
        { name: "국민은행", category: "Brand", manager: "이영희 차장", contact: "02-2073-1111", email: "kb_mkt@kbfg.com", status: "Active" },
      ];
      const projectData = [
        { title: "2026 뉴진스 월드투어 안무", client: "HYBE", budget: 120000000, startDate: "2025-12-01", endDate: "2026-06-30", managerId: "oh", status: "Ongoing" },
      ];
      
      const manualData = [
        // 1. 전사 공통/ERP
        {
          title: "ERP 시스템 업무 배정 및 소통 규칙",
          category: "전사 공통/ERP",
          lastUpdated: "2025-06-01",
          authorId: "oh",
          content: [
            { type: "info", title: "툴 전환 안내", desc: "더 이상 FLOW, Slack, Notion을 사용하지 않습니다. 모든 업무 기록과 소통은 본 ERP에서 이루어집니다." },
            { type: "step", title: "1. 프로젝트 생성", desc: "새로운 건이 발생하면 '프로젝트 관리' 탭에 등록. (명명규칙: [연도] [클라이언트] [프로젝트명])" },
            { type: "step", title: "2. 업무(Task) 할당", desc: "'업무 및 할일' 탭에서 담당자(Assignee)와 마감일(Due Date)을 지정하여 생성. 담당자가 지정되지 않은 업무는 무효." },
            { type: "warning", title: "커뮤니케이션", desc: "구두로 지시한 사항도 반드시 ERP Task에 등록하여 히스토리를 남길 것. ERP에 없으면 안 해도 되는 일로 간주함." }
          ],
          files: ["Grigo_ERP_사용자가이드_v1.0.pdf"]
        },

        // 2. 아티스트 관리
        { 
          title: "[보안] 아티스트 케어 & 현장 호스피탈리티 SOP", 
          category: "아티스트 관리", 
          lastUpdated: "2025-05-28",
          authorId: "hong",
          content: [
            { type: "star", title: "유메키 (Yumeki)", desc: "작업 방식: 음악 분석과 Timecode 정리가 선행되어야 함. 즉흥적인 수정보다는 계획된 리허설 선호. / 케어: 커피는 아이스 아메리카노(산미X), 식사 시간 엄수." },
            { type: "star", title: "에밀리 (Emily)", desc: "작업 방식: 바이브와 느낌을 중시함. 자유롭게 몸 풀 시간이 충분히 필요. / 케어: 샐러드/단백질 위주 식단 선호. 대기실 온도에 민감함." },
            { type: "check", title: "공통 필수 확인(Rider)", desc: "대기실 전신거울 청결 상태, 미지근한 물/찬 물 각 1박스, 수건 10장 이상, 블루투스 스피커 충전 상태." }
          ],
          files: ["아티스트_라이더(Rider)_통합본.pdf", "현장_체크리스트.xlsx"]
        },

        // 3. 행정/비자
        { 
          title: "[E-6] 외국인 아티스트 비자 발급 표준 절차", 
          category: "행정/비자", 
          lastUpdated: "2025-05-20",
          authorId: "oh",
          content: [
            { type: "step", title: "D-60: 서류 취합", desc: "여권 사본, 경력증명서(아포스티유), 프로필, 공연계획서 작성." },
            { type: "step", title: "D-45: 고용추천서 신청", desc: "문화체육관광부 대중문화산업과 온라인 신청 (처리기간 5~7일)." },
            { type: "step", title: "D-30: 사증발급인정신청", desc: "하이코리아(HiKorea) 대행 접수. 허가번호 발급까지 2~3주 소요." },
            { type: "warning", title: "입국 후 절차", desc: "입국일로부터 90일 이내 관할 출입국사무소 방문 지문등록 및 외국인등록증 발급 필수 (미이행 시 과태료)." }
          ],
          files: ["고용추천서_신청양식.hwp", "사증발급신청서_표준.docx", "신원보증서.hwp"]
        },

        // 4. 현장/제작
        {
          title: "[제작] 촬영 및 공연 현장 운영 매뉴얼",
          category: "현장/제작",
          lastUpdated: "2025-05-15",
          authorId: "kang",
          content: [
            { type: "step", title: "1. 콜타임(Call Time) 설정", desc: "스태프는 아티스트 도착 1시간 전 집합. 장비 세팅 및 동선 체크 완료." },
            { type: "step", title: "2. 리허설 진행", desc: "음향/조명 큐시트 순서대로 진행. 수정 사항은 즉시 PD가 기록하여 공유." },
            { type: "warning", title: "비상 상황 대응", desc: "부상 발생 시 즉시 '지정 병원(청담OO정형외과)'으로 이송. 현장 구급키트 위치 파악 필수." }
          ],
          files: ["표준_큐시트_양식.xlsx", "비상연락망_v2.pdf"]
        }
      ];

      // Tasks linked to Manuals
      const taskData = [
        { content: "전사 ERP 시스템 사용 교육 자료 배포", assigneeId: "oh", priority: "High", status: "To Do", dueDate: "2025-06-01", relatedManualTitle: "ERP 시스템 업무 배정 및 소통 규칙" },
        { content: "유메키 7월 워크샵 비자 서류(고용추천서) 준비", assigneeId: "oh", priority: "High", status: "In Progress", dueDate: "2025-05-30", relatedManualTitle: "[E-6] 외국인 아티스트 비자 발급 표준 절차" }
      ];

      const push = async (c, data) => {
        const colRef = collection(db, 'artifacts', appId, 'public', 'data', c);
        for (const item of data) await addDoc(colRef, item);
      };

      if (dancers.length === 0) await push('dancers', dancerData);
      if (partners.length === 0) await push('partners', partnerData);
      if (projects.length === 0) await push('projects', projectData);
      if (manuals.length === 0) await push('manuals', manualData);
      if (tasks.length === 0) await push('tasks', taskData);

    } catch (e) { console.error(e); }
    setIsSeeding(false);
  };

  // --- Components ---

  const ManualDetailModal = ({ manual, onClose }) => {
    if (!manual) return null;
    return (
      <Modal isOpen={!!manual} onClose={onClose} title={manual.title} size="lg">
        <div className="flex flex-col h-full bg-white">
          <div className="p-8 bg-gray-50 border-b border-gray-100">
             <div className="flex items-center gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                  ${manual.category === '전사 공통/ERP' ? 'bg-indigo-100 text-indigo-700' : ''}
                  ${manual.category === '아티스트 관리' ? 'bg-purple-100 text-purple-700' : ''}
                  ${manual.category === '행정/비자' ? 'bg-red-100 text-red-700' : ''}
                  ${manual.category === '현장/제작' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}
                `}>
                  {manual.category}
                </span>
                <span className="text-xs text-gray-400 font-bold">Last updated: {manual.lastUpdated}</span>
             </div>
             <h2 className="text-2xl font-black text-gray-900 mb-2">{manual.title}</h2>
             <p className="text-sm text-gray-500 font-medium">작성자: {TEAM_MEMBERS.find(m=>m.id===manual.authorId)?.name || '관리자'}</p>
          </div>
          
          <div className="p-8 space-y-8">
            {/* Steps & Content */}
            <div className="space-y-6">
               {manual.content?.map((item, idx) => (
                 <div key={idx} className={`p-5 rounded-2xl border transition-all ${item.type === 'warning' ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100 hover:shadow-md'}`}>
                    <div className="flex gap-4">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg shadow-sm
                         ${item.type === 'step' ? 'bg-indigo-600 text-white' : ''}
                         ${item.type === 'check' ? 'bg-green-500 text-white' : ''}
                         ${item.type === 'warning' ? 'bg-red-500 text-white' : ''}
                         ${item.type === 'info' ? 'bg-blue-500 text-white' : ''}
                         ${item.type === 'star' ? 'bg-amber-400 text-white' : ''}
                       `}>
                          {item.type === 'step' && idx + 1}
                          {item.type === 'check' && <CheckSquare size={18}/>}
                          {item.type === 'warning' && <AlertCircle size={18}/>}
                          {item.type === 'info' && <Info size={18}/>}
                          {item.type === 'star' && <Star size={18} fill="currentColor"/>}
                       </div>
                       <div>
                          <h4 className={`font-black text-base mb-1.5 ${item.type === 'warning' ? 'text-red-700' : 'text-gray-900'}`}>{item.title || item.text}</h4>
                          <p className="text-sm text-gray-600 leading-relaxed font-medium">{item.desc}</p>
                       </div>
                    </div>
                 </div>
               ))}
            </div>

            {/* Files */}
            {manual.files && manual.files.length > 0 && (
              <div className="mt-8 pt-8 border-t border-gray-100">
                 <h4 className="font-black text-sm text-gray-900 mb-4 flex items-center gap-2">
                    <Paperclip size={16}/> 첨부 파일 및 서식
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {manual.files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group border border-gray-100">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-600">
                              <FileText size={18}/>
                            </div>
                            <span className="text-xs font-bold text-gray-700 truncate max-w-[200px]">{file}</span>
                         </div>
                         <Download size={16} className="text-gray-300 group-hover:text-indigo-600"/>
                      </div>
                    ))}
                 </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    );
  };

  const ManualManager = () => {
    const [selectedCategory, setSelectedCategory] = useState('All');

    const filteredManuals = selectedCategory === 'All' 
      ? manuals 
      : manuals.filter(m => m.category === selectedCategory);

    return (
      <div className="flex flex-col h-full animate-in fade-in duration-500">
        <div className="flex justify-between items-end mb-8">
          <div>
             <h2 className="text-3xl font-black text-gray-900 tracking-tighter">SOP & Manual Center</h2>
             <p className="text-sm text-gray-500 font-medium">실무 표준 절차 및 업무 가이드라인 (ERP Only)</p>
          </div>
        </div>

        <div className="flex flex-1 gap-8 overflow-hidden">
           {/* Sidebar Navigation */}
           <div className="w-64 flex-shrink-0 overflow-y-auto pr-2">
              <div className="bg-white rounded-[2rem] p-4 border border-gray-100 shadow-sm h-full">
                 <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-4 mt-2">Categories</h3>
                 <div className="space-y-1">
                    {MANUAL_CATEGORIES.map(c => (
                      <button
                        key={c}
                        onClick={() => setSelectedCategory(c)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between transition-all group
                          ${selectedCategory === c ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
                        `}
                      >
                        <span className="flex items-center gap-3">
                           {c === 'All' && <LayoutDashboard size={16}/>}
                           {c === '전사 공통/ERP' && <Layout size={16}/>}
                           {c === '아티스트 관리' && <Star size={16}/>}
                           {c === '행정/비자' && <ShieldCheck size={16}/>}
                           {c === '현장/제작' && <Camera size={16}/>}
                           {c === '재무/정산' && <DollarSign size={16}/>}
                           {c}
                        </span>
                        {selectedCategory === c && <ChevronRight size={14}/>}
                      </button>
                    ))}
                 </div>
              </div>
           </div>

           {/* Content Area */}
           <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-4">
                 {filteredManuals.map(m => (
                   <div 
                     key={m.id} 
                     onClick={() => setActiveManual(m)}
                     className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm hover:border-indigo-200 hover:shadow-lg transition-all cursor-pointer group flex items-center justify-between"
                   >
                      <div className="flex items-center gap-6">
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors
                            ${m.category === '전사 공통/ERP' ? 'bg-indigo-50 text-indigo-600' : ''}
                            ${m.category === '아티스트 관리' ? 'bg-purple-50 text-purple-600' : ''}
                            ${m.category === '행정/비자' ? 'bg-red-50 text-red-600' : ''}
                            ${m.category === '현장/제작' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-600'}
                         `}>
                            <BookOpen size={20}/>
                         </div>
                         <div>
                            <h3 className="text-base font-black text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">{m.title}</h3>
                            <div className="flex items-center gap-3">
                               <StatusBadge type="default" text={m.category} />
                               <span className="text-xs text-gray-400 font-medium flex items-center gap-1"><Clock size={10}/> {m.lastUpdated}</span>
                            </div>
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-8 pr-4">
                         <div className="text-right hidden md:block">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Author</p>
                            <p className="text-xs font-bold text-gray-700">{TEAM_MEMBERS.find(mem=>mem.id===m.authorId)?.name}</p>
                         </div>
                         <div className="w-px h-8 bg-gray-100 hidden md:block"></div>
                         <div className="flex items-center gap-1 text-gray-400">
                            <Paperclip size={14}/>
                            <span className="text-xs font-bold">{m.files?.length || 0}</span>
                         </div>
                         <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all"/>
                      </div>
                   </div>
                 ))}
                 {filteredManuals.length === 0 && (
                    <div className="py-20 text-center text-gray-400 font-bold bg-white rounded-[2rem] border-2 border-dashed border-gray-200">
                       등록된 매뉴얼이 없습니다.
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    );
  };

  const CreateForm = () => {
    // Form state
    const [formData, setFormData] = useState({});
    
    const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

    if (activeTab === 'dancers') return (
      <div className="space-y-4">
        <div><label className="text-xs font-bold text-gray-500">Name</label><input name="name" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-indigo-500" placeholder="이름" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-bold text-gray-500">Nationality</label><input name="nationality" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm" placeholder="KOR" /></div>
          <div><label className="text-xs font-bold text-gray-500">Visa Type</label>
            <select name="visa" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm">
              <option value="">선택하세요</option>
              {VISA_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div><label className="text-xs font-bold text-gray-500">Role</label><input name="role" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm" placeholder="예: 댄스팀 한야, 전속 안무가" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-bold text-gray-500">Contract End</label><input type="date" name="contractEnd" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm" /></div>
          <div><label className="text-xs font-bold text-gray-500">Visa End</label><input type="date" name="visaEnd" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm" /></div>
        </div>
        <button onClick={() => handleCreate('dancers', { ...formData, status: 'Active', contractStart: new Date().toISOString().split('T')[0], visaStart: new Date().toISOString().split('T')[0] })} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl mt-4">Add Artist</button>
      </div>
    );
    // ... (Keep existing forms for projects, partners) ...
    if (activeTab === 'projects') return (
      <div className="space-y-4">
        <div><label className="text-xs font-bold text-gray-500">Project Title</label><input name="title" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm" placeholder="프로젝트명" /></div>
        <div><label className="text-xs font-bold text-gray-500">Client</label><input name="client" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm" placeholder="클라이언트명" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-bold text-gray-500">Budget (KRW)</label><input type="number" name="budget" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm" placeholder="0" /></div>
          <div><label className="text-xs font-bold text-gray-500">Status</label>
            <select name="status" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm">
              {PROJECT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div><label className="text-xs font-bold text-gray-500">Manager</label>
            <select name="managerId" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm">
              <option value="">담당자 선택</option>
              {TEAM_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name} ({m.team})</option>)}
            </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-bold text-gray-500">Start Date</label><input type="date" name="startDate" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm" /></div>
          <div><label className="text-xs font-bold text-gray-500">End Date</label><input type="date" name="endDate" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm" /></div>
        </div>
        <button onClick={() => handleCreate('projects', { ...formData, budget: Number(formData.budget) })} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl mt-4">Create Project</button>
      </div>
    );

    if (activeTab === 'partners') return (
      <div className="space-y-4">
        <div><label className="text-xs font-bold text-gray-500">Company Name</label><input name="name" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm" placeholder="회사명" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-bold text-gray-500">Category</label>
            <select name="category" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm">
              {PARTNER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-bold text-gray-500">Grade</label>
            <select name="status" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm">
              <option value="Active">Active</option>
              <option value="VIP">VIP</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div><label className="text-xs font-bold text-gray-500">Manager Name</label><input name="manager" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm" placeholder="담당자 이름/직급" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-bold text-gray-500">Contact</label><input name="contact" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm" placeholder="010-0000-0000" /></div>
          <div><label className="text-xs font-bold text-gray-500">Email</label><input name="email" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm" placeholder="email@" /></div>
        </div>
        <button onClick={() => handleCreate('partners', formData)} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl mt-4">Add Partner</button>
      </div>
    );

    if (activeTab === 'tasks') return (
        <div className="space-y-4">
          <div><label className="text-xs font-bold text-gray-500">Task Content</label><input name="content" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm" placeholder="할일 내용" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-gray-500">Priority</label>
              <select name="priority" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div><label className="text-xs font-bold text-gray-500">Assignee</label>
              <select name="assigneeId" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm">
                <option value="">담당자 선택</option>
                {TEAM_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div><label className="text-xs font-bold text-gray-500">Due Date</label><input type="date" name="dueDate" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm" /></div>
          
          <div><label className="text-xs font-bold text-gray-500">Link Manual (Optional)</label>
             <select name="relatedManualTitle" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm">
               <option value="">관련 매뉴얼 선택</option>
               {manuals.map(m => <option key={m.id} value={m.title}>{m.title}</option>)}
             </select>
          </div>

          <button onClick={() => handleCreate('tasks', { ...formData, status: 'To Do' })} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl mt-4">Assign Task</button>
        </div>
    );

    if (activeTab === 'manuals') return (
       <div className="space-y-4">
         <div><label className="text-xs font-bold text-gray-500">Title</label><input name="title" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm" placeholder="매뉴얼 제목" /></div>
         <div><label className="text-xs font-bold text-gray-500">Category</label>
            <select name="category" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm">
              {MANUAL_CATEGORIES.filter(c=>c!=='All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
         </div>
         <p className="text-xs text-gray-400 mt-2">* 상세 내용은 생성 후 편집 가능합니다 (데모 버전에서는 기본 템플릿으로 생성됨).</p>
         <button onClick={() => handleCreate('manuals', { 
           ...formData, 
           lastUpdated: new Date().toISOString().split('T')[0],
           content: [{ type: 'info', title: '내용 없음', desc: '세부 내용을 추가해주세요.' }],
           files: []
         })} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl mt-4">Create Manual</button>
       </div>
    );

    return <div className="text-center py-10 text-gray-500">이 섹션은 데이터 추가를 지원하지 않습니다.</div>;
  };

  // --- Views ---
  const Dashboard = () => {
    // ... (Keep existing dashboard code) ...
    const today = new Date();
    const urgentVisas = dancers.filter(d => {
      if (!d.visaEnd || d.visaEnd === "9999-12-31" || d.visaEnd === "N/A") return false;
      const diff = (new Date(d.visaEnd) - today) / (1000 * 60 * 60 * 24);
      return diff <= 60;
    });

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-lg transition-all">
             <div className="flex justify-between mb-2">
               <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Briefcase size={22}/></div>
               <span className="text-[10px] font-black text-green-500 bg-green-50 px-2 py-1 rounded-full uppercase tracking-widest">Active</span>
             </div>
             <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Projects</p>
               <h3 className="text-3xl font-black text-gray-900 mt-1">{projects.length}</h3>
             </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-lg transition-all">
             <div className="flex justify-between mb-2">
               <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Users size={22}/></div>
             </div>
             <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Artists</p>
               <h3 className="text-3xl font-black text-gray-900 mt-1">{dancers.length}</h3>
             </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between border-red-100 hover:shadow-lg transition-all">
             <div className="flex justify-between mb-2">
               <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><ShieldCheck size={22}/></div>
               {urgentVisas.length > 0 && <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"></span>}
             </div>
             <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Visa Critical</p>
               <h3 className={`text-3xl font-black mt-1 ${urgentVisas.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>{urgentVisas.length}</h3>
             </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-lg transition-all">
             <div className="flex justify-between mb-2">
               <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><DollarSign size={22}/></div>
             </div>
             <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monthly Rev.</p>
               <h3 className="text-3xl font-black text-gray-900 mt-1">₩{(settlements.reduce((sum,s)=>sum+s.totalAmount,0)/10000).toLocaleString()}만</h3>
             </div>
          </div>
        </div>
        {/* ... (Rest of dashboard) ... */}
      </div>
    );
  };
  // ... (Keep ArtistManager, ProjectManager, PartnerManager, SettlementManager as is) ...
  const ArtistManager = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
           <h2 className="text-3xl font-black text-gray-900 tracking-tighter">소속 아티스트 관리</h2>
           <p className="text-sm text-gray-500 font-medium">아티스트의 신상 정보, 계약, 비자 상태를 통합 관리합니다.</p>
        </div>
      </div>
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/30 flex gap-4">
           <div className="relative flex-1">
             <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
             <input className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="이름, 국적, 소속팀 검색..." />
           </div>
           <button className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-400 hover:text-indigo-600 transition-colors"><Filter size={20}/></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
             <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-6 py-5">Artist / Role</th>
                  <th className="px-6 py-5">Nation / Visa</th>
                  <th className="px-6 py-5 bg-indigo-50/30 text-indigo-600">Contract Period</th>
                  <th className="px-6 py-5 bg-red-50/30 text-red-600">Visa Period</th>
                  <th className="px-6 py-5 text-right">Status</th>
                  <th className="px-6 py-5 w-10"></th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-50">
                {dancers.map(d => {
                  const today = new Date();
                  const isVisaUrgent = d.visaEnd !== '9999-12-31' && d.visaEnd !== 'N/A' && (new Date(d.visaEnd) - today) / (1000*60*60*24) <= 60;
                  const isContractUrgent = d.contractEnd && (new Date(d.contractEnd) - today) / (1000*60*60*24) <= 60;

                  return (
                    <tr key={d.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-sm ${d.role.includes('한야') ? 'bg-black' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                                {d.name[0]}
                             </div>
                             <div>
                                <p className="font-black text-gray-900 text-sm">{d.name}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase">{d.role}</p>
                             </div>
                          </div>
                      </td>
                      <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                             <span className="text-xs font-black text-gray-700">{d.nationality}</span>
                             <span className="text-gray-300 text-[10px]">/</span>
                             <span className="text-[10px] font-bold text-gray-500 uppercase">{d.visa}</span>
                          </div>
                      </td>
                      <td className="px-6 py-5 bg-indigo-50/10">
                          <div className="space-y-1">
                             <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black text-indigo-400 uppercase">Start</span>
                                <span className="text-xs font-bold text-gray-700">{d.contractStart}</span>
                             </div>
                             <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black text-indigo-400 uppercase">End</span>
                                <span className={`text-xs font-black ${isContractUrgent ? 'text-red-500' : 'text-gray-900'}`}>{d.contractEnd}</span>
                             </div>
                          </div>
                      </td>
                      <td className="px-6 py-5 bg-red-50/10">
                          <div className="space-y-1">
                             <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black text-red-400 uppercase">Start</span>
                                <span className="text-xs font-bold text-gray-700">{d.visaStart}</span>
                             </div>
                             <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black text-red-400 uppercase">End</span>
                                <span className={`text-xs font-black ${isVisaUrgent ? 'text-red-500' : 'text-gray-900'}`}>
                                   {d.visaEnd === '9999-12-31' ? '무기한' : d.visaEnd}
                                </span>
                             </div>
                          </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                          <StatusBadge type={d.status === 'Active' ? 'active' : 'default'} text={d.status} />
                      </td>
                      <td className="px-6 py-5">
                         <button onClick={()=>handleDelete('dancers', d.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  );
                })}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const ProjectManager = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
           <h2 className="text-3xl font-black text-gray-900 tracking-tighter">프로젝트 관리</h2>
           <p className="text-sm text-gray-500 font-medium">진행 중인 모든 프로젝트의 예산 및 일정을 총괄합니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
         {projects.map(p => {
             const manager = TEAM_MEMBERS.find(m => m.id === p.managerId);
             const today = new Date();
             const start = new Date(p.startDate);
             const end = new Date(p.endDate);
             const total = end - start;
             const current = today - start;
             let progress = Math.round((current / total) * 100);
             if (progress < 0) progress = 0;
             if (progress > 100) progress = 100;

             return (
                 <div key={p.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-lg transition-all group">
                     <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                        <div className="flex items-center gap-4">
                           <div className="w-14 h-14 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-black text-lg">
                               P
                           </div>
                           <div>
                               <h3 className="text-lg font-black text-gray-900">{p.title}</h3>
                               <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{p.client} • {manager?.name || 'Unassigned'}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="text-right">
                               <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total Budget</p>
                               <p className="text-lg font-black text-gray-900">₩{(p.budget).toLocaleString()}</p>
                           </div>
                           <StatusBadge type={p.status} text={p.status} />
                           <button onClick={()=>handleDelete('projects', p.id)} className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={18}/></button>
                        </div>
                     </div>

                     <div className="bg-gray-50 rounded-2xl p-4">
                        <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                           <span>{p.startDate}</span>
                           <span className="text-indigo-600">{progress}% Completed</span>
                           <span>{p.endDate}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                           <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000" style={{width: `${progress}%`}}></div>
                        </div>
                     </div>
                 </div>
             )
         })}
         {projects.length === 0 && <div className="text-center py-20 text-gray-400 font-bold">등록된 프로젝트가 없습니다.</div>}
      </div>
    </div>
  );

  const PartnerManager = () => {
    const [expandedId, setExpandedId] = useState(null);

    const toggleExpand = (id) => {
      if (expandedId === id) setExpandedId(null);
      else setExpandedId(id);
    };

    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-end">
          <div>
             <h2 className="text-3xl font-black text-gray-900 tracking-tighter">거래처/파트너 DB</h2>
             <p className="text-sm text-gray-500 font-medium">협력사 및 클라이언트 연락망을 리스트로 관리합니다.</p>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                 <tr>
                    <th className="px-6 py-4">Company</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Manager</th>
                    <th className="px-6 py-4">Contact (Main)</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 w-10"></th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {partners.map(p => (
                   <React.Fragment key={p.id}>
                     <tr 
                       onClick={() => toggleExpand(p.id)} 
                       className={`cursor-pointer transition-colors ${expandedId === p.id ? 'bg-indigo-50/30' : 'hover:bg-gray-50'}`}
                     >
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center font-black text-xs">
                                 {p.name[0]}
                              </div>
                              <span className="font-black text-sm text-gray-900">{p.name}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-500">{p.category}</td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-900">{p.manager}</td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-mono">{p.contact}</td>
                        <td className="px-6 py-4"><StatusBadge type={p.status==='VIP'?'vip':'default'} text={p.status} /></td>
                        <td className="px-6 py-4 text-gray-400">
                           {expandedId === p.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                        </td>
                     </tr>
                     {expandedId === p.id && (
                       <tr className="bg-gray-50/50">
                          <td colSpan="6" className="px-6 py-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm animate-in slide-in-from-top-2 duration-200">
                                <div className="space-y-2">
                                   <div className="flex items-center gap-2 text-gray-500">
                                      <Mail size={14}/>
                                      <span className="font-bold">Email:</span>
                                      <span className="font-mono text-gray-900">{p.email || 'N/A'}</span>
                                   </div>
                                   <div className="flex items-center gap-2 text-gray-500">
                                      <Phone size={14}/>
                                      <span className="font-bold">Direct:</span>
                                      <span className="font-mono text-gray-900">{p.contact}</span>
                                   </div>
                                </div>
                                <div className="flex justify-end items-center gap-4">
                                   <button onClick={(e) => { e.stopPropagation(); handleDelete('partners', p.id); }} className="px-4 py-2 bg-white border border-red-100 text-red-500 rounded-xl text-xs font-black hover:bg-red-50 flex items-center gap-2 transition-colors">
                                      <Trash2 size={14}/> Delete Partner
                                   </button>
                                </div>
                             </div>
                          </td>
                       </tr>
                     )}
                   </React.Fragment>
                 ))}
                 {partners.length === 0 && (
                   <tr>
                     <td colSpan="6" className="text-center py-10 text-gray-400 text-xs font-bold uppercase tracking-widest">No Partners Found</td>
                   </tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>
    );
  };
  const SettlementManager = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
       <div className="flex justify-between items-end">
        <div>
           <h2 className="text-3xl font-black text-gray-900 tracking-tighter">정산 및 회계</h2>
           <p className="text-sm text-gray-500 font-medium">안무 제작비 및 아티스트 지급 내역을 관리합니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 p-8 rounded-[2.5rem] text-white shadow-2xl">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-2">Total Monthly Rev.</p>
             <h4 className="text-4xl font-black">₩{(settlements.reduce((sum,s)=>sum+s.totalAmount,0)/10000).toLocaleString()}만</h4>
             <div className="mt-6 flex items-center gap-2 text-xs font-bold text-emerald-400">
                <TrendingUp size={14}/> +18.4% Trend
             </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Artist Share (70%)</p>
             <h4 className="text-3xl font-black text-gray-800">₩{(settlements.reduce((sum,s)=>sum+s.dancerFee,0)/10000).toLocaleString()}만</h4>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Net Profit (30%)</p>
             <h4 className="text-3xl font-black text-indigo-600">₩{(settlements.reduce((sum,s)=>sum+s.companyFee,0)/10000).toLocaleString()}만</h4>
          </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
         <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
               <tr>
                 <th className="px-8 py-5">Item / Settlement Date</th>
                 <th className="px-8 py-5">Total Amount</th>
                 <th className="px-8 py-5 text-red-500">Artist Fee</th>
                 <th className="px-8 py-5 text-indigo-600">Company Net</th>
                 <th className="px-8 py-5 text-right">Status</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
               {settlements.map(s => (
                 <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-5">
                       <p className="font-bold text-sm text-gray-900">{s.title}</p>
                       <p className="text-[10px] font-black text-gray-400 uppercase">{s.date}</p>
                    </td>
                    <td className="px-8 py-5 text-xs font-black text-gray-800">₩{s.totalAmount.toLocaleString()}</td>
                    <td className="px-8 py-5 text-xs font-bold text-red-500">- ₩{s.dancerFee.toLocaleString()}</td>
                    <td className="px-8 py-5 text-xs font-black text-indigo-600">₩{s.companyFee.toLocaleString()}</td>
                    <td className="px-8 py-5 text-right"><StatusBadge type={s.status === 'Completed' ? 'active' : 'warning'} text={s.status} /></td>
                 </tr>
               ))}
            </tbody>
         </table>
      </div>
    </div>
  );

  const TaskManager = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
           <h2 className="text-3xl font-black text-gray-900 tracking-tighter">업무 및 할일</h2>
           <p className="text-sm text-gray-500 font-medium">실시간 칸반 보드로 업무 진척도를 통제합니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         {['To Do', 'In Progress', 'Done'].map(status => (
           <div key={status} className="bg-gray-100/40 rounded-[2.5rem] p-4 min-h-[600px]">
              <div className="px-4 py-3 flex justify-between items-center mb-6">
                 <h5 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">{status}</h5>
                 <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-black shadow-sm text-gray-400">{tasks.filter(t=>t.status===status).length}</span>
              </div>
              <div className="space-y-4">
                 {tasks.filter(t=>t.status===status).map(t => {
                   const relatedManual = t.relatedManualTitle ? manuals.find(m => m.title === t.relatedManualTitle) : null;
                   
                   return (
                     <div key={t.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 group transition-all">
                        <div className="flex justify-between mb-3">
                           <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${t.priority==='High'?'bg-red-100 text-red-600':'bg-blue-100 text-blue-600'}`}>{t.priority}</span>
                           <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={async()=>await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', t.id), {status: status === 'To Do' ? 'In Progress' : 'Done'})} className="text-indigo-400 hover:text-indigo-600"><CheckCircle2 size={16}/></button>
                              <button onClick={()=>handleDelete('tasks', t.id)} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button>
                           </div>
                        </div>
                        <p className="text-sm font-bold text-gray-800 mb-2 leading-relaxed">{t.content}</p>
                        
                        {/* Linked Manual Badge */}
                        {relatedManual && (
                          <div 
                            onClick={() => setActiveManual(relatedManual)}
                            className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-xl mb-4 cursor-pointer hover:bg-indigo-100 transition-colors"
                          >
                             <BookOpen size={14} className="text-indigo-600"/>
                             <span className="text-[10px] font-bold text-indigo-700 truncate">{relatedManual.title}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                           <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-500">
                                 {TEAM_MEMBERS.find(m=>m.id===t.assigneeId)?.name[0]}
                              </div>
                              <span className="text-[10px] font-black text-gray-400 uppercase">{TEAM_MEMBERS.find(m=>m.id===t.assigneeId)?.name}</span>
                           </div>
                           <span className="text-[10px] font-bold text-gray-300 italic">{t.dueDate}</span>
                        </div>
                     </div>
                   );
                 })}
              </div>
           </div>
         ))}
      </div>
    </div>
  );

  // --- Layout ---

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-6"></div>
      <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Grigo System Initializing</p>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F8F9FD] text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-gray-950 flex flex-col shadow-2xl z-20">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10 group cursor-pointer" onClick={()=>setActiveTab('dashboard')}>
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl italic shadow-lg shadow-indigo-500/30 group-hover:rotate-6 transition-transform">
              G
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none text-white">그리고</h1>
              <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em]">Entertainment</span>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: '통합 대시보드' },
              { id: 'dancers', icon: Users, label: '아티스트 관리' },
              { id: 'projects', icon: Briefcase, label: '프로젝트 관리' },
              { id: 'tasks', icon: CheckSquare, label: '업무 및 할일' },
              { id: 'manuals', icon: BookOpen, label: '업무 매뉴얼 / SOP' },
              { id: 'settlements', icon: CreditCard, label: '정산 및 회계' },
              { id: 'partners', icon: Building2, label: '거래처/파트너 DB' },
            ].map(item => (
              <button 
                key={item.id}
                onClick={()=>setActiveTab(item.id)} 
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[13px] font-black transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'}`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-white/5">
          <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-black text-white">ADMIN</div>
              <div className="flex-1 min-w-0">
                 <p className="text-xs font-black text-gray-200 truncate">오동현 총괄</p>
                 <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Master Handler</p>
              </div>
            </div>
            <button onClick={() => window.location.reload()} className="w-full py-2 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-xl text-[10px] font-black text-gray-500 flex items-center justify-center gap-2 transition-all">
              <LogOut size={12}/> LOGOUT SYSTEM
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-10 z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Workspace</h2>
            <ChevronRight size={14} className="text-gray-300" />
            <span className="text-sm font-black text-gray-900 capitalize tracking-tight">{activeTab} Section</span>
          </div>
          <div className="flex items-center gap-6">
             <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-[10px] font-black text-gray-500">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                SYSTEM ONLINE
             </div>
             {activeTab !== 'dashboard' && activeTab !== 'settlements' && (
               <button 
                 onClick={() => setIsModalOpen(true)}
                 className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 cursor-pointer hover:scale-105 transition-transform"
               >
                 <Plus size={20}/>
               </button>
             )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 bg-[#F9FAFF]/50">
          <div className="max-w-7xl mx-auto pb-20">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'dancers' && <ArtistManager />}
            {activeTab === 'projects' && <ProjectManager />}
            {activeTab === 'tasks' && <TaskManager />}
            {activeTab === 'manuals' && <ManualManager />}
            {activeTab === 'settlements' && <SettlementManager />}
            {activeTab === 'partners' && <PartnerManager />}
          </div>
        </div>

        {/* Global Action: Data Seeding */}
        <button 
          onClick={seedAllData}
          disabled={isSeeding}
          className={`fixed bottom-8 right-8 p-5 bg-white shadow-2xl rounded-[1.5rem] border border-gray-100 hover:scale-110 transition-transform z-50 group ${isSeeding ? 'opacity-50' : 'text-indigo-600'}`}
        >
          <Zap size={28} fill={isSeeding ? "none" : "currentColor"} className={isSeeding ? "animate-spin" : "group-hover:animate-bounce"} />
          <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest pointer-events-none">
            {isSeeding ? 'Seeding...' : '데이터 시뮬레이션 실행 (Zap)'}
          </span>
        </button>

        {/* Create Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Add to ${activeTab.toUpperCase()}`}>
           <CreateForm />
        </Modal>

        {/* Manual Detail Modal */}
        <ManualDetailModal manual={activeManual} onClose={() => setActiveManual(null)} />

      </main>
    </div>
  );
}

