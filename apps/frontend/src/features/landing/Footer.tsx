import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { CONTACT, whatsappLink } from '../../config/contact';
import { FacebookIcon, InstagramIcon } from './social-icons';

const legalLinks = [
  { label: 'Bases legales', to: '/legal/bases-legales' },
  { label: 'Consultas', to: '/legal/consultas' },
  { label: 'Política de privacidad', to: '/legal/privacidad' },
  { label: 'Términos y condiciones', to: '/legal/terminos' },
];

/**
 * Site footer: brand, legal links, contact phone and attention hours, plus a
 * discreet address and social links. Intentionally low-key but informative.
 */
export function Footer() {
  return (
    <footer
      className="border-t border-white/10 bg-[#0a0a0a] text-[#8f8f8f]"
      id="como-llegar"
    >
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-10">
        <div className="flex flex-col items-center gap-6 text-center">
          <a
            className="font-display text-xl font-black tracking-[0.12em] text-white uppercase"
            href="#top"
          >
            D Racing <span className="text-primary">Pro</span>
          </a>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-semibold tracking-[0.08em] uppercase">
            {legalLinks.map((link, index) => (
              <span className="flex items-center gap-4" key={link.to}>
                {index > 0 && (
                  <span aria-hidden="true" className="text-white/15">
                    |
                  </span>
                )}
                <Link className="hover:text-foreground transition" to={link.to}>
                  {link.label}
                </Link>
              </span>
            ))}
          </nav>
        </div>

        <div className="mt-12 grid gap-8 border-t border-white/10 pt-10 sm:grid-cols-2 sm:gap-12">
          <div className="flex items-start gap-4 sm:justify-end sm:text-right">
            <PhoneIcon />
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-white uppercase">
                Contáctenos
              </p>
              <a
                className="hover:text-foreground mt-2 block text-lg font-bold text-white transition"
                href={whatsappLink()}
                rel="noreferrer"
                target="_blank"
              >
                {CONTACT.phoneDisplay}
              </a>
              <a
                className="hover:text-foreground mt-1 block text-sm transition"
                href={`mailto:${CONTACT.email}`}
              >
                {CONTACT.email}
              </a>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-white uppercase">
              Horario de atención
            </p>
            <p className="mt-2 text-sm">{CONTACT.hours.weekday}</p>
            <p className="text-sm">{CONTACT.hours.saturday}</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 border-t border-white/10 pt-8 text-center text-xs sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p>
              {CONTACT.address.street} · {CONTACT.address.area}
            </p>
            <a
              className="text-primary mt-1 inline-block transition hover:underline"
              href={CONTACT.mapsUrl}
              rel="noreferrer"
              target="_blank"
            >
              Ver en Google Maps →
            </a>
          </div>
          <div className="flex gap-2">
            <SocialLink href={CONTACT.social.facebook} label="Facebook">
              <FacebookIcon />
            </SocialLink>
            <SocialLink href={CONTACT.social.instagram} label="Instagram">
              <InstagramIcon />
            </SocialLink>
          </div>
        </div>

        <p className="mt-8 text-center text-[11px] text-[#6a6a6a]">
          © {new Date().getFullYear()} D Racing Pro · Servicio técnico Honda
          NAVI · Santiago, Chile.
        </p>
      </div>
    </footer>
  );
}

function SocialLink({
  children,
  href,
  label,
}: {
  children: ReactNode;
  href: string;
  label: string;
}) {
  return (
    <a
      aria-label={`Síguenos en ${label}`}
      className="hover:text-foreground grid size-9 place-items-center rounded-full border border-white/10 text-[#bdbdbd] transition hover:border-white/30"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}

function PhoneIcon() {
  return (
    <svg
      aria-hidden="true"
      className="text-primary mt-1 shrink-0"
      fill="none"
      height="22"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width="22"
    >
      <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}
