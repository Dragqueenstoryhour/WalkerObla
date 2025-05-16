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
  const [difficulty, setDifficulty] = useState<'1' | '2' | '3'>('1');
  const [isGenerating, setIsGenerating] = useState(false);
  const readingContentRef = useRef<HTMLDivElement>(null);

  const generateNewContent = async () => {
    setIsGenerating(true);
    try {
      // Use a variety of topics for content generation
      const topics = [
        'gardening', 'cooking', 'travel', 'animals', 'history', 
        'music', 'technology', 'health', 'science', 'nature'
      ];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];

      const content = await generateReadingContent(randomTopic, difficulty);
      setCurrentContent(content);
      toast({
        title: "New Content Generated",
        description: `Generated: ${content.title}`,
      });
    } catch (error) {
      console.error("Error generating content:", error);
      toast({
        title: "Error",
        description: "Failed to generate new content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle difficulty and automatically regenerate content with new difficulty
  const toggleDifficulty = async () => {
    let newDifficulty: '1' | '2' | '3';

    if (difficulty === '1') newDifficulty = '2';
    else if (difficulty === '2') newDifficulty = '3';
    else newDifficulty = '1';

    setDifficulty(newDifficulty);

    // Show toast about difficulty change
    toast({
      title: `Difficulty: Level ${newDifficulty}`,
      description: "Generating new content with updated difficulty level...",
    });

    // Generate new content with the updated difficulty after a short delay
    setTimeout(async () => {
      setIsGenerating(true);
      try {
        const currentTopic = currentContent?.title.split(' ').slice(0, 2).join(' ').toLowerCase() || 'random';
        const content = await generateReadingContent(currentTopic, newDifficulty);
        setCurrentContent(content);
      } catch (error) {
        console.error("Error generating content with new difficulty:", error);
      } finally {
        setIsGenerating(false);
      }
    }, 500);
  };

  useEffect(() => {
    if (readingContentRef.current && currentContent) {
      try {
        // Ensure content is a string before proceeding
        let contentStr = typeof currentContent.content === 'string' 
          ? currentContent.content 
          : JSON.stringify(currentContent.content);
        
        // Remove any URLs in parentheses at the end of paragraphs
        contentStr = contentStr.replace(/\(\[?[\w\.]+\]?\(https?:\/\/[^\)]*\)\)/g, '');
        
        // Replace section headers like **Politics** with lead-in phrases
        contentStr = contentStr.replace(/\*\*([\w\s]+)\*\*/g, (match, topic) => {
          return `In ${topic.toLowerCase()},`;
        });
        
        // Create spans for text highlighting
        const paragraphs = contentStr.split('\n\n');
  
        readingContentRef.current.innerHTML = paragraphs
          .map(paragraph => {
            const sentences = paragraph.split('. ');
            const formattedSentences = sentences
              .map(sentence => `<span>${sentence}</span>`)
              .join('. ');
  
            return `<p>${formattedSentences}</p>`;
          })
          .join('');
      } catch (error) {
        console.error('Error formatting content:', error);
        // Fallback rendering in case of error
        if (typeof currentContent.content === 'string') {
          readingContentRef.current.innerHTML = `<p>${currentContent.content}</p>`;
        } else {
          readingContentRef.current.innerHTML = '<p>Unable to display content. Please try generating a new article.</p>';
        }
      }
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
      Array.from(spans).forEach(span => {
        if (span.textContent?.trim() === currentHighlightedText.trim()) {
          span.classList.add('text-primary', 'bg-primary/10', 'font-medium');

          // Scroll into view if needed
          const rect = span.getBoundingClientRect();

          if (readingContentRef.current) {
            const contentRect = readingContentRef.current.getBoundingClientRect();

            if (rect.top < contentRect.top || rect.bottom > contentRect.bottom) {
              span.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      });
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
              Difficulty: Level {difficulty}
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