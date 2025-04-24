import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Avatar } from './Avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useGame } from '@/contexts/GameContext';
import type { SelectedRewards } from '@/lib/types';

interface AvatarCustomizationStoreProps {
  onSave: (selectedAvatarOptions: any) => void;
}

export function AvatarCustomizationStore({ onSave }: AvatarCustomizationStoreProps) {
  const { toast } = useToast();
  const { currentUser } = useGame();
  
  // Available avatar characters - only Chappy Chicken and Pecky Penguin
  const avatarCharacters = [
    { id: 'coolChicken', name: 'Chappy Chicken', unlockedByDefault: true },
    { id: 'penguin', name: 'Pecky Penguin', unlockedByDefault: true },
  ];
  
  // Available accessories
  const avatarAccessories = [
    { id: 'none', name: 'None', unlockedByDefault: true },
    { id: 'sunglasses', name: 'Sunglasses', unlockedByDefault: true },
    { id: 'visor', name: 'Visor', unlockedByDefault: true },
    { id: 'chain', name: 'Gold Chain', unlockedByDefault: true },
  ];
  
  // Available hats
  const avatarHats = [
    { id: 'none', name: 'None', unlockedByDefault: true },
    { id: 'party', name: 'Party Hat', unlockedByDefault: true },
    { id: 'cap', name: 'Baseball Cap', unlockedByDefault: true },
    { id: 'beanie', name: 'Beanie', unlockedByDefault: true },
    { id: 'tophat', name: 'Top Hat', unlockedByDefault: true },
  ];
  
  // State for selected customization options
  const [selectedCharacter, setSelectedCharacter] = useState<string>('coolChicken');
  const [selectedAccessory, setSelectedAccessory] = useState<string>('none');
  const [selectedHat, setSelectedHat] = useState<string>('none');
  
  // Determine if an item is unlocked based on current user level
  const isItemUnlocked = (item: any) => {
    return true; // All items are unlocked by default now
  };
  
  // Current preview state
  const [previewOptions, setPreviewOptions] = useState<{
    character: string;
    accessories: SelectedRewards;
  }>({
    character: 'coolChicken',
    accessories: {}
  });
  
  // Update preview when selections change
  useEffect(() => {
    const accessories: SelectedRewards = {};
    if (selectedAccessory !== 'none') {
      accessories.accessory = selectedAccessory;
    }
    if (selectedHat !== 'none') {
      accessories.hat = selectedHat;
    }
    
    setPreviewOptions({
      character: selectedCharacter,
      accessories
    });
  }, [selectedCharacter, selectedAccessory, selectedHat]);
  
  // Handle save
  const handleSave = () => {
    const selectedOptions = {
      character: selectedCharacter,
      accessories: {
        accessory: selectedAccessory !== 'none' ? selectedAccessory : undefined,
        hat: selectedHat !== 'none' ? selectedHat : undefined,
      }
    };
    
    onSave(selectedOptions);
    toast({
      title: "Avatar Customization Saved",
      description: "Your changes have been applied to your avatar",
    });
  };
  
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">Avatar Customization</CardTitle>
          <CardDescription>
            Customize your avatar with different characters and accessories!
          </CardDescription>
        </div>
        <Button onClick={handleSave}>
          Save Changes
        </Button>
      </CardHeader>
      <CardContent>
        {/* Avatar preview - moved to top */}
        <div className="bg-slate-100 rounded-lg p-6 flex flex-col items-center mb-8">
          <h3 className="font-medium text-lg mb-4">Preview</h3>
          <div className="w-40 h-40 flex items-center justify-center">
            <Avatar 
              character={previewOptions.character as any} 
              selectedRewards={previewOptions.accessories}
              size="xl"
              animate={true}
            />
          </div>
        </div>
        
        {/* Customization options */}
        <div>
          <Tabs defaultValue="character" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="character">Character</TabsTrigger>
              <TabsTrigger value="accessory">Accessory</TabsTrigger>
              <TabsTrigger value="hat">Hat</TabsTrigger>
            </TabsList>
            
            {/* Character selection */}
            <TabsContent value="character" className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {avatarCharacters.map((character) => {
                  const isUnlocked = isItemUnlocked(character);
                  return (
                    <div 
                      key={character.id}
                      className={`relative rounded-lg p-3 border-2 transition-all ${
                        selectedCharacter === character.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200'
                      } ${
                        !isUnlocked ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16">
                          <Avatar 
                            character={character.id as any} 
                            size="sm"
                            animate={false}
                          />
                        </div>
                        <span className="text-sm font-medium">{character.name}</span>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-2"
                        disabled={!isUnlocked}
                        onClick={() => setSelectedCharacter(character.id)}
                      >
                        {selectedCharacter === character.id ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
            
            {/* Accessory selection */}
            <TabsContent value="accessory" className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {avatarAccessories.map((accessory) => {
                  const isUnlocked = isItemUnlocked(accessory);
                  return (
                    <div 
                      key={accessory.id}
                      className={`relative rounded-lg p-3 border-2 transition-all ${
                        selectedAccessory === accessory.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200'
                      } ${
                        !isUnlocked ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16 flex items-center justify-center">
                          {accessory.id === 'sunglasses' && <span className="text-2xl">🕶️</span>}
                          {accessory.id === 'visor' && <span className="text-2xl">🧢</span>}
                          {accessory.id === 'chain' && <span className="text-2xl">⛓️</span>}
                          {accessory.id === 'none' && <span className="text-2xl">❌</span>}
                        </div>
                        <span className="text-sm font-medium">{accessory.name}</span>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-2"
                        disabled={!isUnlocked}
                        onClick={() => setSelectedAccessory(accessory.id)}
                      >
                        {selectedAccessory === accessory.id ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
            
            {/* Hat selection */}
            <TabsContent value="hat" className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {avatarHats.map((hat) => {
                  const isUnlocked = isItemUnlocked(hat);
                  return (
                    <div 
                      key={hat.id}
                      className={`relative rounded-lg p-3 border-2 transition-all ${
                        selectedHat === hat.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200'
                      } ${
                        !isUnlocked ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16 flex items-center justify-center">
                          {hat.id === 'party' && <span className="text-2xl">🎉</span>}
                          {hat.id === 'cap' && <span className="text-2xl">🧢</span>}
                          {hat.id === 'beanie' && <span className="text-2xl">🪖</span>}
                          {hat.id === 'tophat' && <span className="text-2xl">🎩</span>}
                          {hat.id === 'none' && <span className="text-2xl">❌</span>}
                        </div>
                        <span className="text-sm font-medium">{hat.name}</span>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-2"
                        disabled={!isUnlocked}
                        onClick={() => setSelectedHat(hat.id)}
                      >
                        {selectedHat === hat.id ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}