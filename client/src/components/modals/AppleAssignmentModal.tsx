import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Sparkles, Play, Volume2, ChevronDown, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { getAuthHeaders } from '@/lib/supabaseClient';
import { getApiUrl } from '@/lib/utils';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable, useDraggable } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Apple-inspired design system constants
const COLORS = {
  background: '#F8F9FA',
  cardWhite: '#FFFFFF',
  primaryBlue: '#007AFF',
  successGreen: '#34C759',
  warningOrange: '#FF9500',
  errorRed: '#FF3B30',
  textPrimary: '#1D1D1F',
  textSecondary: '#424245',
  textTertiary: '#6E6E73',
  textQuaternary: '#86868B',
  // Sound-specific colors
  rSounds: '#FF6B6B',
  sSounds: '#4ECDC4',
  thSounds: '#FFE66D',
  lSounds: '#95E1D3',
  blends: '#A8E6CF',
  custom: 'linear-gradient(45deg, #FF6B6B, #4ECDC4, #FFE66D)'
};

const SPACING = {
  micro: '4px',
  small: '8px',
  medium: '16px',
  large: '24px',
  xl: '32px'
};

interface Patient {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

interface AppleAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPatient: Patient | null;
}

type NavigationState = 'overview' | 'my-library' | 'browse-all' | 'letter-selection' | 'content-type' | 'generation' | 'review';
type AssignmentCategory = 'starts-with' | 'contains' | 'ends-with';
type ContentType = 'words' | 'phrases';
type SelectedLetter = string; // A-Z or consonant sounds like 'ch', 'th', 'sh', etc.

// Draggable Word Component
const DraggableWord = ({ word, id, isNew = false }: { word: string; id: string; isNew?: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`word-card bg-white p-3 rounded-xl border border-gray-200 text-center font-medium hover:shadow-sm transition-shadow cursor-move ${
        isNew ? 'word-bounce-in' : ''
      }`}
    >
      <span className="mr-2">🔴</span>
      {word}
    </div>
  );
};

// Droppable Trash Component
const DroppableTrash = () => {
  const { setNodeRef, isOver } = useDroppable({ id: 'trash' });
  
  return (
    <div 
      ref={setNodeRef}
      className={`p-6 border-2 border-dashed rounded-2xl transition-all duration-200 ${
        isOver 
          ? 'border-red-500 bg-red-50 scale-105' 
          : 'border-gray-300 bg-gray-50'
      }`}
    >
      <div className="text-center">
        <Trash2 className={`mx-auto h-12 w-12 mb-2 ${isOver ? 'text-red-500' : 'text-gray-400'}`} />
        <p className={`text-sm font-medium ${isOver ? 'text-red-600' : 'text-gray-500'}`}>
          {isOver ? 'Drop to delete' : 'Drag words here to remove'}
        </p>
      </div>
    </div>
  );
};

