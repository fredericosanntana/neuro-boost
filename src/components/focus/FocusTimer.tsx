import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Square, Settings, Brain, Coffee } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DistractionLogger } from './DistractionLogger';
import { AmbientSounds } from './AmbientSounds';
import { apiClient } from '@/lib/api-client';

interface FocusTimerProps {
  taskId?: string;
  onSessionComplete?: (sessionData: any) => void;
}

type TimerState = 'idle' | 'running' | 'paused' | 'completed';
type SessionDuration = 15 | 25 | 45;

const MOTIVATIONAL_MESSAGES = [
  "You're doing great! Stay focused! 💪",
  "Every minute counts towards your goal! 🎯",
  "Your brain is building focus muscle! 🧠",
  "Small steps lead to big achievements! ✨",
  "You've got this! Keep going! 🚀",
  "Focus is your superpower! ⚡",
  "Progress over perfection! 📈"
];

const BREAK_SUGGESTIONS = {
  15: ["Take 3 deep breaths", "Stretch your arms", "Look away from screen"],
  25: ["5-minute walk", "Light stretching", "Drink water"],
  45: ["15-minute walk", "Healthy snack", "Step outside"]
};

export const FocusTimer: React.FC<FocusTimerProps> = ({ taskId, onSessionComplete }) => {
  const [state, setState] = useState<TimerState>('idle');
  const [duration, setDuration] = useState<SessionDuration>(25);
  const [timeRemaining, setTimeRemaining] = useState(duration * 60);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [hyperfocusWarning, setHyperfocusWarning] = useState(false);
  const [ambientSound, setAmbientSound] = useState<string>('none');
  const [effectivenessRating, setEffectivenessRating] = useState<number>(3);
  const [showEffectivenessDialog, setShowEffectivenessDialog] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hyperfocusCheckRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Calculate progress percentage
  const progress = ((duration * 60 - timeRemaining) / (duration * 60)) * 100;

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Update motivational message periodically
  useEffect(() => {
    if (state === 'running') {
      const messageInterval = setInterval(() => {
        const randomMessage = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
        setCurrentMessage(randomMessage);
      }, 30000); // Every 30 seconds

      return () => clearInterval(messageInterval);
    }
  }, [state]);

  // Hyperfocus detection
  const checkHyperfocus = useCallback(async () => {
    if (sessionId && state === 'running') {
      try {
        const response = await apiClient.request(`/focus/sessions/${sessionId}/hyperfocus-check`);
        if (response.hyperfocus_detected && !hyperfocusWarning) {
          setHyperfocusWarning(true);
          toast({
            title: "Hyperfocus Detected 🧠",
            description: "You've been focused for over 90 minutes. Consider taking a break!",
            duration: 10000,
          });
        }
      } catch (error) {
        console.error('Hyperfocus check failed:', error);
      }
    }
  }, [sessionId, state, hyperfocusWarning, toast]);

  // Set up hyperfocus checking
  useEffect(() => {
    if (state === 'running') {
      hyperfocusCheckRef.current = setInterval(checkHyperfocus, 60000); // Check every minute
      return () => {
        if (hyperfocusCheckRef.current) {
          clearInterval(hyperfocusCheckRef.current);
        }
      };
    }
  }, [state, checkHyperfocus]);

  // Timer countdown logic
  useEffect(() => {
    if (state === 'running' && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setState('completed');
            setShowEffectivenessDialog(true);
            toast({
              title: "Session Complete! 🎉",
              description: `Great job! You focused for ${duration} minutes.`,
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [state, timeRemaining, duration, toast]);

  const startSession = async () => {
    try {
      const response = await apiClient.request('/focus/sessions', {
        method: 'POST',
        body: JSON.stringify({
          task_id: taskId,
          duration,
          ambient_sound: ambientSound === 'none' ? undefined : ambientSound
        })
      });

      setSessionId(response.session.id);
      setState('running');
      setTimeRemaining(duration * 60);
      setCurrentMessage(MOTIVATIONAL_MESSAGES[0]);
      setHyperfocusWarning(false);

      toast({
        title: "Focus Session Started! 🎯",
        description: `${duration} minute session in progress. You've got this!`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start focus session. Please try again.",
        variant: "destructive"
      });
    }
  };

  const pauseSession = () => {
    setState('paused');
    setCurrentMessage('Session paused. Take a moment to breathe. 🌸');
  };

  const resumeSession = () => {
    setState('running');
    setCurrentMessage('Welcome back! Let\'s refocus! 💪');
  };

  const stopSession = async (reason: 'user_stopped' | 'hyperfocus_detected' = 'user_stopped') => {
    if (!sessionId) return;

    try {
      await apiClient.request(`/focus/sessions/${sessionId}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          effectiveness_rating: effectivenessRating,
          interruption_reason: reason
        })
      });

      setState('idle');
      setTimeRemaining(duration * 60);
      setSessionId(null);
      setCurrentMessage('');
      setHyperfocusWarning(false);
      setAmbientSound('none'); // Stop ambient sound when session ends

      const suggestions = BREAK_SUGGESTIONS[duration];
      const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];

      toast({
        title: reason === 'hyperfocus_detected' ? "Session Interrupted for Your Wellbeing" : "Session Stopped",
        description: `Break suggestion: ${suggestion}`,
      });

      if (onSessionComplete) {
        onSessionComplete({ duration, rating: effectivenessRating });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save session data.",
        variant: "destructive"
      });
    }
  };

  const completeSession = async () => {
    if (!sessionId) return;

    try {
      await apiClient.request(`/focus/sessions/${sessionId}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          effectiveness_rating: effectivenessRating,
          interruption_reason: 'completed'
        })
      });

      setState('idle');
      setTimeRemaining(duration * 60);
      setSessionId(null);
      setCurrentMessage('');
      setShowEffectivenessDialog(false);
      setAmbientSound('none'); // Stop ambient sound when session completes

      const suggestions = BREAK_SUGGESTIONS[duration];
      const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];

      toast({
        title: "Excellent Work! 🎉",
        description: `Session completed! Break suggestion: ${suggestion}`,
      });

      if (onSessionComplete) {
        onSessionComplete({ duration, rating: effectivenessRating, completed: true });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save session data.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Adaptive Focus Timer
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </CardTitle>
          
          {hyperfocusWarning && (
            <Badge variant="destructive" className="mx-auto">
              ⚠️ Hyperfocus Detected - Consider a Break
            </Badge>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Settings Panel */}
          {showSettings && state === 'idle' && (
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <div>
                <label className="text-sm font-medium">Session Duration</label>
                <Select value={duration.toString()} onValueChange={(value) => {
                  const newDuration = parseInt(value) as SessionDuration;
                  setDuration(newDuration);
                  setTimeRemaining(newDuration * 60);
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes (Quick Focus)</SelectItem>
                    <SelectItem value="25">25 minutes (Classic Pomodoro)</SelectItem>
                    <SelectItem value="45">45 minutes (Deep Work)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Ambient Sounds - Always rendered to maintain audio continuity */}
          <div className={showSettings && state === 'idle' ? 'p-4 bg-muted rounded-lg' : 'hidden'}>
            <AmbientSounds 
              currentSound={ambientSound}
              onSoundChange={setAmbientSound}
            />
          </div>

          {/* Timer Display */}
          <div className="text-center space-y-4">
            <div className="text-6xl font-mono font-bold text-primary">
              {formatTime(timeRemaining)}
            </div>
            
            <Progress value={progress} className="h-3" />
            
            <div className="flex justify-center gap-2">
              <Badge variant="outline">{duration} min session</Badge>
              {state !== 'idle' && (
                <Badge variant={state === 'running' ? 'default' : 'secondary'}>
                  {state.charAt(0).toUpperCase() + state.slice(1)}
                </Badge>
              )}
            </div>
          </div>

          {/* Motivational Message */}
          {currentMessage && (
            <div className="text-center text-sm text-muted-foreground bg-primary/5 p-3 rounded-lg">
              {currentMessage}
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex justify-center gap-2">
            {state === 'idle' && (
              <Button onClick={startSession} className="gap-2">
                <Play className="w-4 h-4" />
                Start Focus Session
              </Button>
            )}
            
            {state === 'running' && (
              <>
                <Button onClick={pauseSession} variant="outline" className="gap-2">
                  <Pause className="w-4 h-4" />
                  Pause
                </Button>
                <Button onClick={() => stopSession()} variant="destructive" className="gap-2">
                  <Square className="w-4 h-4" />
                  Stop
                </Button>
              </>
            )}
            
            {state === 'paused' && (
              <>
                <Button onClick={resumeSession} className="gap-2">
                  <Play className="w-4 h-4" />
                  Resume
                </Button>
                <Button onClick={() => stopSession()} variant="destructive" className="gap-2">
                  <Square className="w-4 h-4" />
                  Stop
                </Button>
              </>
            )}

            {hyperfocusWarning && state === 'running' && (
              <Button 
                onClick={() => stopSession('hyperfocus_detected')} 
                variant="secondary" 
                className="gap-2"
              >
                <Coffee className="w-4 h-4" />
                Take Break
              </Button>
            )}
          </div>

          {/* Distraction Logger */}
          {sessionId && state === 'running' && (
            <DistractionLogger sessionId={sessionId} />
          )}
        </CardContent>
      </Card>

      {/* Effectiveness Rating Dialog */}
      {showEffectivenessDialog && (
        <Card>
          <CardHeader>
            <CardTitle>How effective was this session?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  variant={effectivenessRating === rating ? "default" : "outline"}
                  onClick={() => setEffectivenessRating(rating)}
                  className="w-12 h-12"
                >
                  {rating}
                </Button>
              ))}
            </div>
            <div className="text-center text-sm text-muted-foreground">
              1 = Not focused, 5 = Extremely focused
            </div>
            <div className="flex justify-center gap-2">
              <Button onClick={completeSession}>
                Complete Session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};