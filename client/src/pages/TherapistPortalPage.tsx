import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Plus, Users, FileText, BookOpen, Search, Calendar, UserMinus, ChevronDown, ChevronUp, Trash2, TrendingUp, Award, AlertCircle, CheckCircle, X, BarChart3, Edit3, Save, XCircle, MoreVertical, Send, Zap, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/supabaseClient";
import { AssignmentScorecard } from "@/components/AssignmentScorecard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Assignment, User } from "@shared/schema";
import ContentLibraryPage from "./ContentLibraryPage";
import AssignAssignmentModal from "@/components/modals/AssignAssignmentModal";
import AppleAssignmentModal from "@/components/modals/AppleAssignmentModal";
import SmartAssignmentCreator from "@/components/SmartAssignmentCreator";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import AdvancedTemplateLibrary from "@/components/AdvancedTemplateLibrary";
import WorkflowTools from "@/components/WorkflowTools";
import { 
  PatientListSkeleton, 
  AnalyticsSkeleton, 
  SmartCreatorSkeleton, 
  TemplateLibrarySkeleton,
  LoadingOverlay,
  SuccessAnimation 
} from "@/components/LoadingSkeletons";
import { announcer, focusUtils, keyboardNavigation, KEYBOARD_KEYS } from "@/utils/accessibility";
import "@/styles/apple-assignment-animations.css";

interface AssignmentTemplate {
  id: string;
  title: string;
  description: string;
  words: Array<{ text: string; syllabication: string }>;
  targetSound?: string;
  category?: string;
  assignmentType?: string;
  createdAt: string;
}

const DIFFICULTY_LEVELS = [
  { value: "1", label: "Level 1 - Very Easy" },
  { value: "2", label: "Level 2 - Easy" },
  { value: "3", label: "Level 3 - Basic" },
  { value: "4", label: "Level 4 - Intermediate" },
  { value: "5", label: "Level 5 - Upper Intermediate" },
  { value: "6", label: "Level 6 - Advanced" },
  { value: "7", label: "Level 7 - Very Advanced" },
  { value: "8", label: "Level 8 - Expert" }
];

// Pre-generated assignment templates
const PREDEFINED_TEMPLATES: AssignmentTemplate[] = [
  {
    id: "template-1",
    title: "Animals",
    description: "Practice animal names for vocabulary building",
    words: [
      { text: "cat", syllabication: "cat" },
      { text: "dog", syllabication: "dog" },
      { text: "elephant", syllabication: "el-e-phant" },
      { text: "tiger", syllabication: "ti-ger" },
      { text: "butterfly", syllabication: "but-ter-fly" },
      { text: "rabbit", syllabication: "rab-bit" },
      { text: "monkey", syllabication: "mon-key" },
      { text: "giraffe", syllabication: "gi-raffe" }
    ],
    category: "Animals",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-2",
    title: "Colors",
    description: "Learn and practice color names",
    words: [
      { text: "red", syllabication: "red" },
      { text: "blue", syllabication: "blue" },
      { text: "green", syllabication: "green" },
      { text: "yellow", syllabication: "yel-low" },
      { text: "purple", syllabication: "pur-ple" },
      { text: "orange", syllabication: "or-ange" },
      { text: "pink", syllabication: "pink" },
      { text: "brown", syllabication: "brown" }
    ],
    category: "Colors",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-3",
    title: "Daily Activities",
    description: "Common words for everyday activities and routines",
    words: [
      { text: "breakfast", syllabication: "break-fast" },
      { text: "shower", syllabication: "show-er" },
      { text: "cooking", syllabication: "cook-ing" },
      { text: "driving", syllabication: "driv-ing" },
      { text: "shopping", syllabication: "shop-ping" },
      { text: "exercise", syllabication: "ex-er-cise" },
      { text: "reading", syllabication: "read-ing" },
      { text: "sleeping", syllabication: "sleep-ing" }
    ],
    category: "Daily Life",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-4",
    title: "Family Members",
    description: "Important family relationship words",
    words: [
      { text: "mother", syllabication: "moth-er" },
      { text: "father", syllabication: "fa-ther" },
      { text: "brother", syllabication: "broth-er" },
      { text: "sister", syllabication: "sis-ter" },
      { text: "grandmother", syllabication: "grand-moth-er" },
      { text: "grandfather", syllabication: "grand-fa-ther" },
      { text: "daughter", syllabication: "daugh-ter" },
      { text: "family", syllabication: "fam-i-ly" }
    ],
    category: "Family & Relationships",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-5",
    title: "Food and Drinks",
    description: "Practice common food and beverage names",
    words: [
      { text: "apple", syllabication: "ap-ple" },
      { text: "banana", syllabication: "ba-na-na" },
      { text: "water", syllabication: "wa-ter" },
      { text: "sandwich", syllabication: "sand-wich" },
      { text: "pizza", syllabication: "piz-za" },
      { text: "coffee", syllabication: "cof-fee" },
      { text: "vegetables", syllabication: "veg-e-ta-bles" },
      { text: "chocolate", syllabication: "choc-o-late" }
    ],
    category: "Food and Drinks",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-6",
    title: "Emotions & Feelings",
    description: "Express emotions clearly with proper pronunciation",
    words: [
      { text: "happy", syllabication: "hap-py" },
      { text: "excited", syllabication: "ex-cit-ed" },
      { text: "worried", syllabication: "wor-ried" },
      { text: "comfortable", syllabication: "com-fort-a-ble" },
      { text: "frustrated", syllabication: "frus-trat-ed" },
      { text: "grateful", syllabication: "grate-ful" },
      { text: "nervous", syllabication: "ner-vous" },
      { text: "confident", syllabication: "con-fi-dent" }
    ],
    category: "Emotional Expression",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-7",
    title: "Food & Cooking",
    description: "Kitchen and food-related vocabulary practice",
    words: [
      { text: "vegetables", syllabication: "veg-e-ta-bles" },
      { text: "delicious", syllabication: "de-li-cious" },
      { text: "restaurant", syllabication: "res-tau-rant" },
      { text: "ingredients", syllabication: "in-gre-di-ents" },
      { text: "kitchen", syllabication: "kitch-en" },
      { text: "breakfast", syllabication: "break-fast" },
      { text: "grocery", syllabication: "gro-cer-y" },
      { text: "nutrition", syllabication: "nu-tri-tion" }
    ],
    category: "Food & Dining",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-8",
    title: "Medical Terms",
    description: "Important healthcare and medical vocabulary",
    words: [
      { text: "doctor", syllabication: "doc-tor" },
      { text: "medicine", syllabication: "med-i-cine" },
      { text: "hospital", syllabication: "hos-pi-tal" },
      { text: "appointment", syllabication: "ap-point-ment" },
      { text: "therapy", syllabication: "ther-a-py" },
      { text: "exercise", syllabication: "ex-er-cise" },
      { text: "rehabilitation", syllabication: "re-ha-bil-i-ta-tion" },
      { text: "recovery", syllabication: "re-cov-er-y" }
    ],
    category: "Healthcare",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-9",
    title: "Weather & Seasons",
    description: "Describe weather and seasonal changes confidently",
    words: [
      { text: "temperature", syllabication: "tem-per-a-ture" },
      { text: "umbrella", syllabication: "um-brel-la" },
      { text: "sunshine", syllabication: "sun-shine" },
      { text: "forecast", syllabication: "fore-cast" },
      { text: "cloudy", syllabication: "cloud-y" },
      { text: "winter", syllabication: "win-ter" },
      { text: "beautiful", syllabication: "beau-ti-ful" },
      { text: "outside", syllabication: "out-side" }
    ],
    category: "Weather & Environment",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-10",
    title: "Technology Words",
    description: "Modern technology and digital communication terms",
    words: [
      { text: "computer", syllabication: "com-pu-ter" },
      { text: "telephone", syllabication: "tel-e-phone" },
      { text: "internet", syllabication: "in-ter-net" },
      { text: "application", syllabication: "ap-pli-ca-tion" },
      { text: "digital", syllabication: "dig-i-tal" },
      { text: "communication", syllabication: "com-mu-ni-ca-tion" },
      { text: "technology", syllabication: "tech-nol-o-gy" },
      { text: "smartphone", syllabication: "smart-phone" }
    ],
    category: "Technology",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-11",
    title: "Transportation",
    description: "Vehicles and travel-related vocabulary",
    words: [
      { text: "car", syllabication: "car" },
      { text: "bus", syllabication: "bus" },
      { text: "airplane", syllabication: "air-plane" },
      { text: "bicycle", syllabication: "bi-cy-cle" },
      { text: "motorcycle", syllabication: "mo-tor-cy-cle" },
      { text: "subway", syllabication: "sub-way" },
      { text: "driving", syllabication: "driv-ing" },
      { text: "passenger", syllabication: "pas-sen-ger" }
    ],
    category: "Transportation",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-12",
    title: "Sports",
    description: "Sports and physical activities vocabulary",
    words: [
      { text: "football", syllabication: "foot-ball" },
      { text: "basketball", syllabication: "bas-ket-ball" },
      { text: "swimming", syllabication: "swim-ming" },
      { text: "running", syllabication: "run-ning" },
      { text: "exercise", syllabication: "ex-er-cise" },
      { text: "competition", syllabication: "com-pe-ti-tion" },
      { text: "athlete", syllabication: "ath-lete" },
      { text: "victory", syllabication: "vic-to-ry" }
    ],
    category: "Sports",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-13",
    title: "Action Words",
    description: "Dynamic verbs and action-related vocabulary for clear pronunciation",
    words: [
      { text: "running", syllabication: "run-ning" },
      { text: "jumping", syllabication: "jump-ing" },
      { text: "climbing", syllabication: "climb-ing" },
      { text: "swimming", syllabication: "swim-ming" },
      { text: "dancing", syllabication: "danc-ing" },
      { text: "writing", syllabication: "writ-ing" },
      { text: "reading", syllabication: "read-ing" },
      { text: "cooking", syllabication: "cook-ing" }
    ],
    category: "Action Words",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-14", 
    title: "Colors & Descriptions",
    description: "Descriptive words including colors and visual characteristics",
    words: [
      { text: "purple", syllabication: "pur-ple" },
      { text: "orange", syllabication: "or-ange" },
      { text: "beautiful", syllabication: "beau-ti-ful" },
      { text: "sparkling", syllabication: "spark-ling" },
      { text: "brilliant", syllabication: "bril-liant" },
      { text: "transparent", syllabication: "trans-par-ent" },
      { text: "colorful", syllabication: "col-or-ful" },
      { text: "magnificent", syllabication: "mag-nif-i-cent" }
    ],
    category: "Colors & Descriptions",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-15",
    title: "Animals & Nature", 
    description: "Wildlife and natural world vocabulary practice",
    words: [
      { text: "elephant", syllabication: "el-e-phant" },
      { text: "butterfly", syllabication: "but-ter-fly" },
      { text: "mountain", syllabication: "moun-tain" },
      { text: "forest", syllabication: "for-est" },
      { text: "ocean", syllabication: "o-cean" },
      { text: "environment", syllabication: "en-vi-ron-ment" },
      { text: "wilderness", syllabication: "wil-der-ness" },
      { text: "creature", syllabication: "crea-ture" }
    ],
    category: "Animals & Nature",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-16",
    title: "Numbers & Mathematics",
    description: "Numerical terms and mathematical vocabulary",
    words: [
      { text: "seventeen", syllabication: "sev-en-teen" },
      { text: "thirty", syllabication: "thir-ty" },
      { text: "hundred", syllabication: "hun-dred" },
      { text: "thousand", syllabication: "thou-sand" },
      { text: "multiplication", syllabication: "mul-ti-pli-ca-tion" },
      { text: "division", syllabication: "di-vi-sion" },
      { text: "calculation", syllabication: "cal-cu-la-tion" },
      { text: "percentage", syllabication: "per-cent-age" }
    ],
    category: "Numbers & Mathematics",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-17",
    title: "Occupations & Careers",
    description: "Professional roles and career-related vocabulary",
    words: [
      { text: "teacher", syllabication: "teach-er" },
      { text: "engineer", syllabication: "en-gi-neer" },
      { text: "firefighter", syllabication: "fire-fight-er" },
      { text: "veterinarian", syllabication: "vet-er-i-nar-i-an" },
      { text: "architect", syllabication: "ar-chi-tect" },
      { text: "photographer", syllabication: "pho-tog-ra-pher" },
      { text: "scientist", syllabication: "sci-en-tist" },
      { text: "electrician", syllabication: "e-lec-tri-cian" }
    ],
    category: "Occupations & Careers",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-18",
    title: "Time & Calendar",
    description: "Time-related words, days, months, and scheduling vocabulary",
    words: [
      { text: "yesterday", syllabication: "yes-ter-day" },
      { text: "tomorrow", syllabication: "to-mor-row" },
      { text: "September", syllabication: "Sep-tem-ber" },
      { text: "February", syllabication: "Feb-ru-ar-y" },
      { text: "appointment", syllabication: "ap-point-ment" },
      { text: "schedule", syllabication: "sched-ule" },
      { text: "calendar", syllabication: "cal-en-dar" },
      { text: "anniversary", syllabication: "an-ni-ver-sa-ry" }
    ],
    category: "Time & Calendar",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-19",
    title: "Body Parts & Health",
    description: "Anatomical terms and health-related vocabulary",
    words: [
      { text: "shoulder", syllabication: "shoul-der" },
      { text: "forehead", syllabication: "fore-head" },
      { text: "stomach", syllabication: "stom-ach" },
      { text: "muscle", syllabication: "mus-cle" },
      { text: "skeleton", syllabication: "skel-e-ton" },
      { text: "respiratory", syllabication: "res-pi-ra-to-ry" },
      { text: "circulation", syllabication: "cir-cu-la-tion" },
      { text: "temperature", syllabication: "tem-per-a-ture" }
    ],
    category: "Body Parts & Health",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-20",
    title: "School & Education",
    description: "Academic vocabulary and educational terms",
    words: [
      { text: "classroom", syllabication: "class-room" },
      { text: "library", syllabication: "li-brar-y" },
      { text: "education", syllabication: "ed-u-ca-tion" },
      { text: "graduation", syllabication: "grad-u-a-tion" },
      { text: "university", syllabication: "u-ni-ver-si-ty" },
      { text: "laboratory", syllabication: "lab-o-ra-to-ry" },
      { text: "assignment", syllabication: "as-sign-ment" },
      { text: "vocabulary", syllabication: "vo-cab-u-lar-y" }
    ],
    category: "School & Education",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-21",
    title: "Clothing & Fashion",
    description: "Apparel and fashion-related vocabulary practice",
    words: [
      { text: "sweater", syllabication: "sweat-er" },
      { text: "umbrella", syllabication: "um-brel-la" },
      { text: "comfortable", syllabication: "com-fort-a-ble" },
      { text: "accessories", syllabication: "ac-ces-so-ries" },
      { text: "wardrobe", syllabication: "ward-robe" },
      { text: "fashionable", syllabication: "fash-ion-a-ble" },
      { text: "zipper", syllabication: "zip-per" },
      { text: "elegant", syllabication: "el-e-gant" }
    ],
    category: "Clothing & Fashion",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-22",
    title: "Music & Arts",
    description: "Creative and artistic vocabulary for music and visual arts",
    words: [
      { text: "instrument", syllabication: "in-stru-ment" },
      { text: "orchestra", syllabication: "or-ches-tra" },
      { text: "painting", syllabication: "paint-ing" },
      { text: "sculpture", syllabication: "sculp-ture" },
      { text: "creative", syllabication: "cre-a-tive" },
      { text: "performance", syllabication: "per-for-mance" },
      { text: "gallery", syllabication: "gal-ler-y" },
      { text: "exhibition", syllabication: "ex-hi-bi-tion" }
    ],
    category: "Music & Arts",
    createdAt: new Date().toISOString()
  }
];

