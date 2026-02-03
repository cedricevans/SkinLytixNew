import { useNavigate } from 'react-router-dom';
import { ArrowRight, Beaker, Coins, Layers } from 'lucide-react';

interface ProblemSectionProps {
  id?: string;
}

const ProblemSection = ({ id }: ProblemSectionProps) => {
  const navigate = useNavigate();
  const modules = [
    {
      icon: Beaker,
      title: 'Ingredient Intelligence',
      description: 'Decode confusing ingredient lists instantly for any personal care product - face, body, or hair.',
      pain: 'Pain Point: 70% find ingredients confusing',
      cta: 'Get clarity in seconds',
    },
    {
      icon: Layers,
      title: 'Routine Optimizer',
      description: 'Stop products from fighting each other. Our EpiQ score analyzes interactions across your entire routine.',
      pain: "Pain Point: 69% don't know how products work together",
      cta: 'Maximize effectiveness',
    },
    {
      icon: Coins,
      title: 'Cost Analysis',
      description: 'See if expensive products justify their price. Compare formulas and find budget-friendly alternatives.',
      pain: 'Pain Point: 67% say price is most influential',
      cta: 'Save money, get results',
    },
  ];

  return (
    <>
      <section id={id} className="py-20 bg-background">
        <div className="container mx-auto px-[5px] lg:px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-accent mb-3">Three Modules. Zero Guesswork.</p>
            <h2 className="font-heading text-3xl md:text-4xl">
              Built on real consumer pain points
            </h2>
            <p className="text-muted-foreground mt-3">
              Based on insights from 998 beauty shoppers just like you.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {modules.map((module, index) => (
              <div 
                key={index} 
                className="group bg-card rounded-xl p-6 shadow-elegant hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-4">
                  <module.icon className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading text-lg font-semibold">{module.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {module.description}
                </p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                  {module.pain}
                </p>
                <p className="text-sm font-semibold text-accent">
                  {module.cta}
                </p>
                </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-[5px] lg:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="bg-card rounded-2xl border border-border shadow-elegant overflow-hidden">
              <div className="grid md:grid-cols-2 gap-0">
                <div className="p-8 md:p-10">
                  <div className="inline-flex items-center gap-2 bg-cta/10 text-cta px-3 py-1.5 rounded-full text-sm font-medium mb-4">
                    Try It Now
                  </div>
                  <h3 className="font-heading text-2xl md:text-3xl text-foreground mb-3">
                    Quick Product Lookup
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Paste a few ingredients from any product to see instant insights. No sign-up required.
                  </p>

                  <div className="space-y-4">
                    <textarea
                      rows={4}
                      placeholder="e.g., Water, Glycerin, Niacinamide, Fragrance..."
                      className="w-full resize-none rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => navigate('/quiz')}
                        className="inline-flex items-center gap-2 bg-primary/10 text-primary px-6 py-3 rounded-full font-semibold transition-all duration-300 hover:bg-primary/15"
                      >
                        Start Quiz
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                        <ArrowRight className="h-3 w-3 text-white" />
                      </span>
                      Is your moisturizer safe? Take our 30-second skin type quiz.
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground mt-4 inline-flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                      <ArrowRight className="h-3 w-3 text-white" />
                    </span>
                    This is a preview. Full analysis includes 50+ data points.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-primary to-primary/80 p-8 md:p-10 flex items-center justify-center">
                  <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-6 w-full max-w-xs">
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <div key={num} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-cta/80 flex items-center justify-center text-cta-foreground text-xs font-bold">
                            {num}
                          </div>
                          <div className="h-2 bg-primary-foreground/20 rounded-full flex-1" />
                        </div>
                      ))}
                      <div className="text-center pt-2">
                        <span className="text-primary-foreground/60 text-sm">Enter ingredients to see instant safety insights.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ProblemSection;
