import { useState, useEffect } from 'react';
import { AvatarStyle, SelectedRewards } from '@/lib/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface AvatarProps {
  avatarStyle?: AvatarStyle;
  selectedRewards?: SelectedRewards;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  character?: 'chicken' | 'penguin' | 'frog' | 'tiger' | 'monkey' | 'default';
  animate?: boolean;
}

export function Avatar({ 
  avatarStyle = defaultAvatarStyle,
  selectedRewards = {},
  size = 'md', 
  className,
  character = 'default',
  animate = true
}: AvatarProps) {
  const [blinking, setBlinking] = useState(false);
  
  // Set up random blinking
  useEffect(() => {
    if (!animate) return;
    
    const blinkInterval = setInterval(() => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 200);
    }, Math.random() * 3000 + 2000); // Random blink between 2-5 seconds
    
    return () => clearInterval(blinkInterval);
  }, [animate]);
  
  // Size classes for the avatar container
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40'
  };
  
  // Generate 3D-looking avatar based on character type
  return (
    <div className={cn(
      "relative flex items-center justify-center",
      sizeClasses[size],
      className
    )}>
      <div className="w-full h-full relative">
        {character === 'chicken' && (
          <ChickenAvatar 
            size={size}
            blinking={blinking}
            animate={animate}
            accessories={selectedRewards}
          />
        )}
        
        {character === 'penguin' && (
          <PenguinAvatar 
            size={size}
            blinking={blinking}
            animate={animate}
            accessories={selectedRewards}
          />
        )}
        
        {character === 'frog' && (
          <FrogAvatar 
            size={size}
            blinking={blinking}
            animate={animate}
            accessories={selectedRewards}
          />
        )}
        
        {character === 'tiger' && (
          <TigerAvatar 
            size={size}
            blinking={blinking}
            animate={animate}
            accessories={selectedRewards}
          />
        )}
        
        {character === 'monkey' && (
          <MonkeyAvatar 
            size={size}
            blinking={blinking}
            animate={animate}
            accessories={selectedRewards}
          />
        )}
        
        {character === 'default' && (
          <DefaultAvatar 
            size={size}
            avatarStyle={avatarStyle}
            blinking={blinking}
            animate={animate}
            accessories={selectedRewards}
          />
        )}
      </div>
    </div>
  );
}

// Character Components
interface CharacterProps {
  size: 'sm' | 'md' | 'lg' | 'xl';
  blinking: boolean;
  animate: boolean;
  accessories?: SelectedRewards;
  avatarStyle?: AvatarStyle;
}

