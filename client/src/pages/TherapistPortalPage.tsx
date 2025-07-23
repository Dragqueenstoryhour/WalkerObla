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
import { Plus, Users, FileText, BookOpen, Search, Calendar, UserMinus, ChevronDown, ChevronUp, Trash2, TrendingUp, Award, AlertCircle, CheckCircle, X, BarChart3, Target, Edit3, Save, XCircle, MoreVertical, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Assignment, User } from "@shared/schema";
import ContentLibraryPage from "./ContentLibraryPage";
import AssignAssignmentModal from "@/components/modals/AssignAssignmentModal";

interface AssignmentTemplate {
  id: string;
  title: string;
  description: string;
  words: Array<{ text: string; syllabication: string }>;
  targetSound?: string;
  category?: string;
  createdAt: string;
}

const DIFFICULTY_LEVELS = [
  { value: "1", label: "Level 1 - Beginner" },
  { value: "2", label: "Level 2 - Easy" },
  { value: "3", label: "Level 3 - Easy-Medium" },
  { value: "4", label: "Level 4 - Medium" },
  { value: "5", label: "Level 5 - Medium-Hard" },
  { value: "6", label: "Level 6 - Hard" },
  { value: "7", label: "Level 7 - Expert" }
];

// Pre-generated assignment templates
const PREDEFINED_TEMPLATES: AssignmentTemplate[] = [
  {
    id: "template-1",
    title: "S Sound Practice",
    description: "Practice words containing the 's' sound for clear pronunciation",
    words: [
      { text: "sun", syllabication: "sun" },
      { text: "house", syllabication: "house" },
      { text: "music", syllabication: "mu-sic" },
      { text: "sister", syllabication: "sis-ter" },
      { text: "simple", syllabication: "sim-ple" },
      { text: "person", syllabication: "per-son" },
      { text: "surprise", syllabication: "sur-prise" },
      { text: "practice", syllabication: "prac-tice" }
    ],
    targetSound: "s",
    category: "Consonant Practice",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-2",
    title: "R Sound Mastery",
    description: "Focus on 'r' sound production and clarity",
    words: [
      { text: "red", syllabication: "red" },
      { text: "car", syllabication: "car" },
      { text: "friend", syllabication: "friend" },
      { text: "brother", syllabication: "broth-er" },
      { text: "surprise", syllabication: "sur-prise" },
      { text: "street", syllabication: "street" },
      { text: "bright", syllabication: "bright" },
      { text: "party", syllabication: "par-ty" }
    ],
    targetSound: "r",
    category: "Consonant Practice",
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
    title: "TH Sound Practice",
    description: "Master the challenging 'th' sound in various contexts",
    words: [
      { text: "think", syllabication: "think" },
      { text: "mother", syllabication: "moth-er" },
      { text: "bath", syllabication: "bath" },
      { text: "weather", syllabication: "weath-er" },
      { text: "three", syllabication: "three" },
      { text: "birthday", syllabication: "birth-day" },
      { text: "nothing", syllabication: "noth-ing" },
      { text: "healthy", syllabication: "health-y" }
    ],
    targetSound: "th",
    category: "Consonant Practice",
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
  }
];

interface ReportCardProps {
  assignmentId: number;
  onClose: () => void;
}

