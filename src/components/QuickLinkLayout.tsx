import { ReactNode } from "react";
import { Link } from "react-router-dom";
import heroCommunity from "@/assets/hero-community.jpg";

const linkColor = "#ff5aa3";
const hoverLinkColor = "#b91f75";

const handleLinkHover = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
  (event.currentTarget as HTMLElement).style.color = hoverLinkColor;
};

const handleLinkLeave = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
  (event.currentTarget as HTMLElement).style.color = linkColor;
};

const handleButtonHover = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
  const target = event.currentTarget as HTMLElement;
  target.style.color = hoverLinkColor;
  target.style.borderColor = hoverLinkColor;
  target.style.backgroundColor = hoverLinkColor;
};

const handleButtonLeave = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
  const target = event.currentTarget as HTMLElement;
  target.style.color = linkColor;
  target.style.borderColor = "rgba(255,255,255,0.6)";
  target.style.backgroundColor = "rgba(255,255,255,0.2)";
};

export const PinkLink = ({
  to,
  children,
  className = "",
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) => (
  <Link
    to={to}
    className={className}
    style={{ color: linkColor, transition: "color 0.15s ease" }}
    onMouseEnter={handleLinkHover}
    onMouseLeave={handleLinkLeave}
  >
    {children}
  </Link>
);

export const PinkAnchor = ({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) => (
  <a
    href={href}
    className={className}
    style={{ color: linkColor, transition: "color 0.15s ease" }}
    onMouseEnter={handleLinkHover}
    onMouseLeave={handleLinkLeave}
  >
    {children}
  </a>
);

export const quickLinkAccentColor = linkColor;

type QuickLinkLayoutProps = {
  title: string;
  subtitle: string;
  heroImage?: string;
  highlight?: string;
  heroTextColor?: string;
  children: ReactNode;
};

export const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section
    className="group rounded-3xl p-6 md:p-8 shadow-soft space-y-4 transition border border-border bg-white"
    style={{ color: "#000" }}
  >
    <h3 className="text-xl md:text-2xl font-heading font-bold" style={{ color: "#000" }}>
      {title}
    </h3>
    <div className="space-y-3 text-sm md:text-base">{children}</div>
  </section>
);

const QuickLinkLayout = ({
  title,
  subtitle,
  heroImage = heroCommunity,
  highlight,
  heroTextColor = "#ffffff",
  children,
}: QuickLinkLayoutProps) => (
  <main className="min-h-screen bg-background">
    <section className="relative w-full h-72 md:h-80 lg:h-[28rem] overflow-hidden">
      <img
        src={heroImage}
        alt="SkinLytix hero background"
        className="absolute inset-0 w-full h-full object-cover object-center"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/60 to-transparent" />
      <div className="relative z-10 flex flex-col items-start justify-end h-full max-w-6xl mx-auto px-4 py-10 md:py-12">
        <nav className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-3 text-sm font-semibold tracking-[0.2em] uppercase">
          <PinkLink to="/home">Home</PinkLink>
          <div className="flex items-center gap-4">
            <PinkLink to="/profile">Profile</PinkLink>
            <Link
              to="/home"
              className="rounded-full border px-3 py-1 text-xs font-semibold"
              style={{
                borderColor: "rgba(255,255,255,0.6)",
                backgroundColor: "rgba(255,255,255,0.2)",
                color: linkColor,
                transition: "color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease",
              }}
              onMouseEnter={handleButtonHover}
              onMouseLeave={handleButtonLeave}
            >
              Discover
            </Link>
          </div>
        </nav>
        {highlight && (
          <p
            className="text-xs md:text-sm uppercase tracking-[0.3em] mb-3"
            style={{ color: heroTextColor }}
          >
            {highlight}
          </p>
        )}
        <h1
          className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold leading-tight"
          style={{ color: heroTextColor }}
        >
          {title}
        </h1>
        <p
          className="mt-3 text-base md:text-lg max-w-3xl"
          style={{ color: heroTextColor }}
        >
          {subtitle}
        </p>
      </div>
    </section>

    <section className="max-w-6xl mx-auto px-4 py-12 space-y-8">
      {children}
    </section>
  </main>
);

export default QuickLinkLayout;
