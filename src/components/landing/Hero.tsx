import { useNavigate } from 'react-router-dom';
import heroBackground from '@/assets/landing/hero-background.jpg';

interface HeroProps {
  id?: string;
}

const Hero = ({ id }: HeroProps) => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth');
  };


  return (
    <section id={id} className="relative min-h-[80vh] flex items-center">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-transparent" />
      </div>
      
      {/* Content */}
      <div className="container mx-auto px-[20px] lg:px-6 relative z-10">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/10 text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold mb-6">
            Expert Validated - Human + AI
          </div>
          <h1 className="font-heading font-extrabold text-4xl md:text-5xl lg:text-6xl mb-6 text-primary-foreground leading-tight">
            Stop Guessing.
            <br />
            <span className="text-cta">Start Understanding.</span>
          </h1>

          <p className="text-lg md:text-xl mb-8 text-primary-foreground/90 leading-relaxed">
            70% of shoppers find ingredient lists confusing. SkinLytix decodes face, body, and hair
            products instantly, optimizes your entire personal care routine, and helps you stop
            wasting money. Get started free today.
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleGetStarted}
              className="bg-cta text-cta-foreground px-8 py-3 rounded-full font-semibold text-base transition-all duration-300 hover:opacity-90 hover:shadow-hover hover:-translate-y-0.5"
            >
              Get Started Free
            </button>
          </div>
          <p className="text-sm text-primary-foreground/80 mt-4">
            Join hundreds of beauty enthusiasts analyzing their entire personal care routine.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
