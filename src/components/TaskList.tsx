import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: boolean;
}

interface TaskListProps {
  onTaskComplete: () => void;
}

export const TaskList = ({ onTaskComplete }: TaskListProps) => {
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", text: "Configurar ambiente de trabalho", completed: false, priority: true },
    { id: "2", text: "Revisar lista de prioridades", completed: false, priority: false }
  ]);
  const [newTask, setNewTask] = useState("");
  const { toast } = useToast();

  const addTask = () => {
    if (newTask.trim()) {
      const task: Task = {
        id: Date.now().toString(),
        text: newTask.trim(),
        completed: false,
        priority: false
      };
      setTasks([task, ...tasks]);
      setNewTask("");
      toast({
        title: "Nova tarefa adicionada! ✨",
        description: "Continue assim, você está indo bem!",
      });
    }
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => {
      if (task.id === id) {
        const updated = { ...task, completed: !task.completed };
        if (updated.completed) {
          onTaskComplete();
          toast({
            title: "Tarefa concluída! 🎉",
            description: "Mais uma vitória conquistada!",
          });
        }
        return updated;
      }
      return task;
    }));
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const togglePriority = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, priority: !task.priority } : task
    ));
  };

  const completedCount = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;

  return (
    <Card className="p-6 bg-gradient-warm border-accent/30">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Suas Tarefas</h3>
          <div className="text-sm text-muted-foreground">
            {completedCount}/{totalTasks} concluídas
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-accent rounded-full h-2">
          <div 
            className="bg-gradient-success h-2 rounded-full transition-all duration-500 ease-gentle"
            style={{ width: totalTasks > 0 ? `${(completedCount / totalTasks) * 100}%` : '0%' }}
          />
        </div>

        {/* Add new task */}
        <div className="flex gap-2">
          <Input
            placeholder="Nova tarefa..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTask()}
            className="border-accent/50 focus:border-primary"
          />
          <Button variant="primary" size="icon" onClick={addTask}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Task list */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 ease-gentle ${
                task.completed 
                  ? 'bg-success-soft border-success/30 opacity-75' 
                  : 'bg-background border-accent/30 hover:border-primary/50'
              }`}
            >
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleTask(task.id)}
                className="data-[state=checked]:bg-success data-[state=checked]:border-success"
              />
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => togglePriority(task.id)}
                className={`h-6 w-6 ${task.priority ? 'text-focus' : 'text-muted-foreground hover:text-focus'}`}
              >
                <Star className={`w-3 h-3 ${task.priority ? 'fill-current' : ''}`} />
              </Button>

              <span
                className={`flex-1 text-sm ${
                  task.completed 
                    ? 'line-through text-muted-foreground' 
                    : task.priority 
                    ? 'font-medium text-foreground' 
                    : 'text-foreground'
                }`}
              >
                {task.text}
              </span>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeTask(task.id)}
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>

        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Nenhuma tarefa ainda</p>
            <p className="text-xs mt-1">Adicione uma tarefa para começar! 🚀</p>
          </div>
        )}
      </div>
    </Card>
  );
};