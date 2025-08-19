import { useState } from "react";
import { FocusTimer } from "@/components/FocusTimer";
import { TaskList } from "@/components/TaskList";
import { ProgressTracker } from "@/components/ProgressTracker";
import { Button } from "@/components/ui/button";
import { Brain, Sun, Moon, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";

const Index = () => {
  const [completedTasks, setCompletedTasks] = useState(0);
  const [focusSessions, setFocusSessions] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { user, isLoading, logout } = useAuth();

  const handleTaskComplete = () => {
    setCompletedTasks(prev => prev + 1);
  };

  const handleSessionComplete = () => {
    setFocusSessions(prev => prev + 1);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-warm p-4">
        <LoginForm />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-warm ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <header className="border-b border-accent/30 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-lg shadow-gentle">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">ADHD Focus</h1>
                <p className="text-sm text-muted-foreground">Olá, {user.name}!</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="gentle"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full"
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Timer */}
          <div className="lg:col-span-1">
            <FocusTimer onSessionComplete={handleSessionComplete} />
          </div>

          {/* Center Column - Tasks */}
          <div className="lg:col-span-1">
            <TaskList onTaskComplete={handleTaskComplete} />
          </div>

          {/* Right Column - Progress */}
          <div className="lg:col-span-1">
            <ProgressTracker 
              completedTasks={completedTasks}
              focusSessions={focusSessions}
              dailyGoal={6}
            />
          </div>
        </div>

        {/* Motivational Footer */}
        <div className="text-center mt-12 space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">
            Você tem o poder de conquistar seus objetivos! 💪
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Cada pequeno passo te leva mais perto do seu sucesso. 
            Com foco e organização, você pode superar qualquer desafio.
          </p>
          
          <div className="flex justify-center gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{completedTasks}</div>
              <div className="text-xs text-muted-foreground">Tarefas hoje</div>
            </div>
            <div className="w-px bg-accent mx-4"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{focusSessions}</div>
              <div className="text-xs text-muted-foreground">Sessões de foco</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
