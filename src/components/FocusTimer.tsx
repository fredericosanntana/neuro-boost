import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Coffee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FocusTimerProps {
  onSessionComplete: () => void;
}

export const FocusTimer = ({ onSessionComplete }: FocusTimerProps) => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive) {
      interval = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (minutes > 0) {
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          // Timer completed
          setIsActive(false);
          if (isBreak) {
            setIsBreak(false);
            setMinutes(25);
            toast({
              title: "Pausa terminada! 🎯",
              description: "Hora de voltar ao foco!",
            });
          } else {
            onSessionComplete();
            setIsBreak(true);
            setMinutes(5);
            toast({
              title: "Sessão completa! 🎉",
              description: "Que tal uma pausa bem merecida?",
            });
          }
          setSeconds(0);
        }
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      if (interval) clearInterval(interval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, minutes, seconds, isBreak, onSessionComplete, toast]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setMinutes(25);
    setSeconds(0);
  };

  const formatTime = (mins: number, secs: number) => {
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = isBreak 
    ? ((5 * 60 - (minutes * 60 + seconds)) / (5 * 60)) * 100
    : ((25 * 60 - (minutes * 60 + seconds)) / (25 * 60)) * 100;

  return (
    <Card className="p-6 bg-gradient-warm border-accent/30">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 mb-4">
          {isBreak ? (
            <Coffee className="w-5 h-5 text-success" />
          ) : (
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse-gentle" />
          )}
          <span className="text-sm font-medium text-muted-foreground">
            {isBreak ? "Pausa" : "Foco"}
          </span>
        </div>

        <div className="relative w-40 h-40 mx-auto">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-accent"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              className={isBreak ? "text-success" : "text-primary"}
              style={{
                transition: "stroke-dashoffset 1s ease-in-out"
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold text-foreground">
              {formatTime(minutes, seconds)}
            </span>
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <Button 
            variant={isActive ? "outline" : (isBreak ? "success" : "focus")} 
            size="lg" 
            onClick={toggleTimer}
          >
            {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            {isActive ? "Pausar" : "Iniciar"}
          </Button>
          
          <Button variant="gentle" size="lg" onClick={resetTimer}>
            <RotateCcw className="w-5 h-5" />
            Reiniciar
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          {isBreak 
            ? "Descanse um pouco, você merece! ☕" 
            : "Concentre-se numa tarefa por vez 🎯"
          }
        </p>
      </div>
    </Card>
  );
};