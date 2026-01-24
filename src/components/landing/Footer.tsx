import { Instagram, Facebook, Linkedin, Youtube } from 'lucide-react';
import BrandName from './BrandName';

const Footer = () => {
  const links = [
    { label: 'About Us', href: '#' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'FAQ', href: '#' },
    { label: 'Contact', href: '#' },
  ];

  const socialLinks = [
    { 
      icon: Instagram, 
      href: 'https://www.instagram.com/skinlytix?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==',
      label: 'Instagram'
    },
    { 
      icon: Facebook, 
      href: 'https://www.facebook.com/profile.php?id=61574847090738',
      label: 'Facebook'
    },
    { 
      icon: Linkedin, 
      href: 'https://www.linkedin.com/company/skinlytix',
      label: 'LinkedIn'
    },
    { 
      icon: Youtube, 
      href: 'https://www.youtube.com/@skinlytix',
      label: 'YouTube'
    },
  ];

  return (
    <footer className="bg-primary text-primary-foreground py-10">
      <div className="container mx-auto px-[5px] lg:px-6">
        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          {/* Logo */}
          <div className="font-heading text-xl font-bold">
            <BrandName />
          </div>
          
          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-6">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
          
          {/* Social Icons */}
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                aria-label={social.label}
              >
                <social.icon className="w-5 h-5" />
              </a>
            ))}
            {/* Threads Icon */}
            <a
              href="https://www.threads.com/@skinlytix"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
              aria-label="Threads"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 192 192"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 95.8621 60.8264 115.29C61.6956 124.633 66.9443 132.807 75.3228 138.548C82.3279 143.347 91.0222 145.866 100.068 145.87C100.082 145.87 100.095 145.87 100.109 145.87C117.952 145.87 131.675 135.993 138.412 116.881C141.197 108.89 142.78 99.3046 142.78 88.3813C142.78 87.0725 142.73 85.7776 142.635 84.4966C145.013 85.8455 147.077 87.4445 148.792 89.2636C153.652 94.4013 156.26 101.315 156.26 109.299C156.26 135.229 135.362 156.107 109.41 156.107C83.4584 156.107 62.56 135.229 62.56 109.299C62.56 97.2824 66.8048 85.8633 74.5823 76.9063L62.4178 65.4891C51.5077 77.7648 45 93.8068 45 109.299C45 144.934 73.7539 173.649 109.41 173.649C145.066 173.649 173.82 144.934 173.82 109.299C173.82 96.5152 169.632 84.6845 161.778 75.1866C156.653 69.018 149.854 64.2205 141.537 60.9383V88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z"
                  fill="currentColor"
                />
              </svg>
            </a>
          </div>
        </div>
        
        {/* Bottom */}
        <div className="border-t border-primary-foreground/20 pt-6 text-center">
          <p className="text-sm text-primary-foreground/70 mb-2">
            Evidence-based skincare intelligence for people tired of wasting money on products that don't work.
          </p>
          <p className="text-xs text-primary-foreground/60 mb-2">
            Built on real consumer research. Powered by free, open APIs.
          </p>
          <p className="text-xs text-primary-foreground/50">
            (c) 2025 <BrandName />. Built with open science &amp; real user data.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
