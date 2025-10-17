import { Card, CardContent } from "@/components/ui/card";
import ingredientIcon from "@/assets/ingredient-icon.png";
import routineIcon from "@/assets/routine-icon.png";
import costIcon from "@/assets/cost-icon.png";

const features = [
  {
    icon: ingredientIcon,
    title: "Ingredient Intelligence",
    description: "Decode confusing ingredient lists instantly. Understand what each ingredient does, its molecular properties, and potential interactions.",
    stat: "70% find ingredients confusing",
    benefit: "Get clarity in seconds"
  },
  {
    icon: routineIcon,
    title: "Routine Optimizer",
    description: "Stop products from fighting each other. Our EpiQ score analyzes interactions and tells you exactly how to layer your skincare.",
    stat: "69% don't know how products work together",
    benefit: "Maximize effectiveness"
  },
  {
    icon: costIcon,
    title: "Cost Analysis",
    description: "See if expensive products justify their price. Compare formulas and find budget-friendly alternatives that work just as well.",
    stat: "67% say price is most influential",
    benefit: "Save money, get results"
  }
];

const Features = () => {
  return (
    <section id="features" className="py-12 md:py-24 px-4 md:px-6 bg-gradient-card">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-3xl md:text-5xl font-heading font-bold mb-3 md:mb-4">
            Three Modules. Zero Guesswork.
          </h2>
          <p className="text-base md:text-lg font-subheading text-muted-foreground max-w-2xl mx-auto">
            Built on real consumer pain points from 998 beauty shoppers just like you
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className="border-border/50 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-2 bg-card/80 backdrop-blur-sm animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-5 md:p-8">
                {/* Icon */}
                <div className="mb-4 md:mb-6 flex justify-center">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-accent/10 flex items-center justify-center p-3 md:p-4">
                    <img
                      src={feature.icon}
                      alt={`${feature.title} icon`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl md:text-2xl font-heading font-bold mb-2 md:mb-3 text-center">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-sm md:text-base text-muted-foreground font-body mb-4 md:mb-6 text-center leading-relaxed">
                  {feature.description}
                </p>

                {/* Stats & Benefit */}
                <div className="pt-6 border-t border-border/50 space-y-2">
                  <p className="text-sm font-subheading text-warning-foreground bg-warning/50 px-3 py-2 rounded-md text-center">
                    <span className="font-semibold">Pain Point:</span> {feature.stat}
                  </p>
                  <p className="text-sm font-cta font-semibold text-success-foreground bg-success/30 px-3 py-2 rounded-md text-center">
                    {feature.benefit}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
