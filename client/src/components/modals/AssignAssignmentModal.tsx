import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Search, Calendar as CalendarIcon, FileText, Users, Send } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { User } from "@shared/schema";

interface AssignmentTemplate {
  id: string;
  title: string;
  description: string;
  words: Array<{ text: string; syllabication: string }>;
  targetSound?: string;
  category?: string;
}

interface ContentLibraryItem {
  id: number;
  title: string;
  description?: string;
  contentType: string;
  items: Array<{ text: string; syllabication?: string }>;
  difficulty: string;
  category?: string;
}

interface AssignAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: User[];
  contentLibrary: ContentLibraryItem[];
  onSendAssignment: (data: {
    assignmentId: number;
    clientIds: string[];
    dueDate?: string;
    therapistNotes?: string;
  }) => void;
  isLoading?: boolean;
  isContentLoading?: boolean;
}

export default function AssignAssignmentModal({
  isOpen,
  onClose,
  clients,
  contentLibrary,
  onSendAssignment,
  isLoading = false,
  isContentLoading = false
}: AssignAssignmentModalProps) {
  const [selectedAssignment, setSelectedAssignment] = useState<ContentLibraryItem | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [therapistNotes, setTherapistNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");


  // Filter assignments based on search term
  const filteredAssignments = contentLibrary.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClientToggle = (clientId: string) => {
    setSelectedClientIds(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleSelectAll = () => {
    if (selectedClientIds.length === clients.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(clients.map(client => client.id));
    }
  };

  const handleSend = () => {
    if (!selectedAssignment || selectedClientIds.length === 0) return;

    onSendAssignment({
      assignmentId: selectedAssignment.id,
      clientIds: selectedClientIds,
      dueDate: dueDate?.toISOString(),
      therapistNotes: therapistNotes.trim() || undefined
    });
  };

  const resetForm = () => {
    setSelectedAssignment(null);
    setSelectedClientIds([]);
    setDueDate(undefined);
    setTherapistNotes("");
    setSearchTerm("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-labelledby="assign-title" className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle id="assign-title">Assign New Assignment</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[70vh]">
          {/* Left Column: Assignment Selection */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Select Assignment
              </h3>
              
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search assignments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Assignment List */}
              <ScrollArea className="h-64 border rounded-lg">
                <div className="p-2 space-y-2">
                  {isContentLoading ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
                      Loading assignments...
                    </div>
                  ) : filteredAssignments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm ? "No assignments match your search" : contentLibrary.length === 0 ? "No assignments available in your content library" : "No assignments match your search"}
                    </div>
                  ) : (
                    filteredAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedAssignment?.id === assignment.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                        onClick={() => setSelectedAssignment(assignment)}
                      >
                        <div className="font-medium">{assignment.title}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {assignment.description}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {assignment.contentType}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {assignment.difficulty}
                          </Badge>
                          {assignment.category && (
                            <Badge variant="outline" className="text-xs">
                              {assignment.category}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          {assignment.items.length} items
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Assignment Preview */}
            {selectedAssignment && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Assignment Preview</h4>
                <div className="text-sm text-gray-600 mb-3">
                  {selectedAssignment.description}
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Items ({selectedAssignment.items.length}):</div>
                  <ScrollArea className="h-20">
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {selectedAssignment.items.slice(0, 10).map((item, index) => (
                        <div key={`${item.text}-${index}`} className="p-1 bg-gray-50 rounded">
                          {item.text}
                        </div>
                      ))}
                      {selectedAssignment.items.length > 10 && (
                        <div className="p-1 text-gray-500 italic">
                          +{selectedAssignment.items.length - 10} more...
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Patient Selection and Options */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Patients ({selectedClientIds.length} selected)
              </h3>
              
              {/* Select All */}
              <div className="flex items-center space-x-2 mb-3">
                <Checkbox
                  id="select-all"
                  checked={selectedClientIds.length === clients.length}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  Select All ({clients.length})
                </label>
              </div>

              {/* Patient List */}
              <ScrollArea className="h-48 border rounded-lg">
                <div className="p-2 space-y-2">
                  {clients.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No patients available
                    </div>
                  ) : (
                    clients.map((client) => (
                      <div
                        key={client.id}
                        className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50"
                      >
                        <Checkbox
                          id={`client-${client.id}`}
                          checked={selectedClientIds.includes(client.id)}
                          onCheckedChange={() => handleClientToggle(client.id)}
                        />
                        <label
                          htmlFor={`client-${client.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="font-medium">
                            {client.firstName && client.lastName
                              ? `${client.firstName} ${client.lastName}`
                              : client.username}
                          </div>
                          <div className="text-sm text-gray-600">{client.email}</div>
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Assignment Options */}
            <div className="space-y-4">
              <Separator />
              
              {/* Due Date */}
              <div>
                <label className="text-sm font-medium mb-2 block">Due Date (Optional)</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Select due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Therapist Notes */}
              <div>
                <label className="text-sm font-medium mb-2 block">Notes for Patients (Optional)</label>
                <Textarea
                  placeholder="Add any special instructions or encouragement for your patients..."
                  value={therapistNotes}
                  onChange={(e) => setTherapistNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600">
            {selectedAssignment && selectedClientIds.length > 0 && (
              <>
                Will send "{selectedAssignment.title}" to {selectedClientIds.length} patient{selectedClientIds.length !== 1 ? 's' : ''}
              </>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!selectedAssignment || selectedClientIds.length === 0 || isLoading}
            >
              {isLoading ? "Sending..." : "Send Assignment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}