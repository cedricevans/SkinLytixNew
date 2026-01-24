import { Beaker, Coins, Layers } from 'lucide-react';

interface ProblemSectionProps {
  id?: string;
}

const ProblemSection = ({ id }: ProblemSectionProps) => {
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
  );
};

export default ProblemSection;
