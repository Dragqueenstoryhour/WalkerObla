import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/AuthContext";
import { LogIn, UserPlus } from "lucide-react";

interface SignInToSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  wordToSave?: string;
  onSaveAfterLogin?: () => void;
}

export function SignInToSaveModal({ isOpen, onClose, wordToSave, onSaveAfterLogin }: SignInToSaveModalProps) {
  const { oauthLogin } = useAuthContext();

  const handleSignIn = async () => {
    try {
      await oauthLogin('google');
      if (onSaveAfterLogin) {
        onSaveAfterLogin();
      }
      onClose();
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            Sign in to save words
          </DialogTitle>
          <DialogDescription>
            {wordToSave 
              ? `Sign in to save "${wordToSave}" to your personal collection and track your learning progress.`
              : "Sign in to save words to your personal collection and track your learning progress."
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Benefits of signing in:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Save words and organize them in folders</li>
              <li>• Track your pronunciation progress</li>
              <li>• Access your saved content anywhere</li>
              <li>• Get personalized recommendations</li>
            </ul>
          </div>
          
          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleSignIn}
              className="w-full"
              size="lg"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign in with Google
            </Button>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account? 
                <Button 
                  variant="link" 
                  className="p-0 ml-1 h-auto"
                  onClick={handleSignIn}
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Create one now
                </Button>
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}