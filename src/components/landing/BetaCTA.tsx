import BrandName from './BrandName';
import creatorJasmine from '@/assets/landing/creator-jasmine.jpg';
import creatorMarcus from '@/assets/landing/creator-marcus.jpg';
import creatorSophia from '@/assets/landing/creator-sophia.jpg';
import creatorCarlos from '@/assets/landing/creator-carlos.jpg';

interface BetaCTAProps {
  id?: string;
}

const BetaCTA = ({ id }: BetaCTAProps) => {
  const creators = [
    {
      name: '@JasmineLee',
      image: creatorJasmine,
      quote: 'Finally, a skincare app that gets melanin-rich skin!'
    },
    {
      name: '@MarcusH',
      image: creatorMarcus,
      quote: 'The ingredient analysis is incredibly detailed and helpful.'
    },
    {
      name: '@SophiaBeauty',
      image: creatorSophia,
      quote: 'My followers love the product recommendations I share from SkinLytix.'
    },
    {
      name: '@CarlosD',
      image: creatorCarlos,
      quote: 'Changed my entire skincare routine for the better.'
    }
  ];

  return (
    <section id={id} className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl text-center mb-3">
            <BrandName /> Creator Circle
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            See the Change
          </p>
          
          {/* Creator Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {creators.map((creator, index) => (
              <div 
                key={index} 
                className="bg-card rounded-xl p-5 shadow-elegant hover:shadow-lg transition-shadow text-center"
              >
                <img 
                  src={creator.image} 
                  alt={creator.name}
                  className="w-20 h-20 rounded-full object-cover mx-auto mb-4"
                />
                <p className="text-accent font-semibold text-sm mb-2">{creator.name}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  "{creator.quote}"
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <p className="text-muted-foreground mb-4 text-sm">
              Want to join our Creator Circle? Limited spots available.
            </p>
            <a 
              href="https://docs.google.com/forms/d/e/1FAIpQLSeouOQk9FzBzLac_dJbXHa4F7y8qAPn6bdi9HjnlgWwGh2ACg/viewform?usp=header"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-accent hover:bg-accent-hover text-accent-foreground px-8 py-3 rounded-full font-semibold transition-all duration-300 hover:shadow-hover hover:-translate-y-0.5"
            >
              Apply to Join
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BetaCTA;
