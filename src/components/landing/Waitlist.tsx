import BrandName from './BrandName';
import { useNavigate } from 'react-router-dom';

const Waitlist = () => {
  const navigate = useNavigate();

  return (
    <section id="waitlist" className="py-12 md:py-16 bg-[rgb(60,160,185)]">
      <div className="container mx-auto px-[5px] lg:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              Free Beta - Sign Up Today
            </div>
            <h2 className="font-heading text-2xl md:text-3xl mb-3 text-primary-foreground">
              Ready to Stop Wasting Money on Skincare?
            </h2>
            <p className="text-primary-foreground/80 text-base max-w-xl mx-auto">
              Join beauty enthusiasts who analyze before they buy. Start analyzing your products for free - no waiting, no credit card required.
            </p>
          </div>

          {/* Exclusive Benefits */}
          <div className="max-w-xl mx-auto text-center">
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="bg-cta text-cta-foreground px-8 py-3 rounded-full font-semibold transition-all duration-300 hover:opacity-90 hover:shadow-hover text-sm whitespace-nowrap"
            >
              Get Started Free
            </button>
            <p className="text-xs text-primary-foreground/60 mt-4">
              No credit card required - Instant access - Free during beta
            </p>
            <p className="text-xs text-primary-foreground/60 mt-2">
              Start analyzing with <BrandName /> today.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Waitlist;
