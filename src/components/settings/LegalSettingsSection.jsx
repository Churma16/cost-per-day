import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  IoInformationCircleOutline,
  IoDocumentTextOutline,
  IoShieldCheckmarkOutline,
} from 'react-icons/io5';
import { APP_VERSION } from '../../constants/branding';
import {
  SETTINGS_ROW_CLASS,
  SettingsCard,
  SettingsChevron,
  SettingsDivider,
  SettingsRowIcon,
  SettingsRowText,
  SettingsSection,
} from './SettingsList';

const MotionLink = motion.create(Link);

const legalDestinations = [
  {
    path: '/about',
    labelKey: 'aboutWorthwhile',
    descriptionKey: 'aboutWorthwhileSubtitle',
    Icon: IoInformationCircleOutline,
  },
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
    <SettingsSection id="about-legal-heading" title={t('aboutAndLegal')}>
      <SettingsCard>
        {legalDestinations.map(({ path, labelKey, descriptionKey, Icon }, index) => (
          <React.Fragment key={path}>
            {index > 0 && <SettingsDivider />}
            <MotionLink
              to={path}
              state={{ from: '/settings' }}
              aria-disabled={isInteractionBlocked || undefined}
              onClick={(event) => {
                if (isInteractionBlocked) event.preventDefault();
              }}
              whileTap={isInteractionBlocked ? undefined : { scale: 0.985 }}
              className={`${SETTINGS_ROW_CLASS} hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2F7473] ${
                isInteractionBlocked ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <SettingsRowIcon tone="brand">
                <Icon aria-hidden="true" className="h-4 w-4" />
              </SettingsRowIcon>
              <SettingsRowText title={t(labelKey)} subtitle={t(descriptionKey)} />
              <SettingsChevron />
            </MotionLink>
          </React.Fragment>
        ))}
      </SettingsCard>
      <p className="py-3 text-center text-xs text-gray-400">
        {t('versionText', { version: APP_VERSION })}
      </p>
    </SettingsSection>
  );
}

export default LegalSettingsSection;
