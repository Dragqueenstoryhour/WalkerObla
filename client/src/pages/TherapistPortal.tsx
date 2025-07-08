import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, BookOpen, TrendingUp, Clock, Target, Trash2, Edit, Camera, Mic, Search, Filter, ChevronDown, UserPlus, Settings, BarChart3 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface TherapistClient {
  id: number;
  therapistId: string;
  clientId: string;
  assignedDate: string;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  client: {
    id: string;
    username: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    lastActivityDate: string | null;
    level: number;
    xp: number;
    createdAt: string;
  };
}

interface Assignment {
  id: number;
  userId: string;
  therapistId: string;
  therapistName: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ContentLibraryItem {
  id: number;
  createdBy: string;
  title: string;
  description: string | null;
  contentType: string;
  items: any[];
  difficulty: string;
  category: string | null;
  tags: string[] | null;
  isPublic: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AssignmentWizardData {
  clientId: string;
  title: string;
  description: string;
  dueDate: string;
  contentType: 'words' | 'phrases' | 'custom';
  selectedItems: any[];
  difficulty: string;
  category: string;
}

export default function TherapistPortal() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [activeTab, setActiveTab] = useState("clients");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);
  const [showAssignmentWizard, setShowAssignmentWizard] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [selectedClient, setSelectedClient] = useState<TherapistClient | null>(null);
  const [assignmentWizardData, setAssignmentWizardData] = useState<AssignmentWizardData>({
    clientId: "",
    title: "",
    description: "",
    dueDate: "",
    contentType: 'words',
    selectedItems: [],
    difficulty: "4",
    category: ""
  });

  // Generated content for assignment creation
  const [generatedWords, setGeneratedWords] = useState<any[]>([]);
  const [contentFilter, setContentFilter] = useState({
    type: 'topic',
    value: '',
    sound: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Queries
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['/api/therapist/clients'],
    retry: false,
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['/api/therapist/assignments'],
    retry: false,
  });

  const { data: contentLibrary = [], isLoading: libraryLoading } = useQuery({
    queryKey: ['/api/therapist/library'],
    retry: false,
  });

  const { data: publicLibrary = [] } = useQuery({
    queryKey: ['/api/therapist/library/public'],
    retry: false,
  });

