import { Button } from "@/components/ui/button";
import { Brain, ArrowRight, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Hero = () => {
    const navigate = useNavigate();

    return (
        <div className="relative overflow-hidden bg-background pt-20 pb-16 md:pt-32 md:pb-24">
            <div className="container relative z-10 px-4 mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-sm font-medium rounded-full bg-primary/10 text-primary animate-fade-in">
                    <Zap className="w-4 h-4" />
                    <span>Produtividade Supercharged</span>
                </div>

                <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl mb-6 animate-fade-in-up">
                    Desbloqueie seu Potencial com <br className="hidden sm:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-500">
                        NeuroBoost
                    </span>
                </h1>

                <p className="max-w-2xl mx-auto mb-10 text-lg text-muted-foreground sm:text-xl md:text-2xl animate-fade-in-up delay-100">
                    A ferramenta definitiva de produtividade projetada para mentes únicas. Domine seu foco, gerencie tarefas e gamifique seu sucesso.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-200">
                    <Button
                        size="lg"
                        className="w-full sm:w-auto text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
                        onClick={() => navigate('/app')}
                    >
                        Começar Grátis
                        <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="lg"
                        className="w-full sm:w-auto text-lg px-8 py-6 rounded-full"
                        onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                        Saiba Mais
                    </Button>
                </div>
            </div>

            {/* Abstract Background Shapes */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[100px]" />
                <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] rounded-full bg-indigo-500/5 blur-[100px]" />
                <div className="absolute bottom-0 left-[20%] w-[30%] h-[30%] rounded-full bg-teal-500/5 blur-[100px]" />
            </div>
        </div>
    );
};
