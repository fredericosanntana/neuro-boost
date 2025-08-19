import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, MessageSquare, Volume2, Smartphone, Brain, Plus, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';

interface DistractionLoggerProps {
  sessionId: string;
}

type DistractionType = 'thought' | 'noise' | 'notification' | 'impulse' | 'other';
type DistractionSeverity = 1 | 2 | 3;

const DISTRACTION_CONFIG = {
  thought: {
    icon: Brain,
    label: 'Thought',
    color: 'bg-blue-100 text-blue-800',
    examples: ['worry', 'idea', 'memory', 'daydream']
  },
  noise: {
    icon: Volume2,
    label: 'Noise',
    color: 'bg-red-100 text-red-800',
    examples: ['conversation', 'music', 'traffic', 'construction']
  },
  notification: {
    icon: Smartphone,
    label: 'Notification',
    color: 'bg-yellow-100 text-yellow-800',
    examples: ['phone', 'email', 'message', 'app alert']
  },
  impulse: {
    icon: Zap,
    label: 'Impulse',
    color: 'bg-purple-100 text-purple-800',
    examples: ['check social media', 'get snack', 'look outside', 'stretch']
  },
  other: {
    icon: MessageSquare,
    label: 'Other',
    color: 'bg-gray-100 text-gray-800',
    examples: ['interruption', 'physical discomfort', 'environmental']
  }
};

const SEVERITY_LABELS = {
  1: { label: 'Minor', color: 'bg-green-100 text-green-800', description: 'Brief, easily dismissed' },
  2: { label: 'Moderate', color: 'bg-yellow-100 text-yellow-800', description: 'Noticeable disruption' },
  3: { label: 'Major', color: 'bg-red-100 text-red-800', description: 'Significant interruption' }
};

export const DistractionLogger: React.FC<DistractionLoggerProps> = ({ sessionId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<DistractionType>('thought');
  const [severity, setSeverity] = useState<DistractionSeverity>(2);
  const [description, setDescription] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [recentDistractions, setRecentDistractions] = useState<Array<{
    type: DistractionType;
    severity: DistractionSeverity;
    timestamp: Date;
  }>>([]);

  const { toast } = useToast();

  const quickLogDistraction = async (quickType: DistractionType, quickSeverity: DistractionSeverity = 2) => {
    try {
      setIsLogging(true);
      
      await apiClient.request(`/focus/sessions/${sessionId}/distractions`, {
        method: 'POST',
        body: JSON.stringify({
          type: quickType,
          severity: quickSeverity,
          description: ''
        })
      });

      const newDistraction = {
        type: quickType,
        severity: quickSeverity,
        timestamp: new Date()
      };

      setRecentDistractions(prev => [newDistraction, ...prev.slice(0, 4)]);

      const config = DISTRACTION_CONFIG[quickType];
      toast({
        title: "Distraction Logged",
        description: `${config.label} distraction recorded. Stay focused! 💪`,
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log distraction. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLogging(false);
    }
  };

  const logDetailedDistraction = async () => {
    try {
      setIsLogging(true);
      
      await apiClient.request(`/focus/sessions/${sessionId}/distractions`, {
        method: 'POST',
        body: JSON.stringify({
          type,
          severity,
          description: description.trim() || undefined
        })
      });

      const newDistraction = {
        type,
        severity,
        timestamp: new Date()
      };

      setRecentDistractions(prev => [newDistraction, ...prev.slice(0, 4)]);

      toast({
        title: "Distraction Logged",
        description: "Details recorded. Let's get back to focus! 🎯",
        duration: 3000,
      });

      // Reset form
      setDescription('');
      setType('thought');
      setSeverity(2);
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log distraction. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <Card className="border-dashed border-2 border-muted">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
          Quick Distraction Log
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Log Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(DISTRACTION_CONFIG).slice(0, 4).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => quickLogDistraction(key as DistractionType)}
                disabled={isLogging}
                className="h-auto p-2 flex flex-col gap-1"
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs">{config.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Detailed Log Dialog */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Log with Details
            </Button>
          </DialogTrigger>
          
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Distraction Details</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Type of Distraction</label>
                <Select value={type} onValueChange={(value) => setType(value as DistractionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DISTRACTION_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {config.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Examples: {DISTRACTION_CONFIG[type].examples.join(', ')}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Severity</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {Object.entries(SEVERITY_LABELS).map(([level, config]) => (
                    <Button
                      key={level}
                      variant={severity === parseInt(level) ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSeverity(parseInt(level) as DistractionSeverity)}
                      className="flex flex-col gap-1 h-auto p-2"
                    >
                      <span className="font-medium">{level}</span>
                      <span className="text-xs">{config.label}</span>
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {SEVERITY_LABELS[severity].description}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Description (Optional)</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the distraction..."
                  maxLength={200}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {200 - description.length} characters remaining
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={logDetailedDistraction} disabled={isLogging}>
                  {isLogging ? 'Logging...' : 'Log Distraction'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Recent Distractions */}
        {recentDistractions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Recent:</p>
            <div className="flex flex-wrap gap-1">
              {recentDistractions.map((distraction, index) => {
                const config = DISTRACTION_CONFIG[distraction.type];
                const severityConfig = SEVERITY_LABELS[distraction.severity];
                return (
                  <div key={index} className="flex items-center gap-1">
                    <Badge variant="outline" className={`text-xs ${config.color}`}>
                      {config.label}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${severityConfig.color}`}>
                      {distraction.severity}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            💡 Acknowledging distractions helps you refocus faster
          </p>
        </div>
      </CardContent>
    </Card>
  );
};