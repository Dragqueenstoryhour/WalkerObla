import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, FileText, BookOpen, Search, Calendar, UserMinus, ChevronDown, ChevronUp, Trash2, TrendingUp, Award, AlertCircle, CheckCircle, X, BarChart3, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Assignment, User } from "@shared/schema";

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

  // Assignment form state
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("4");
  const [selectedTemplate, setSelectedTemplate] = useState<AssignmentTemplate | null>(null);
  const [generatedWords, setGeneratedWords] = useState<Array<{ text: string; syllabication: string }>>([]);
  const [customTopic, setCustomTopic] = useState("");

  // Data queries
  const { data: clients = [] } = useQuery({ queryKey: ['/api/therapist/clients'] });
  const { data: assignments = [] } = useQuery({ queryKey: ['/api/therapist/assignments'] });

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
    mutationFn: async (email: string) => {
      const response = await apiRequest('/api/therapist/add-client', {
        method: 'POST',
        body: JSON.stringify({ clientEmail: email })
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/clients'] });
      toast({ title: "Client added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error adding client", description: error.message, variant: "destructive" });
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
      toast({ title: "Assignment created and email sent to client!" });
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

  // Event handlers
  const handleAddClient = (email: string) => {
    if (email) {
      addClientMutation.mutate(email);
    }
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
    if (!selectedClient || !assignmentTitle.trim() || generatedWords.length === 0) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const assignmentData = {
      userId: selectedClient.id,
      therapistId: user?.id,
      title: assignmentTitle.trim(),
      description: assignmentDescription.trim(),
      difficulty: parseInt(selectedDifficulty),
      items: generatedWords
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
    setShowAssignmentForm(false);
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
          <p className="text-gray-600">Manage your clients and create personalized speech therapy assignments</p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              My Clients
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Content Library
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Client List */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Client List ({filteredClients.length})</span>
                      <Button
                        size="sm"
                        onClick={() => {
                          const email = prompt("Enter client's email address:");
                          if (email) handleAddClient(email);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search clients..."
                        value={clientSearchTerm}
                        onChange={(e) => setClientSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {filteredClients.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">No clients found</p>
                      ) : (
                        filteredClients.map((client: User) => (
                          <div
                            key={client.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedClient?.id === client.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedClient(client)}
                          >
                            <div className="font-medium">
                              {client.firstName && client.lastName
                                ? `${client.firstName} ${client.lastName}`
                                : client.username}
                            </div>
                            <div className="text-sm text-gray-600">{client.email}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Client Details & Assignments */}
              <div className="lg:col-span-2">
                {selectedClient ? (
                  <div className="space-y-6">
                    {/* Client Info */}
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
                            <p className="text-sm text-gray-500">Create the first assignment for this client</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {clientAssignments.map((assignment: Assignment) => (
                              <div
                                key={assignment.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:border-gray-300 cursor-pointer"
                                onClick={() => setShowReportCard(assignment.id)}
                              >
                                <div className="flex-1">
                                  <h4 className="font-medium">{assignment.title}</h4>
                                  <p className="text-sm text-gray-600">{assignment.description}</p>
                                  <div className="flex items-center gap-4 mt-2">
                                    <Badge variant="outline">
                                      Level {assignment.difficulty}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      Created {new Date(assignment.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={assignment.isCompleted ? "default" : "secondary"}>
                                    {assignment.isCompleted ? "Completed" : "In Progress"}
                                  </Badge>
                                  <BarChart3 className="h-4 w-4 text-gray-400" />
                                </div>
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
                        <p className="text-gray-600">Select a client to view their assignments</p>
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
                        disabled={createAssignmentMutation.isPending || !assignmentTitle.trim() || generatedWords.length === 0}
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Assignment Templates Library
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedTemplates.map((template) => (
                    <Card key={template.id} className="border-2 hover:border-blue-300 transition-colors">
                      <CardHeader>
                        <CardTitle className="text-lg">{template.title}</CardTitle>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {template.category && (
                            <Badge variant="outline">{template.category}</Badge>
                          )}
                          {template.targetSound && (
                            <Badge variant="secondary">Sound: {template.targetSound}</Badge>
                          )}
                          <p className="text-sm text-gray-600">{template.words.length} words</p>
                          <div className="text-xs text-gray-500">
                            Created: {new Date(template.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}