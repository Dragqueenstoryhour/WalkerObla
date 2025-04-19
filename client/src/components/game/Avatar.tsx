import { AvatarStyle, SelectedRewards } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AvatarProps {
  avatarStyle?: AvatarStyle;
  selectedRewards?: SelectedRewards;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// This is a simplified placeholder avatar - in a real implementation, this would
// render SVG elements based on the avatarStyle and selectedRewards props
export function Avatar({ 
  avatarStyle = defaultAvatarStyle,
  selectedRewards = {},
  size = 'md', 
  className 
}: AvatarProps) {
  // Size classes for the avatar container
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32'
  };
  
  // Determine background color based on avatar style
  const bgColorClass = getBgColorClass(avatarStyle.skinTone);
  
  // Determine hair color based on avatar style
  const hairColorClass = getHairColorClass(avatarStyle.hairColor);
  
  return (
    <div className={cn(
      "relative rounded-full overflow-hidden bg-muted flex items-center justify-center",
      sizeClasses[size],
      className
    )}>
      {/* Base face with skin tone */}
      <div className={cn(
        "absolute inset-0 rounded-full",
        bgColorClass
      )} />
      
      {/* Simple avatar features - just a placeholder implementation */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Eyes */}
        <div className="flex space-x-2 mt-1">
          <div className="w-2 h-2 rounded-full bg-gray-800"></div>
          <div className="w-2 h-2 rounded-full bg-gray-800"></div>
        </div>
        
        {/* Mouth */}
        <div className="w-4 h-1 mt-2 rounded-full bg-gray-700"></div>
      </div>
      
      {/* Hair */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1/3 rounded-t-full",
        hairColorClass
      )} />
      
      {/* Hat (if selected) */}
      {selectedRewards.hat && (
        <div className="absolute top-0 left-0 right-0 h-1/4 bg-blue-500 rounded-t-full" />
      )}
      
      {/* Badge (if selected) */}
      {selectedRewards.badge && (
        <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-yellow-400 rounded-full flex items-center justify-center text-xs">
          ★
        </div>
      )}
    </div>
  );
}

// Helper functions for avatar styling
function getBgColorClass(skinTone: string = 'medium'): string {
  const skinToneClasses: Record<string, string> = {
    light: 'bg-amber-200',
    medium: 'bg-amber-300',
    dark: 'bg-amber-600',
    tan: 'bg-amber-400'
  };
  
  return skinToneClasses[skinTone] || skinToneClasses.medium;
}

function getHairColorClass(hairColor: string = 'brown'): string {
  const hairColorClasses: Record<string, string> = {
    black: 'bg-gray-900',
    brown: 'bg-amber-800',
    blonde: 'bg-yellow-400',
    red: 'bg-red-600',
    gray: 'bg-gray-400',
    white: 'bg-gray-100'
  };
  
  return hairColorClasses[hairColor] || hairColorClasses.brown;
}

// Default avatar style if none provided
const defaultAvatarStyle: AvatarStyle = {
  skinTone: 'medium',
  hairStyle: 'short',
  hairColor: 'brown',
  faceShape: 'oval',
  eyeColor: 'brown',
  eyebrowStyle: 'natural',
  noseStyle: 'medium',
  mouthStyle: 'neutral'
};