function ChickenAvatar({ size, blinking, animate, accessories }: CharacterProps) {
  return (
    <div className="relative w-full h-full">
      {/* Character body - 3D effect with gradients */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-400 shadow-lg"
        animate={animate ? { scale: [1, 1.03, 1] } : {}}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      />
      
      {/* Beak */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/3 w-1/4 h-1/6 bg-gradient-to-b from-orange-400 to-orange-500 rounded-md transform rotate-6"></div>
      
      {/* Eyes */}
      <div className="absolute left-[40%] top-[40%] w-[12%] h-[12%] rounded-full bg-white border-2 border-gray-600 flex items-center justify-center">
        <motion.div 
          className="w-2/3 h-2/3 rounded-full bg-black"
          animate={blinking ? { scaleY: [1, 0.1, 1] } : {}}
          transition={{ duration: 0.1 }}
        />
      </div>
      <div className="absolute left-[55%] top-[40%] w-[12%] h-[12%] rounded-full bg-white border-2 border-gray-600 flex items-center justify-center">
        <motion.div 
          className="w-2/3 h-2/3 rounded-full bg-black"
          animate={blinking ? { scaleY: [1, 0.1, 1] } : {}}
          transition={{ duration: 0.1 }}
        />
      </div>
      
      {/* Comb */}
      <div className="absolute left-[45%] top-[15%] w-[10%] h-[15%] bg-gradient-to-r from-red-500 to-red-600 rounded-lg transform -rotate-6"></div>
      <div className="absolute left-[35%] top-[18%] w-[10%] h-[15%] bg-gradient-to-r from-red-500 to-red-600 rounded-lg transform -rotate-12"></div>
      <div className="absolute left-[55%] top-[18%] w-[10%] h-[15%] bg-gradient-to-r from-red-500 to-red-600 rounded-lg transform rotate-12"></div>
      
      {/* Wings */}
      <div className="absolute left-[15%] top-[45%] w-[20%] h-[30%] bg-gradient-to-t from-yellow-300 to-yellow-400 rounded-full transform -rotate-12"></div>
      <div className="absolute left-[70%] top-[45%] w-[20%] h-[30%] bg-gradient-to-t from-yellow-300 to-yellow-400 rounded-full transform rotate-12"></div>
      
      {/* Sunglasses if accessory is present */}
      {accessories?.accessory === 'sunglasses' && (
        <>
          <div className="absolute left-[36%] top-[38%] w-[16%] h-[16%] bg-black rounded-lg border border-gray-700 shadow-md"></div>
          <div className="absolute left-[53%] top-[38%] w-[16%] h-[16%] bg-black rounded-lg border border-gray-700 shadow-md"></div>
          <div className="absolute left-[50.5%] top-[40%] w-[4%] h-[4%] bg-gradient-to-r from-gray-700 to-gray-800 rounded-full"></div>
          <div className="absolute left-[32%] top-[42%] w-[20%] h-[2%] bg-gradient-to-r from-gray-800 to-gray-700"></div>
          <div className="absolute left-[53%] top-[42%] w-[20%] h-[2%] bg-gradient-to-r from-gray-700 to-gray-800"></div>
        </>
      )}
      
      {/* Hat if present */}
      {accessories?.hat === 'party' && (
        <div className="absolute left-[35%] top-[0%] w-[30%] h-[25%]">
          <div className="relative w-full h-full">
            <div className="absolute bottom-0 w-full h-[80%] bg-gradient-to-b from-blue-500 to-blue-600 rounded-t-full"></div>
            <div className="absolute top-[-10%] left-[40%] w-[20%] h-[40%] bg-gradient-to-t from-red-500 to-yellow-400 rounded-full transform -rotate-12"></div>
          </div>
        </div>
      )}
    </div>
  );
}

function PenguinAvatar({ size, blinking, animate, accessories }: CharacterProps) {
  return (
    <div className="relative w-full h-full">
      {/* Body - 3D effect with gradients */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-800 to-black shadow-lg"
        animate={animate ? { scale: [1, 1.03, 1] } : {}}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      />
      
      {/* White belly */}
      <div className="absolute left-[30%] top-[40%] w-[40%] h-[50%] bg-gradient-to-b from-gray-100 to-white rounded-full"></div>
      
      {/* Eyes */}
      <div className="absolute left-[38%] top-[35%] w-[10%] h-[10%] rounded-full bg-white flex items-center justify-center">
        <motion.div 
          className="w-2/3 h-2/3 rounded-full bg-black"
          animate={blinking ? { scaleY: [1, 0.1, 1] } : {}}
          transition={{ duration: 0.1 }}
        />
      </div>
      <div className="absolute left-[52%] top-[35%] w-[10%] h-[10%] rounded-full bg-white flex items-center justify-center">
        <motion.div 
          className="w-2/3 h-2/3 rounded-full bg-black"
          animate={blinking ? { scaleY: [1, 0.1, 1] } : {}}
          transition={{ duration: 0.1 }}
        />
      </div>
      
      {/* Beak */}
      <div className="absolute left-[43%] top-[45%] w-[14%] h-[10%] bg-gradient-to-r from-orange-400 to-orange-500 rounded-lg"></div>
      
      {/* Accessories */}
      {accessories?.accessory === 'tie' && (
        <div className="absolute left-[45%] top-[55%] w-[10%] h-[25%] bg-gradient-to-b from-red-600 to-red-700">
          <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-tr from-red-600 to-red-700 clip-path-triangle"></div>
        </div>
      )}
    </div>
  );
}

function FrogAvatar({ size, blinking, animate, accessories }: CharacterProps) {
  return (
    <div className="relative w-full h-full">
      {/* Body - 3D effect with gradients */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-lg"
        animate={animate ? { scale: [1, 1.03, 1] } : {}}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      />
      
      {/* Eyes - bulging frog eyes */}
      <div className="absolute left-[30%] top-[30%] w-[18%] h-[18%] rounded-full bg-gradient-to-b from-white to-gray-200 shadow-lg border border-green-700 flex items-center justify-center">
        <motion.div 
          className="w-3/4 h-3/4 rounded-full bg-black"
          animate={blinking ? { scaleY: [1, 0.1, 1] } : {}}
          transition={{ duration: 0.1 }}
        />
      </div>
      <div className="absolute left-[52%] top-[30%] w-[18%] h-[18%] rounded-full bg-gradient-to-b from-white to-gray-200 shadow-lg border border-green-700 flex items-center justify-center">
        <motion.div 
          className="w-3/4 h-3/4 rounded-full bg-black"
          animate={blinking ? { scaleY: [1, 0.1, 1] } : {}}
          transition={{ duration: 0.1 }}
        />
      </div>
      
      {/* Mouth */}
      <div className="absolute left-[40%] top-[58%] w-[20%] h-[5%] bg-gradient-to-r from-green-700 to-green-800 rounded-full"></div>
      
      {/* Accessories */}
      {accessories?.accessory === 'crown' && (
        <div className="absolute left-[30%] top-[5%] w-[40%] h-[20%]">
          <div className="relative w-full h-full">
            <div className="absolute bottom-0 w-full h-[60%] bg-gradient-to-t from-yellow-400 to-yellow-300 rounded-t-lg"></div>
            <div className="absolute top-0 left-[20%] w-[10%] h-[70%] bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t-lg"></div>
            <div className="absolute top-0 left-[40%] w-[10%] h-[100%] bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t-lg"></div>
            <div className="absolute top-0 left-[60%] w-[10%] h-[70%] bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t-lg"></div>
            <div className="absolute top-[30%] left-[25%] w-[10%] h-[10%] rounded-full bg-gradient-to-br from-red-400 to-red-600"></div>
            <div className="absolute top-[30%] left-[65%] w-[10%] h-[10%] rounded-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
          </div>
        </div>
      )}
    </div>
  );
}

function TigerAvatar({ size, blinking, animate, accessories }: CharacterProps) {
  return (
    <div className="relative w-full h-full">
      {/* Body - 3D effect with gradients */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 shadow-lg"
        animate={animate ? { scale: [1, 1.03, 1] } : {}}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      />
      
      {/* Tiger stripes */}
      <div className="absolute left-[20%] top-[30%] w-[12%] h-[5%] bg-black rounded-full transform rotate-45"></div>
      <div className="absolute left-[70%] top-[30%] w-[12%] h-[5%] bg-black rounded-full transform -rotate-45"></div>
      <div className="absolute left-[30%] top-[60%] w-[10%] h-[5%] bg-black rounded-full transform rotate-45"></div>
      <div className="absolute left-[60%] top-[60%] w-[10%] h-[5%] bg-black rounded-full transform -rotate-45"></div>
      <div className="absolute left-[45%] top-[70%] w-[10%] h-[5%] bg-black rounded-full"></div>
      
      {/* White muzzle */}
      <div className="absolute left-[35%] top-[45%] w-[30%] h-[30%] bg-gradient-to-b from-orange-100 to-white rounded-full"></div>
      
      {/* Eyes */}
      <div className="absolute left-[35%] top-[35%] w-[10%] h-[10%] rounded-full bg-white flex items-center justify-center">
        <motion.div 
          className="w-2/3 h-2/3 rounded-full bg-amber-700"
          animate={blinking ? { scaleY: [1, 0.1, 1] } : {}}
          transition={{ duration: 0.1 }}
        />
      </div>
      <div className="absolute left-[55%] top-[35%] w-[10%] h-[10%] rounded-full bg-white flex items-center justify-center">
        <motion.div 
          className="w-2/3 h-2/3 rounded-full bg-amber-700"
          animate={blinking ? { scaleY: [1, 0.1, 1] } : {}}
          transition={{ duration: 0.1 }}
        />
      </div>
      
      {/* Nose */}
      <div className="absolute left-[45%] top-[48%] w-[10%] h-[7%] bg-gradient-to-br from-black to-gray-700 rounded-full"></div>
      
      {/* Mouth */}
      <div className="absolute left-[42%] top-[58%] w-[16%] h-[2%] bg-black rounded-full"></div>
      
      {/* Ears */}
      <div className="absolute left-[25%] top-[15%] w-[15%] h-[15%] bg-gradient-to-br from-orange-300 to-orange-500 rounded-full transform -rotate-12"></div>
      <div className="absolute left-[60%] top-[15%] w-[15%] h-[15%] bg-gradient-to-br from-orange-300 to-orange-500 rounded-full transform rotate-12"></div>
      
      {/* Accessories */}
      {accessories?.accessory === 'medal' && (
        <div className="absolute left-[40%] top-[70%] w-[20%] h-[20%]">
          <div className="relative w-full h-full">
            <div className="absolute w-full h-full rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 border-4 border-yellow-600"></div>
            <div className="absolute inset-0 flex items-center justify-center font-bold text-yellow-800">
              1
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MonkeyAvatar({ size, blinking, animate, accessories }: CharacterProps) {
  return (
    <div className="relative w-full h-full">
      {/* Body - 3D effect with gradients */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 shadow-lg"
        animate={animate ? { scale: [1, 1.03, 1] } : {}}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      />
      
      {/* Face */}
      <div className="absolute left-[25%] top-[25%] w-[50%] h-[50%] bg-gradient-to-b from-amber-200 to-amber-300 rounded-full"></div>
      
      {/* Eyes */}
      <div className="absolute left-[35%] top-[35%] w-[10%] h-[10%] rounded-full bg-white flex items-center justify-center">
        <motion.div 
          className="w-2/3 h-2/3 rounded-full bg-black"
          animate={blinking ? { scaleY: [1, 0.1, 1] } : {}}
          transition={{ duration: 0.1 }}
        />
      </div>
      <div className="absolute left-[55%] top-[35%] w-[10%] h-[10%] rounded-full bg-white flex items-center justify-center">
        <motion.div 
          className="w-2/3 h-2/3 rounded-full bg-black"
          animate={blinking ? { scaleY: [1, 0.1, 1] } : {}}
          transition={{ duration: 0.1 }}
        />
      </div>
      
      {/* Nose */}
      <div className="absolute left-[45%] top-[48%] w-[10%] h-[7%] bg-gradient-to-br from-gray-700 to-black rounded-full"></div>
      
      {/* Mouth */}
      <div className="absolute left-[40%] top-[60%] w-[20%] h-[3%] bg-gradient-to-r from-amber-900 to-red-900 rounded-full"></div>
      
      {/* Ears */}
      <div className="absolute left-[20%] top-[25%] w-[18%] h-[18%] bg-gradient-to-br from-amber-700 to-amber-900 rounded-full"></div>
      <div className="absolute left-[62%] top-[25%] w-[18%] h-[18%] bg-gradient-to-br from-amber-700 to-amber-900 rounded-full"></div>
      
      {/* Accessories */}
      {accessories?.accessory === 'banana' && (
        <div className="absolute left-[35%] top-[10%] w-[30%] h-[20%]">
          <div className="relative w-full h-full">
            <div className="absolute bottom-0 w-full h-[60%] bg-gradient-to-t from-yellow-300 to-yellow-400 rounded-lg transform rotate-12"></div>
          </div>
        </div>
      )}
    </div>
  );
}

function DefaultAvatar({ size, blinking, animate, avatarStyle, accessories }: CharacterProps) {
  // Determine background color based on avatar style
  const bgColorClass = getBgColorClass(avatarStyle?.skinTone);
  
  // Determine hair color based on avatar style
  const hairColorClass = getHairColorClass(avatarStyle?.hairColor);
  
  return (
    <div className="relative w-full h-full">
      {/* Base face with skin tone */}
      <motion.div
        className={cn(
          "absolute inset-0 rounded-full",
          bgColorClass
        )}
        animate={animate ? { scale: [1, 1.03, 1] } : {}}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      />
      
      {/* Eyes */}
      <div className="absolute left-[35%] top-[40%] w-[10%] h-[10%] rounded-full bg-white flex items-center justify-center">
        <motion.div 
          className="w-2/3 h-2/3 rounded-full bg-black"
          animate={blinking ? { scaleY: [1, 0.1, 1] } : {}}
          transition={{ duration: 0.1 }}
        />
      </div>
      <div className="absolute left-[55%] top-[40%] w-[10%] h-[10%] rounded-full bg-white flex items-center justify-center">
        <motion.div 
          className="w-2/3 h-2/3 rounded-full bg-black"
          animate={blinking ? { scaleY: [1, 0.1, 1] } : {}}
          transition={{ duration: 0.1 }}
        />
      </div>
      
      {/* Eyebrows */}
      <div className="absolute left-[35%] top-[35%] w-[10%] h-[2%] bg-gray-800 rounded-full transform -rotate-12"></div>
      <div className="absolute left-[55%] top-[35%] w-[10%] h-[2%] bg-gray-800 rounded-full transform rotate-12"></div>
      
      {/* Mouth */}
      <div className="absolute left-[40%] top-[55%] w-[20%] h-[3%] bg-gradient-to-r from-red-600 to-red-700 rounded-full"></div>
      
      {/* Hair */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1/3 rounded-t-full",
        hairColorClass
      )} />
      
      {/* Accessories */}
      {accessories?.hat && (
        <div className="absolute top-[-5%] left-0 right-0 h-1/4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-full shadow-lg" />
      )}
      
      {accessories?.accessory === 'glasses' && (
        <>
          <div className="absolute left-[33%] top-[40%] w-[12%] h-[12%] rounded-full border-2 border-gray-700"></div>
          <div className="absolute left-[55%] top-[40%] w-[12%] h-[12%] rounded-full border-2 border-gray-700"></div>
          <div className="absolute left-[45%] top-[42%] w-[10%] h-[2%] bg-gray-700"></div>
        </>
      )}
    </div>
  );
}

// Helper functions for avatar styling
function getBgColorClass(skinTone: string = 'medium'): string {
  const skinToneClasses: Record<string, string> = {
    light: 'bg-gradient-to-br from-amber-100 to-amber-200',
    medium: 'bg-gradient-to-br from-amber-200 to-amber-300',
    dark: 'bg-gradient-to-br from-amber-500 to-amber-600',
    tan: 'bg-gradient-to-br from-amber-300 to-amber-400'
  };
  
  return skinToneClasses[skinTone] || skinToneClasses.medium;
}

function getHairColorClass(hairColor: string = 'brown'): string {
  const hairColorClasses: Record<string, string> = {
    black: 'bg-gradient-to-b from-gray-800 to-gray-900',
    brown: 'bg-gradient-to-b from-amber-700 to-amber-800',
    blonde: 'bg-gradient-to-b from-yellow-300 to-yellow-400',
    red: 'bg-gradient-to-b from-red-500 to-red-600',
    gray: 'bg-gradient-to-b from-gray-300 to-gray-400',
    white: 'bg-gradient-to-b from-gray-100 to-gray-200'
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