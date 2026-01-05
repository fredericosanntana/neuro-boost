import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";

const LandingPage = () => {
    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-1">
                <Hero />
                <Features />

                {/* CTA Section */}
                <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
                    <div className="container px-4 mx-auto text-center relative z-10">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
                            Pronto para Dominar seu Foco?
                        </h2>
                        <p className="text-xl opacity-90 mb-10 max-w-2xl mx-auto">
                            Junte-se a milhares de outras pessoas que transformaram sua produtividade com o NeuroBoost.
                        </p>
                        <div className="flex justify-center">
                            <a
                                href="/app"
                                className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-primary bg-background rounded-full hover:bg-secondary transition-colors shadow-lg"
                            >
                                Inicie sua Jornada Agora
                            </a>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
};

export default LandingPage;
