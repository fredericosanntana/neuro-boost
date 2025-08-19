import { Card } from "@/components/ui/card";
import { Trophy, Target, Clock, Zap } from "lucide-react";

interface ProgressTrackerProps {
  completedTasks: number;
  focusSessions: number;
  dailyGoal: number;
}

export const ProgressTracker = ({ 
  completedTasks, 
  focusSessions, 
  dailyGoal = 6 
}: ProgressTrackerProps) => {
  const achievements = [
    {
      icon: Target,
      label: "Tarefas hoje",
      current: completedTasks,
      goal: dailyGoal,
      color: "text-success",
      bgColor: "bg-success-soft"
    },
    {
      icon: Clock,
      label: "Sessões de foco",
      current: focusSessions,
      goal: 4,
      color: "text-primary",
      bgColor: "bg-primary-soft"
    },
    {
      icon: Zap,
      label: "Sequência",
      current: Math.min(completedTasks, 3),
      goal: 3,
      color: "text-focus",
      bgColor: "bg-focus-soft"
    }
  ];

  const totalProgress = ((completedTasks + focusSessions) / (dailyGoal + 4)) * 100;

  return (
    <Card className="p-6 bg-gradient-warm border-accent/30">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Progresso Hoje</h3>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-focus" />
            <span className="text-sm font-medium text-focus">
              {Math.round(totalProgress)}%
            </span>
          </div>
        </div>

        {/* Main progress circle */}
        <div className="flex justify-center mb-6">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-accent"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - totalProgress / 100)}`}
                className="text-primary"
                style={{
                  transition: "stroke-dashoffset 1s ease-in-out"
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-foreground">
                {Math.round(totalProgress)}%
              </span>
              <span className="text-xs text-muted-foreground">do seu dia</span>
            </div>
          </div>
        </div>

        {/* Achievement cards */}
        <div className="grid grid-cols-1 gap-3">
          {achievements.map((achievement, index) => {
            const Icon = achievement.icon;
            const progress = (achievement.current / achievement.goal) * 100;
            const isComplete = achievement.current >= achievement.goal;
            
            return (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 ${
                  isComplete 
                    ? `${achievement.bgColor} border-transparent` 
                    : 'bg-background border-accent/30'
                }`}
              >
                <div className={`p-2 rounded-lg ${achievement.bgColor}`}>
                  <Icon className={`w-4 h-4 ${achievement.color}`} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {achievement.label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {achievement.current}/{achievement.goal}
                    </span>
                  </div>
                  
                  <div className="w-full bg-accent rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-500 ease-gentle ${
                        isComplete ? 'bg-gradient-success' : 'bg-gradient-primary'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                {isComplete && (
                  <div className="animate-bounce-subtle">
                    <Trophy className="w-4 h-4 text-focus" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center pt-2">
          <p className="text-sm text-muted-foreground">
            {totalProgress >= 100 
              ? "Parabéns! Você arrasou hoje! 🎉" 
              : totalProgress >= 50
              ? "Você está indo muito bem! 💪"
              : "Cada pequeno passo conta! 🌟"
            }
          </p>
        </div>
      </div>
    </Card>
  );
};