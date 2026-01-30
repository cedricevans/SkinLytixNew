const SocialProof = () => {
  const stats = [
    {
      number: '145+',
      label: 'Products Analyzed',
      detail: 'Decoded ingredient lists helping users',
      color: 'text-primary',
      size: 'text-4xl md:text-5xl',
    },
    {
      number: '71+',
      label: 'Active Users',
      detail: 'Growing community of beauty enthusiasts',
      color: 'text-azure',
      size: 'text-4xl md:text-5xl',
    },
    {
      number: 'Coming Soon',
      label: 'Expert Reviews',
      detail: 'Validated by Cosmetic Science students',
      color: 'text-accent',
      size: 'text-2xl md:text-3xl',
    },
    {
      number: '4 Partners',
      label: 'Academic Validation',
      detail: 'Human + AI verified accuracy',
      color: 'text-primary',
      size: 'text-3xl md:text-4xl',
    },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-[5px] lg:px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-accent mb-3">Live Metrics</p>
          <h2 className="font-heading text-3xl md:text-4xl">
            Growing with every analysis
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <span className={`block font-extrabold mb-3 font-heading ${stat.color} ${stat.size}`}>
                {stat.number}
              </span>
              <p className="text-sm md:text-base text-muted-foreground uppercase tracking-wide">
                {stat.label}
              </p>
              {stat.detail && (
                <p className="text-xs text-muted-foreground mt-2">
                  {stat.detail}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