function ReportCard({ assignmentId, onClose }: ReportCardProps) {
  const { data: results = [] } = useQuery({
    queryKey: ['/api/assignments', assignmentId, 'results'],
    enabled: !!assignmentId
  });

  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    if (results.length > 0) {
      const correctWords = results.filter((r: any) => r.pronunciationScore > 70);
      const incorrectWords = results.filter((r: any) => r.pronunciationScore <= 70);
      
      // Generate insights
      apiRequest('/api/pronunciation/insights', {
        method: 'POST',
        body: JSON.stringify({ correctWords, incorrectWords })
      }).then(setInsights).catch(console.error);
    }
  }, [results]);

  const averageScore = results.length > 0 
    ? results.reduce((sum: number, r: any) => sum + r.pronunciationScore, 0) / results.length 
    : 0;

  const correctWords = results.filter((r: any) => r.pronunciationScore > 70);
  const incorrectWords = results.filter((r: any) => r.pronunciationScore <= 70);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Assignment Report Card
          </DialogTitle>
        </DialogHeader>

        {results.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No results available for this assignment yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{Math.round(averageScore)}%</div>
                    <div className="text-sm text-gray-600">Average Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{correctWords.length}</div>
                    <div className="text-sm text-gray-600">Words Mastered</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{incorrectWords.length}</div>
                    <div className="text-sm text-gray-600">Needs Practice</div>
                  </div>
                </div>
                <Progress value={averageScore} className="w-full" />
              </CardContent>
            </Card>

            {/* AI Insights */}
            {insights && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    AI Analysis & Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Key Insights</h4>
                    <p className="text-gray-700">{insights.insights}</p>
                  </div>
                  
                  {insights.soundsToFocus.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Sounds to Focus On</h4>
                      <div className="flex flex-wrap gap-2">
                        {insights.soundsToFocus.map((sound: string, index: number) => (
                          <Badge key={index} variant="outline">{sound}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-semibold mb-2">Overall Feedback</h4>
                    <p className="text-green-700">{insights.overallFeedback}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detailed Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Correct Words */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Words Done Correctly (Score &gt; 70%)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {correctWords.length === 0 ? (
                    <p className="text-gray-500">No words scored above 70% yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {correctWords.map((result: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                          <span className="font-medium">{result.itemPracticed}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="bg-green-600">{result.pronunciationScore}%</Badge>
                            <div className="text-xs text-gray-600">
                              A:{result.accuracy} F:{result.fluency} C:{result.completeness}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Incorrect Words */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="h-5 w-5" />
                    Words Needing Work (Score &lt; 70%)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {incorrectWords.length === 0 ? (
                    <p className="text-gray-500">Great! All attempted words scored above 70%.</p>
                  ) : (
                    <div className="space-y-2">
                      {incorrectWords.map((result: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-orange-50 rounded">
                          <span className="font-medium">{result.itemPracticed}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="bg-orange-600">{result.pronunciationScore}%</Badge>
                            <div className="text-xs text-gray-600">
                              A:{result.accuracy} F:{result.fluency} C:{result.completeness}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
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

  // Assignment form state
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("4");
  const [selectedTemplate, setSelectedTemplate] = useState<AssignmentTemplate | null>(null);
  const [generatedWords, setGeneratedWords] = useState<Array<{ text: string; syllabication: string }>>([]);
  const [customTopic, setCustomTopic] = useState("");

  // Data queries
  const { data: clientsData = { clients: [], pendingInvitations: [] } } = useQuery({ queryKey: ['/api/therapist/clients'] });
  const { data: assignments = [] } = useQuery({ queryKey: ['/api/therapist/assignments'] });
  const { data: contentLibrary = [], isLoading: isContentLibraryLoading } = useQuery({ queryKey: ['/api/therapist/library'] });

  const clients = clientsData.clients || [];
  const pendingInvitations = clientsData.pendingInvitations || [];

  const filteredClients = clients.filter((client: User) =>
    client.username?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    client.firstName?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    client.lastName?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(clientSearchTerm.toLowerCase())
  );

  // Get assignments for selected client
  const clientAssignments = selectedClient
    ? assignments.filter((assignment: Assignment) => assignment.userId === selectedClient.id)
    : [];

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
        const filteredPending = old.pendingInvitations?.filter((inv: any) => !inv.isTemporary) || [];
        
        // Handle both response formats consistently
        const newClient = data.client || data;
        
        // Ensure the new client has all required fields
        if (!newClient || !newClient.id) {
          console.error('❌ Invalid client data received:', data);
          return old;
        }
        
        console.log('🔄 Adding client to cache:', newClient);
        
        return {
          ...old,
          clients: [...filteredClients, newClient],
          pendingInvitations: filteredPending
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

  // Event handlers
  const handleAddClient = () => {
    setShowAddClientModal(true);
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

  const handleUseTemplate = (template: AssignmentTemplate) => {
    setSelectedTemplate(template);
    setAssignmentTitle(template.title);
    setAssignmentDescription(template.description);
    setGeneratedWords(template.words);
  };

  const handleCreateAssignment = () => {
    // Validate based on assignment mode
    if (assignmentMode === "existing") {
      if (!selectedClient || !assignmentTitle.trim() || generatedWords.length === 0) {
        toast({ title: "Please select a client, enter a title, and generate content", variant: "destructive" });
        return;
      }
    } else if (assignmentMode === "email") {
      if (!clientEmail.trim() || !assignmentTitle.trim() || generatedWords.length === 0) {
        toast({ title: "Please enter client email, title, and generate content", variant: "destructive" });
        return;
      }
      // Basic email validation
      if (!/\S+@\S+\.\S+/.test(clientEmail.trim())) {
        toast({ title: "Please enter a valid email address", variant: "destructive" });
        return;
      }
    }

    const assignmentData = assignmentMode === "existing" 
      ? {
          userId: selectedClient?.id,
          therapistId: user?.id,
          therapistName: user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user?.username || "Therapist",
          title: assignmentTitle.trim(),
          description: assignmentDescription.trim(),
          items: generatedWords.map(word => ({
            ...word,
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
          description: assignmentDescription.trim(),
          items: generatedWords.map(word => ({
            ...word,
            difficulty: selectedDifficulty
          }))
        };

    createAssignmentMutation.mutate(assignmentData);
  };

  const handleSaveAsTemplate = () => {
    if (!assignmentTitle.trim() || generatedWords.length === 0) {
      toast({ title: "Cannot save empty template", variant: "destructive" });
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
    setCustomTopic("");
    setAssignmentMode("existing");
    setClientEmail("");
    setShowAssignmentForm(false);
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Therapist Portal</h1>
          <p className="text-gray-600">Manage your patients and create personalized speech therapy assignments</p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              My Patients
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Content Library
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Patient List */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Patient List ({filteredClients.length})</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAssignAssignmentModal(true)}
                          disabled={clients.length === 0 || !Array.isArray(contentLibrary) || contentLibrary.length === 0 || isContentLibraryLoading}
                          title="Send Assignment to Patients"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleAddClient}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search patients..."
                        value={clientSearchTerm}
                        onChange={(e) => setClientSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Active Clients */}
                      <div className="space-y-2">
                        {filteredClients.length === 0 ? (
                          <p className="text-center text-gray-500 py-4">No active patients</p>
                        ) : (
                          filteredClients.map((client: User) => (
                            <div
                              key={client.id}
                              className={`p-3 rounded-lg border transition-colors ${
                                selectedClient?.id === client.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div 
                                  className="flex-1 cursor-pointer"
                                  onClick={() => setSelectedClient(client)}
                                >
                                  <div className="font-medium">
                                    {client.firstName && client.lastName
                                      ? `${client.firstName} ${client.lastName}`
                                      : client.username}
                                  </div>
                                  <div className="text-sm text-gray-600">{client.email}</div>
                                </div>
                                
                                {/* Three dots menu */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedClient(client);
                                      setSelectedTab('assignments');
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
                                        // TODO: Add remove patient functionality
                                        console.log('Remove patient:', client.id);
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

                      {/* Pending Invitations */}
                      {pendingInvitations.length > 0 && (
                        <>
                          <Separator />
                          <div id="pending-invitations-section" className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <h4 className="text-lg font-semibold text-yellow-700 dark:text-yellow-400 mb-3 flex items-center gap-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Pending Invitations ({pendingInvitations.length})
                            </h4>
                            <div className="space-y-2">
                              {pendingInvitations.map((invitation: any) => (
                                <div
                                  key={invitation.id}
                                  className={`p-3 rounded-lg border ${invitation.isTemporary 
                                    ? 'border-blue-200 bg-blue-50 animate-pulse' 
                                    : 'border-yellow-200 bg-yellow-50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className={`font-medium ${invitation.isTemporary 
                                        ? 'text-blue-800' 
                                        : 'text-yellow-800'
                                      }`}>
                                        {invitation.clientEmail}
                                      </div>
                                      <div className={`text-sm ${invitation.isTemporary 
                                        ? 'text-blue-600' 
                                        : 'text-yellow-600'
                                      }`}>
                                        {invitation.isTemporary 
                                          ? 'Sending invitation...' 
                                          : `Invited ${new Date(invitation.sentAt).toLocaleDateString()}`
                                        }
                                      </div>
                                    </div>
                                    <Badge 
                                      variant="secondary" 
                                      className={invitation.isTemporary 
                                        ? 'bg-blue-100 text-blue-800' 
                                        : 'bg-yellow-100 text-yellow-800'
                                      }
                                    >
                                      {invitation.isTemporary ? 'Sending...' : 'Pending'}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Patient Details & Assignments */}
              <div className="lg:col-span-2">
                {selectedClient ? (
                  <div className="space-y-6">
                    {/* Patient Info */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>
                            {selectedClient.firstName && selectedClient.lastName
                              ? `${selectedClient.firstName} ${selectedClient.lastName}`
                              : selectedClient.username}
                          </span>
                          <Button onClick={() => setShowAssignmentForm(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            New Assignment
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-600">Email</label>
                            <p>{selectedClient.email}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Total Assignments</label>
                            <p>{clientAssignments.length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Assignments */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Assignments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {clientAssignments.length === 0 ? (
                          <div className="text-center py-8">
                            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">No assignments yet</p>
                            <p className="text-sm text-gray-500">Create the first assignment for this patient</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {clientAssignments.map((assignment: Assignment) => (
                              <div
                                key={assignment.id}
                                className="p-4 border rounded-lg hover:border-gray-300"
                              >
                                {editingAssignment === assignment.id ? (
                                  // Edit mode
                                  <div className="space-y-3">
                                    <div>
                                      <label className="text-sm font-medium text-gray-700">Title</label>
                                      <Input
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        placeholder="Assignment title"
                                        className="mt-1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-700">Description</label>
                                      <Textarea
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        placeholder="Assignment description"
                                        rows={2}
                                        className="mt-1"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        onClick={handleSaveEdit}
                                        disabled={updateAssignmentMutation.isPending || !editTitle.trim()}
                                      >
                                        <Save className="h-4 w-4 mr-1" />
                                        {updateAssignmentMutation.isPending ? "Saving..." : "Save"}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelEdit}
                                        disabled={updateAssignmentMutation.isPending}
                                      >
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  // View mode
                                  <div className="flex items-center justify-between">
                                    <div 
                                      className="flex-1 cursor-pointer"
                                      onClick={() => setShowReportCard(assignment.id)}
                                    >
                                      <h4 className="font-medium">{assignment.title}</h4>
                                      <p className="text-sm text-gray-600">{assignment.description}</p>
                                      <div className="flex items-center gap-4 mt-2">
                                        <Badge variant="outline">
                                          Assignment
                                        </Badge>
                                        <span className="text-xs text-gray-500">
                                          Created {new Date(assignment.createdAt).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartEdit(assignment);
                                        }}
                                      >
                                        <Edit3 className="h-4 w-4" />
                                      </Button>
                                      <Badge variant={assignment.isCompleted ? "default" : "secondary"}>
                                        {assignment.isCompleted ? "Completed" : "In Progress"}
                                      </Badge>
                                      <BarChart3 
                                        className="h-4 w-4 text-gray-400 cursor-pointer" 
                                        onClick={() => setShowReportCard(assignment.id)}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Select a patient to view their assignments</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

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
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Assignment Content</h3>
                      
                      {/* Template Selection */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">Choose from Templates</label>
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

                      <div className="text-center text-gray-500">or</div>

                      {/* Custom Content Generation */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter topic (e.g., 'Animals', 'Food', 'Family')"
                          value={customTopic}
                          onChange={(e) => setCustomTopic(e.target.value)}
                        />
                        <Button 
                          onClick={handleGenerateContent}
                          disabled={generateContentMutation.isPending || !customTopic.trim()}
                        >
                          {generateContentMutation.isPending ? "Generating..." : "Generate"}
                        </Button>
                      </div>
                    </div>

                    {/* Generated Words */}
                    {generatedWords.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-medium">Assignment Words ({generatedWords.length})</label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSaveAsTemplate}
                          >
                            Save as Template
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-3">
                          {generatedWords.map((word, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="font-medium">{word.text}</span>
                              <span className="text-sm text-gray-600">{word.syllabication}</span>
                            </div>
                          ))}
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
                          generatedWords.length === 0 ||
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

          <TabsContent value="library">
            <ContentLibraryPage />
          </TabsContent>
        </Tabs>

        {/* Add Patient Modal */}
        {showAddClientModal && (
          <Dialog open={showAddClientModal} onOpenChange={handleCloseAddClientModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Add New Patient
                </DialogTitle>
                <DialogDescription>
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
                    Your patient will receive a beautifully formatted invitation email with instructions to join the platform.
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
      </div>
    </div>
  );
}