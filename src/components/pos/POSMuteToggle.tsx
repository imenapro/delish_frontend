import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';
import { isMuted, setMuted } from '@/utils/sounds';

export function POSMuteToggle() {
  const [muted, setMutedState] = useState(isMuted());

  const toggleMute = () => {
    const newState = !muted;
    setMutedState(newState);
    setMuted(newState);
  };

  // Sync with local storage changes if multiple tabs/components
  useEffect(() => {
    const handleStorageChange = () => {
        setMutedState(isMuted());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <Button
      variant={muted ? "destructive" : "outline"}
      size="sm"
      onClick={toggleMute}
      className={`
        transition-all duration-300 ease-in-out flex items-center gap-2 min-w-[140px] justify-center
        ${muted 
          ? 'bg-red-500 hover:bg-red-600 text-white border-red-600' 
          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
        }
      `}
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      title={muted ? "Click to unmute audio" : "Click to mute audio"}
    >
      {muted ? (
        <>
          <VolumeX className="h-4 w-4 animate-in zoom-in duration-300" />
          <span className="font-medium">Unmute Sound</span>
        </>
      ) : (
        <>
          <Volume2 className="h-4 w-4 animate-in zoom-in duration-300" />
          <span className="font-medium">Mute Sound</span>
        </>
      )}
    </Button>
  );
}
