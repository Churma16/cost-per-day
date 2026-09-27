import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  IoChevronForwardOutline,
  IoDocumentTextOutline,
  IoShieldCheckmarkOutline,
} from 'react-icons/io5';
import { APP_VERSION } from '../../constants/branding';

const MotionLink = motion.create(Link);

const legalDestinations = [
  {
    path: '/privacy',
    labelKey: 'privacyPolicy',
    descriptionKey: 'privacyPolicySubtitle',
    Icon: IoShieldCheckmarkOutline,
  },
  {
    path: '/terms',
    labelKey: 'termsOfService',
    descriptionKey: 'termsOfServiceSubtitle',
    Icon: IoDocumentTextOutline,
  },
];

function LegalSettingsSection({ isInteractionBlocked }) {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="about-legal-heading">
      <h2 id="about-legal-heading" className="mb-2 px-1 text-sm font-semibold text-gray-700">
        {t('aboutAndLegal')}
      </h2>
      <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm">
        {legalDestinations.map(({ path, labelKey, descriptionKey, Icon }, index) => (
          <MotionLink
            key={path}
            to={path}
            aria-disabled={isInteractionBlocked || undefined}
            onClick={(event) => {
              if (isInteractionBlocked) event.preventDefault();
            }}
            whileTap={isInteractionBlocked ? undefined : { scale: 0.985 }}
            className={`flex min-h-[64px] items-center gap-3 px-3.5 py-3 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2F7473] ${
              index > 0 ? 'border-t border-gray-100' : ''
            } ${isInteractionBlocked ? 'pointer-events-none opacity-50' : ''}`}
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[#F1F7F6] text-[#2F7473]">
              <Icon aria-hidden="true" className="text-xl" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-gray-900">{t(labelKey)}</span>
              <span className="mt-0.5 block text-xs leading-5 text-gray-500">{t(descriptionKey)}</span>
            </span>
            <IoChevronForwardOutline aria-hidden="true" className="flex-none text-gray-400" />
          </MotionLink>
        ))}
      </div>
      <p className="py-3 text-center text-xs text-gray-400">
        {t('versionText', { version: APP_VERSION })}
      </p>
    </section>
  );
}

export default LegalSettingsSection;
