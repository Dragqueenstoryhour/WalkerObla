import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

const DraggableWord = ({ word, isNew = false }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: word });
  
  // Handle the animation with CSS classes instead of inline styles
  const className = `draggable-word ${isNew ? 'grow-in' : ''}`;
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isNew ? 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : transition,
    cursor: 'grab',
    padding: '12px 16px',
    margin: '6px',
    borderRadius: '8px',
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
    color: '#374151',
    minHeight: '40px',
  };
  
  return (
    <div ref={setNodeRef} style={style} className={className} {...attributes} {...listeners}>
      {word}
    </div>
  );
};

const DroppableArea = ({ id, children, words }) => {
  const { setNodeRef } = useSortable({ id, data: { type: 'container', children: words } });
  return <div ref={setNodeRef} className="droppable-area bg-gray-100 p-4 rounded-lg min-h-[200px] max-h-80 overflow-y-auto">{children}</div>;
};

const Trash = () => {
  const { setNodeRef, isOver } = useDroppable({ id: 'trash' });
  const style = {
    transition: 'background-color 0.2s ease',
    backgroundColor: isOver ? 'red' : 'transparent',
  };

  return (
    <div ref={setNodeRef} style={style} className="p-4 border-2 border-dashed border-red-500 rounded-full">
      <Trash2 className="h-8 w-8 text-red-500" />
    </div>
  );
};

interface AssignmentCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: {
    id: string;
    title: string;
    description?: string;
    words: string[];
    targetSound?: string;
  };
  onSave: (updatedWords: string[], updatedTitle?: string, updatedDescription?: string) => void;
}

