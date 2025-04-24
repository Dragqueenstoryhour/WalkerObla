import { useState, useEffect } from 'react';
import { AvatarStyle, SelectedRewards } from '@/lib/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Import the new avatar images
import chappyChickenImage from '../../assets/avatars/chappy-chicken.jpg';
import peckyPenguinImage from '../../assets/avatars/pecky-penguin.jpg';
import chickenSunglassesImage from '../../assets/avatars/chicken-sunglasses.jpg';
import chickenVisorImage from '../../assets/avatars/chicken-visor.jpg';
import chickenSunglassesVisorImage from '../../assets/avatars/chicken-sunglasses-visor.jpg';
import penguinSunglassesImage from '../../assets/avatars/penguin-sunglasses.jpg';
import penguinChainImage from '../../assets/avatars/penguin-chain.jpg';
import penguinSunglassesChainImage from '../../assets/avatars/penguin-sunglasses-chain.jpg';

// Default avatar style for the human character
const defaultAvatarStyle: AvatarStyle = {
  skinTone: 'light',
  hairColor: 'brown',
  hairStyle: 'short',
  faceShape: 'oval',
  eyeColor: 'brown',
  eyebrowStyle: 'natural',
  noseStyle: 'straight',
  mouthStyle: 'smile'
};

interface AvatarProps {
  avatarStyle?: AvatarStyle;
  selectedRewards?: SelectedRewards;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  character?: 'chicken' | 'coolChicken' | 'penguin' | 'frog' | 'tiger' | 'monkey' | 'default';
  animate?: boolean;
}

export function Avatar({ 
  avatarStyle = defaultAvatarStyle,
  selectedRewards = {},
  size = 'md', 
  className,
  character = 'coolChicken',
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
  
  // Generate avatar based on character type
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
        
        {character === 'coolChicken' && (
          <CoolChickenAvatar 
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

// Chappy Chicken Avatar (coolChicken)
function CoolChickenAvatar({ size, blinking, animate, accessories }: CharacterProps) {
  // Determine which chicken image to use based on accessories
  let avatarImage = chappyChickenImage;
  
  const hasSunglasses = accessories?.sunglasses || accessories?.accessory === 'sunglasses';
  const hasVisor = accessories?.visor || accessories?.accessory === 'visor';
  
  if (hasSunglasses && hasVisor) {
    avatarImage = chickenSunglassesVisorImage;
  } else if (hasSunglasses) {
    avatarImage = chickenSunglassesImage;
  } else if (hasVisor) {
    avatarImage = chickenVisorImage;
  }
  
  return (
    <div className="relative w-full h-full">
      {/* Use the image as background with animation */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center rounded-full shadow-lg overflow-hidden"
        animate={animate ? { 
          scale: [1, 1.03, 1],
          rotate: [0, 2, -2, 0]
        } : {}}
        transition={{ 
          repeat: Infinity, 
          duration: 4, 
          ease: "easeInOut"
        }}
        style={{ backgroundImage: `url(${avatarImage})` }}
      />
      
      {/* Add a subtle pulsing effect */}
      <motion.div
        className="absolute inset-0 bg-orange-500 rounded-full opacity-0"
        animate={{ opacity: [0, 0.1, 0] }}
        transition={{ 
          repeat: Infinity, 
          duration: 2,
          ease: "easeInOut"
        }}
      />
      
      {/* Add tooltip on hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
        <div className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-center text-orange-800 transform -translate-y-8">
          Chappy Chicken
        </div>
      </div>
    </div>
  );
}

// Basic Chicken Avatar 
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
    </div>
  );
}

// Pecky Penguin Avatar
function PenguinAvatar({ size, blinking, animate, accessories }: CharacterProps) {
  // Determine which penguin image to use based on accessories
  let avatarImage = peckyPenguinImage;
  
  const hasSunglasses = accessories?.sunglasses || accessories?.accessory === 'sunglasses';
  const hasChain = accessories?.chain || accessories?.accessory === 'chain';
  
  if (hasSunglasses && hasChain) {
    avatarImage = penguinSunglassesChainImage;
  } else if (hasSunglasses) {
    avatarImage = penguinSunglassesImage;
  } else if (hasChain) {
    avatarImage = penguinChainImage;
  }
  
  return (
    <div className="relative w-full h-full">
      {/* Use the image as background with animation */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center rounded-full shadow-lg overflow-hidden"
        animate={animate ? { 
          scale: [1, 1.03, 1],
          rotate: [0, 2, -2, 0]
        } : {}}
        transition={{ 
          repeat: Infinity, 
          duration: 4, 
          ease: "easeInOut"
        }}
        style={{ backgroundImage: `url(${avatarImage})` }}
      />
      
      {/* Add a subtle pulsing effect */}
      <motion.div
        className="absolute inset-0 bg-blue-500 rounded-full opacity-0"
        animate={{ opacity: [0, 0.1, 0] }}
        transition={{ 
          repeat: Infinity, 
          duration: 2,
          ease: "easeInOut"
        }}
      />
      
      {/* Add tooltip on hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
        <div className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-center text-blue-800 transform -translate-y-8">
          Pecky Penguin
        </div>
      </div>
    </div>
  );
}

// The rest of the avatars stay the same
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
      <div className="absolute left-[20%] top-[25%] w-[18%] h-[18%] bg-gradient-to-br from-amber-600 to-amber-800 rounded-full transform -rotate-12"></div>
      <div className="absolute left-[62%] top-[25%] w-[18%] h-[18%] bg-gradient-to-br from-amber-600 to-amber-800 rounded-full transform rotate-12"></div>
    </div>
  );
}

function DefaultAvatar({ size, blinking, animate, avatarStyle, accessories }: CharacterProps) {
  // Determine background color based on avatar style
  const getBgColorClass = (skinTone?: string) => {
    switch (skinTone) {
      case 'dark': return 'bg-gradient-to-br from-amber-900 to-amber-800';
      case 'medium': return 'bg-gradient-to-br from-amber-700 to-amber-600';
      case 'light': 
      default: return 'bg-gradient-to-br from-amber-200 to-amber-300';
    }
  };
  
  // Determine hair color based on avatar style
  const getHairColorClass = (hairColor?: string) => {
    switch (hairColor) {
      case 'black': return 'bg-gradient-to-t from-gray-900 to-gray-800';
      case 'blonde': return 'bg-gradient-to-t from-yellow-600 to-yellow-400';
      case 'red': return 'bg-gradient-to-t from-red-700 to-red-500';
      case 'brown':
      default: return 'bg-gradient-to-t from-amber-800 to-amber-700';
    }
  };
  
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
    </div>
  );
}