interface ReportCardProps {
  assignmentId: number;
  onClose: () => void;
}

interface AssignmentScoreDisplayProps {
  assignmentId: number;
}

function AssignmentScoreDisplay({ assignmentId }: AssignmentScoreDisplayProps) {
  const { data: queryData } = useQuery({
    queryKey: ['/api/assignments', assignmentId, 'results'],
    enabled: !!assignmentId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  const results = queryData?.data || [];

  if (results.length === 0) {
    return null;
  }

  const averageScore = results.reduce((sum: number, r: any) => sum + r.pronunciationScore, 0) / results.length;
  const completedCount = results.filter((r: any) => r.pronunciationScore > 70).length;
  
  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded text-xs">
      <Award className="w-3 h-3 text-blue-600" />
      <span className="font-medium text-blue-800">
        {Math.round(averageScore)}% ({completedCount}/{results.length})
      </span>
    </div>
  );
}

function ReportCard({ assignmentId, onClose }: ReportCardProps) {
  // Get assignment details for the scorecard
  const { data: assignmentData } = useQuery({
    queryKey: ['/api/assignments', assignmentId],
    enabled: !!assignmentId
  });
  const assignment = assignmentData?.data;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent aria-labelledby="report-card-title" aria-describedby="report-card-description" className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle id="report-card-title" className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Assignment Report Card
          </DialogTitle>
          <DialogDescription id="report-card-description">
            Comprehensive performance analysis and detailed scoring breakdown
          </DialogDescription>
        </DialogHeader>

        <AssignmentScorecard 
          assignmentId={assignmentId}
          assignmentTitle={assignment?.title || 'Assignment'}
          isTherapistView={true}
        />
      </DialogContent>
    </Dialog>
  );
}
export default function TherapistPortal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [selectedTab, setSelectedTab] = useState("clients");
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showReportCard, setShowReportCard] = useState<number | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<AssignmentTemplate[]>(PREDEFINED_TEMPLATES);
  const [assignmentMode, setAssignmentMode] = useState<"existing" | "email">("existing");
  const [clientEmail, setClientEmail] = useState("");
  const [editingAssignment, setEditingAssignment] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientFirstName, setNewClientFirstName] = useState("");
  const [newClientLastName, setNewClientLastName] = useState("");
  const [showAssignAssignmentModal, setShowAssignAssignmentModal] = useState(false);
  const [showAppleAssignmentModal, setShowAppleAssignmentModal] = useState(false);
  const [selectedPatientForAssignment, setSelectedPatientForAssignment] = useState<User | null>(null);
  
  // Performance and accessibility states
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [tabsLoading, setTabsLoading] = useState<Record<string, boolean>>({});
  
  // Workflow tools states
  const [showWorkflowTools, setShowWorkflowTools] = useState(false);

  // Assignment form state
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("4");
  const [selectedTemplate, setSelectedTemplate] = useState<AssignmentTemplate | null>(null);
  const [generatedWords, setGeneratedWords] = useState<Array<{ text: string; syllabication: string }>>([]);
  const [wordSuggestions, setWordSuggestions] = useState<Array<{ text: string; syllabication: string }>>([]);
  const [customTopic, setCustomTopic] = useState("");
  const [contentGenerationMode, setContentGenerationMode] = useState("sounds");
  const [soundPosition, setSoundPosition] = useState("starts-with");
  const [selectedSound, setSelectedSound] = useState("");
  const [isGeneratingSoundWords, setIsGeneratingSoundWords] = useState(false);
  const [wordPairs, setWordPairs] = useState<Array<{ word1: string; word2: string }>>([]);
  const [selectedWordPairs, setSelectedWordPairs] = useState<Array<{ word1: string; word2: string }>>([]);
  const [isGeneratingWordPairs, setIsGeneratingWordPairs] = useState(false);

  // Data queries
  const { data: clientsData = { clients: [] } } = useQuery({ queryKey: ['/api/therapist/clients'] }) as { data: { clients: any[] } };
  const { data: assignmentsData = [] } = useQuery({ queryKey: ['/api/therapist/assignments'] });
  const assignments = assignmentsData.data || assignmentsData || [];
  const { data: contentLibrary = [], isLoading: isContentLibraryLoading } = useQuery({ queryKey: ['/api/therapist/library'] });

  const clients = clientsData.data?.clients || clientsData.clients || [];
  
  // Debug logging

  const filteredClients = clients.filter((client: User) => {
    if (!clientSearchTerm) return true; // Show all if no search term
    const searchLower = clientSearchTerm.toLowerCase();
    return (
      client.username?.toLowerCase().includes(searchLower) ||
      client.firstName?.toLowerCase().includes(searchLower) ||
      client.lastName?.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower)
    );
  });

  // Get assignments for selected client
  const clientAssignments = selectedClient
    ? assignments.filter((assignment: Assignment) => assignment.userId === selectedClient.id)
    : [];

  // Enhanced tab change handler with loading states and performance optimization
  const handleTabChange = (newTab: string) => {
    // Prevent unnecessary re-renders if same tab is clicked
    if (newTab === selectedTab) return;
    
    setTabsLoading(prev => ({ ...prev, [newTab]: true }));
    setSelectedTab(newTab);
    
    // Announce tab change for screen readers
    announcer.announce(`Switched to ${newTab.replace('-', ' ')} tab`);
    
    // Optimize loading time based on tab complexity
    const loadingTime = newTab === 'analytics' ? 500 : newTab === 'smart-creator' ? 400 : 300;
    
    setTimeout(() => {
      setTabsLoading(prev => ({ ...prev, [newTab]: false }));
    }, loadingTime);
  };

  // Workflow handlers
  const handleBulkAction = async (action: string, selectedItems: string[], data?: any) => {
    setIsPageLoading(true);
    announcer.announce(`Processing ${action} for ${selectedItems.length} items`, 'assertive');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccessMessage(`${action} completed successfully for ${selectedItems.length} items`);
      setShowSuccessAnimation(true);
      announcer.announce(`${action} completed successfully`, 'assertive');
      
    } catch (error) {
      announcer.announce(`Error processing ${action}`, 'assertive');
      toast({ 
        title: "Bulk Action Failed", 
        description: `Failed to ${action}. Please try again.`,
        variant: "destructive" 
      });
    } finally {
      setIsPageLoading(false);
    }
  };

  const handleScheduleAssignment = async (assignmentData: any, scheduledDate: Date) => {
    setIsPageLoading(true);
    announcer.announce('Scheduling assignment', 'assertive');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSuccessMessage(`Assignment scheduled for ${scheduledDate.toLocaleDateString()}`);
      setShowSuccessAnimation(true);
      announcer.announce('Assignment scheduled successfully', 'assertive');
      
    } catch (error) {
      announcer.announce('Error scheduling assignment', 'assertive');
      toast({ 
        title: "Scheduling Failed", 
        description: "Failed to schedule assignment. Please try again.",
        variant: "destructive" 
      });
    } finally {
      setIsPageLoading(false);
    }
  };

  const handleVoiceInput = (transcript: string) => {
    // Handle voice input by updating relevant form fields
    if (showAssignmentForm) {
      if (!assignmentDescription) {
        setAssignmentDescription(transcript);
      } else {
        setAssignmentDescription(prev => prev + ' ' + transcript);
      }
    }
    announcer.announce('Voice input processed');
  };

  // Mutations
  const addClientMutation = useMutation({
    mutationFn: async ({ email, firstName, lastName }: { email: string; firstName: string; lastName: string }) => {
      const response = await apiRequest('/api/therapist/clients', {
        method: 'POST',
        body: JSON.stringify({ 
          clientEmail: email,
          firstName: firstName.trim(),
          lastName: lastName.trim()
        })
      });
      return response;
    },
    onMutate: async ({ email, firstName, lastName }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/therapist/clients'] });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['/api/therapist/clients']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['/api/therapist/clients'], (old: any) => {
        if (!old) return old;
        
        // Create a temporary client entry
        const tempClient = {
          id: `temp-${Date.now()}`,
          email: email,
          firstName: firstName || null,
          lastName: lastName || null,
          username: `${email.split('@')[0]}_temp`,
          isTemporary: true // Flag to identify temporary entries
        };
        
        return {
          ...old,
          clients: [...(old.clients || []), tempClient]
        };
      });
      
      // Return a context object with the snapshotted value
      return { previousData };
    },
    onSuccess: (data, variables) => {
      // Update the cache with the new client data
      queryClient.setQueryData(['/api/therapist/clients'], (old: any) => {
        if (!old) return old;
        
        // Remove temporary optimistic updates and add real client
        const filteredClients = old.clients?.filter((client: any) => !client.isTemporary) || [];
        
        // Handle both response formats consistently
        const newClient = data.data?.client || data.client || data;
        
        // Ensure the new client has all required fields
        if (!newClient || !newClient.id) {
          console.error('❌ Invalid client data received:', data);
          return old;
        }
        
        console.log('🔄 Adding client to cache:', newClient);
        
        return {
          ...old,
          clients: [...filteredClients, newClient]
        };
      });
      
      // Force immediate refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/clients'] });
      
      handleCloseAddClientModal();
      
      // Show success toast
      toast({ 
        title: "Patient added successfully!",
        description: data.message || "The patient is now available for assignments."
      });
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousData) {
        queryClient.setQueryData(['/api/therapist/clients'], context.previousData);
      }
      toast({ title: "Error adding patient", description: error.message, variant: "destructive" });
    }
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (assignmentData: any) => {
      const response = await apiRequest('/api/assignments', {
        method: 'POST',
        body: JSON.stringify(assignmentData)
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/assignments'] });
      if (assignmentMode === "email") {
        toast({ title: "Assignment created and invitation email sent!" });
      } else {
        toast({ title: "Assignment created and email sent to client!" });
      }
      resetAssignmentForm();
    },
    onError: (error: any) => {
      toast({ title: "Error creating assignment", description: error.message, variant: "destructive" });
    }
  });

  const generateContentMutation = useMutation({
    mutationFn: async ({ topic, difficulty }: { topic: string; difficulty: string }) => {
      const response = await apiRequest('/api/content/generate-topic-phrases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          topic, 
          difficulty, 
          type: "words",
          count: 8 
        })
      });
      return response.words || response;
    },
    onSuccess: (words) => {
      setGeneratedWords(words);
    },
    onError: (error: any) => {
      toast({ title: "Error generating content", description: error.message, variant: "destructive" });
    }
  });

  const generateTopicWordsMutation = useMutation({
    mutationFn: async ({ topic, difficulty, count }: { topic: string; difficulty: string; count: number }) => {
      const response = await apiRequest('/api/content/generate-topic-phrases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          topic, 
          difficulty, 
          type: "words",
          count: count || 20
        })
      });
      
      // Handle both response formats
      const words = response.data?.phrases || response.phrases || response.words || response;
      
      // Convert to the expected format with syllabication
      const formattedWords = words.map((word: any) => {
        if (typeof word === 'string') {
          return { text: word, syllabication: word };
        }
        return { text: word.text || word, syllabication: word.syllabication || word.text || word };
      });
      
      return formattedWords;
    },
    onSuccess: (words) => {
      setWordSuggestions(words);
      
      // Auto-populate assignment title and description when generating custom topic words
      if (!assignmentTitle.trim()) {
        setAssignmentTitle(`${customTopic.charAt(0).toUpperCase() + customTopic.slice(1)} Practice`);
      }
      if (!assignmentDescription.trim()) {
        setAssignmentDescription(`Practice pronunciation with words related to ${customTopic.toLowerCase()}. Drag words from the suggestions to build your custom assignment.`);
      }
      
      toast({
        title: "Words Generated!",
        description: `Generated ${words.length} words for "${customTopic}". Drag them to create your assignment.`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Error generating topic words", description: error.message, variant: "destructive" });
    }
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (template: Omit<AssignmentTemplate, 'id' | 'createdAt'>) => {
      // In a real app, this would save to the database
      const newTemplate: AssignmentTemplate = {
        ...template,
        id: `custom-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      setSavedTemplates(prev => [...prev, newTemplate]);
      return newTemplate;
    },
    onSuccess: () => {
      toast({ title: "Template saved successfully!" });
    }
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ assignmentId, title, description }: { assignmentId: number; title: string; description: string }) => {
      const response = await apiRequest(`/api/assignments/${assignmentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title, description })
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/assignments'] });
      toast({ title: "Assignment updated successfully!" });
      setEditingAssignment(null);
      setEditTitle("");
      setEditDescription("");
    },
    onError: (error: any) => {
      toast({ title: "Error updating assignment", description: error.message, variant: "destructive" });
    }
  });

  const sendAssignmentMutation = useMutation({
    mutationFn: async (data: {
      assignmentId: number;
      clientIds: string[];
      dueDate?: string;
      therapistNotes?: string;
    }) => {
      const response = await apiRequest('/api/therapist/assignments/send', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/assignments'] });
      toast({ 
        title: "Assignments sent successfully!", 
        description: `Assignment sent to ${data.emailsSent || 0} patient(s)`
      });
      setShowAssignAssignmentModal(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error sending assignments", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const removeClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const response = await apiRequest(`/api/therapist/clients/${clientId}`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/clients'] });
      toast({ title: "Patient removed successfully!" });
      setSelectedClient(null);
    },
    onError: (error: any) => {
      toast({ title: "Error removing patient", description: error.message, variant: "destructive" });
    }
  });

  // Event handlers
    const handleAddClient = () => {
      setShowAddClientModal(true);
    };

    const handleRemovePatient = (clientId: string) => {
      if (window.confirm("Are you sure you want to remove this patient? This action cannot be undone.")) {
        removeClientMutation.mutate(clientId);
      }
    };


  const handleSubmitAddClient = () => {
    if (newClientEmail.trim() && newClientFirstName.trim() && newClientLastName.trim()) {
      addClientMutation.mutate({
        email: newClientEmail.trim(),
        firstName: newClientFirstName.trim(),
        lastName: newClientLastName.trim()
      });
    }
  };

  const handleCloseAddClientModal = () => {
    setShowAddClientModal(false);
    setNewClientEmail("");
    setNewClientFirstName("");
    setNewClientLastName("");
  };

  const handleGenerateContent = () => {
    if (customTopic.trim()) {
      generateContentMutation.mutate({ 
        topic: customTopic.trim(), 
        difficulty: selectedDifficulty 
      });
    }
  };

  const handleGenerateTopicWords = () => {
    if (customTopic.trim()) {
      // Generate 20 words for the topic
      generateTopicWordsMutation.mutate({ 
        topic: customTopic.trim(), 
        difficulty: selectedDifficulty,
        count: 20
      });
    }
  };

  const handleGenerateWordPairs = () => {
    if (selectedSound && soundPosition) {
      setIsGeneratingWordPairs(true);
      
      fetch('/api/content/generate-word-pairs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          soundPattern: selectedSound,
          position: soundPosition
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setWordPairs(data.data.pairs);
          setAssignmentTitle(`Word Pairs - ${selectedSound.toUpperCase()}`);
          setAssignmentDescription(`Practice making sentences with word pairs that ${soundPosition.replace('-', ' ')} "${selectedSound}".`);
        } else {
          toast({ 
            title: "Error generating word pairs", 
            description: data.message || "Failed to generate word pairs", 
            variant: "destructive" 
          });
        }
      })
      .catch(error => {
        console.error('Error generating word pairs:', error);
        toast({ 
          title: "Error generating word pairs", 
          description: "Failed to generate word pairs. Please try again.", 
          variant: "destructive" 
        });
      })
      .finally(() => {
        setIsGeneratingWordPairs(false);
      });
    }
  };

  const handleUseTemplate = (template: AssignmentTemplate) => {
    setSelectedTemplate(template);
    setAssignmentTitle(template.title);
    setAssignmentDescription(template.description);
    setGeneratedWords(template.words);
    
    // If it's a "Watch then Practice" template, switch to that mode
    if (template.assignmentType === 'watch-practice') {
      setContentGenerationMode('watch-practice');
      if (template.targetSound) {
        setSelectedSound(template.targetSound);
        setSoundPosition('starts-with'); // Default position
      }
    }
  };

  const handleCreateAssignment = () => {
    // Validate based on assignment mode
    const hasContent = contentGenerationMode === "word-pairs" ? selectedWordPairs.length > 0 : generatedWords.length > 0;
    
    if (assignmentMode === "existing") {
      if (!selectedClient || !assignmentTitle.trim() || !hasContent) {
        toast({ 
          title: `Please select a client, enter a title, and ${contentGenerationMode === "word-pairs" ? "select word pairs" : "generate content"}`, 
          variant: "destructive" 
        });
        return;
      }
    } else if (assignmentMode === "email") {
      if (!clientEmail.trim() || !assignmentTitle.trim() || !hasContent) {
        toast({ 
          title: `Please enter client email, title, and ${contentGenerationMode === "word-pairs" ? "select word pairs" : "generate content"}`, 
          variant: "destructive" 
        });
        return;
      }
      // Basic email validation
      if (!/\S+@\S+\.\S+/.test(clientEmail.trim())) {
        toast({ title: "Please enter a valid email address", variant: "destructive" });
        return;
      }
    }

    // Determine assignment type and create appropriate metadata
    const isWatchPracticeAssignment = contentGenerationMode === "watch-practice";
    const isWordPairsAssignment = contentGenerationMode === "word-pairs";
    
    let assignmentMetadata = null;
    if (isWatchPracticeAssignment) {
      assignmentMetadata = {
        assignmentType: 'watch-practice',
        soundPattern: {
          sound: selectedSound,
          position: soundPosition
        },
        structure: {
          wordsPerAssignment: 3,
          animationPlaysPerWord: 3,
          practiceAttemptsPerWord: 3,
          phrasesPerWord: 3
        }
      };
    } else if (isWordPairsAssignment) {
      assignmentMetadata = {
        assignmentType: 'word-pairs',
        soundPattern: {
          sound: selectedSound,
          position: soundPosition
        },
        selectedPairs: selectedWordPairs,
        instructions: "Make a sentence using both words from each pair. Say the sentence out loud three times."
      };
    }

    const assignmentData = assignmentMode === "existing" 
      ? {
          userId: selectedClient?.id,
          therapistId: user?.id,
          therapistName: user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user?.username || "Therapist",
          title: assignmentTitle.trim(),
          description: assignmentDescription.trim() + (isWatchPracticeAssignment ? 
            "\n\nFor each word, phrase, or sentence in the video, watch us say it first. Then you'll practice." : 
            isWordPairsAssignment ? "\n\nMake a sentence using both words from each pair. Say the sentence out loud three times." : ""),
          metadata: assignmentMetadata,
          items: isWordPairsAssignment 
            ? selectedWordPairs.map(pair => ({
                itemType: 'word-pair',
                content: `${pair.word1} + ${pair.word2}`,
                syllabication: `${pair.word1} / ${pair.word2}`,
                difficulty: selectedDifficulty,
                word1: pair.word1,
                word2: pair.word2,
                connection: pair.connection
              }))
            : generatedWords.slice(0, isWatchPracticeAssignment ? 3 : generatedWords.length).map(word => ({
                itemType: 'word',
                content: word.text,
                syllabication: word.syllabication,
                difficulty: selectedDifficulty
              }))
        }
      : {
          clientEmail: clientEmail.trim(),
          therapistId: user?.id,
          therapistName: user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user?.username || "Therapist",
          title: assignmentTitle.trim(),
          description: assignmentDescription.trim() + (isWatchPracticeAssignment ? 
            "\n\nFor each word, phrase, or sentence in the video, watch us say it first. Then you'll practice." : 
            isWordPairsAssignment ? "\n\nMake a sentence using both words from each pair. Say the sentence out loud three times." : ""),
          metadata: assignmentMetadata,
          items: isWordPairsAssignment 
            ? selectedWordPairs.map(pair => ({
                itemType: 'word-pair',
                content: `${pair.word1} + ${pair.word2}`,
                syllabication: `${pair.word1} / ${pair.word2}`,
                difficulty: selectedDifficulty,
                word1: pair.word1,
                word2: pair.word2,
                connection: pair.connection
              }))
            : generatedWords.slice(0, isWatchPracticeAssignment ? 3 : generatedWords.length).map(word => ({
                itemType: 'word',
                content: word.text,
                syllabication: word.syllabication,
                difficulty: selectedDifficulty
              }))
        };

    createAssignmentMutation.mutate(assignmentData);
  };

  const handleSaveAsTemplate = () => {
    if (!assignmentTitle.trim()) {
      toast({ title: "Title Required", description: "Please enter a title for the assignment before saving it as a template.", variant: "destructive" });
      return;
    }
    if (generatedWords.length === 0) {
      toast({ title: "Cannot Save Empty Template", description: "Please add at least one word to the assignment.", variant: "destructive" });
      return;
    }

    const template = {
      title: assignmentTitle.trim(),
      description: assignmentDescription.trim(),
      words: generatedWords,
      category: "Custom Template"
    };

    saveTemplateMutation.mutate(template);
  };

  const resetAssignmentForm = () => {
    setAssignmentTitle("");
    setAssignmentDescription("");
    setSelectedDifficulty("4");
    setSelectedTemplate(null);
    setGeneratedWords([]);
    setWordSuggestions([]);
    setWordPairs([]);
    setSelectedWordPairs([]);
    setCustomTopic("");
    setAssignmentMode("existing");
    setClientEmail("");
    setShowAssignmentForm(false);
    setContentGenerationMode("templates");
    setSoundPosition("starts-with");
    setSelectedSound("");
  };

  const handleStartEdit = (assignment: Assignment) => {
    setEditingAssignment(assignment.id);
    setEditTitle(assignment.title);
    setEditDescription(assignment.description || "");
  };

  const handleCancelEdit = () => {
    setEditingAssignment(null);
    setEditTitle("");
    setEditDescription("");
  };

  const handleSaveEdit = () => {
    if (editingAssignment && editTitle.trim()) {
      updateAssignmentMutation.mutate({
        assignmentId: editingAssignment,
        title: editTitle.trim(),
        description: editDescription.trim()
      });
    }
  };

  const handleGenerateSoundWords = async () => {
    if (!selectedSound || !soundPosition) return;
    
    setIsGeneratingSoundWords(true);
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/therapist/generate-words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          sound: selectedSound,
          position: soundPosition,
          difficulty: selectedDifficulty,
          count: 20
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate words');
      }

      const data = await response.json();
      const suggestions = data.data?.words?.phrases || [];
      setWordSuggestions(suggestions);
      
      toast({
        title: "Words Generated!",
        description: `Found ${suggestions.length} words that ${soundPosition.replace('-', ' ')} "${selectedSound}"`,
      });
    } catch (error) {
      console.error('Error generating sound words:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate words for the selected sound pattern.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSoundWords(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, word: any) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(word));
  };

  const handleDragStartPair = (e: React.DragEvent, pair: { word1: string; word2: string }) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'word-pair', data: pair }));
  };

  const addWordPairToAssignment = (pair: { word1: string; word2: string }) => {
    setSelectedWordPairs(prev => {
      if (!prev.find(p => p.word1 === pair.word1 && p.word2 === pair.word2)) {
        return [...prev, pair];
      }
      return prev;
    });
  };

  const removeWordPairFromAssignment = (index: number) => {
    setSelectedWordPairs(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dragData = e.dataTransfer.getData('text/plain');
    try {
      const parsedData = JSON.parse(dragData);
      if (parsedData.type === 'word-pair') {
        addWordPairToAssignment(parsedData.data);
      } else {
        addWordToAssignment(parsedData);
      }
    } catch (error) {
      console.error('Error parsing dropped item:', error);
    }
  };

  const addWordToAssignment = (word: any) => {
    if (!generatedWords.find(w => w.text === word.text)) {
      setGeneratedWords(prev => [...prev, word]);
      setWordSuggestions(prev => prev.filter(w => w.text !== word.text));
    }
  };

  const removeWordFromAssignment = (index: number) => {
    const removedWord = generatedWords[index];
    setGeneratedWords(prev => prev.filter((_, i) => i !== index));
    if (wordSuggestions.length > 0) {
      setWordSuggestions(prev => [...prev, removedWord]);
    }
  };

  if (!user || user.role !== 'therapist') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-gray-600">You need therapist access to view this portal.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="therapist-portal-container">
      <div className="portal-header">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="portal-title">
                Therapist Portal
              </h1>
              <p className="portal-subtitle">Manage your patients and create personalized speech therapy assignments</p>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <div className="stats-card">
                <div className="stats-number">{clients.length}</div>
                <div className="stats-label">Active Patients</div>
              </div>
              <div className="stats-card" style={{background: 'linear-gradient(135deg, var(--apple-green) 0%, #28CD41 100%)'}}>
                <div className="stats-number">{assignments.length}</div>
                <div className="stats-label">Total Assignments</div>
              </div>
              <div className="stats-card" style={{background: 'linear-gradient(135deg, var(--apple-orange) 0%, var(--apple-yellow) 100%)'}}>
                <div className="stats-number">{assignments.filter((a: Assignment) => !a.isCompleted).length}</div>
                <div className="stats-label">Active</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">

        <Tabs value={selectedTab} onValueChange={handleTabChange} className="w-full">
          <div 
            className="enhanced-tabs mb-8" 
            role="tablist" 
            aria-label="Therapist portal navigation"
            onKeyDown={(e) => {
              const tabs = ['clients', 'analytics', 'smart-creator', 'library', 'workflow'];
              const currentIndex = tabs.indexOf(selectedTab);
              if (e.key === KEYBOARD_KEYS.ARROW_LEFT || e.key === KEYBOARD_KEYS.ARROW_RIGHT) {
                e.preventDefault();
                let newIndex = currentIndex;
                if (e.key === KEYBOARD_KEYS.ARROW_LEFT) {
                  newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
                } else {
                  newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
                }
                handleTabChange(tabs[newIndex]);
              }
            }}
          >
            {[
              { id: 'clients', label: 'My Patients', icon: Users },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'smart-creator', label: 'Smart Creator', icon: TrendingUp },
              { id: 'library', label: 'Templates', icon: BookOpen },
              { id: 'workflow', label: 'Workflow Tools', icon: Zap }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`enhanced-tab ${selectedTab === tab.id ? 'active' : ''}`}
                  onClick={() => handleTabChange(tab.id)}
                  onKeyDown={(e) => {
                    const tabs = ['clients', 'analytics', 'smart-creator', 'library', 'workflow'];
                    keyboardNavigation.handleTabNavigation(e, tabs, selectedTab, handleTabChange);
                  }}
                  role="tab"
                  aria-selected={selectedTab === tab.id}
                  aria-controls={`${tab.id}-panel`}
                  tabIndex={selectedTab === tab.id ? 0 : -1}
                  disabled={tabsLoading[tab.id]}
                >
                  <Icon className="h-4 w-4 inline-block mr-2" />
                  {tab.label}
                  {tabsLoading[tab.id] && (
                    <div className="inline-block ml-2 animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          <TabsContent value="clients" className="space-y-6" role="tabpanel" id="clients-panel">
            {tabsLoading.clients ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <PatientListSkeleton />
                <div className="lg:col-span-2">
                  <div className="enhanced-card">
                    <div className="enhanced-card-content flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className="animate-spin h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading patient details...</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Patient List */}
              <div className="lg:col-span-1">
                <div className="enhanced-card">
                  <div className="enhanced-card-header">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">Patient List ({filteredClients.length})</h3>
                      <div className="flex gap-2">
                        <button
                          className="btn-secondary p-2"
                          onClick={() => setShowAssignAssignmentModal(true)}
                          disabled={clients.length === 0 || !Array.isArray(contentLibrary) || contentLibrary.length === 0 || isContentLibraryLoading}
                          title="Send Assignment to Patients"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                        <button
                          className="btn-primary p-2"
                          onClick={handleAddClient}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="enhanced-search">
                      <Search className="enhanced-search-icon h-4 w-4" />
                      <input
                        className="enhanced-search-input"
                        placeholder="Search patients..."
                        value={clientSearchTerm}
                        onChange={(e) => setClientSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="enhanced-card-content">
                    <div className="space-y-3">
                      {/* Active Clients */}
                      <div className="space-y-3">
                        {filteredClients.length === 0 ? (
                          <div className="text-center py-8" role="status" aria-live="polite">
                            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
                            <p className="text-gray-500">No active patients</p>
                          </div>
                        ) : (
                          filteredClients.map((client: User, index) => (
                            <div
                              key={client.id}
                              className={`patient-card ${selectedClient?.id === client.id ? 'selected' : ''}`}
                              onClick={() => {
                                setSelectedClient(client);
                                announcer.announce(`Selected patient ${client.firstName && client.lastName ? `${client.firstName} ${client.lastName}` : client.username}`);
                              }}
                              role="button"
                              tabIndex={0}
                              aria-label={`Select patient ${client.firstName && client.lastName ? `${client.firstName} ${client.lastName}` : client.username}, ${client.email}`}
                              onKeyDown={(e) => {
                                if (e.key === KEYBOARD_KEYS.ENTER || e.key === KEYBOARD_KEYS.SPACE) {
                                  e.preventDefault();
                                  setSelectedClient(client);
                                  announcer.announce(`Selected patient ${client.firstName && client.lastName ? `${client.firstName} ${client.lastName}` : client.username}`);
                                } else if (e.key === KEYBOARD_KEYS.ARROW_DOWN || e.key === KEYBOARD_KEYS.ARROW_UP) {
                                  e.preventDefault();
                                  const direction = e.key === KEYBOARD_KEYS.ARROW_DOWN ? 1 : -1;
                                  const nextIndex = index + direction;
                                  if (nextIndex >= 0 && nextIndex < filteredClients.length) {
                                    const nextClient = filteredClients[nextIndex];
                                    const nextElement = document.querySelector(`[data-client-id="${nextClient.id}"]`) as HTMLElement;
                                    nextElement?.focus();
                                  }
                                }
                              }}
                              data-client-id={client.id}
                            >
                              <div className="flex items-center">
                                <div className="patient-info">
                                  <div className="patient-name">
                                    {client.firstName && client.lastName
                                      ? `${client.firstName} ${client.lastName}`
                                      : client.username}
                                  </div>
                                  <div className="patient-email">{client.email}</div>
                                </div>
                                
                                {/* Three dots menu */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button 
                                      className="btn-secondary h-8 w-8 p-0 ml-3" 
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedPatientForAssignment(client);
                                      setShowAppleAssignmentModal(true);
                                    }}>
                                      <FileText className="mr-2 h-4 w-4" />
                                      Create Assignment
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSelectedClient(client)}>
                                      <BarChart3 className="mr-2 h-4 w-4" />
                                      View Progress
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      className="text-red-600"
                                      onClick={() => {
                                        handleRemovePatient(client.id);
                                      }}
                                    >
                                      <UserMinus className="mr-2 h-4 w-4" />
                                      Remove Patient
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Details & Assignments */}
              <div className="lg:col-span-2">
                {selectedClient ? (
                  <div className="space-y-6">
                    {/* Patient Info */}
                    <div className="enhanced-card">
                      <div className="enhanced-card-header">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="patient-avatar" style={{width: '60px', height: '60px', fontSize: '1.5rem'}}>
                              {(selectedClient.firstName?.[0] || selectedClient.username?.[0] || 'U').toUpperCase()}
                            </div>
                            <div>
                              <h3 className="text-xl font-semibold">
                                {selectedClient.firstName && selectedClient.lastName
                                  ? `${selectedClient.firstName} ${selectedClient.lastName}`
                                  : selectedClient.username}
                              </h3>
                              <p className="text-gray-600">{selectedClient.email}</p>
                            </div>
                          </div>
                          <button 
                            className="btn-primary"
                            onClick={() => setShowAssignmentForm(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            New Assignment
                          </button>
                        </div>
                      </div>
                      <div className="enhanced-card-content">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="stats-card" style={{background: 'linear-gradient(135deg, var(--apple-blue) 0%, var(--apple-blue-light) 100%)'}}>
                            <div className="stats-number">{clientAssignments.length}</div>
                            <div className="stats-label">Total Assignments</div>
                          </div>
                          <div className="stats-card" style={{background: 'linear-gradient(135deg, var(--apple-green) 0%, #28CD41 100%)'}}>
                            <div className="stats-number">{clientAssignments.filter((a: Assignment) => a.isCompleted).length}</div>
                            <div className="stats-label">Completed</div>
                          </div>
                          <div className="stats-card" style={{background: 'linear-gradient(135deg, var(--apple-orange) 0%, var(--apple-yellow) 100%)'}}>
                            <div className="stats-number">{clientAssignments.filter((a: Assignment) => !a.isCompleted).length}</div>
                            <div className="stats-label">In Progress</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Assignments */}
                    <div className="enhanced-card">
                      <div className="enhanced-card-header">
                        <h3 className="text-lg font-semibold">Assignments</h3>
                      </div>
                      <div className="enhanced-card-content">
                        {clientAssignments.length === 0 ? (
                          <div className="text-center py-12">
                            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 font-medium">No assignments yet</p>
                            <p className="text-sm text-gray-500 mt-2">Create the first assignment for this patient</p>
                            <button 
                              className="btn-primary mt-4"
                              onClick={() => setShowAssignmentForm(true)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create First Assignment
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {clientAssignments.map((assignment: Assignment) => (
                              <div
                                key={assignment.id}
                                className="assignment-card"
                              >
                                {editingAssignment === assignment.id ? (
                                  // Edit mode
                                  <div className="space-y-4">
                                    <div>
                                      <label className="text-sm font-medium text-gray-700 mb-2 block">Title</label>
                                      <input
                                        className="enhanced-search-input"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        placeholder="Assignment title"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-700 mb-2 block">Description</label>
                                      <textarea
                                        className="enhanced-search-input"
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        placeholder="Assignment description"
                                        rows={3}
                                        style={{resize: 'vertical'}}
                                      />
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <button
                                        className="btn-success"
                                        onClick={handleSaveEdit}
                                        disabled={updateAssignmentMutation.isPending || !editTitle.trim()}
                                      >
                                        <Save className="h-4 w-4 mr-2" />
                                        {updateAssignmentMutation.isPending ? "Saving..." : "Save"}
                                      </button>
                                      <button
                                        className="btn-secondary"
                                        onClick={handleCancelEdit}
                                        disabled={updateAssignmentMutation.isPending}
                                      >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  // View mode
                                  <div 
                                    className="cursor-pointer"
                                    onClick={() => setShowReportCard(assignment.id)}
                                  >
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex-1">
                                        <div className="assignment-title">{assignment.title}</div>
                                        <div className="assignment-description">{assignment.description}</div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          className="btn-secondary h-8 w-8 p-0"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleStartEdit(assignment);
                                          }}
                                        >
                                          <Edit3 className="h-4 w-4" />
                                        </button>
                                        <div className="flex items-center gap-2">
                                          {assignment.isCompleted && (
                                            <AssignmentScoreDisplay assignmentId={assignment.id} />
                                          )}
                                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                                            assignment.isCompleted 
                                              ? 'bg-green-100 text-green-800' 
                                              : 'bg-blue-100 text-blue-800'
                                          }`}>
                                            {assignment.isCompleted ? "Completed" : "In Progress"}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="assignment-meta">
                                      <span>📄 Assignment</span>
                                      <span>Created {new Date(assignment.createdAt).toLocaleDateString()}</span>
                                      {assignment.isCompleted && assignment.completedAt && (
                                        <span>✅ Completed {new Date(assignment.completedAt).toLocaleDateString()}</span>
                                      )}
                                      <span className="flex items-center gap-1">
                                        <BarChart3 className="h-3 w-3" />
                                        View Report
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="enhanced-card">
                    <div className="enhanced-card-content flex items-center justify-center h-64">
                      <div className="text-center">
                        <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">Select a patient to view their assignments</p>
                        <p className="text-sm text-gray-500 mt-2">Choose a patient from the list to see their progress and create assignments</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Assignment Creation Modal */}
            {showAssignmentForm && (
              <Dialog open={showAssignmentForm} onOpenChange={() => setShowAssignmentForm(false)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Assignment</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Assignment Mode Selection */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-3 block">Assign To</label>
                        <div className="flex gap-4 mb-4">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              name="assignmentMode"
                              value="existing"
                              checked={assignmentMode === "existing"}
                              onChange={(e) => setAssignmentMode(e.target.value as "existing" | "email")}
                              className="text-blue-600"
                            />
                            <span>Existing Client</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              name="assignmentMode"
                              value="email"
                              checked={assignmentMode === "email"}
                              onChange={(e) => setAssignmentMode(e.target.value as "existing" | "email")}
                              className="text-blue-600"
                            />
                            <span>Email Address</span>
                          </label>
                        </div>
                        
                        {assignmentMode === "existing" ? (
                          <div className="p-3 bg-blue-50 rounded-lg border">
                            <div className="text-sm font-medium text-blue-800">
                              Selected Client: {selectedClient ? 
                                (selectedClient.firstName && selectedClient.lastName 
                                  ? `${selectedClient.firstName} ${selectedClient.lastName}` 
                                  : selectedClient.username) 
                                : "None selected"}
                            </div>
                            {selectedClient && (
                              <div className="text-sm text-blue-600">{selectedClient.email}</div>
                            )}
                            {!selectedClient && (
                              <div className="text-sm text-blue-600 mt-1">
                                Please select a client from the left panel first
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <Input
                              value={clientEmail}
                              onChange={(e) => setClientEmail(e.target.value)}
                              placeholder="Enter client's email address"
                              type="email"
                            />
                            <p className="text-sm text-gray-600 mt-1">
                              The client will receive an invitation email if they don't have an account
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Assignment Title</label>
                        <Input
                          value={assignmentTitle}
                          onChange={(e) => setAssignmentTitle(e.target.value)}
                          placeholder="e.g., R Sound Practice"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Difficulty Level</label>
                        <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DIFFICULTY_LEVELS.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        value={assignmentDescription}
                        onChange={(e) => setAssignmentDescription(e.target.value)}
                        placeholder="Describe the assignment goals..."
                        rows={3}
                      />
                    </div>

                    {/* Content Generation */}
                    <Separator />
                    
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Assignment Content
                      </h3>
                      
                      {/* Content Generation Tabs */}
                      <Tabs value={contentGenerationMode} onValueChange={setContentGenerationMode} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="sounds">Sound Patterns</TabsTrigger>
                          <TabsTrigger value="templates">Topics</TabsTrigger>
                          <TabsTrigger value="exercises">Custom Exercises</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="templates" className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Choose from Topics</label>
                            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                              {savedTemplates.map((template) => (
                                <Button
                                  key={template.id}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUseTemplate(template)}
                                  className="justify-start"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  {template.title}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="sounds" className="space-y-4">
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">Sound Position</label>
                              <div className="flex gap-2">
                                {['starts-with', 'contains', 'ends-with'].map((position) => (
                                  <Button
                                    key={position}
                                    variant={soundPosition === position ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSoundPosition(position)}
                                    className="capitalize"
                                  >
                                    {position.replace('-', ' ')}
                                  </Button>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium mb-2 block">Select Sound</label>
                              <div className="space-y-3">
                                <div>
                                  <div className="text-xs text-gray-600 mb-1">Consonant Sounds</div>
                                  <div className="flex flex-wrap gap-1">
                                    {['s', 'r', 'l', 'th', 'sh', 'ch', 'f', 'v', 'k', 'g', 'p', 'b', 't', 'd', 'm', 'n'].map((sound) => (
                                      <Button
                                        key={sound}
                                        variant={selectedSound === sound ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedSound(sound)}
                                        className="min-w-[40px] h-8"
                                      >
                                        {sound}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="text-xs text-gray-600 mb-1">Vowel Sounds</div>
                                  <div className="flex flex-wrap gap-1">
                                    {['a', 'e', 'i', 'o', 'u', 'ay', 'ee', 'igh', 'ow', 'oo'].map((sound) => (
                                      <Button
                                        key={sound}
                                        variant={selectedSound === sound ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedSound(sound)}
                                        className="min-w-[40px] h-8"
                                      >
                                        {sound}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <Button 
                              onClick={handleGenerateSoundWords}
                              disabled={isGeneratingSoundWords || !selectedSound || !soundPosition}
                              className="w-full"
                            >
                              {isGeneratingSoundWords ? (
                                <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" /> Loading...</>
                              ) : (
                                `Generate words that ${soundPosition.replace('-', ' ')} "${selectedSound}"`
                              )}
                            </Button>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="exercises" className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Watch then Practice Card */}
                            <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 hover:border-blue-400 transition-colors cursor-pointer">
                              <div className="text-center">
                                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                  <Eye className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2">Watch then Practice</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                  Students watch animations up to 3 times, then practice words individually and in phrases
                                </p>
                                <Button 
                                  variant="outline" 
                                  className="w-full"
                                  onClick={() => setContentGenerationMode("watch-practice")}
                                >
                                  Create Exercise
                                </Button>
                              </div>
                            </div>

                            {/* Word Pairs Card */}
                            <div className="p-4 border-2 border-dashed border-purple-300 rounded-lg bg-purple-50 hover:border-purple-400 transition-colors cursor-pointer">
                              <div className="text-center">
                                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                  <Zap className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2">Word Pairs</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                  Students make sentences using both words from each pair and say them out loud three times
                                </p>
                                <Button 
                                  variant="outline" 
                                  className="w-full"
                                  onClick={() => setContentGenerationMode("word-pairs")}
                                >
                                  Create Exercise
                                </Button>
                              </div>
                            </div>

                            {/* Custom Topic Card */}
                            <div className="p-4 border-2 border-dashed border-green-300 rounded-lg bg-green-50 hover:border-green-400 transition-colors cursor-pointer">
                              <div className="text-center">
                                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                  <FileText className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2">Custom Topic</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                  Generate practice words based on a specific topic or theme
                                </p>
                                <Button 
                                  variant="outline" 
                                  className="w-full"
                                  onClick={() => setContentGenerationMode("custom-topic")}
                                >
                                  Create Exercise
                                </Button>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="custom-topic" className="space-y-4">
                          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <h4 className="font-semibold text-green-800 mb-2">Custom Topic Exercise</h4>
                            <p className="text-sm text-green-700 mb-4">
                              Generate 20 practice words based on a specific topic or theme. Drag words from the suggestions to create your assignment.
                            </p>
                            
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium mb-2 block">Topic or Theme</label>
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="Enter topic (e.g., 'Animals', 'Food', 'Transportation')"
                                    value={customTopic}
                                    onChange={(e) => setCustomTopic(e.target.value)}
                                    className="flex-1"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && customTopic.trim()) {
                                        handleGenerateTopicWords();
                                      }
                                    }}
                                  />
                                  <Button 
                                    onClick={handleGenerateTopicWords}
                                    disabled={generateContentMutation.isPending || !customTopic.trim()}
                                  >
                                    {generateContentMutation.isPending ? (
                                      <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" /> Loading...</>
                                    ) : (
                                      "Generate 20 Words"
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="watch-practice" className="space-y-4">
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="font-semibold text-blue-800 mb-2">Watch then Practice Exercise</h4>
                            <p className="text-sm text-blue-700 mb-4">
                              Create an assignment where students first watch pronunciation animations, then practice the words individually and in phrases.
                            </p>
                            
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium mb-2 block">Sound Position</label>
                                <div className="flex gap-2">
                                  {['starts-with', 'contains', 'ends-with'].map((position) => (
                                    <Button
                                      key={position}
                                      variant={soundPosition === position ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setSoundPosition(position)}
                                      className="capitalize"
                                    >
                                      {position.replace('-', ' ')}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium mb-2 block">Select Sound</label>
                                <div className="space-y-3">
                                  <div>
                                    <div className="text-xs text-gray-600 mb-1">Consonant Sounds</div>
                                    <div className="flex flex-wrap gap-1">
                                      {['s', 'r', 'l', 'th', 'sh', 'ch', 'f', 'v', 'k', 'g', 'p', 'b', 't', 'd', 'm', 'n'].map((sound) => (
                                        <Button
                                          key={sound}
                                          variant={selectedSound === sound ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => setSelectedSound(sound)}
                                          className="min-w-[40px] h-8"
                                        >
                                          {sound}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <div className="text-xs text-gray-600 mb-1">Vowel Sounds</div>
                                    <div className="flex flex-wrap gap-1">
                                      {['a', 'e', 'i', 'o', 'u', 'ay', 'ee', 'igh', 'ow', 'oo'].map((sound) => (
                                        <Button
                                          key={sound}
                                          variant={selectedSound === sound ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => setSelectedSound(sound)}
                                          className="min-w-[40px] h-8"
                                        >
                                          {sound}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <Button 
                                onClick={handleGenerateSoundWords}
                                disabled={isGeneratingSoundWords || !selectedSound || !soundPosition}
                                className="w-full"
                              >
                                {isGeneratingSoundWords ? (
                                  <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" /> Loading...</>
                                ) : (
                                  `Generate words that ${soundPosition.replace('-', ' ')} "${selectedSound}"`
                                )}
                              </Button>
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="word-pairs" className="space-y-4">
                          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <h4 className="font-semibold text-purple-800 mb-2">Word Pairs Exercise</h4>
                            <p className="text-sm text-purple-700 mb-4">
                              Create an assignment where students make sentences using both words from each pair and say them out loud three times.
                            </p>
                            
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium mb-2 block">Sound Position</label>
                                <div className="flex gap-2">
                                  {['starts-with', 'contains', 'ends-with'].map((position) => (
                                    <Button
                                      key={position}
                                      variant={soundPosition === position ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setSoundPosition(position)}
                                      className="capitalize"
                                    >
                                      {position.replace('-', ' ')}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium mb-2 block">Select Sound</label>
                                <div className="space-y-3">
                                  <div>
                                    <div className="text-xs text-gray-600 mb-1">Consonant Sounds</div>
                                    <div className="flex flex-wrap gap-1">
                                      {['s', 'r', 'l', 'th', 'sh', 'ch', 'f', 'v', 'k', 'g', 'p', 'b', 't', 'd', 'm', 'n'].map((sound) => (
                                        <Button
                                          key={sound}
                                          variant={selectedSound === sound ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => setSelectedSound(sound)}
                                          className="min-w-[40px] h-8"
                                        >
                                          {sound}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <div className="text-xs text-gray-600 mb-1">Vowel Sounds</div>
                                    <div className="flex flex-wrap gap-1">
                                      {['a', 'e', 'i', 'o', 'u', 'ay', 'ee', 'igh', 'ow', 'oo'].map((sound) => (
                                        <Button
                                          key={sound}
                                          variant={selectedSound === sound ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => setSelectedSound(sound)}
                                          className="min-w-[40px] h-8"
                                        >
                                          {sound}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <Button 
                                onClick={handleGenerateWordPairs}
                                disabled={isGeneratingWordPairs || !selectedSound || !soundPosition}
                                className="w-full"
                              >
                                {isGeneratingWordPairs ? (
                                  <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" /> Loading...</>
                                ) : (
                                  `Generate word pairs that ${soundPosition.replace('-', ' ')} "${selectedSound}"`
                                )}
                              </Button>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>

                    {/* Word Suggestions and Assignment Builder */}
                    {(wordSuggestions.length > 0 || generatedWords.length > 0 || wordPairs.length > 0) && (
                      <div className="grid grid-cols-2 gap-6">
                        {/* Word Pairs or Word Suggestions */}
                        {contentGenerationMode === "word-pairs" && wordPairs.length > 0 ? (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                              <label className="text-sm font-medium">Generated Word Pairs ({wordPairs.length})</label>
                            </div>
                            <div className="max-h-60 overflow-y-auto border rounded-lg p-3 bg-purple-50">
                              <div className="grid gap-2">
                                {wordPairs.map((pair, index) => (
                                  <div
                                    key={index}
                                    draggable
                                    onDragStart={(e) => handleDragStartPair(e, pair)}
                                    className="flex items-center justify-between p-2 bg-white rounded border cursor-move hover:shadow-md transition-shadow"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 font-medium">
                                        <span className="text-purple-700">{pair.word1}</span>
                                        <span className="text-gray-400">+</span>
                                        <span className="text-purple-700">{pair.word2}</span>
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => addWordPairToAssignment(pair)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : wordSuggestions.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <label className="text-sm font-medium">Word Suggestions ({wordSuggestions.length})</label>
                            </div>
                            <div className="max-h-60 overflow-y-auto border rounded-lg p-3 bg-blue-50">
                              <div className="grid gap-2">
                                {wordSuggestions.map((word, index) => (
                                  <div
                                    key={index}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, word)}
                                    className="flex items-center justify-between p-2 bg-white rounded border cursor-move hover:shadow-md transition-shadow"
                                  >
                                    <span className="font-medium">{word.text}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-600">{word.syllabication}</span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => addWordToAssignment(word)}
                                        className="h-6 w-6 p-0"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Assignment Words or Word Pairs */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${contentGenerationMode === "word-pairs" ? "bg-purple-500" : "bg-green-500"}`}></div>
                              <label className="text-sm font-medium">
                                {contentGenerationMode === "word-pairs" 
                                  ? `Assignment Word Pairs (${selectedWordPairs.length})` 
                                  : `Assignment Words (${generatedWords.length})`}
                              </label>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleSaveAsTemplate}
                              disabled={contentGenerationMode === "word-pairs" ? selectedWordPairs.length === 0 : generatedWords.length === 0}
                            >
                              Save as Template
                            </Button>
                          </div>
                          <div
                            className={`min-h-60 max-h-60 overflow-y-auto border-2 border-dashed rounded-lg p-3 ${
                              contentGenerationMode === "word-pairs" 
                                ? "border-purple-300 bg-purple-50" 
                                : "border-green-300 bg-green-50"
                            }`}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                          >
                            {(contentGenerationMode === "word-pairs" ? selectedWordPairs.length === 0 : generatedWords.length === 0) ? (
                              <div className="flex items-center justify-center h-full text-gray-500">
                                <div className="text-center">
                                  <Plus className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                  <p className="text-sm">
                                    {contentGenerationMode === "word-pairs" 
                                      ? "Drag word pairs here or use the + button" 
                                      : "Drag words here or use the + button"}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="grid gap-2">
                                {contentGenerationMode === "word-pairs" ? (
                                  selectedWordPairs.map((pair, index) => (
                                    <div 
                                      key={index} 
                                      className="flex items-center justify-between p-2 bg-white rounded border"
                                      onDragOver={handleDragOver}
                                      onDrop={handleDrop}
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 font-medium">
                                          <span className="text-purple-700">{pair.word1}</span>
                                          <span className="text-gray-400">+</span>
                                          <span className="text-purple-700">{pair.word2}</span>
                                        </div>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => removeWordPairFromAssignment(index)}
                                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))
                                ) : (
                                  generatedWords.map((word, index) => (
                                    <div 
                                      key={index} 
                                      className="flex items-center justify-between p-2 bg-white rounded border"
                                      onDragOver={handleDragOver}
                                      onDrop={handleDrop}
                                    >
                                      <span className="font-medium">{word.text}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-600">{word.syllabication}</span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => removeWordFromAssignment(index)}
                                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button variant="outline" onClick={resetAssignmentForm}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateAssignment}
                        disabled={
                          createAssignmentMutation.isPending || 
                          !assignmentTitle.trim() || 
                          (contentGenerationMode === "word-pairs" ? selectedWordPairs.length === 0 : generatedWords.length === 0) ||
                          (assignmentMode === "existing" && !selectedClient) ||
                          (assignmentMode === "email" && !clientEmail.trim())
                        }
                      >
                        {createAssignmentMutation.isPending ? "Creating..." : "Create Assignment"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Report Card Modal */}
            {showReportCard && (
              <ReportCard
                assignmentId={showReportCard}
                onClose={() => setShowReportCard(null)}
              />
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6" role="tabpanel" id="analytics-panel">
            {tabsLoading.analytics ? (
              <AnalyticsSkeleton />
            ) : (
              <AnalyticsDashboard clients={clients} assignments={assignments} />
            )}
          </TabsContent>

          <TabsContent value="smart-creator" className="space-y-6" role="tabpanel" id="smart-creator-panel">
            {tabsLoading['smart-creator'] ? (
              <SmartCreatorSkeleton />
            ) : (
              <SmartAssignmentCreator 
                selectedClient={selectedClient}
                clientAssignments={clientAssignments}
                onCreateAssignment={(data) => {
                  createAssignmentMutation.mutate({
                    ...data,
                    userId: selectedClient?.id,
                    therapistId: user?.id,
                    therapistName: user?.firstName && user?.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user?.username || "Therapist"
                  });
                  announcer.announce('Creating smart assignment', 'assertive');
                }}
                isLoading={createAssignmentMutation.isPending}
              />
            )}
          </TabsContent>

          <TabsContent value="library" role="tabpanel" id="library-panel">
            {tabsLoading.library ? (
              <TemplateLibrarySkeleton />
            ) : (
              <AdvancedTemplateLibrary
                onSelectTemplate={(template) => {
                  setSelectedTemplate(template);
                  setAssignmentTitle(template.title);
                  setAssignmentDescription(template.description);
                  setGeneratedWords(template.content.words.map(word => ({ text: word, syllabication: word })));
                  setShowAssignmentForm(true);
                  announcer.announce(`Template ${template.title} selected`);
                }}
                userRole={user?.role === 'therapist' ? 'therapist' : 'therapist'}
              />
            )}
          </TabsContent>

          <TabsContent value="workflow" className="space-y-6" role="tabpanel" id="workflow-panel">
            {tabsLoading.workflow ? (
              <div className="enhanced-card">
                <div className="enhanced-card-content flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading workflow tools...</p>
                  </div>
                </div>
              </div>
            ) : (
              <WorkflowTools
                clients={clients}
                assignments={assignments}
                onBulkAction={handleBulkAction}
                onScheduleAssignment={handleScheduleAssignment}
                onVoiceInput={handleVoiceInput}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Add Patient Modal */}
        {showAddClientModal && (
          <Dialog open={showAddClientModal} onOpenChange={handleCloseAddClientModal}>
            <DialogContent aria-labelledby="add-patient-title" aria-describedby="add-patient-description" className="max-w-md">
              <DialogHeader>
                <DialogTitle id="add-patient-title" className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Add New Patient
                </DialogTitle>
                <DialogDescription id="add-patient-description">
                  Fill in the details below to send an email invitation to your new patient.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">First Name</label>
                  <Input
                    value={newClientFirstName}
                    onChange={(e) => setNewClientFirstName(e.target.value)}
                    placeholder="Enter patient's first name"
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Last Name</label>
                  <Input
                    value={newClientLastName}
                    onChange={(e) => setNewClientLastName(e.target.value)}
                    placeholder="Enter patient's last name"
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Email Address</label>
                  <Input
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="Enter patient's email address"
                    className="w-full"
                  />
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    Your patient will receive an invitation email to join the platform.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={handleCloseAddClientModal}
                  disabled={addClientMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitAddClient}
                  disabled={
                    addClientMutation.isPending || 
                    !newClientEmail.trim() || 
                    !newClientFirstName.trim() || 
                    !newClientLastName.trim()
                  }
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {addClientMutation.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Assign Assignment Modal */}
        <AssignAssignmentModal
          isOpen={showAssignAssignmentModal}
          onClose={() => setShowAssignAssignmentModal(false)}
          clients={clients}
          contentLibrary={Array.isArray(contentLibrary) ? contentLibrary : []}
          onSendAssignment={sendAssignmentMutation.mutate}
          isLoading={sendAssignmentMutation.isPending}
          isContentLoading={isContentLibraryLoading}
        />

        {/* Apple Assignment Modal */}
        <AppleAssignmentModal
          isOpen={showAppleAssignmentModal}
          onClose={() => {
            setShowAppleAssignmentModal(false);
            setSelectedPatientForAssignment(null);
          }}
          selectedPatient={selectedPatientForAssignment}
        />

        {/* Loading Overlay */}
        {isPageLoading && (
          <LoadingOverlay message="Processing your request..." />
        )}

        {/* Success Animation */}
        {showSuccessAnimation && (
          <SuccessAnimation 
            message={successMessage}
            onComplete={() => {
              setShowSuccessAnimation(false);
              setSuccessMessage('');
            }}
          />
        )}

        {/* Accessibility live region for announcements */}
        <div
          id="accessibility-announcements"
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
        ></div>
      </div>
    </div>
  );
}
