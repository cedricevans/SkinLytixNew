import BrandName from './BrandName';
import { ArrowRight } from 'lucide-react';
import stepScan from '@/assets/landing/step-scan.jpg';
import stepAnalyze from '@/assets/landing/step-analyze.jpg';
import stepScore from '@/assets/landing/step-score.jpg';
import stepOptimize from '@/assets/landing/step-optimize.jpg';

interface HowItWorksProps {
  id?: string;
}

const HowItWorks = ({ id }: HowItWorksProps) => {
  const steps = [
    {
      image: stepScan,
      title: 'Scan Your Products',
      description: 'Upload a photo of any skincare product. OCR extracts ingredients automatically - or add manually if needed.',
      time: 'Time: 30 seconds',
    },
    {
      image: stepAnalyze,
      title: 'Community Database',
      description: "Check if someone already analyzed this product. If not, you're helping build our knowledge base for others.",
      time: 'Time: 5 seconds',
    },
    {
      image: stepScore,
      title: 'AI Analysis',
      description: 'We query molecular data, validate against research, and analyze interactions using evidence-based logic.',
      time: 'Time: 10 seconds',
    },
    {
      image: stepOptimize,
      title: 'Get Your EpiQ Score',
      description: 'Receive personalized routine recommendations, ingredient insights, and cost-effectiveness analysis.',
      time: 'Time: Instant',
    }
  ];

  return (
    <section id={id} className="py-20 bg-[rgb(60,160,185)] text-primary-foreground">
      <div className="container mx-auto px-6">
        <h2 className="font-heading text-3xl md:text-4xl text-center mb-3">
          How <BrandName /> Works
        </h2>
        <p className="text-center text-primary-foreground mb-16 font-semibold">
          From confusion to clarity in under 60 seconds
        </p>
        
        {/* Steps */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-4 max-w-5xl mx-auto mb-16">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center gap-4 md:gap-2">
              <div className="relative">
                {/* Step Number Badge */}
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-cta text-cta-foreground rounded-full flex items-center justify-center font-heading font-bold text-sm z-10 ring-4 ring-[rgb(60,160,185)]">
                  {index + 1}
                </div>
                {/* Circular Image */}
                <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-card shadow-elegant">
                  <img 
                    src={step.image} 
                    alt={step.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              
              {/* Arrow between steps (not after last) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block text-primary-foreground">
                  <ArrowRight className="w-6 h-6" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Step Descriptions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-10">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <h3 className="font-heading text-sm md:text-base font-semibold mb-2">{step.title}</h3>
              <p className="text-xs md:text-sm text-primary-foreground/80 leading-relaxed mb-2">{step.description}</p>
              <p className="text-xs font-semibold text-primary-foreground">{step.time}</p>
            </div>
          ))}
        </div>
        <div className="max-w-4xl mx-auto bg-primary-foreground/10 border border-primary-foreground/20 rounded-xl p-6 text-center text-sm text-primary-foreground/80">
          Beta Transparency: First-time product entry takes 20-40 seconds. Once in our database, analysis drops to 5-7 seconds.
          You're not just using <BrandName /> - you're building it with us.
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
