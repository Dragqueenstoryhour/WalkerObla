import { useState } from 'react';
import { SimpleRecorder } from '@/components/SimpleRecorder';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RecordingTest() {
  const [customText, setCustomText] = useState('');
  const [testText, setTestText] = useState('The quick brown fox jumps over the lazy dog. This is a simple test of the pronunciation assessment system.');
  const [assessmentResults, setAssessmentResults] = useState(null);
  
  const handleAssessmentReceived = (results: any) => {
    console.log('Received assessment results in parent component:', results);
    setAssessmentResults(results);
  };
  
  const handleUseCustomText = () => {
    if (customText.trim()) {
      setTestText(customText.trim());
    }
  };
  
  const sampleTexts = [
    'The quick brown fox jumps over the lazy dog. This is a simple test of the pronunciation assessment system.',
    'Reading aloud helps improve pronunciation and fluency for stroke recovery patients.',
    'Today is a beautiful day and I am happy to be practicing my reading skills.',
    'Learning to speak clearly again is an important part of stroke recovery.'
  ];

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Recording and Speech Assessment Test</h1>
      
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4">Select Text to Read</h2>
          
          <div className="grid gap-4 mb-4">
            {sampleTexts.map((text, index) => (
              <Button 
                key={index}
                variant={testText === text ? "default" : "outline"}
                onClick={() => setTestText(text)}
                className="justify-start h-auto py-3 px-4 text-left"
              >
                <span className="mr-2">{index + 1}.</span> {text}
              </Button>
            ))}
          </div>
          
          <div className="flex space-x-2 mt-4">
            <Input
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Enter your own text to read..."
              className="flex-1"
            />
            <Button onClick={handleUseCustomText}>Use Custom Text</Button>
          </div>
        </CardContent>
      </Card>
      
      <SimpleRecorder
        referenceText={testText}
        onAssessmentReceived={handleAssessmentReceived}
      />
      
      {assessmentResults && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">Raw Assessment Data</h2>
            <pre className="bg-muted p-4 rounded-md overflow-auto max-h-96">
              {JSON.stringify(assessmentResults, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}