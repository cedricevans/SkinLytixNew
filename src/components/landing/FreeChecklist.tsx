import { useNavigate } from 'react-router-dom';
import { ArrowRight, FlaskConical } from 'lucide-react';

const FreeChecklist = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-background rounded-2xl shadow-lg border border-border overflow-hidden">
            <div className="grid md:grid-cols-2 gap-0">
              {/* Left side - Content */}
              <div className="p-8 md:p-10">
                <div className="inline-flex items-center gap-2 bg-cta/10 text-cta px-3 py-1.5 rounded-full text-sm font-medium mb-4">
                  <FlaskConical className="w-4 h-4" />
                  Try It Now
                </div>

                <h2 className="font-heading text-2xl md:text-3xl text-foreground mb-3">
                  Quick Product Lookup
                </h2>

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
                      <ArrowRight className="w-4 h-4 text-white" />
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
              
              {/* Right side - Visual */}
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
  );
};

export default FreeChecklist;
