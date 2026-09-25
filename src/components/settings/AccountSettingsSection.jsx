import React from 'react';
import { useTranslation } from 'react-i18next';
import { IoLogOutOutline } from 'react-icons/io5';

function AccountSettingsSection({
  user,
  isSigningOut,
  isInteractionBlocked,
  signOutError,
  authError,
  onSignOut,
}) {
  const { t } = useTranslation();

  return (
    <div>
      <button
        type="button"
        className="w-full flex items-center justify-center gap-2 py-3 px-3.5 bg-white border border-red-200/90 rounded-2xl text-red-600 hover:bg-red-50/60 active:bg-red-100/60 transition-colors font-medium text-sm shadow-sm disabled:opacity-50"
        onClick={() => {
          if (!isInteractionBlocked) onSignOut();
        }}
        disabled={isSigningOut || isInteractionBlocked}
        aria-label={t('signOut')}
        title={user?.displayName || user?.email || t('signOut')}
      >
        <IoLogOutOutline className="text-lg" />
        <span>{isSigningOut ? t('loading') : t('signOut')}</span>
      </button>
      {(signOutError || authError) && (
        <p role="alert" className="mt-2 text-center text-xs text-red-600">
          {signOutError || authError?.message || t('signOutError')}
        </p>
      )}
    </div>
  );
}

export default AccountSettingsSection;
