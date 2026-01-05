import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Clock, Trophy, Target, Shield, Zap } from "lucide-react";

const features = [
    {
        title: "Timer de Foco",
        description: "Timer Pomodoro personalizável adaptado para padrões de foco neurodivergentes.",
        icon: Clock,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
    },
    {
        title: "Gamificação de Tarefas",
        description: "Transforme sua lista de tarefas em um jogo. Ganhe XP e suba de nível ao completar tarefas.",
        icon: Trophy,
        color: "text-yellow-500",
        bg: "bg-yellow-500/10",
    },
    {
        title: "Bloqueio de Distrações",
        description: "Ferramentas inteligentes para ajudar você a entrar no fluxo e minimizar interrupções externas.",
        icon: Shield,
        color: "text-red-500",
        bg: "bg-red-500/10",
    },
    {
        title: "Rastreamento de Metas",
        description: "Acompanhamento visual de progresso que celebra pequenas vitórias e constrói momentum.",
        icon: Target,
        color: "text-green-500",
        bg: "bg-green-500/10",
    },
    {
        title: "Interface Neuro-Amigável",
        description: "Interface limpa e livre de desordem, projetada para reduzir a carga cognitiva.",
        icon: Brain,
        color: "text-purple-500",
        bg: "bg-purple-500/10",
    },
    {
        title: "Fluxo Instantâneo",
        description: "Modos de início rápido para ajudar você a superar a disfunção executiva imediatamente.",
        icon: Zap,
        color: "text-orange-500",
        bg: "bg-orange-500/10",
    },
];

export const Features = () => {
    return (
        <section id="features" className="py-20 bg-secondary/30">
            <div className="container px-4 mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
                        Projetado para <span className="text-primary">Como Você Pensa</span>
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Ferramentas tradicionais de produtividade não funcionam para todos. O NeuroBoost é diferente.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <Card key={index} className="border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                            <CardHeader>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.bg}`}>
                                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                                </div>
                                <CardTitle>{feature.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="text-base">
                                    {feature.description}
                                </CardDescription>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
};
