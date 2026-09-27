import React from 'react';
import { useTranslation } from 'react-i18next';
import { IoLogInOutline, IoLogOutOutline } from 'react-icons/io5';
import OwnershipLoader from '../ui/OwnershipLoader';

function AccountSettingsSection({
  user,
  isGuest,
  isSigningOut,
  isInteractionBlocked,
  signOutError,
  authError,
  onSignOut,
  onSignIn,
  guestMigrationError,
  isMigratingGuestData,
  onRetryGuestMigration,
}) {
  const { t } = useTranslation();
  const [isSignInPending, setIsSignInPending] = React.useState(false);
  const signInTimerRef = React.useRef(null);

  React.useEffect(() => () => {
    if (signInTimerRef.current) {
      window.clearTimeout(signInTimerRef.current);
    }
  }, []);

  const handleSignIn = () => {
    if (isSignInPending || isInteractionBlocked) return;

    setIsSignInPending(true);
    signInTimerRef.current = window.setTimeout(async () => {
      signInTimerRef.current = null;
      try {
        await onSignIn();
      } catch {
        setIsSignInPending(false);
      }
    }, 480);
  };

  if (isGuest && !user) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-gray-900">{t('guestModeTitle')}</p>
        <p className="mt-1 text-xs leading-5 text-gray-500">{t('guestModeSettingsNotice')}</p>
        <div className="mt-4 flex w-full justify-center">
          <button
            type="button"
            className={`auth-button settings-auth-button text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7473] focus-visible:ring-offset-2 disabled:cursor-wait ${
              isSignInPending ? 'collapsing' : ''
            }`}
            onClick={handleSignIn}
            disabled={isSignInPending || isInteractionBlocked}
            aria-busy={isSignInPending}
          >
            <span className="relative flex h-full w-full items-center justify-center">
              <span className="auth-button__label flex items-center justify-center gap-2">
                <IoLogInOutline className="text-lg" />
                <span>{t('signInWithGoogle')}</span>
              </span>
              <OwnershipLoader
                active={isSignInPending}
                className="auth-button__loader h-[26px] w-[26px]"
              />
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {guestMigrationError && (
        <div role="alert" className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
          <p>{t('guestMigrationFailed')}</p>
          <button
            type="button"
            onClick={onRetryGuestMigration}
            disabled={isMigratingGuestData || isInteractionBlocked}
            className="mt-2 font-semibold underline disabled:opacity-50"
          >
            {isMigratingGuestData ? t('loading') : t('retryGuestMigration')}
          </button>
        </div>
      )}
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
