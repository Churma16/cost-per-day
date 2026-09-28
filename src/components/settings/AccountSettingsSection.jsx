import React from 'react';
import { useTranslation } from 'react-i18next';
import { IoLogInOutline } from 'react-icons/io5';
import OwnershipLoader from '../ui/OwnershipLoader';
import { ErrorCard } from '../ui/AsyncState';

function AccountSettingsSection({
  isInteractionBlocked,
  authError,
  onSignIn,
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

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-900">{t('guestModeTitle')}</p>
      <p className="mt-1 text-xs leading-5 text-gray-500">{t('guestModeSettingsNotice')}</p>
      <div className="mt-4 flex w-full justify-center">
        <button
          type="button"
          className={`auth-button settings-auth-button text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-wait ${
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
      {authError && (
        <ErrorCard
          body={t('authSignInErrorBody')}
          className="mt-2"
        />
      )}
    </div>
  );
}

export default AccountSettingsSection;