const AssignmentCustomizationModal: React.FC<AssignmentCustomizationModalProps> = ({
  isOpen,
  onClose,
  assignment,
  onSave,
}) => {
  const [includedWords, setIncludedWords] = useState<string[]>([]);
  const [suggestedWords, setSuggestedWords] = useState<string[]>([]);
  const [allGeneratedWords, setAllGeneratedWords] = useState<string[]>([]);
  const [newlyAddedWords, setNewlyAddedWords] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [manualWordInput, setManualWordInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Editable title and description states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  const handleAddManualWord = () => {
    if (manualWordInput.trim() && !includedWords.includes(manualWordInput.trim())) {
      setIncludedWords(prev => [...prev, manualWordInput.trim()]);
      setManualWordInput('');
    }
  };

  // Filter suggested words excluding those already included
  const filteredSuggestedWords = suggestedWords
    .filter(word => !includedWords.includes(word))
    .filter(word => word.toLowerCase().includes(searchTerm.toLowerCase()));

  // Function to fetch more words when we need replacements
  const fetchMoreWords = async () => {
    try {
      const response = await apiRequest('/api/content/generate-suggested-words', {
        method: 'POST',
        body: JSON.stringify({ title: assignment.title, targetSound: assignment.targetSound }),
      });
      const newWords = response.data.phrases.map((word: any) => word.text);
      
      // Add new words that aren't already in our lists
      const uniqueNewWords = newWords.filter(word => 
        !allGeneratedWords.includes(word) && !includedWords.includes(word)
      );
      
      setAllGeneratedWords(prev => [...prev, ...uniqueNewWords]);
      setSuggestedWords(prev => {
        const updated = [...prev, ...uniqueNewWords];
        return updated.filter(word => !includedWords.includes(word));
      });
      
      return uniqueNewWords;
    } catch (error) {
      console.error("Error fetching more words:", error);
      return [];
    }
  };

  useEffect(() => {
    if (assignment) {
      setIncludedWords(assignment.words);
      setTitle(assignment.title);
      setDescription(assignment.description || '');
      setNewlyAddedWords(new Set());
      
      const fetchSuggestedWords = async () => {
        setIsLoading(true);
        try {
          const response = await apiRequest('/api/content/generate-suggested-words', {
            method: 'POST',
            body: JSON.stringify({ title: assignment.title, targetSound: assignment.targetSound }),
          });
          const words = response.data.phrases.map((word: any) => word.text);
          setAllGeneratedWords(words);
          setSuggestedWords(words.filter(word => !assignment.words.includes(word)));
        } catch (error) {
          console.error("Error fetching suggested words:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSuggestedWords();
    }
  }, [assignment]);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    if (over.id === 'trash') {
      setIncludedWords(includedWords.filter(word => word !== active.id));
      // Add the word back to suggested if it was originally from there
      if (allGeneratedWords.includes(active.id)) {
        setSuggestedWords(prev => [...prev, active.id]);
      }
      return;
    }

    if (active.id !== over.id) {
      const oldIndex = includedWords.indexOf(active.id);
      const newIndex = includedWords.indexOf(over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Reordering within included words
        setIncludedWords(arrayMove(includedWords, oldIndex, newIndex));
      } else {
        // Moving from suggested to included
        if (!includedWords.includes(active.id)) {
          setIncludedWords(prev => [...prev, active.id]);
          
          // Remove from suggested words
          setSuggestedWords(prev => prev.filter(word => word !== active.id));
          
          // Mark as newly added for animation
          setNewlyAddedWords(prev => new Set([...prev, active.id]));
          
          // Fetch a replacement word with animation
          setTimeout(async () => {
            const newWords = await fetchMoreWords();
            if (newWords.length > 0) {
              // Mark the first new word for animation
              const newWord = newWords[0];
              setNewlyAddedWords(prev => new Set([...prev, newWord]));
              
              // Remove animation flag after animation completes
              setTimeout(() => {
                setNewlyAddedWords(prev => {
                  const updated = new Set(prev);
                  updated.delete(newWord);
                  updated.delete(active.id);
                  return updated;
                });
              }, 300);
            }
          }, 100);
        }
      }
    }
    setActiveId(null);
  };

  if (!isOpen) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <style>{`
        .draggable-word.grow-in {
          animation: growIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          transform: scale(0);
        }
        
        @keyframes growIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center overflow-hidden">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Editable Title */}
          <div className="mb-4">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-2xl font-bold border-b-2 border-blue-500 bg-transparent outline-none flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingTitle(false);
                    } else if (e.key === 'Escape') {
                      setTitle(assignment.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  onBlur={() => setIsEditingTitle(false)}
                  autoFocus
                />
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setTitle(assignment.title);
                    setIsEditingTitle(false);
                  }}
                  className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <h2 
                className="text-2xl font-bold cursor-pointer hover:bg-gray-100 px-2 py-1 rounded" 
                onClick={() => setIsEditingTitle(true)}
                title="Click to edit title"
              >
                {title}
              </h2>
            )}
          </div>
          
          {/* Editable Description */}
          <div className="mb-4">
            {isEditingDescription ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-gray-600 border border-gray-300 rounded p-2 resize-none outline-none focus:border-blue-500"
                  rows={3}
                  placeholder="Add a description..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      setIsEditingDescription(false);
                    } else if (e.key === 'Escape') {
                      setDescription(assignment.description || '');
                      setIsEditingDescription(false);
                    }
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditingDescription(false)}
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setDescription(assignment.description || '');
                      setIsEditingDescription(false);
                    }}
                    className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p 
                className="text-gray-600 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[24px]" 
                onClick={() => setIsEditingDescription(true)}
                title="Click to edit description"
              >
                {description || 'Click to add a description...'}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Suggested Words</h3>
              <input
                type="text"
                id="suggested-words-search"
                placeholder="Search suggested words..."
                className="w-full p-2 border rounded mb-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {isLoading ? (
                <div>Loading...</div>
              ) : (
                <SortableContext items={filteredSuggestedWords} strategy={rectSortingStrategy}>
                  <div className="border rounded p-2 h-80 overflow-y-auto">
                    {filteredSuggestedWords.map(word => (
                      <DraggableWord 
                        key={word} 
                        word={word} 
                        isNew={newlyAddedWords.has(word)}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Included Words ({includedWords.length})</h3>
              <div className="flex mb-2">
                <input
                  type="text"
                  id="manual-word-input"
                  placeholder="Manually add word..."
                  className="w-full p-2 border rounded-l"
                  value={manualWordInput}
                  onChange={(e) => setManualWordInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddManualWord();
                    }
                  }}
                />
                <button onClick={handleAddManualWord} className="bg-blue-500 text-white p-2 rounded-r">Add</button>
              </div>
              <SortableContext items={includedWords} strategy={rectSortingStrategy}>
                <DroppableArea id="included-words" words={includedWords}>
                  {includedWords.map(word => (
                    <DraggableWord 
                      key={word} 
                      word={word} 
                      isNew={newlyAddedWords.has(word)}
                    />
                  ))}
                </DroppableArea>
              </SortableContext>
              <div className="flex justify-center mt-4">
                <Trash />
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={onClose} className="bg-gray-300 text-black p-2 rounded mr-2">Cancel</button>
            <button onClick={() => onSave(includedWords, title, description)} className="bg-green-500 text-white p-2 rounded">Save Changes</button>
          </div>
        </div>
      </div>
      <DragOverlay>
        {activeId ? (
          <div style={{
            cursor: 'grabbing',
            padding: '12px 16px',
            margin: '6px',
            borderRadius: '8px',
            backgroundColor: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: 'bold',
            fontSize: '14px',
            color: '#374151',
            minHeight: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'scale(1.05)',
          }}>
            {activeId}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default AssignmentCustomizationModal;