  // Mutations
  const addClientMutation = useMutation({
    mutationFn: async (data: { clientEmail: string; notes?: string }) => {
      return await apiRequest('/api/therapist/clients', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/clients'] });
      setShowAddClientDialog(false);
      setNewClientEmail("");
      setClientNotes("");
      toast({
        title: "Client Added",
        description: "Client has been successfully added to your roster.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add client.",
        variant: "destructive",
      });
    }
  });

  const removeClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      return await apiRequest(`/api/therapist/clients/${clientId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/clients'] });
      toast({
        title: "Client Removed",
        description: "Client has been removed from your roster.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove client.",
        variant: "destructive",
      });
    }
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (assignmentData: any) => {
      return await apiRequest('/api/assignments', {
        method: 'POST',
        body: JSON.stringify(assignmentData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/assignments'] });
      setShowAssignmentWizard(false);
      resetAssignmentWizard();
      toast({
        title: "Assignment Created",
        description: "Homework assignment has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create assignment.",
        variant: "destructive",
      });
    }
  });

  // Helper functions
  const resetAssignmentWizard = () => {
    setAssignmentWizardData({
      clientId: "",
      title: "",
      description: "",
      dueDate: "",
      contentType: 'words',
      selectedItems: [],
      difficulty: "4",
      category: ""
    });
    setGeneratedWords([]);
    setContentFilter({ type: 'topic', value: '', sound: '' });
  };

  const filteredClients = clients.filter((client: TherapistClient) => 
    client.client.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${client.client.firstName} ${client.client.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getClientName = (client: any) => {
    if (client.firstName && client.lastName) {
      return `${client.firstName} ${client.lastName}`;
    }
    return client.username;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const getActivityStatus = (lastActivityDate: string | null) => {
    if (!lastActivityDate) return { status: "never", color: "gray" };
    
    const daysSince = Math.floor((Date.now() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSince === 0) return { status: "today", color: "green" };
    if (daysSince === 1) return { status: "yesterday", color: "blue" };
    if (daysSince <= 7) return { status: `${daysSince}d ago`, color: "yellow" };
    if (daysSince <= 30) return { status: `${daysSince}d ago`, color: "orange" };
    return { status: `${daysSince}d ago`, color: "red" };
  };

  // Content generation functions
  const generateContentByTopic = async (topic: string) => {
    if (!topic.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await apiRequest('/api/therapist/generate-topic', {
        method: 'POST',
        body: JSON.stringify({
          topic,
          difficulty: assignmentWizardData.difficulty,
          type: assignmentWizardData.contentType
        }),
      });
      setGeneratedWords(response.items || []);
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Could not generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateContentBySound = async (sound: string) => {
    if (!sound.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await apiRequest('/api/therapist/generate-words', {
        method: 'POST',
        body: JSON.stringify({
          sound,
          difficulty: assignmentWizardData.difficulty,
          count: 8
        }),
      });
      setGeneratedWords(response.words || []);
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Could not generate words. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleItemSelection = (item: any) => {
    const isSelected = assignmentWizardData.selectedItems.some(selected => 
      selected.text === item.text || selected.word === item.word
    );
    
    if (isSelected) {
      setAssignmentWizardData(prev => ({
        ...prev,
        selectedItems: prev.selectedItems.filter(selected => 
          selected.text !== item.text && selected.word !== item.word
        )
      }));
    } else {
      setAssignmentWizardData(prev => ({
        ...prev,
        selectedItems: [...prev.selectedItems, item]
      }));
    }
  };

  const createAssignment = () => {
    if (!assignmentWizardData.clientId || !assignmentWizardData.title || assignmentWizardData.selectedItems.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select at least one item.",
        variant: "destructive",
      });
      return;
    }

    createAssignmentMutation.mutate({
      userId: assignmentWizardData.clientId,
      title: assignmentWizardData.title,
      description: assignmentWizardData.description,
      dueDate: assignmentWizardData.dueDate || null,
      items: assignmentWizardData.selectedItems
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Therapist Portal</h1>
          <p className="text-gray-600">Manage your clients, create assignments, and track progress</p>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              My Clients
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Content Library
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Client Management</CardTitle>
                  <CardDescription>
                    View and manage your assigned clients
                  </CardDescription>
                </div>
                <Dialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Add Client
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Client</DialogTitle>
                      <DialogDescription>
                        Enter the client's email address to add them to your roster.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="clientEmail">Client Email</Label>
                        <Input
                          id="clientEmail"
                          type="email"
                          placeholder="client@example.com"
                          value={newClientEmail}
                          onChange={(e) => setNewClientEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="clientNotes">Notes (Optional)</Label>
                        <Textarea
                          id="clientNotes"
                          placeholder="Add any notes about this client..."
                          value={clientNotes}
                          onChange={(e) => setClientNotes(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => addClientMutation.mutate({ 
                          clientEmail: newClientEmail, 
                          notes: clientNotes 
                        })}
                        disabled={!newClientEmail || addClientMutation.isPending}
                      >
                        {addClientMutation.isPending ? "Adding..." : "Add Client"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search clients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Clients Table */}
                {clientsLoading ? (
                  <div className="text-center py-8">Loading clients...</div>
                ) : filteredClients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {clients.length === 0 ? "No clients assigned yet." : "No clients match your search."}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredClients.map((relationship: TherapistClient) => {
                      const activity = getActivityStatus(relationship.client.lastActivityDate);
                      return (
                        <Card key={relationship.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <Avatar>
                                <AvatarImage src={relationship.client.profileImageUrl || undefined} />
                                <AvatarFallback>
                                  {getClientName(relationship.client).charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold">{getClientName(relationship.client)}</h3>
                                <p className="text-sm text-gray-600">{relationship.client.email}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge variant="outline">Level {relationship.client.level}</Badge>
                                  <Badge 
                                    variant="outline"
                                    className={`border-${activity.color}-300 text-${activity.color}-700`}
                                  >
                                    {activity.status}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedClient(relationship);
                                  setAssignmentWizardData(prev => ({ ...prev, clientId: relationship.client.id }));
                                  setShowAssignmentWizard(true);
                                }}
                              >
                                Create Assignment
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeClientMutation.mutate(relationship.client.id)}
                                disabled={removeClientMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Assignment Dashboard</CardTitle>
                  <CardDescription>
                    Monitor homework assignments and client progress
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowAssignmentWizard(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Assignment
                </Button>
              </CardHeader>
              <CardContent>
                {assignmentsLoading ? (
                  <div className="text-center py-8">Loading assignments...</div>
                ) : assignments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No assignments created yet. Create your first assignment to get started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignments.map((assignment: Assignment) => (
                      <Card key={assignment.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{assignment.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{assignment.description}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant={assignment.isCompleted ? "default" : "secondary"}>
                                {assignment.isCompleted ? "Completed" : "In Progress"}
                              </Badge>
                              {assignment.dueDate && (
                                <Badge variant="outline">
                                  Due: {formatDate(assignment.dueDate)}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Library Tab */}
          <TabsContent value="library" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Library</CardTitle>
                <CardDescription>
                  Manage your custom content and access the public library
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Content library features coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics & Reports</CardTitle>
                <CardDescription>
                  View detailed progress reports and analytics for your clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Analytics dashboard coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Assignment Creation Wizard */}
        <Dialog open={showAssignmentWizard} onOpenChange={setShowAssignmentWizard}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Assignment</DialogTitle>
              <DialogDescription>
                Create a personalized homework assignment for your client
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Assignment Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="assignmentClient">Client</Label>
                  <Select
                    value={assignmentWizardData.clientId}
                    onValueChange={(value) => setAssignmentWizardData(prev => ({ ...prev, clientId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((relationship: TherapistClient) => (
                        <SelectItem key={relationship.client.id} value={relationship.client.id}>
                          {getClientName(relationship.client)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assignmentTitle">Assignment Title</Label>
                  <Input
                    id="assignmentTitle"
                    placeholder="e.g., R-sound Practice"
                    value={assignmentWizardData.title}
                    onChange={(e) => setAssignmentWizardData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="assignmentDescription">Description</Label>
                <Textarea
                  id="assignmentDescription"
                  placeholder="Instructions for the client..."
                  value={assignmentWizardData.description}
                  onChange={(e) => setAssignmentWizardData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dueDate">Due Date (Optional)</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={assignmentWizardData.dueDate}
                    onChange={(e) => setAssignmentWizardData(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="contentType">Content Type</Label>
                  <Select
                    value={assignmentWizardData.contentType}
                    onValueChange={(value: 'words' | 'phrases' | 'custom') => 
                      setAssignmentWizardData(prev => ({ ...prev, contentType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="words">Words</SelectItem>
                      <SelectItem value="phrases">Phrases</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select
                    value={assignmentWizardData.difficulty}
                    onValueChange={(value) => setAssignmentWizardData(prev => ({ ...prev, difficulty: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Beginner</SelectItem>
                      <SelectItem value="2">2 - Easy</SelectItem>
                      <SelectItem value="3">3 - Basic</SelectItem>
                      <SelectItem value="4">4 - Intermediate</SelectItem>
                      <SelectItem value="5">5 - Advanced</SelectItem>
                      <SelectItem value="6">6 - Expert</SelectItem>
                      <SelectItem value="7">7 - Master</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Content Generation */}
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4">Generate Content</h3>
                <div className="space-y-4">
                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <Label>Generation Type</Label>
                      <Select
                        value={contentFilter.type}
                        onValueChange={(value) => setContentFilter(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="topic">By Topic</SelectItem>
                          <SelectItem value="sound">By Sound/Letter</SelectItem>
                          <SelectItem value="custom">Custom Words</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      {contentFilter.type === 'topic' ? (
                        <div>
                          <Label>Topic</Label>
                          <Input
                            placeholder="e.g., Animals, Colors, Food"
                            value={contentFilter.value}
                            onChange={(e) => setContentFilter(prev => ({ ...prev, value: e.target.value }))}
                          />
                        </div>
                      ) : contentFilter.type === 'sound' ? (
                        <div>
                          <Label>Sound/Letter</Label>
                          <Input
                            placeholder="e.g., R, TH, S"
                            value={contentFilter.sound}
                            onChange={(e) => setContentFilter(prev => ({ ...prev, sound: e.target.value }))}
                          />
                        </div>
                      ) : (
                        <div>
                          <Label>Manual Entry</Label>
                          <Input placeholder="Enter words manually..." />
                        </div>
                      )}
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={() => {
                          if (contentFilter.type === 'topic') {
                            generateContentByTopic(contentFilter.value);
                          } else if (contentFilter.type === 'sound') {
                            generateContentBySound(contentFilter.sound);
                          }
                        }}
                        disabled={isGenerating}
                      >
                        {isGenerating ? "Generating..." : "Generate"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Generated Content Selection */}
              {generatedWords.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Select Items for Assignment</h4>
                  <ScrollArea className="h-48 border rounded-md p-4">
                    <div className="grid grid-cols-2 gap-2">
                      {generatedWords.map((item, index) => {
                        const itemText = item.text || item.word || item;
                        const isSelected = assignmentWizardData.selectedItems.some(selected => 
                          selected.text === itemText || selected.word === itemText
                        );
                        
                        return (
                          <div key={index} className="flex items-center space-x-2">
                            <Checkbox
                              id={`item-${index}`}
                              checked={isSelected}
                              onCheckedChange={() => toggleItemSelection(item)}
                            />
                            <Label htmlFor={`item-${index}`} className="text-sm">
                              {itemText}
                              {item.syllabication && (
                                <span className="text-gray-500 ml-1">({item.syllabication})</span>
                              )}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  <div className="mt-2 text-sm text-gray-600">
                    {assignmentWizardData.selectedItems.length} items selected
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignmentWizard(false)}>
                Cancel
              </Button>
              <Button
                onClick={createAssignment}
                disabled={createAssignmentMutation.isPending || assignmentWizardData.selectedItems.length === 0}
              >
                {createAssignmentMutation.isPending ? "Creating..." : "Create Assignment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}