import { ArrowRight, Download, Sparkles } from 'lucide-react';
import checklistImage from '@/assets/landing/problem-endless-search.jpg';

const FreeChecklist = () => {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-[5px] lg:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-background rounded-3xl shadow-xl border border-border overflow-hidden">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-0">
              <div className="relative">
                <img
                  src={checklistImage}
                  alt="Shopper reviewing skincare ingredients in store"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent" />
                <div className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-full bg-primary/85 px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-soft">
                  Free skincare guide
                </div>
              </div>

              <div className="p-8 md:p-10">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="inline-flex items-center gap-2 rounded-full bg-cta/10 text-cta px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]">
                    Before You Buy Checklist
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                    $0
                  </span>
                </div>

                <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-3">
                  Most people buy skincare blindly… and waste money doing it.
                </h2>
                <p className="text-muted-foreground text-base md:text-lg mb-4">
                  You don’t have to.
                </p>

                <p className="text-muted-foreground mb-6">
                  Get the <span className="font-semibold text-foreground">SkinLytix™ Before-You-Buy Checklist</span> — the same framework beauty pros use (but
                  nobody ever shares publicly). This guide shows you exactly how to tell if a product is actually worth
                  your money… in under 60 seconds.
                </p>

                <div className="rounded-2xl border border-cta/20 bg-cta/5 p-4 mb-6">
                  <p className="text-sm font-semibold text-foreground mb-1">And the best part?</p>
                  <p className="text-sm text-muted-foreground">
                    It’s free... for a limited time. Download it now before it goes behind the paywall.
                  </p>
                </div>

                <a
                  href="https://shop.beacons.ai/skinlytix/ece7c948-36fc-4448-a6c8-4a919c88c471"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-cta px-6 py-3 text-sm font-semibold text-cta-foreground shadow-[var(--shadow-hover)] transition-all hover:translate-y-[-1px]"
                >
                  Download the free checklist
                  <Download className="h-4 w-4" />
                </a>

                <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-cta" />
                    It’s free
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-primary" />
                    Downloads in under 60 seconds
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FreeChecklist;
