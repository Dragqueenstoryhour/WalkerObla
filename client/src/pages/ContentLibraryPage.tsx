import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BookOpen, Search } from "lucide-react";
import { AssignmentCustomizationModal } from "@/components/AssignmentCustomizationModal";

interface AssignmentTemplate {
  id: string;
  title: string;
  description: string;
  words: Array<{ text: string; syllabication: string }>;
  targetSound?: string;
  category?: string;
  createdAt: string;
}

// Pre-defined assignment templates (same as in TherapistPortalPage)
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
      { text: "sister", syllabication: "sis-ter" },
      { text: "brother", syllabication: "broth-er" },
      { text: "grandmother", syllabication: "grand-moth-er" },
      { text: "grandfather", syllabication: "grand-fa-ther" },
      { text: "cousin", syllabication: "cous-in" },
      { text: "family", syllabication: "fam-i-ly" }
    ],
    category: "Family",
    createdAt: new Date().toISOString()
  },
  {
    id: "template-5",
    title: "TH Sound Challenge",
    description: "Practice both voiced and unvoiced 'th' sounds",
    words: [
      { text: "think", syllabication: "think" },
      { text: "thank", syllabication: "thank" },
      { text: "three", syllabication: "three" },
      { text: "this", syllabication: "this" },
      { text: "that", syllabication: "that" },
      { text: "mother", syllabication: "moth-er" },
      { text: "brother", syllabication: "broth-er" },
      { text: "feather", syllabication: "feath-er" }
    ],
    targetSound: "th",
    category: "Consonant Practice",
    createdAt: new Date().toISOString()
  }
];

export default function ContentLibraryPage() {
  const [templates, setTemplates] = useState<AssignmentTemplate[]>(PREDEFINED_TEMPLATES);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<AssignmentTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter templates based on search term
  const filteredTemplates = templates.filter(template =>
    template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.targetSound?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTemplateClick = (template: AssignmentTemplate) => {
    setSelectedTemplate(template);
    setIsModalOpen(true);
  };

  const handleSaveTemplate = (updatedTemplate: AssignmentTemplate) => {
    setTemplates(prev => prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
    setIsModalOpen(false);
    setSelectedTemplate(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTemplate(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Library</h1>
          <p className="text-gray-600">
            Browse and customize assignment templates for your therapy sessions
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className="border-2 hover:border-blue-300 transition-all duration-200 cursor-pointer hover:shadow-lg transform hover:-translate-y-1"
              onClick={() => handleTemplateClick(template)}
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-start gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{template.title}</span>
                </CardTitle>
                <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    {template.category && (
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                    )}
                    {template.targetSound && (
                      <Badge variant="secondary" className="text-xs">
                        Sound: {template.targetSound}
                      </Badge>
                    )}
                  </div>

                  {/* Word count */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">
                      {template.words.length} words
                    </span>
                    <span className="text-gray-400 text-xs">
                      Click to customize
                    </span>
                  </div>

                  {/* Creation date */}
                  <div className="text-xs text-gray-500 border-t pt-2">
                    Created: {new Date(template.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No results message */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-500">
              Try adjusting your search terms to find what you're looking for.
            </p>
          </div>
        )}

        {/* Customization Modal */}
        {selectedTemplate && (
          <AssignmentCustomizationModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            template={selectedTemplate}
            onSave={handleSaveTemplate}
          />
        )}
      </div>
    </div>
  );
}