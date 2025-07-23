import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BookOpen, Search, GripVertical, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getAuthHeaders } from "@/lib/supabaseClient";
import AssignmentCustomizationModal from "@/components/modals/AssignmentCustomizationModal";

interface ContentLibraryItem {
  id: number;
  title: string;
  description?: string;
  contentType: string;
  items: { text: string; syllabication?: string }[];
  difficulty: string;
  category?: string;
  tags?: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Legacy interface for the modal
interface AssignmentTemplate {
  id: string;
  title: string;
  description: string;
  words: string[];
  targetSound?: string;
  category?: string;
  createdAt: string;
}

// Temporary hardcoded templates until database is populated
const DEFAULT_TEMPLATES: AssignmentTemplate[] = [
  {
    id: "temp-1",
    title: "S Sound Practice",
    description: "Practice words containing the 's' sound for clear pronunciation",
    words: ["sun", "house", "music", "sister", "simple", "person", "surprise", "practice"],
    targetSound: "s",
    category: "Consonant Practice",
    createdAt: new Date().toISOString()
  },
  {
    id: "temp-2",
    title: "R Sound Mastery",
    description: "Focus on 'r' sound production and clarity",
    words: ["red", "car", "friend", "brother", "surprise", "street", "bright", "party"],
    targetSound: "r",
    category: "Consonant Practice",
    createdAt: new Date().toISOString()
  },
  {
    id: "temp-3",
    title: "Daily Activities",
    description: "Common words for everyday activities and routines",
    words: ["breakfast", "shower", "cooking", "driving", "shopping", "exercise", "reading", "sleeping"],
    category: "Daily Life",
    createdAt: new Date().toISOString()
  }
];

export default function ContentLibraryPage() {
  const { user } = useAuth();
  const [contentItems, setContentItems] = useState<ContentLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<AssignmentTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draggedTemplate, setDraggedTemplate] = useState<string | null>(null);

  // Load content library items from API
  useEffect(() => {
    if (user) {
      fetchContentLibrary();
    }
  }, [user]);

  const fetchContentLibrary = async () => {
    try {
      setIsLoading(true);
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/therapist/library', {
        headers: {
          ...authHeaders,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setContentItems(data.data || []);
      } else {
        console.error('Failed to fetch content library');
      }
    } catch (error) {
      console.error('Error fetching content library:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert content library item to legacy template format for modal
  const convertToTemplate = (item: ContentLibraryItem): AssignmentTemplate => ({
    id: item.id.toString(),
    title: item.title,
    description: item.description || '',
    words: item.items.map(i => i.text),
    targetSound: item.tags?.[0],
    category: item.category,
    createdAt: item.createdAt
  });

  // Combine database content with default templates
  // Show default templates only if no database items exist, or as fallback for empty database
  const databaseTemplates = contentItems.map(convertToTemplate);
  const allTemplates = contentItems.length > 0 
    ? databaseTemplates
    : DEFAULT_TEMPLATES;

  // Filter templates based on search term
  const filteredTemplates = allTemplates.filter(template =>
    template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.targetSound?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (template: AssignmentTemplate) => {
    setSelectedTemplate(template);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTemplate(null);
  };

  const handleSave = async (updatedWords: string[], updatedTitle?: string, updatedDescription?: string) => {
    if (!selectedTemplate || !user) return;

    try {
      // Check if this is a temporary/default template (starts with "temp-")
      if (selectedTemplate.id.startsWith('temp-')) {
        console.log('📝 Converting default template to real content library item...');
        
        // Create a new content library item from the default template
        const authHeaders = await getAuthHeaders();
        const response = await fetch('/api/therapist/library', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            title: updatedTitle || selectedTemplate.title,
            description: updatedDescription || selectedTemplate.description,
            contentType: 'words',
            items: updatedWords.map(word => ({ text: word })),
            difficulty: 'intermediate',
            category: selectedTemplate.category || 'Practice',
            tags: selectedTemplate.targetSound ? [selectedTemplate.targetSound] : [],
            isPublic: false
          }),
        });

        if (response.ok) {
          const newData = await response.json();
          // Add to content items and refresh
          setContentItems(prev => [...prev, newData.data]);
          console.log('✅ Default template converted to content library item successfully');
          // Refresh the content library to get the latest data
          fetchContentLibrary();
        } else {
          console.error('❌ Failed to create content library item');
        }
        
        handleCloseModal();
        return;
      }

      const contentId = parseInt(selectedTemplate.id);
      const originalItem = contentItems.find(item => item.id === contentId);
      
      if (!originalItem) {
        console.log('⚠️ Original content library item not found');
        handleCloseModal();
        return;
      }

      // Update the existing content library item via API
      const authHeaders = await getAuthHeaders();
      const updateData: any = {
        items: updatedWords.map(word => ({ text: word }))
      };
      
      // Include title and description if they were updated
      if (updatedTitle !== undefined) {
        updateData.title = updatedTitle;
      }
      if (updatedDescription !== undefined) {
        updateData.description = updatedDescription;
      }
      
      const response = await fetch(`/api/therapist/library/${contentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const updatedData = await response.json();
        // Update local state
        setContentItems(prev => prev.map(item => 
          item.id === contentId ? updatedData.data : item
        ));
        console.log('✅ Content library item updated successfully');
      } else {
        console.error('❌ Failed to update content library item');
      }
    } catch (error) {
      console.error('❌ Error updating content library item:', error);
    }
    
    handleCloseModal();
  };

  // Drag and drop handlers for template reordering
  const handleDragStart = (e: React.DragEvent, templateId: string) => {
    setDraggedTemplate(templateId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    
    if (!draggedTemplate || draggedTemplate === targetId) {
      setDraggedTemplate(null);
      return;
    }

    const draggedIndex = filteredTemplates.findIndex(t => t.id === draggedTemplate);
    const targetIndex = filteredTemplates.findIndex(t => t.id === targetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Note: This only updates visual order, not persisted order
      const newTemplates = [...filteredTemplates];
      const [draggedItem] = newTemplates.splice(draggedIndex, 1);
      newTemplates.splice(targetIndex, 0, draggedItem);
      // Could add API call here to persist order if needed
    }
    
    setDraggedTemplate(null);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Loading content library...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Content Library</h1>
          </div>
          <p className="text-gray-600">Manage and customize your speech therapy templates</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search templates by title, description, category, or sound..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Template Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No content found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search terms' : 'Create your first content library item to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200"
                draggable
                onDragStart={(e) => handleDragStart(e, template.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, template.id)}
                onClick={() => handleOpenModal(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex-1">
                      {template.title}
                    </CardTitle>
                    <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {template.description}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Words:</span>
                      <span className="font-medium">{template.words.length}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {template.category && (
                        <Badge variant="secondary" className="text-xs">
                          {template.category}
                        </Badge>
                      )}
                      {template.targetSound && (
                        <Badge variant="outline" className="text-xs">
                          /{template.targetSound}/
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Customization Modal */}
        {selectedTemplate && (
          <AssignmentCustomizationModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            assignment={selectedTemplate}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
}