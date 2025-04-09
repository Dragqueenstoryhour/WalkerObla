import { useState, useRef, useEffect } from 'react';
import { useReading } from '@/contexts/ReadingContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, BarChart2 } from 'lucide-react';
import { generateReadingContent } from '@/lib/openai';
import { useToast } from '@/hooks/use-toast';

const ReadingContent = () => {
  const { currentContent, setCurrentContent, currentHighlightedText, isReading } = useReading();
  const { toast } = useToast();
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [isGenerating, setIsGenerating] = useState(false);
  const readingContentRef = useRef<HTMLDivElement>(null);

  const generateNewContent = async () => {
    setIsGenerating(true);
    try {
      const topic = 'random'; // Could be more specific based on user preference
      const content = await generateReadingContent(topic, difficulty);
      setCurrentContent(content);
      toast({
        title: "New Content Generated",
        description: `Generated: ${content.title}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate new content",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleDifficulty = () => {
    if (difficulty === 'easy') setDifficulty('medium');
    else if (difficulty === 'medium') setDifficulty('hard');
    else setDifficulty('easy');
  };

  useEffect(() => {
    if (readingContentRef.current && currentContent) {
      // Create spans for text highlighting
      const paragraphs = currentContent.content.split('\n\n');
      
      readingContentRef.current.innerHTML = paragraphs
        .map(paragraph => {
          const sentences = paragraph.split('. ');
          const formattedSentences = sentences
            .map(sentence => `<span>${sentence}</span>`)
            .join('. ');
          
          return `<p>${formattedSentences}</p>`;
        })
        .join('');
    }
  }, [currentContent]);

  useEffect(() => {
    if (readingContentRef.current && currentHighlightedText && isReading) {
      // Remove previous highlights
      const spans = readingContentRef.current.querySelectorAll('span');
      spans.forEach(span => {
        span.classList.remove('text-primary', 'bg-primary/10', 'font-medium');
      });
      
      // Add highlight to matching span
      for (const span of spans) {
        if (span.textContent?.trim() === currentHighlightedText.trim()) {
          span.classList.add('text-primary', 'bg-primary/10', 'font-medium');
          
          // Scroll into view if needed
          const rect = span.getBoundingClientRect();
          const contentRect = readingContentRef.current.getBoundingClientRect();
          
          if (rect.top < contentRect.top || rect.bottom > contentRect.bottom) {
            span.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          
          break;
        }
      }
    }
  }, [currentHighlightedText, isReading]);

  if (!currentContent) return null;

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Reading Material</h2>
          <div className="flex space-x-2">
            <Button
              onClick={generateNewContent}
              disabled={isGenerating}
              size="sm"
              className="text-sm"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              {isGenerating ? 'Generating...' : 'New Content'}
            </Button>
            <Button
              onClick={toggleDifficulty}
              variant="outline"
              size="sm"
              className="text-sm"
            >
              <BarChart2 className="w-4 h-4 mr-1" />
              Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </Button>
          </div>
        </div>
        
        <div className="mb-4 border-b border-secondary pb-2">
          <h3 className="font-semibold text-lg mb-2">{currentContent.title}</h3>
          <p className="text-sm text-textColor opacity-70 mb-1">
            Source: {currentContent.source} • 
            {' '}{Math.round(currentContent.readingTime / 60)} min read • 
            {' '}{currentContent.wordCount} words
          </p>
        </div>
        
        <div 
          ref={readingContentRef}
          className="prose max-w-none text-lg leading-relaxed"
        >
          {/* Content will be injected via useEffect */}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReadingContent;
