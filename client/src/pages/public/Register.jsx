import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthShell from '../../features/auth/AuthShell.jsx';
import RegisterForm from '../../features/auth/RegisterForm.jsx';
import registerImage from '../../assets/images/photos/register-side.webp';

const linkClass = 'font-semibold text-emerald hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald rounded';

/** Student self-registration. */
export default function Register() {
  const { t } = useTranslation('auth');
  return (
    <AuthShell
      title={t('register.title')}
      subtitle={t('register.subtitle')}
      image={registerImage}
      imageAlt={t('register.imageAlt')}
      footer={
        <>
          <p>
            {t('register.haveAccount')}{' '}
            <Link to="/login" className={linkClass}>
              {t('register.loginLink')}
            </Link>
          </p>
          <p>
            {t('register.orgPrompt')}{' '}
            <Link to="/register-organization" className={linkClass}>
              {t('register.orgLink')}
            </Link>
          </p>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
