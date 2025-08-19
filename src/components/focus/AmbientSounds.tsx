import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Volume2, VolumeX, Play, Pause, Waves, TreePine, Zap, Cloud, Coffee } from 'lucide-react';

interface AmbientSoundsProps {
  currentSound: string;
  onSoundChange: (sound: string) => void;
}

const AMBIENT_SOUNDS = {
  'none': {
    name: 'None',
    icon: VolumeX,
    color: 'text-gray-500',
    description: 'Silent focus mode'
  },
  'binaural': {
    name: 'Focus Tones',
    icon: Zap,
    color: 'text-purple-600',
    description: 'Binaural beats for concentration',
    generated: true
  },
  'white-noise': {
    name: 'White Noise',
    icon: Cloud,
    color: 'text-gray-400',
    description: 'Static sound for concentration',
    generated: true
  },
  'brown-noise': {
    name: 'Brown Noise',
    icon: Waves,
    color: 'text-amber-600',
    description: 'Deep, rumbling sound for ADHD focus',
    generated: true
  },
};

export const AmbientSounds: React.FC<AmbientSoundsProps> = ({ 
  currentSound, 
  onSoundChange 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([0.3]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Initialize and manage audio context
  useEffect(() => {
    // Auto-start sound when selected (except 'none')
    if (currentSound && currentSound !== 'none') {
      startAmbientSound();
    } else {
      stopAmbientSound();
    }

    return () => {
      stopAmbientSound();
    };
  }, [currentSound]);

  // Update volume when changed
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume[0] * 0.3;
    }
    if (audioElementRef.current) {
      audioElementRef.current.volume = volume[0];
    }
  }, [volume]);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const generateNoiseBuffer = (soundType: string, audioContext: AudioContext) => {
    const bufferSize = audioContext.sampleRate * 2;
    const noiseBuffer = audioContext.createBuffer(2, bufferSize, audioContext.sampleRate);
    const outputLeft = noiseBuffer.getChannelData(0);
    const outputRight = noiseBuffer.getChannelData(1);
    
    if (soundType === 'brown-noise') {
      // Brown noise generation - better for ADHD
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const sample = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        outputLeft[i] = sample;
        outputRight[i] = sample;
        b6 = white * 0.115926;
      }
    } else if (soundType === 'white-noise') {
      // White noise generation
      for (let i = 0; i < bufferSize; i++) {
        const sample = Math.random() * 2 - 1;
        outputLeft[i] = sample;
        outputRight[i] = sample;
      }
    } else if (soundType === 'binaural') {
      // Binaural beats for focus (40Hz base + 44Hz)
      const baseFreq = 200; // Base carrier frequency
      const beatFreq = 4;   // 4Hz difference for focus
      for (let i = 0; i < bufferSize; i++) {
        const time = i / audioContext.sampleRate;
        const leftTone = Math.sin(2 * Math.PI * baseFreq * time) * 0.3;
        const rightTone = Math.sin(2 * Math.PI * (baseFreq + beatFreq) * time) * 0.3;
        outputLeft[i] = leftTone;
        outputRight[i] = rightTone;
      }
    }
    
    return noiseBuffer;
  };

  const startAmbientSound = async () => {
    try {
      console.log(`🎵 Starting ${currentSound} sound...`);
      stopAmbientSound(); // Stop any existing sound
      
      // Wait a bit to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (currentSound === 'none') return;

      const soundConfig = AMBIENT_SOUNDS[currentSound as keyof typeof AMBIENT_SOUNDS];
      
      if (soundConfig?.generated) {
        // Use Web Audio API for generated sounds
        const audioContext = initAudioContext();
        
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        const soundBuffer = generateNoiseBuffer(currentSound, audioContext);
        const sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = soundBuffer;
        sourceNode.loop = true;
        
        const gainNode = audioContext.createGain();
        gainNode.gain.value = volume[0] * 0.3;
        
        sourceNode.connect(gainNode);
        gainNode.connect(audioContext.destination);
        sourceNode.start(0);
        
        sourceNodeRef.current = sourceNode;
        gainNodeRef.current = gainNode;
        
        setIsPlaying(true);
        console.log(`🎵 Started generated ${currentSound} sound`);
      } else if (soundConfig?.url) {
        // Use HTML Audio for file-based sounds
        console.log(`🎵 Attempting to load audio: ${soundConfig.url}`);
        const audio = new Audio();
        audio.src = soundConfig.url;
        audio.loop = true;
        audio.volume = volume[0];
        
        // Try without crossOrigin first
        audio.addEventListener('loadstart', () => {
          console.log(`🎵 Started loading ${currentSound} audio`);
        });
        
        audio.addEventListener('canplay', () => {
          console.log(`🎵 ${currentSound} audio can start playing`);
          audio.play().then(() => {
            setIsPlaying(true);
            console.log(`🎵 Successfully started ${currentSound} audio`);
          }).catch(err => {
            console.error('Error playing audio:', err);
            setIsPlaying(false);
          });
        });
        
        audio.addEventListener('error', (e) => {
          console.error('Audio loading error for', currentSound, ':', e);
          console.log(`⚠️ Trying with crossOrigin for ${currentSound}`);
          
          // Try again with crossOrigin
          const audioWithCors = new Audio();
          audioWithCors.crossOrigin = 'anonymous';
          audioWithCors.src = soundConfig.url;
          audioWithCors.loop = true;
          audioWithCors.volume = volume[0];
          
          audioWithCors.addEventListener('canplay', () => {
            console.log(`🎵 ${currentSound} audio with CORS can start playing`);
            audioWithCors.play().then(() => {
              setIsPlaying(true);
              console.log(`🎵 Successfully started ${currentSound} with CORS`);
            }).catch(corsErr => {
              console.error('CORS audio also failed:', corsErr);
              
              // Final fallback to generated sound
              console.log(`⚠️ All audio loading failed for ${currentSound}, using generated fallback`);
              try {
                const audioContext = initAudioContext();
                if (audioContext.state === 'suspended') {
                  audioContext.resume();
                }
                
                const fallbackBuffer = generateNoiseBuffer(currentSound, audioContext);
                const sourceNode = audioContext.createBufferSource();
                sourceNode.buffer = fallbackBuffer;
                sourceNode.loop = true;
                
                const gainNode = audioContext.createGain();
                gainNode.gain.value = volume[0] * 0.3;
                
                sourceNode.connect(gainNode);
                gainNode.connect(audioContext.destination);
                sourceNode.start(0);
                
                sourceNodeRef.current = sourceNode;
                gainNodeRef.current = gainNode;
                
                setIsPlaying(true);
                console.log(`🎵 Started generated fallback for ${currentSound}`);
              } catch (fallbackError) {
                console.error('Fallback sound generation failed:', fallbackError);
                setIsPlaying(false);
              }
            });
          });
          
          audioWithCors.addEventListener('error', () => {
            console.error('CORS audio also failed for', currentSound);
            // Clean up failed audio element
            audioElementRef.current = null;
          });
          
          // Clean up original audio element first
          if (audioElementRef.current) {
            audioElementRef.current.pause();
            audioElementRef.current.src = '';
          }
          
          audioElementRef.current = audioWithCors;
          audioWithCors.load();
        });
        
        audioElementRef.current = audio;
        audio.load();
      }
    } catch (error) {
      console.error('Error starting ambient sound:', error);
      setIsPlaying(false);
    }
  };

  const stopAmbientSound = () => {
    try {
      console.log('🛑 Stopping all ambient sounds...');
      
      // Stop Web Audio API sounds
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
          sourceNodeRef.current.disconnect();
        } catch (e) {
          console.log('Source node already stopped');
        }
        sourceNodeRef.current = null;
      }
      
      if (gainNodeRef.current) {
        try {
          gainNodeRef.current.disconnect();
        } catch (e) {
          console.log('Gain node already disconnected');
        }
        gainNodeRef.current = null;
      }
      
      // Stop HTML Audio elements
      if (audioElementRef.current) {
        try {
          audioElementRef.current.pause();
          audioElementRef.current.currentTime = 0;
          audioElementRef.current.src = '';
          audioElementRef.current.load();
        } catch (e) {
          console.log('Audio element already stopped');
        }
        audioElementRef.current = null;
      }
      
      setIsPlaying(false);
      console.log('🛑 All ambient sounds stopped');
    } catch (error) {
      console.error('Error stopping ambient sound:', error);
    }
  };

  const togglePlayback = () => {
    if (!currentSound || currentSound === 'none') return;

    if (isPlaying) {
      stopAmbientSound();
    } else {
      startAmbientSound();
    }
  };

  const previewSound = async (soundKey: string) => {
    if (soundKey === 'none') return;

    setIsPreviewMode(true);
    
    // Temporarily start the sound for 3 seconds
    const originalSound = currentSound;
    onSoundChange(soundKey);
    
    setTimeout(() => {
      setIsPreviewMode(false);
      onSoundChange(originalSound);
    }, 3000);
  };

  const handleSoundChange = (newSound: string) => {
    onSoundChange(newSound);
  };

  const currentSoundConfig = currentSound && currentSound !== '' ? AMBIENT_SOUNDS[currentSound as keyof typeof AMBIENT_SOUNDS] : AMBIENT_SOUNDS['none'];

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Ambient Sounds</label>
        <Select value={currentSound || 'none'} onValueChange={handleSoundChange}>
          <SelectTrigger>
            <SelectValue placeholder="Choose ambient sound" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(AMBIENT_SOUNDS).map(([key, sound]) => {
              const Icon = sound.icon;
              return (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${sound.color}`} />
                    <div>
                      <div className="font-medium">{sound.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {sound.description}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {currentSound && currentSound !== 'none' && (
        <div className="space-y-3">
          {/* Volume Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Volume</label>
              <span className="text-sm text-muted-foreground">
                {Math.round(volume[0] * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <VolumeX className="w-4 h-4 text-muted-foreground" />
              <Slider
                value={volume}
                onValueChange={setVolume}
                max={1}
                min={0}
                step={0.1}
                className="flex-1"
              />
              <Volume2 className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={togglePlayback}
                disabled={isPreviewMode}
                className="gap-2"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Play
                  </>
                )}
              </Button>

              {!isPlaying && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => previewSound(currentSound)}
                  disabled={isPreviewMode}
                  className="gap-2"
                >
                  <Waves className="w-4 h-4" />
                  {isPreviewMode ? 'Previewing...' : 'Preview 3s'}
                </Button>
              )}
            </div>

            {isPlaying && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Playing
              </div>
            )}
          </div>

          {/* Sound Info */}
          <Card className="bg-muted/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <currentSoundConfig.icon className={`w-4 h-4 ${currentSoundConfig.color}`} />
                <div>
                  <div className="font-medium text-sm">{currentSoundConfig.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {currentSoundConfig.description}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ADHD-specific Tips */}
          {currentSound === 'brown-noise' && (
            <div className="text-xs text-muted-foreground bg-amber-50 p-2 rounded border border-amber-200">
              💡 <strong>ADHD Tip:</strong> Brown noise can help mask distracting sounds and improve focus by providing consistent auditory input.
            </div>
          )}

          {currentSound === 'white-noise' && (
            <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded border border-gray-200">
              💡 <strong>Focus Tip:</strong> White noise helps create a consistent audio environment, reducing sudden distractions.
            </div>
          )}


          {currentSound === 'binaural' && (
            <div className="text-xs text-muted-foreground bg-purple-50 p-2 rounded border border-purple-200">
              💡 <strong>Focus Tip:</strong> Use headphones for best results with binaural beats. 4Hz beats enhance focus and concentration.
            </div>
          )}
        </div>
      )}

      {/* Note about audio files */}
      <div className="text-xs text-muted-foreground text-center">
        🎵 Ambient sounds help create a consistent environment for better focus
      </div>
    </div>
  );
};