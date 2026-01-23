import { Microscope } from 'lucide-react';

interface MissionProps {
  id?: string;
}

const Mission = ({ id }: MissionProps) => {
  return (
    <section id={id} className="py-16 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <Microscope className="w-12 h-12 text-primary" strokeWidth={1.5} />
          </div>
          <h2 className="font-heading font-bold text-2xl md:text-3xl text-foreground mb-4">
            Mission
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            To bring ingredient transparency and scientific literacy to every beauty consumer, 
            especially those historically underserved by the industry.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Mission;
