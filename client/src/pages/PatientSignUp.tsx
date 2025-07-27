import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Target, Award, Clock, Brain, Mic, BarChart3 } from 'lucide-react';
import { SignupForm } from '@/components/SignupForm';
import { useLocation } from 'wouter';

export default function PatientSignUp() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect authenticated users
  useEffect(() => {
    if (user) {
      setLocation('/my-words');
    }
  }, [user, setLocation]);

  // Don't render if user is authenticated (will redirect)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Column: Patient-focused content */}
          <div>
            {/* Header */}
            <div className="text-center lg:text-left mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                🎯 Start Your Speech Journey Today!
              </h1>
              <p className="text-xl text-gray-600">
                Join thousands of learners improving their pronunciation with AI-powered speech therapy tools.
              </p>
            </div>

            {/* Benefits Section */}
            <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">What you'll get:</h2>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mic className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">AI-Powered Speech Analysis</h3>
                      <p className="text-gray-600 text-sm">Real-time pronunciation feedback with detailed accuracy scoring</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Target className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Personalized Practice</h3>
                      <p className="text-gray-600 text-sm">Custom word lists and exercises tailored to your needs</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Progress Tracking</h3>
                      <p className="text-gray-600 text-sm">Visual charts showing your improvement over time</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Award className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Gamified Learning</h3>
                      <p className="text-gray-600 text-sm">Fun exercises with achievements and progress rewards</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Brain className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Smart Content Library</h3>
                      <p className="text-gray-600 text-sm">Access thousands of words, phrases, and reading materials</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-pink-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Practice Anywhere</h3>
                      <p className="text-gray-600 text-sm">Works on all devices - practice at home, work, or on the go</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right Column: Signup Form */}
          <div className="lg:mt-20">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Start Your Free Account</h2>
                  <p className="text-gray-600">
                    Begin your speech improvement journey today - no credit card required
                  </p>
                </div>
                
                <SignupForm />
                
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-6 text-sm text-gray-600">
                  <span className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                    100% Free to start
                  </span>
                  <span className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                    No credit card required
                  </span>
                  <span className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                    Cancel anytime
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Trust signals */}
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>
                Trusted by speech learners worldwide. Your data is secure and private.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}