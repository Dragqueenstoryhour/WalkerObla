import React from 'react';

// Generic Skeleton Component
export const Skeleton: React.FC<{ 
  className?: string; 
  width?: string; 
  height?: string; 
  rounded?: boolean;
}> = ({ className = '', width = '100%', height = '1rem', rounded = false }) => (
  <div 
    className={`skeleton ${rounded ? 'rounded-full' : 'rounded'} ${className}`}
    style={{ width, height }}
  />
);

// Card Skeleton
export const CardSkeleton: React.FC = () => (
  <div className="enhanced-card animate-pulse">
    <div className="enhanced-card-header">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton width="40px" height="40px" rounded />
        <div className="flex-1">
          <Skeleton width="60%" height="1.2rem" className="mb-2" />
          <Skeleton width="80%" height="0.9rem" />
        </div>
      </div>
    </div>
    <div className="enhanced-card-content">
      <div className="space-y-3">
        <Skeleton width="100%" height="0.8rem" />
        <Skeleton width="75%" height="0.8rem" />
        <Skeleton width="90%" height="0.8rem" />
        <div className="flex gap-2 mt-4">
          <Skeleton width="80px" height="32px" />
          <Skeleton width="80px" height="32px" />
          <Skeleton width="80px" height="32px" />
        </div>
      </div>
    </div>
  </div>
);

// Patient List Skeleton
export const PatientListSkeleton: React.FC = () => (
  <div className="enhanced-card">
    <div className="enhanced-card-header">
      <Skeleton width="40%" height="1.5rem" className="mb-4" />
      <div className="enhanced-search">
        <Skeleton width="100%" height="40px" />
      </div>
    </div>
    <div className="enhanced-card-content">
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="patient-card">
            <div className="flex items-center">
              <Skeleton width="48px" height="48px" rounded className="mr-3" />
              <div className="flex-1">
                <Skeleton width="60%" height="1rem" className="mb-2" />
                <Skeleton width="80%" height="0.8rem" className="mb-2" />
                <div className="flex items-center gap-2">
                  <Skeleton width="8px" height="8px" rounded />
                  <Skeleton width="40px" height="0.7rem" />
                </div>
              </div>
              <Skeleton width="32px" height="32px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Assignment Card Skeleton
export const AssignmentSkeleton: React.FC = () => (
  <div className="assignment-card">
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <Skeleton width="70%" height="1.1rem" className="mb-2" />
        <Skeleton width="90%" height="0.9rem" className="mb-2" />
        <Skeleton width="60%" height="0.9rem" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton width="32px" height="32px" />
        <Skeleton width="80px" height="24px" />
      </div>
    </div>
    <div className="flex items-center gap-4">
      <Skeleton width="80px" height="0.8rem" />
      <Skeleton width="100px" height="0.8rem" />
      <Skeleton width="60px" height="0.8rem" />
    </div>
  </div>
);

// Analytics Dashboard Skeleton
export const AnalyticsSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="enhanced-card">
      <div className="enhanced-card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton width="40px" height="40px" />
            <div>
              <Skeleton width="200px" height="1.2rem" className="mb-2" />
              <Skeleton width="300px" height="0.9rem" />
            </div>
          </div>
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} width="60px" height="32px" />
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="stats-card">
          <Skeleton width="100%" height="2rem" className="mb-2" />
          <Skeleton width="60%" height="0.8rem" />
        </div>
      ))}
    </div>

    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <CardSkeleton />
      <CardSkeleton />
    </div>

    {/* Progress Overview */}
    <div className="enhanced-card">
      <div className="enhanced-card-header">
        <Skeleton width="40%" height="1.2rem" />
      </div>
      <div className="enhanced-card-content">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="analytics-card bg-gray-200">
              <Skeleton width="100%" height="2rem" className="mb-2" />
              <Skeleton width="80%" height="0.8rem" className="mb-2" />
              <Skeleton width="60%" height="0.7rem" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Template Library Skeleton
export const TemplateLibrarySkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="enhanced-card">
      <div className="enhanced-card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton width="40px" height="40px" />
            <div>
              <Skeleton width="200px" height="1.2rem" className="mb-2" />
              <Skeleton width="400px" height="0.9rem" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton width="32px" height="32px" />
            <Skeleton width="32px" height="32px" />
          </div>
        </div>
      </div>
    </div>

    {/* Filters */}
    <div className="enhanced-card">
      <div className="enhanced-card-content">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} width="100%" height="40px" />
          ))}
        </div>
      </div>
    </div>

    {/* Templates Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// Smart Creator Skeleton
export const SmartCreatorSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* AI Analysis Header */}
    <div className="enhanced-card">
      <div className="enhanced-card-header">
        <div className="flex items-center gap-3">
          <Skeleton width="40px" height="40px" />
          <div>
            <Skeleton width="250px" height="1.2rem" className="mb-2" />
            <Skeleton width="300px" height="0.9rem" />
          </div>
        </div>
      </div>
      <div className="enhanced-card-content">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="analytics-card bg-gray-200">
              <Skeleton width="100%" height="1.5rem" className="mb-2" />
              <Skeleton width="60%" height="0.8rem" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Skeleton width="30%" height="1rem" className="mb-2" />
            <div className="space-y-1">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} width="80%" height="24px" />
              ))}
            </div>
          </div>
          <div>
            <Skeleton width="30%" height="1rem" className="mb-2" />
            <div className="space-y-1">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} width="75%" height="24px" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Suggestions */}
    <div className="enhanced-card">
      <div className="enhanced-card-header">
        <div className="flex items-center justify-between">
          <Skeleton width="200px" height="1.2rem" />
          <Skeleton width="120px" height="32px" />
        </div>
      </div>
      <div className="enhanced-card-content">
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 border-2 rounded-lg border-gray-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Skeleton width="16px" height="16px" />
                  <div>
                    <Skeleton width="200px" height="1rem" className="mb-1" />
                    <Skeleton width="300px" height="0.8rem" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton width="80px" height="20px" />
                  <Skeleton width="20px" height="20px" rounded />
                </div>
              </div>
              <Skeleton width="250px" height="0.7rem" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Loading Overlay
export const LoadingOverlay: React.FC<{ message?: string }> = ({ 
  message = 'Loading...' 
}) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="enhanced-modal max-w-sm mx-4">
      <div className="enhanced-modal-content text-center py-8">
        <div className="animate-spin h-12 w-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-lg font-medium mb-2">{message}</p>
        <p className="text-sm text-gray-600">Please wait while we process your request</p>
      </div>
    </div>
  </div>
);

// Success Animation
export const SuccessAnimation: React.FC<{ 
  message?: string; 
  onComplete?: () => void;
}> = ({ 
  message = 'Success!', 
  onComplete 
}) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="enhanced-modal max-w-sm mx-4">
        <div className="enhanced-modal-content text-center py-8">
          <div className="success-icon mb-4">
            ✓
          </div>
          <p className="text-lg font-medium text-green-600">{message}</p>
        </div>
      </div>
    </div>
  );
};