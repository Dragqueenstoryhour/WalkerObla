import React, { useState, useRef } from 'react';
import { User, Assignment } from '@shared/schema';
import { 
  Calendar, 
  Send, 
  Users, 
  Mic, 
  MicOff, 
  PlayCircle, 
  Square, 
  Clock,
  CheckSquare,
  Mail,
  FileText,
  Zap,
  Settings,
  Filter,
  Download,
  Upload,
  Share2,
  Copy,
  Archive,
  Trash2,
  MessageSquare
} from 'lucide-react';

interface WorkflowToolsProps {
  clients: User[];
  assignments: Assignment[];
  onBulkAction: (action: string, selectedItems: string[], data?: any) => void;
  onScheduleAssignment: (assignmentData: any, scheduledDate: Date) => void;
  onVoiceInput: (transcript: string) => void;
}

const WorkflowTools: React.FC<WorkflowToolsProps> = ({
  clients,
  assignments,
  onBulkAction,
  onScheduleAssignment,
  onVoiceInput
}) => {
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [bulkEmailTemplate, setBulkEmailTemplate] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // Voice Recognition Setup
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        processVoiceInput(audioBlob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);

      // Also start speech recognition if available
      if ('webkitSpeechRecognition' in window) {
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setVoiceTranscript(transcript);
        };

        recognition.start();
      }

    } catch (error) {
      console.error('Error starting voice recording:', error);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      
      if (voiceTranscript) {
        onVoiceInput(voiceTranscript);
      }
    }
  };

  const processVoiceInput = async (audioBlob: Blob) => {
    // In a real implementation, this would send the audio to a speech-to-text service
    console.log('Processing voice input:', audioBlob);
  };

  const handleClientSelection = (clientId: string, selected: boolean) => {
    if (selected) {
      setSelectedClients(prev => [...prev, clientId]);
    } else {
      setSelectedClients(prev => prev.filter(id => id !== clientId));
    }
  };

  const handleAssignmentSelection = (assignmentId: string, selected: boolean) => {
    if (selected) {
      setSelectedAssignments(prev => [...prev, assignmentId]);
    } else {
      setSelectedAssignments(prev => prev.filter(id => id !== assignmentId));
    }
  };

  const selectAllClients = () => {
    setSelectedClients(clients.map(c => c.id));
  };

  const clearAllSelections = () => {
    setSelectedClients([]);
    setSelectedAssignments([]);
  };

  const handleBulkEmail = () => {
    if (selectedClients.length === 0) return;
    
    onBulkAction('bulk_email', selectedClients, {
      template: bulkEmailTemplate,
      subject: 'Important Update from Your Speech Therapist'
    });
    
    setBulkEmailTemplate('');
    setSelectedClients([]);
  };

  const handleScheduledAssignment = () => {
    if (!scheduledDate || !scheduledTime) return;
    
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    
    const assignmentData = {
      selectedClients,
      scheduledFor: scheduledDateTime
    };
    
    onScheduleAssignment(assignmentData, scheduledDateTime);
    setShowScheduler(false);
    setScheduledDate('');
    setScheduledTime('');
    setSelectedClients([]);
  };

  const bulkActions = [
    {
      id: 'bulk_email',
      label: 'Send Email',
      icon: <Mail className="h-4 w-4" />,
      description: 'Send email to selected patients',
      requiresSelection: true
    },
    {
      id: 'bulk_assignment',
      label: 'Create Assignment',
      icon: <FileText className="h-4 w-4" />,
      description: 'Create assignment for multiple patients',
      requiresSelection: true
    },
    {
      id: 'export_data',
      label: 'Export Data',
      icon: <Download className="h-4 w-4" />,
      description: 'Export patient data to CSV',
      requiresSelection: false
    },
    {
      id: 'generate_report',
      label: 'Generate Reports',
      icon: <FileText className="h-4 w-4" />,
      description: 'Generate progress reports',
      requiresSelection: true
    }
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions Header */}
      <div className="enhanced-card">
        <div className="enhanced-card-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Workflow Tools</h3>
                <p className="text-sm text-gray-600">
                  Streamlined actions for efficient therapy management
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary"
                onClick={() => setShowBulkActions(!showBulkActions)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Bulk Actions
              </button>
              <button
                className="btn-primary"
                onClick={() => setShowScheduler(!showScheduler)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Input Section */}
      <div className="enhanced-card">
        <div className="enhanced-card-header">
          <h3 className="font-semibold flex items-center gap-2">
            <Mic className="h-5 w-5 text-blue-600" />
            Voice Input Assistant
          </h3>
        </div>
        <div className="enhanced-card-content">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  isRecording 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              >
                {isRecording ? (
                  <>
                    <Square className="h-4 w-4" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    Start Voice Input
                  </>
                )}
              </button>
              
              {isRecording && (
                <div className="flex items-center gap-2 text-red-600">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Recording...</span>
                </div>
              )}
            </div>

            {voiceTranscript && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800 mb-1">Voice Transcript:</div>
                <div className="text-blue-900">{voiceTranscript}</div>
                <button
                  className="btn-secondary mt-2"
                  onClick={() => {
                    navigator.clipboard.writeText(voiceTranscript);
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </button>
              </div>
            )}

            <div className="text-xs text-gray-500">
              💡 Use voice input to quickly dictate assignment instructions, patient notes, or email templates
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Panel */}
      {showBulkActions && (
        <div className="enhanced-card">
          <div className="enhanced-card-header">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Bulk Actions</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedClients.length} patients selected
                </span>
                <button
                  className="btn-secondary text-xs"
                  onClick={selectAllClients}
                >
                  Select All
                </button>
                <button
                  className="btn-secondary text-xs"
                  onClick={clearAllSelections}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
          <div className="enhanced-card-content">
            {/* Patient Selection */}
            <div className="space-y-3 mb-6">
              <h4 className="font-medium text-sm">Select Patients:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                {clients.map(client => (
                  <label
                    key={client.id}
                    className="flex items-center gap-3 p-2 border rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedClients.includes(client.id)}
                      onChange={(e) => handleClientSelection(client.id, e.target.checked)}
                      className="rounded"
                    />
                    <div className="patient-avatar" style={{width: '32px', height: '32px', fontSize: '0.8rem'}}>
                      {(client.firstName?.[0] || client.username?.[0] || 'U').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {client.firstName && client.lastName
                          ? `${client.firstName} ${client.lastName}`
                          : client.username}
                      </div>
                      <div className="text-xs text-gray-600 truncate">{client.email}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Bulk Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {bulkActions.map(action => (
                <button
                  key={action.id}
                  className="btn-secondary p-4 flex flex-col items-center gap-2 text-center"
                  onClick={() => {
                    if (action.id === 'bulk_email' && selectedClients.length > 0) {
                      // Show email template input
                      const template = prompt('Enter email message:');
                      if (template) {
                        onBulkAction(action.id, selectedClients, { template });
                      }
                    } else {
                      onBulkAction(action.id, selectedClients);
                    }
                  }}
                  disabled={action.requiresSelection && selectedClients.length === 0}
                  title={action.description}
                >
                  {action.icon}
                  <span className="text-xs font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Scheduler Panel */}
      {showScheduler && (
        <div className="enhanced-card">
          <div className="enhanced-card-header">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Schedule Assignment
            </h3>
          </div>
          <div className="enhanced-card-content">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <input
                    type="date"
                    className="enhanced-search-input"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Time</label>
                  <input
                    type="time"
                    className="enhanced-search-input"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Selected Patients ({selectedClients.length})
                </label>
                <div className="text-sm text-gray-600">
                  {selectedClients.length === 0 
                    ? 'No patients selected. Use bulk actions above to select patients.'
                    : `Assignment will be scheduled for ${selectedClients.length} patient(s)`
                  }
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t">
                <button
                  className="btn-success"
                  onClick={handleScheduledAssignment}
                  disabled={!scheduledDate || !scheduledTime || selectedClients.length === 0}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule Assignment
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setShowScheduler(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="analytics-card" style={{background: 'linear-gradient(135deg, var(--apple-blue) 0%, var(--apple-blue-light) 100%)'}}>
          <div className="analytics-value text-lg">{clients.length}</div>
          <div className="analytics-label text-sm">Total Patients</div>
        </div>
        
        <div className="analytics-card" style={{background: 'linear-gradient(135deg, var(--apple-green) 0%, #28CD41 100%)'}}>
          <div className="analytics-value text-lg">{selectedClients.length}</div>
          <div className="analytics-label text-sm">Selected</div>
        </div>
        
        <div className="analytics-card" style={{background: 'linear-gradient(135deg, var(--apple-orange) 0%, var(--apple-yellow) 100%)'}}>
          <div className="analytics-value text-lg">{assignments.filter(a => !a.isCompleted).length}</div>
          <div className="analytics-label text-sm">Active Assignments</div>
        </div>
        
        <div className="analytics-card" style={{background: 'linear-gradient(135deg, var(--apple-purple) 0%, var(--apple-pink) 100%)'}}>
          <div className="analytics-value text-lg">{Math.round(assignments.filter(a => a.isCompleted).length / Math.max(assignments.length, 1) * 100)}%</div>
          <div className="analytics-label text-sm">Completion Rate</div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowTools;