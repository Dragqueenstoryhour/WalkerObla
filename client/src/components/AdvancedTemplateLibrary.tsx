import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Star, 
  TrendingUp, 
  Users, 
  Clock, 
  Target,
  Award,
  Filter,
  Search,
  Heart,
  Share2,
  Download,
  Edit3,
  Copy,
  BarChart3,
  Sparkles,
  Crown,
  Shield,
  Zap
} from 'lucide-react';

interface TemplateStats {
  uses: number;
  averageScore: number;
  completionRate: number;
  rating: number;
  reviews: number;
}

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: number;
  targetSounds: string[];
  wordCount: number;
  estimatedDuration: number;
  createdBy: string;
  createdAt: string;
  isPublic: boolean;
  isPremium: boolean;
  isFeatured: boolean;
  tags: string[];
  stats: TemplateStats;
  content: {
    words: string[];
    instructions: string;
    tips: string[];
  };
}

interface AdvancedTemplateLibraryProps {
  onSelectTemplate: (template: Template) => void;
  userRole: 'therapist' | 'premium_therapist' | 'admin';
}

const AdvancedTemplateLibrary: React.FC<AdvancedTemplateLibraryProps> = ({
  onSelectTemplate,
  userRole = 'therapist'
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'recent' | 'effective'>('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);

  const categories = [
    'All Templates',
    'Consonant Practice',
    'Vowel Sounds',
    'Daily Life',
    'Family & Relationships',
    'Food & Dining',
    'Healthcare',
    'Weather & Environment',
    'Technology',
    'Emotional Expression'
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterAndSortTemplates();
  }, [templates, selectedCategory, selectedDifficulty, searchTerm, sortBy]);

  const loadTemplates = async () => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockTemplates: Template[] = [
      {
        id: 'featured-1',
        title: 'R-Sound Mastery Challenge',
        description: 'Comprehensive R-sound practice with progressive difficulty levels',
        category: 'Consonant Practice',
        difficulty: 4,
        targetSounds: ['r', 'er', 'or', 'ar'],
        wordCount: 25,
        estimatedDuration: 20,
        createdBy: 'Dr. Sarah Johnson',
        createdAt: '2024-01-15',
        isPublic: true,
        isPremium: true,
        isFeatured: true,
        tags: ['featured', 'challenging', 'comprehensive'],
        stats: {
          uses: 1247,
          averageScore: 78,
          completionRate: 85,
          rating: 4.8,
          reviews: 156
        },
        content: {
          words: ['red', 'car', 'start', 'garden', 'brother', 'strong', 'terrible', 'interrupt'],
          instructions: 'Focus on tongue placement and airflow for clear R sounds',
          tips: ['Keep tongue tip slightly curled', 'Practice slow, then increase speed', 'Record yourself for comparison']
        }
      },
      {
        id: 'community-1',
        title: 'Everyday Conversations',
        description: 'Common phrases for daily interactions and social situations',
        category: 'Daily Life',
        difficulty: 2,
        targetSounds: ['th', 's', 'l'],
        wordCount: 18,
        estimatedDuration: 15,
        createdBy: 'Community',
        createdAt: '2024-01-10',
        isPublic: true,
        isPremium: false,
        isFeatured: false,
        tags: ['community', 'practical', 'beginner-friendly'],
        stats: {
          uses: 892,
          averageScore: 82,
          completionRate: 92,
          rating: 4.6,
          reviews: 89
        },
        content: {
          words: ['hello', 'thank you', 'please', 'excuse me', 'how are you', 'goodbye'],
          instructions: 'Practice common social phrases with clear articulation',
          tips: ['Focus on natural rhythm', 'Practice with emotion', 'Use gestures while speaking']
        }
      },
      {
        id: 'expert-1',
        title: 'Medical Terminology Precision',
        description: 'Healthcare vocabulary for professional communication',
        category: 'Healthcare',
        difficulty: 5,
        targetSounds: ['th', 'sh', 'ch'],
        wordCount: 30,
        estimatedDuration: 25,
        createdBy: 'Dr. Michael Chen',
        createdAt: '2024-01-08',
        isPublic: true,
        isPremium: true,
        isFeatured: true,
        tags: ['professional', 'advanced', 'medical'],
        stats: {
          uses: 567,
          averageScore: 74,
          completionRate: 78,
          rating: 4.9,
          reviews: 42
        },
        content: {
          words: ['physician', 'stethoscope', 'diagnosis', 'prescription', 'rehabilitation', 'therapeutic'],
          instructions: 'Focus on precise articulation of medical terms',
          tips: ['Break down complex words', 'Practice syllable stress', 'Learn medical abbreviations']
        }
      },
      {
        id: 'trending-1',
        title: 'Tech Talk Essentials',
        description: 'Modern technology vocabulary for digital natives',
        category: 'Technology',
        difficulty: 3,
        targetSounds: ['k', 'g', 't', 'd'],
        wordCount: 22,
        estimatedDuration: 18,
        createdBy: 'Alex Rodriguez',
        createdAt: '2024-01-12',
        isPublic: true,
        isPremium: false,
        isFeatured: false,
        tags: ['trending', 'modern', 'technology'],
        stats: {
          uses: 734,
          averageScore: 80,
          completionRate: 88,
          rating: 4.4,
          reviews: 67
        },
        content: {
          words: ['computer', 'software', 'digital', 'technology', 'application', 'internet'],
          instructions: 'Practice clear pronunciation of tech terminology',
          tips: ['Focus on consonant clusters', 'Practice acronyms', 'Use in context sentences']
        }
      }
    ];

    setTemplates(mockTemplates);
    setIsLoading(false);
  };

  const filterAndSortTemplates = () => {
    let filtered = [...templates];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Filter by difficulty
    if (selectedDifficulty !== 'all') {
      const difficulty = parseInt(selectedDifficulty);
      filtered = filtered.filter(t => t.difficulty === difficulty);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(term) ||
        t.description.toLowerCase().includes(term) ||
        t.tags.some(tag => tag.toLowerCase().includes(term)) ||
        t.targetSounds.some(sound => sound.toLowerCase().includes(term))
      );
    }

    // Sort templates
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => b.stats.uses - a.stats.uses);
        break;
      case 'rating':
        filtered.sort((a, b) => b.stats.rating - a.stats.rating);
        break;
      case 'recent':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'effective':
        filtered.sort((a, b) => b.stats.averageScore - a.stats.averageScore);
        break;
    }

    setFilteredTemplates(filtered);
  };

  const getTemplateIcon = (template: Template) => {
    if (template.isFeatured) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (template.isPremium) return <Star className="h-4 w-4 text-purple-500" />;
    if (template.createdBy === 'Community') return <Users className="h-4 w-4 text-blue-500" />;
    return <Shield className="h-4 w-4 text-gray-500" />;
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'text-green-600 bg-green-50 border-green-200';
    if (difficulty <= 3) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (difficulty <= 4) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getEffectivenessColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const renderTemplateCard = (template: Template) => (
    <div
      key={template.id}
      className="enhanced-card cursor-pointer group transition-all duration-200 hover:scale-[1.02]"
      onClick={() => onSelectTemplate(template)}
    >
      {/* Header */}
      <div className="enhanced-card-header">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getTemplateIcon(template)}
            <div>
              <h3 className="font-semibold text-lg group-hover:text-purple-600 transition-colors">
                {template.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{template.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            <span className="text-sm font-medium">{template.stats.rating}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{template.stats.uses}</div>
            <div className="text-xs text-gray-600">Uses</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${getEffectivenessColor(template.stats.averageScore)}`}>
              {template.stats.averageScore}%
            </div>
            <div className="text-xs text-gray-600">Avg Score</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="enhanced-card-content">
        <div className="space-y-3">
          {/* Metadata */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-gray-500" />
              <span>{template.targetSounds.join(', ')}</span>
            </div>
            <div className={`px-2 py-1 rounded border text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
              Level {template.difficulty}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{template.estimatedDuration} min</span>
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>{template.wordCount} words</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>Completion Rate</span>
              <span>{template.stats.completionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${template.stats.completionRate}%` }}
              ></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>by {template.createdBy}</span>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                <Heart className="h-4 w-4 text-gray-500 hover:text-red-500" />
              </button>
              <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                <Share2 className="h-4 w-4 text-gray-500 hover:text-blue-500" />
              </button>
              <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                <Download className="h-4 w-4 text-gray-500 hover:text-green-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTemplateList = (template: Template) => (
    <div
      key={template.id}
      className="enhanced-card cursor-pointer group hover:bg-gray-50 transition-colors"
      onClick={() => onSelectTemplate(template)}
    >
      <div className="enhanced-card-content">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            {getTemplateIcon(template)}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold group-hover:text-purple-600 transition-colors truncate">
                {template.title}
              </h3>
              <div className={`px-2 py-1 rounded border text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
                L{template.difficulty}
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2 line-clamp-1">{template.description}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{template.targetSounds.join(', ')}</span>
              <span>{template.wordCount} words</span>
              <span>{template.estimatedDuration} min</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="font-semibold">{template.stats.uses}</div>
              <div className="text-xs text-gray-500">Uses</div>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                <span className="font-semibold">{template.stats.rating}</span>
              </div>
              <div className="text-xs text-gray-500">{template.stats.reviews} reviews</div>
            </div>
            <div className="text-center">
              <div className={`font-semibold ${getEffectivenessColor(template.stats.averageScore)}`}>
                {template.stats.averageScore}%
              </div>
              <div className="text-xs text-gray-500">Avg Score</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button className="p-1 hover:bg-gray-200 rounded transition-colors">
              <BarChart3 className="h-4 w-4 text-gray-500" />
            </button>
            <button className="p-1 hover:bg-gray-200 rounded transition-colors">
              <Copy className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="enhanced-card">
        <div className="enhanced-card-content flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading template library...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="enhanced-card">
        <div className="enhanced-card-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Advanced Template Library</h3>
                <p className="text-sm text-gray-600">
                  Discover high-quality, data-driven speech therapy templates
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'}`}
                onClick={() => setViewMode('grid')}
              >
                <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                </div>
              </button>
              <button
                className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'}`}
                onClick={() => setViewMode('list')}
              >
                <div className="w-4 h-4 flex flex-col gap-0.5">
                  <div className="bg-current h-0.5 rounded"></div>
                  <div className="bg-current h-0.5 rounded"></div>
                  <div className="bg-current h-0.5 rounded"></div>
                  <div className="bg-current h-0.5 rounded"></div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="enhanced-card">
        <div className="enhanced-card-content">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                className="enhanced-search-input pl-10"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <select
              className="enhanced-search-input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.slice(1).map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            {/* Difficulty Filter */}
            <select
              className="enhanced-search-input"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
            >
              <option value="all">All Levels</option>
              {[1,2,3,4,5].map(level => (
                <option key={level} value={level.toString()}>
                  Level {level}
                </option>
              ))}
            </select>

            {/* Sort Filter */}
            <select
              className="enhanced-search-input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="popular">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="recent">Most Recent</option>
              <option value="effective">Most Effective</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredTemplates.length} of {templates.length} templates
        </p>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-yellow-500" />
          <span className="text-sm text-gray-600">
            {filteredTemplates.filter(t => t.isFeatured).length} featured
          </span>
        </div>
      </div>

      {/* Templates */}
      <div className={viewMode === 'grid' 
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
        : 'space-y-3'
      }>
        {filteredTemplates.map(template => 
          viewMode === 'grid' 
            ? renderTemplateCard(template)
            : renderTemplateList(template)
        )}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="enhanced-card">
          <div className="enhanced-card-content text-center py-12">
            <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No templates found</p>
            <p className="text-sm text-gray-500 mt-2">
              Try adjusting your filters or search terms
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedTemplateLibrary;