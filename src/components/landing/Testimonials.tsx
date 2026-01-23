import { Star } from 'lucide-react';
import testimonialIsabella from '@/assets/landing/testimonial-isabella.jpg';
import testimonialKenji from '@/assets/landing/testimonial-kenji.jpg';
import testimonialPriya from '@/assets/landing/testimonial-priya.jpg';
import testimonialDavid from '@/assets/landing/testimonial-david.jpg';

interface TestimonialsProps {
  id?: string;
}

const Testimonials = ({ id }: TestimonialsProps) => {
  const testimonials = [
    {
      name: 'Camille R.',
      image: testimonialIsabella,
      quote: 'SkinLytix helped me understand exactly what my skin needs. No more guessing!'
    },
    {
      name: 'Adrian S.',
      image: testimonialKenji,
      quote: 'The EpiQ Score feature is a game-changer. I finally found products that work for me.'
    },
    {
      name: 'Mercedes J.',
      image: testimonialPriya,
      quote: 'As someone with sensitive skin, this app has saved me so much time and money.'
    },
    {
      name: 'Devon H.',
      image: testimonialDavid,
      quote: 'Love how it breaks down ingredients in a way I can actually understand.'
    }
  ];

  return (
    <section id={id} className="py-20 bg-secondary">
      <div className="container mx-auto px-6">
        <h2 className="font-heading text-3xl md:text-4xl text-center mb-3">
          <span className="text-gradient">What people are saying</span>
        </h2>
        <p className="text-center text-muted-foreground mb-12">from early users</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="bg-card rounded-xl p-6 shadow-elegant hover:shadow-lg transition-shadow"
            >
              <div className="mb-4">
                <h4 className="font-heading font-semibold text-sm">{testimonial.name}</h4>
                <div className="flex gap-0.5 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-accent text-accent" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                "{testimonial.quote}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
