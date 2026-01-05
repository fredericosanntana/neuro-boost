import { Brain, Twitter, Github, Linkedin } from "lucide-react";

export const Footer = () => {
    return (
        <footer className="bg-background border-t border-border/50 py-12">
            <div className="container px-4 mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Brain className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">NeuroBoost</span>
                    </div>

                    <div className="text-sm text-muted-foreground text-center md:text-right">
                        <p>&copy; {new Date().getFullYear()} NeuroBoost. Todos os direitos reservados.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                            <Twitter className="w-5 h-5" />
                        </a>
                        <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                            <Github className="w-5 h-5" />
                        </a>
                        <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                            <Linkedin className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};