const AppleAssignmentModal: React.FC<AppleAssignmentModalProps> = ({
  isOpen,
  onClose,
  selectedPatient
}) => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<NavigationState>('overview');
  const [selectedCategory, setSelectedCategory] = useState<AssignmentCategory | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<SelectedLetter>('');
  const [selectedContentType, setSelectedContentType] = useState<ContentType | null>(null);
  const [difficulty, setDifficulty] = useState(2); // 1-5 scale, 2 = beginner-intermediate
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [editableTitle, setEditableTitle] = useState('');
  const [editableInstructions, setEditableInstructions] = useState('');
  const [myLibraryTemplates, setMyLibraryTemplates] = useState<any[]>([]);
  const [publicTemplates, setPublicTemplates] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [assignmentWords, setAssignmentWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [newWords, setNewWords] = useState<Set<string>>(new Set());

  // DnD Kit sensors
  const sensors = useSensors(useSensor(PointerSensor));

  // Initialize assignment words when content is generated
  useEffect(() => {
    if (generatedContent && generatedContent.words) {
      const words = generatedContent.words.map((wordObj: any) => wordObj.text || wordObj);
      setAssignmentWords(words);
    }
  }, [generatedContent]);

  // Drag handlers
  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }

    // Handle dropping in trash
    if (over.id === 'trash') {
      // Remove the word from assignment
      const newWords = assignmentWords.filter(word => word !== active.id);
      setAssignmentWords(newWords);
      
      // Generate a replacement word (simulate API call)
      try {
        const response = await apiRequest('/api/content/generate-topic-phrases', {
          method: 'POST',
          body: JSON.stringify({
            topic: `${selectedContentType} that ${selectedCategory === 'starts-with' ? 'start with' : selectedCategory === 'contains' ? 'contain' : 'end with'} ${selectedLetter}`,
            difficulty: difficulty,
            contentType: selectedContentType,
            letter: selectedLetter,
            category: selectedCategory,
            count: 1
          })
        });
        
        if (response.data.phrases && response.data.phrases.length > 0) {
          const newWord = response.data.phrases[0].text || response.data.phrases[0];
          // Add the new word with a slight delay for better UX
          setTimeout(() => {
            setAssignmentWords(prev => [...prev, newWord]);
            setNewWords(prev => new Set([...Array.from(prev), newWord]));
            // Remove the new word animation after it completes
            setTimeout(() => {
              setNewWords(prev => {
                const updated = new Set(prev);
                updated.delete(newWord);
                return updated;
              });
            }, 600);
          }, 300);
        }
      } catch (error) {
        console.error('Error generating replacement word:', error);
        // Fallback: add a placeholder word
        setTimeout(() => {
          const fallbackWord = `${selectedLetter.toLowerCase()}eplace`;
          setAssignmentWords(prev => [...prev, fallbackWord]);
          setNewWords(prev => new Set([...Array.from(prev), fallbackWord]));
          // Remove the new word animation after it completes
          setTimeout(() => {
            setNewWords(prev => {
              const updated = new Set(prev);
              updated.delete(fallbackWord);
              return updated;
            });
          }, 600);
        }, 300);
      }
    } else {
      // Handle reordering within the words list
      if (active.id !== over.id && assignmentWords.includes(active.id) && assignmentWords.includes(over.id)) {
        const oldIndex = assignmentWords.indexOf(active.id);
        const newIndex = assignmentWords.indexOf(over.id);
        setAssignmentWords(arrayMove(assignmentWords, oldIndex, newIndex));
      }
    }
    
    setActiveId(null);
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentView('overview');
      setSelectedCategory(null);
      setSelectedLetter('');
      setSelectedContentType(null);
      setDifficulty(2);
      setIsGenerating(false);
      setGeneratedContent(null);
      setAssignmentWords([]);
      setAvailableWords([]);
      setNewWords(new Set());
    }
  }, [isOpen]);

  const handleCategorySelection = (category: AssignmentCategory) => {
    setSelectedCategory(category);
    setCurrentView('letter-selection');
  };

  const handleLetterSelection = (letter: string) => {
    setSelectedLetter(letter);
    setCurrentView('content-type');
  };

  const handleContentTypeSelection = (type: ContentType) => {
    setSelectedContentType(type);
    // Stay on the same view to show difficulty selector
  };

  const generateAssignment = async () => {
    if (!selectedCategory || !selectedLetter || !selectedContentType || !selectedPatient) return;
    
    setIsGenerating(true);
    setCurrentView('generation');
    
    try {
      // Simulate AI generation delay
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const categoryText = selectedCategory === 'starts-with' ? 'start with' : 
                          selectedCategory === 'contains' ? 'contain' : 'end with';
      
      const response = await apiRequest('/api/content/generate-topic-phrases', {
        method: 'POST',
        body: JSON.stringify({
          topic: `${selectedContentType} that ${categoryText} ${selectedLetter.toUpperCase()}`,
          difficulty: difficulty,
          contentType: selectedContentType,
          letter: selectedLetter,
          category: selectedCategory,
          count: 15
        })
      });

      const generatedData = {
        title: `${selectedContentType.charAt(0).toUpperCase() + selectedContentType.slice(1)} that ${categoryText} "${selectedLetter.toUpperCase()}"`,
        instructions: `Practice each ${selectedContentType.slice(0, -1)} 3 times, focusing on clear pronunciation. Record your best attempt.`,
        words: response.data.phrases || [],
        sentences: selectedContentType === 'phrases' ? response.data.phrases || [] : [
          `Practice ${selectedContentType} that ${categoryText} the letter "${selectedLetter.toUpperCase()}".`,
          `Focus on clear pronunciation of each ${selectedContentType.slice(0, -1)}.`,
          `Record yourself saying each ${selectedContentType.slice(0, -1)} clearly.`
        ]
      };

      setGeneratedContent(generatedData);
      setEditableTitle(generatedData.title);
      setEditableInstructions(generatedData.instructions);
      setCurrentView('review');
    } catch (error) {
      console.error('Error generating assignment:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const sendAssignment = async () => {
    if (!generatedContent || !selectedPatient) return;
    
    try {
      setIsGenerating(true);
      
      // Prepare assignment data for API
      const assignmentData = {
        title: editableTitle,
        description: editableInstructions,
        clientEmail: selectedPatient.email,
        therapistId: user?.id || '',
        therapistName: user?.firstName && user?.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user?.username || 'Therapist',
        items: generatedContent.content.map((item: any) => ({
          itemType: contentType,
          content: item.word || item.phrase,
          phonetic: item.phonetic,
          definition: item.definition,
          difficulty: item.difficulty || 'medium',
          syllabication: item.syllabication
        }))
      };

      const authHeaders = await getAuthHeaders();
      const response = await fetch(getApiUrl('/api/assignments'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(assignmentData)
      });

      if (!response.ok) {
        throw new Error('Failed to create assignment');
      }

      const result = await response.json();
      console.log('Assignment created successfully:', result);
      
      // Show success state
      onClose();
    } catch (error) {
      console.error('Error sending assignment:', error);
      // TODO: Show error toast
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const getPatientDisplayName = () => {
    if (!selectedPatient) return 'Patient';
    return selectedPatient.firstName && selectedPatient.lastName 
      ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
      : selectedPatient.username || selectedPatient.email.split('@')[0];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div 
        className="apple-modal-enter bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        style={{ 
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif',
          backgroundColor: COLORS.cardWhite
        }}
      >
        {/* Enhanced Navigation Header */}
        <div className="relative">
          {/* Patient Context Banner */}
          <div 
            className="patient-banner px-6 py-4"
            style={{ 
              background: 'linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%)',
              color: 'white'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {currentView !== 'overview' && (
                  <button
                    onClick={() => {
                      if (currentView === 'letter-selection') setCurrentView('overview');
                      else if (currentView === 'content-type') setCurrentView('letter-selection');
                      else if (currentView === 'generation') setCurrentView('content-type');
                      else if (currentView === 'review') setCurrentView('content-type');
                      else if (currentView === 'my-library') setCurrentView('overview');
                      else if (currentView === 'browse-all') setCurrentView('overview');
                    }}
                    className="nav-button p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <div>
                  <h1 className="text-lg font-semibold">Create Assignment for</h1>
                  <p className="text-sm opacity-90">{getPatientDisplayName()}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="nav-button p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* iOS-style Tab Navigation */}
          <div className="px-6 py-3 border-b border-gray-100">
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button 
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  currentView === 'overview' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setCurrentView('overview')}
              >
                ⚡ Quick Start
              </button>
              <button 
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  currentView === 'my-library'
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setCurrentView('my-library')}
              >
                📚 My Library
              </button>
              <button 
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  currentView === 'browse-all'
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setCurrentView('browse-all')}
              >
                🌍 Browse All
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {/* Overview - Assignment Category Gallery */}
          {currentView === 'overview' && (
            <div>
              <h2 className="text-2xl font-semibold mb-2" style={{ color: COLORS.textPrimary }}>
                Quick Generate Assignment
              </h2>
              <p className="text-base mb-8" style={{ color: COLORS.textTertiary }}>
                Choose your focus area
              </p>

              <div className="grid grid-cols-3 gap-6">
                {/* Words that Start with */}
                <button
                  onClick={() => handleCategorySelection('starts-with')}
                  className="assignment-type-card group relative p-6 rounded-2xl border-2 border-gray-100 hover:border-gray-200 transition-all duration-300 hover:shadow-lg hover:scale-105 bg-white"
                >
                  <div className="text-center">
                    <div 
                      className="assignment-type-icon w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white"
                      style={{ backgroundColor: COLORS.rSounds }}
                    >
                      🚀
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: COLORS.textPrimary }}>
                      WORDS THAT START WITH
                    </h3>
                    <div className="text-sm space-y-1 mb-4" style={{ color: COLORS.textTertiary }}>
                      <p>A-Z Letters</p>
                      <p>Consonant Sounds</p>
                      <p>Word Beginnings</p>
                    </div>
                    <div className="flex justify-center">
                      <div className="flex space-x-1">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className={`w-2 h-2 rounded-full ${i <= 5 ? 'bg-yellow-400' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs mt-2" style={{ color: COLORS.textTertiary }}>Most Popular</p>
                  </div>
                </button>

                {/* Words that Contain */}
                <button
                  onClick={() => handleCategorySelection('contains')}
                  className="assignment-type-card group relative p-6 rounded-2xl border-2 border-gray-100 hover:border-gray-200 transition-all duration-300 hover:shadow-lg hover:scale-105 bg-white"
                >
                  <div className="text-center">
                    <div 
                      className="assignment-type-icon w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white"
                      style={{ backgroundColor: COLORS.sSounds }}
                    >
                      🎯
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: COLORS.textPrimary }}>
                      WORDS THAT CONTAIN
                    </h3>
                    <div className="text-sm space-y-1 mb-4" style={{ color: COLORS.textTertiary }}>
                      <p>Letter in Middle</p>
                      <p>Sound Patterns</p>
                      <p>Within Words</p>
                    </div>
                    <div className="flex justify-center">
                      <div className="flex space-x-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`w-2 h-2 rounded-full ${i <= 4 ? 'bg-yellow-400' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs mt-2" style={{ color: COLORS.textTertiary }}>Challenging</p>
                  </div>
                </button>

                {/* Words that End with */}
                <button
                  onClick={() => handleCategorySelection('ends-with')}
                  className="assignment-type-card group relative p-6 rounded-2xl border-2 border-gray-100 hover:border-gray-200 transition-all duration-300 hover:shadow-lg hover:scale-105 bg-white"
                >
                  <div className="text-center">
                    <div 
                      className="assignment-type-icon w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white"
                      style={{ backgroundColor: COLORS.thSounds }}
                    >
                      🏁
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: COLORS.textPrimary }}>
                      WORDS THAT END WITH
                    </h3>
                    <div className="text-sm space-y-1 mb-4" style={{ color: COLORS.textTertiary }}>
                      <p>Word Endings</p>
                      <p>Final Sounds</p>
                      <p>Suffix Practice</p>
                    </div>
                    <div className="flex justify-center">
                      <div className="flex space-x-1">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className={`w-2 h-2 rounded-full ${i <= 5 ? 'bg-yellow-400' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs mt-2" style={{ color: COLORS.textTertiary }}>Fun Focus</p>
                  </div>
                </button>

              </div>
            </div>
          )}

          {/* Letter Selection View */}
          {currentView === 'letter-selection' && selectedCategory && (
            <div>
              <h2 className="text-2xl font-semibold mb-2" style={{ color: COLORS.textPrimary }}>
                Choose Letter or Sound
              </h2>
              <p className="text-base mb-8" style={{ color: COLORS.textTertiary }}>
                Select the letter or sound for words that {selectedCategory === 'starts-with' ? 'start with' : selectedCategory === 'contains' ? 'contain' : 'end with'}
              </p>

              {/* Alphabet Grid */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4" style={{ color: COLORS.textSecondary }}>
                  🔤 Letters A-Z
                </h3>
                <div className="grid grid-cols-6 gap-3">
                  {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
                    <button
                      key={letter}
                      onClick={() => handleLetterSelection(letter)}
                      className={`assignment-type-card p-4 rounded-xl border-2 text-center font-bold text-lg transition-all duration-200 ${
                        selectedLetter === letter
                          ? 'selected border-blue-500 bg-blue-50 shadow-md scale-105'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                      style={{ color: COLORS.textPrimary }}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Consonant Sounds */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4" style={{ color: COLORS.textSecondary }}>
                  🎵 Common Consonant Sounds
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {['CH', 'SH', 'TH', 'WH', 'CK', 'NG', 'ST', 'BL', 'FL', 'PL', 'BR', 'CR'].map((sound) => (
                    <button
                      key={sound}
                      onClick={() => handleLetterSelection(sound)}
                      className={`assignment-type-card p-4 rounded-xl border-2 text-center font-bold text-lg transition-all duration-200 ${
                        selectedLetter === sound
                          ? 'selected border-blue-500 bg-blue-50 shadow-md scale-105'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                      style={{ color: COLORS.textPrimary }}
                    >
                      {sound}
                    </button>
                  ))}
                </div>
              </div>

              {selectedLetter && (
                <div className="text-center">
                  <p className="text-lg mb-4" style={{ color: COLORS.textSecondary }}>
                    Selected: <span className="font-bold text-blue-600">{selectedLetter}</span>
                  </p>
                  <button
                    onClick={() => setCurrentView('content-type')}
                    className="apple-button px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors shadow-lg hover:shadow-xl"
                  >
                    Continue →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Content Type Selection View */}
          {currentView === 'content-type' && selectedCategory && selectedLetter && (
            <div>
              <h2 className="text-2xl font-semibold mb-2" style={{ color: COLORS.textPrimary }}>
                Choose Content Type
              </h2>
              <p className="text-base mb-8" style={{ color: COLORS.textTertiary }}>
                Generate words or phrases that {selectedCategory === 'starts-with' ? 'start with' : selectedCategory === 'contains' ? 'contain' : 'end with'} "{selectedLetter}"
              </p>

              {/* Words vs Phrases Choice */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4" style={{ color: COLORS.textSecondary }}>
                  📝 Content Type
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <button
                    onClick={() => handleContentTypeSelection('words')}
                    className={`assignment-type-card p-6 rounded-2xl border-2 transition-all duration-200 ${
                      selectedContentType === 'words'
                        ? 'selected border-blue-500 bg-blue-50 shadow-md scale-105'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-4">📝</div>
                      <h4 className="text-xl font-semibold mb-2" style={{ color: COLORS.textPrimary }}>
                        WORDS
                      </h4>
                      <p className="text-sm" style={{ color: COLORS.textTertiary }}>
                        Individual words that {selectedCategory === 'starts-with' ? 'start with' : selectedCategory === 'contains' ? 'contain' : 'end with'} "{selectedLetter}"
                      </p>
                      <div className="mt-4 text-xs" style={{ color: COLORS.textTertiary }}>
                        Examples: {selectedCategory === 'starts-with' ? `${selectedLetter}at, ${selectedLetter}og, ${selectedLetter}ed` : 
                                  selectedCategory === 'contains' ? `c${selectedLetter.toLowerCase()}t, h${selectedLetter.toLowerCase()}t, s${selectedLetter.toLowerCase()}t` :
                                  `ca${selectedLetter.toLowerCase()}, do${selectedLetter.toLowerCase()}, go${selectedLetter.toLowerCase()}`}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleContentTypeSelection('phrases')}
                    className={`assignment-type-card p-6 rounded-2xl border-2 transition-all duration-200 ${
                      selectedContentType === 'phrases'
                        ? 'selected border-blue-500 bg-blue-50 shadow-md scale-105'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-4">💬</div>
                      <h4 className="text-xl font-semibold mb-2" style={{ color: COLORS.textPrimary }}>
                        PHRASES
                      </h4>
                      <p className="text-sm" style={{ color: COLORS.textTertiary }}>
                        Short phrases and sentences containing words with "{selectedLetter}"
                      </p>
                      <div className="mt-4 text-xs" style={{ color: COLORS.textTertiary }}>
                        Examples: "{selectedLetter === 'R' ? 'red roses bloom' : `fun with ${selectedLetter.toLowerCase()}`}", longer sentences
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Difficulty Level */}
              {selectedContentType && (
                <div className="mb-8">
                  <h3 className="text-lg font-medium mb-4" style={{ color: COLORS.textSecondary }}>
                    🎯 Difficulty Level
                  </h3>
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <div className="flex items-center space-x-4 mb-2">
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={difficulty}
                        onChange={(e) => setDifficulty(parseInt(e.target.value))}
                        className="difficulty-slider flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${COLORS.primaryBlue} 0%, ${COLORS.primaryBlue} ${(difficulty-1)*25}%, #e5e7eb ${(difficulty-1)*25}%, #e5e7eb 100%)`
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-sm" style={{ color: COLORS.textTertiary }}>
                      <span>Beginner</span>
                      <span>Intermediate</span>
                      <span>Advanced</span>
                    </div>
                    <p className="text-center mt-2 font-medium" style={{ color: COLORS.textSecondary }}>
                      Perfect for {getPatientDisplayName()}'s current level
                    </p>
                  </div>
                </div>
              )}

              {/* Generate Button */}
              {selectedContentType && (
                <div className="text-center">
                  <button
                    onClick={generateAssignment}
                    className="apple-button px-12 py-4 rounded-2xl font-semibold text-lg bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-2">
                      <Sparkles className="h-5 w-5" />
                      <span>Generate {selectedContentType.charAt(0).toUpperCase() + selectedContentType.slice(1)} Assignment</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* My Library View */}
          {currentView === 'my-library' && (
            <div>
              <h2 className="text-2xl font-semibold mb-2" style={{ color: COLORS.textPrimary }}>
                My Library
              </h2>
              <p className="text-base mb-8" style={{ color: COLORS.textTertiary }}>
                Saved assignment templates and previously created assignments
              </p>

              <div className="space-y-6">
                {/* Quick Templates */}
                <div>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: COLORS.textSecondary }}>
                    🚀 Quick Templates
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="assignment-type-card p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">📝</div>
                        <div>
                          <h4 className="font-semibold" style={{ color: COLORS.textPrimary }}>Words Starting with R</h4>
                          <p className="text-sm" style={{ color: COLORS.textTertiary }}>15 words, beginner level</p>
                        </div>
                      </div>
                    </div>
                    <div className="assignment-type-card p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">💬</div>
                        <div>
                          <h4 className="font-semibold" style={{ color: COLORS.textPrimary }}>TH Sound Phrases</h4>
                          <p className="text-sm" style={{ color: COLORS.textTertiary }}>10 phrases, intermediate</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recently Created */}
                <div>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: COLORS.textSecondary }}>
                    🕒 Recently Created
                  </h3>
                  <div className="space-y-3">
                    {myLibraryTemplates.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-4">📚</div>
                        <p style={{ color: COLORS.textTertiary }}>No saved assignments yet</p>
                        <p className="text-sm mt-2" style={{ color: COLORS.textTertiary }}>
                          Assignments you create will appear here for quick reuse
                        </p>
                      </div>
                    ) : (
                      myLibraryTemplates.map((template, index) => (
                        <div key={index} className="assignment-type-card p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold" style={{ color: COLORS.textPrimary }}>{template.title}</h4>
                              <p className="text-sm" style={{ color: COLORS.textTertiary }}>{template.description}</p>
                            </div>
                            <button className="apple-button px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">
                              Use Template
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Browse All View */}
          {currentView === 'browse-all' && (
            <div>
              <h2 className="text-2xl font-semibold mb-2" style={{ color: COLORS.textPrimary }}>
                Browse All Templates
              </h2>
              <p className="text-base mb-8" style={{ color: COLORS.textTertiary }}>
                Discover assignment templates shared by the community
              </p>

              <div className="space-y-6">
                {/* Categories */}
                <div>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: COLORS.textSecondary }}>
                    🎯 Popular Categories
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { name: 'Articulation', count: 24, icon: '🗣️' },
                      { name: 'Fluency', count: 12, icon: '🌊' },
                      { name: 'Voice', count: 8, icon: '🎵' }
                    ].map((category) => (
                      <div key={category.name} className="assignment-type-card p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer">
                        <div className="text-center">
                          <div className="text-2xl mb-2">{category.icon}</div>
                          <h4 className="font-semibold" style={{ color: COLORS.textPrimary }}>{category.name}</h4>
                          <p className="text-sm" style={{ color: COLORS.textTertiary }}>{category.count} templates</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Featured Templates */}
                <div>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: COLORS.textSecondary }}>
                    ⭐ Featured Templates
                  </h3>
                  <div className="space-y-3">
                    {[
                      { title: 'Complete R-Sound Assessment', author: 'Dr. Sarah Johnson', rating: 5, uses: 234 },
                      { title: 'Beginner Articulation Pack', author: 'Speech Therapy Center', rating: 4, uses: 189 },
                      { title: 'Advanced Fluency Exercises', author: 'Mike Thompson SLP', rating: 5, uses: 156 }
                    ].map((template, index) => (
                      <div key={index} className="assignment-type-card p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold" style={{ color: COLORS.textPrimary }}>{template.title}</h4>
                            <p className="text-sm" style={{ color: COLORS.textTertiary }}>By {template.author}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs" style={{ color: COLORS.textTertiary }}>
                              <span>⭐ {template.rating}/5</span>
                              <span>👥 {template.uses} uses</span>
                            </div>
                          </div>
                          <button className="apple-button px-4 py-2 bg-green-500 text-white rounded-lg text-sm">
                            Use Template
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Generation Loading */}
          {currentView === 'generation' && (
            <div className="text-center py-16">
              <div className="mb-8">
                <div 
                  className="ai-thinking-brain w-24 h-24 rounded-2xl mx-auto mb-6 flex items-center justify-center text-4xl"
                  style={{ backgroundColor: COLORS.primaryBlue }}
                >
                  🧠
                </div>
                <h2 className="text-2xl font-semibold mb-4" style={{ color: COLORS.textPrimary }}>
                  🪄 Creating Your R-Sounds Assignment...
                </h2>
              </div>

              <div className="space-y-4 text-left max-w-md mx-auto">
                <div className="loading-step flex items-center space-x-4 p-4 bg-blue-50 rounded-xl">
                  <div className="w-8 h-8 bg-blue-500 rounded-full animate-pulse"></div>
                  <span style={{ color: COLORS.textSecondary }}>⚡ Analyzing {getPatientDisplayName()}'s level...</span>
                </div>
                <div className="loading-step flex items-center space-x-4 p-4 bg-blue-50 rounded-xl">
                  <div className="w-8 h-8 bg-blue-500 rounded-full animate-pulse"></div>
                  <span style={{ color: COLORS.textSecondary }}>📚 Selecting optimal words...</span>
                </div>
                <div className="loading-step flex items-center space-x-4 p-4 bg-blue-50 rounded-xl">
                  <div className="w-8 h-8 bg-blue-500 rounded-full animate-pulse"></div>
                  <span style={{ color: COLORS.textSecondary }}>🎯 Crafting practice sentences...</span>
                </div>
                <div className="loading-step flex items-center space-x-4 p-4 bg-green-50 rounded-xl">
                  <div className="w-8 h-8 bg-green-500 rounded-full success-checkmark"></div>
                  <span style={{ color: COLORS.successGreen }}>✅ Ready for your review!</span>
                </div>
              </div>

              <div className="mt-8">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="progress-bar-fill bg-blue-500 h-3 rounded-full transition-all duration-1000"
                    style={{ width: '100%' }}
                  ></div>
                </div>
                <p className="mt-2 text-lg font-medium" style={{ color: COLORS.textSecondary }}>100%</p>
              </div>
            </div>
          )}

          {/* Assignment Review */}
          {currentView === 'review' && generatedContent && (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold" style={{ color: COLORS.textPrimary }}>
                    ✅ Assignment Generated!
                  </h2>
                  <button className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                    💾 Save to Library
                  </button>
                </div>

                {/* Editable Title */}
                <div className="mb-6">
                  <input
                    type="text"
                    value={editableTitle}
                    onChange={(e) => setEditableTitle(e.target.value)}
                    className="apple-input text-xl font-semibold w-full p-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                    style={{ color: COLORS.textPrimary }}
                  />
                </div>

                {/* Trash Area */}
                <div className="mb-6 flex justify-center">
                  <DroppableTrash />
                </div>

                {/* Assignment Preview */}
                <div className="space-y-6">
                  {/* Words Section */}
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: COLORS.textSecondary }}>
                      📝 WORDS (Drag to reorder, drag to trash to remove)
                    </h3>
                    <SortableContext items={assignmentWords} strategy={rectSortingStrategy}>
                      <div className="grid grid-cols-3 gap-3">
                        {assignmentWords.slice(0, 12).map((word: string, index: number) => (
                          <DraggableWord
                            key={`${word}-${index}`}
                            id={word}
                            word={word}
                            isNew={newWords.has(word)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                    <button 
                      className="mt-4 px-4 py-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors font-medium"
                    >
                      + Add Custom Word
                    </button>
                  </div>

                {/* Sentences Section */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: COLORS.textSecondary }}>
                    📝 SENTENCES (AI Generated)
                  </h3>
                  <div className="space-y-3">
                    {generatedContent.sentences.map((sentence: string, index: number) => (
                      <div key={index} className="sentence-card bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">🌈</span>
                          <span style={{ color: COLORS.textPrimary }}>"{sentence}"</span>
                        </div>
                        <div className="flex space-x-2">
                          <button className="p-2 hover:bg-gray-100 rounded-lg">
                            <Volume2 className="h-4 w-4" style={{ color: COLORS.textTertiary }} />
                          </button>
                          <button className="p-2 hover:bg-gray-100 rounded-lg">
                            <span style={{ color: COLORS.textTertiary }}>📝</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="mt-4 px-4 py-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors font-medium">
                    ➕ Add More
                  </button>
                </div>

                {/* Instructions */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: COLORS.textSecondary }}>
                    📋 Instructions for {getPatientDisplayName()}
                  </h3>
                  <textarea
                    value={editableInstructions}
                    onChange={(e) => setEditableInstructions(e.target.value)}
                    className="apple-input w-full p-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none"
                    rows={3}
                    style={{ color: COLORS.textPrimary }}
                  />
                </div>
              </div>

                {/* Action Buttons */}
                <div className="flex space-x-4 mt-8 pt-6 border-t border-gray-200">
                  <button 
                    className="apple-button flex-1 px-6 py-3 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                    style={{ color: COLORS.textSecondary }}
                  >
                    📱 Patient View
                  </button>
                  <button 
                    className="apple-button flex-1 px-6 py-3 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                    style={{ color: COLORS.textSecondary }}
                  >
                    👁️ Preview
                  </button>
                  <button 
                    onClick={sendAssignment}
                    className="apple-button flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors shadow-lg hover:shadow-xl"
                  >
                    📤 Send Assignment
                  </button>
                </div>
              </div>

              {/* Drag Overlay */}
              <DragOverlay>
                {activeId ? (
                  <div className="word-card bg-white p-3 rounded-xl border border-gray-200 text-center font-medium shadow-lg transform scale-105">
                    <span className="mr-2">🔴</span>
                    {activeId}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppleAssignmentModal;