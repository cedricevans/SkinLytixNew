import { Award, Users, FlaskConical, Shield } from "lucide-react";

const signals = [
  {
    icon: FlaskConical,
    stat: "Reviewed by Real Experts",
    description: "Double-checked by students who care about your skin's safety"
  },
  {
    icon: Users,
    stat: "Community-Built",
    description: "Real products from real users, verified by peers"
  },
  {
    icon: Award,
    stat: "69% Say It's Unique",
    description: "Based on market research with 998 beauty shoppers"
  },
  {
    icon: Shield,
    stat: "No Pre-Seeded Data",
    description: "Fresh formulas only—no outdated ingredient lists"
  }
];

const TrustSignals = () => {
  return (
    <section className="py-12 md:py-16 px-4 md:px-6 bg-primary/5 border-y border-border/50">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {signals.map((signal, index) => {
            const Icon = signal.icon;
            return (
              <div
                key={signal.stat}
                className="text-center animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex justify-center mb-3 md:mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-accent/20 flex items-center justify-center">
                    <Icon className="w-6 h-6 md:w-8 md:h-8 text-accent" />
                  </div>
                </div>
                <h3 className="text-base md:text-lg font-heading font-bold mb-1 md:mb-2">
                  {signal.stat}
                </h3>
                <p className="text-xs md:text-sm font-body text-muted-foreground">
                  {signal.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrustSignals;
