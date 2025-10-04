import { Award, Users, FlaskConical, Shield } from "lucide-react";

const signals = [
  {
    icon: FlaskConical,
    stat: "PubMed Validated",
    description: "Every recommendation backed by scientific research"
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
    <section className="py-16 px-6 bg-primary/5 border-y border-border/50">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {signals.map((signal, index) => {
            const Icon = signal.icon;
            return (
              <div
                key={signal.stat}
                className="text-center animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-accent" />
                  </div>
                </div>
                <h3 className="text-lg font-heading font-bold mb-2">
                  {signal.stat}
                </h3>
                <p className="text-sm font-body text-muted-foreground">
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
