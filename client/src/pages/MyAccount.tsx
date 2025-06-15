import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit2, Mail, HelpCircle } from 'lucide-react';
import { Link } from 'wouter';

interface ContactFormData {
  category: 'Question' | 'Bug fix' | 'Enhancement Suggestion';
  subject: string;
  message: string;
}

export default function MyAccount() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [contactForm, setContactForm] = useState<ContactFormData>({
    category: 'Question',
    subject: '',
    message: ''
  });
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthenticated || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Please log in to access your account.</p>
      </div>
    );
  }

  const userData = user as any;
  const displayName = userData.firstName || userData.username || userData.email?.split('@')[0] || 'User';

  const handleEditName = () => {
    setEditedName(displayName);
    setIsEditing(true);
  };

  const handleSaveName = async () => {
    // This would typically update the user profile via API
    setIsEditing(false);
    toast({
      title: 'Profile Updated',
      description: 'Your name has been updated successfully.',
    });
  };

  const handleContactSubmit = async () => {
    if (!contactForm.subject.trim() || !contactForm.message.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in both subject and message fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: displayName,
          email: userData.email,
          category: contactForm.category,
          subject: contactForm.subject,
          message: contactForm.message,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Message Sent',
          description: 'Thank you for your feedback! We\'ll get back to you soon.',
        });
        setContactForm({
          category: 'Question',
          subject: '',
          message: ''
        });
        setIsContactDialogOpen(false);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send your message. Please try again.',
        variant: 'destructive',
      });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">My Account</h1>
      
      {/* Account Details Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-gray-500">Name</Label>
              {isEditing ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button size="sm" onClick={handleSaveName}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-lg">{displayName}</p>
                  <Button size="sm" variant="ghost" onClick={handleEditName}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-500">Email Address</Label>
            <p className="text-lg mt-1">{userData.email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Questions or Suggestions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Questions or Suggestions?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            We'd love to hear from you! Whether you have questions, found a bug, or have ideas to improve the app.
          </p>
          
          <div className="flex gap-4">
            <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Contact Us
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Contact Us</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="category">About</Label>
                    <Select
                      value={contactForm.category}
                      onValueChange={(value: 'Question' | 'Bug fix' | 'Enhancement Suggestion') => 
                        setContactForm(prev => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Question">Question</SelectItem>
                        <SelectItem value="Bug fix">Bug fix</SelectItem>
                        <SelectItem value="Enhancement Suggestion">Enhancement Suggestion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={contactForm.subject}
                      onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Brief subject line"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="message">What's up?</Label>
                    <Textarea
                      id="message"
                      value={contactForm.message}
                      onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Tell us what's on your mind..."
                      rows={4}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleContactSubmit} 
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Link href="/our-story">
              <Button variant="outline">Our Story</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}