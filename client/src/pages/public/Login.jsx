import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthShell from '../../features/auth/AuthShell.jsx';
import LoginForm from '../../features/auth/LoginForm.jsx';
import loginImage from '../../assets/images/photos/login-side.webp';

const linkClass = 'font-semibold text-emerald hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald rounded';

export default function Login() {
  const { t } = useTranslation('auth');
  return (
    <AuthShell
      title={t('login.title')}
      subtitle={t('login.subtitle')}
      image={loginImage}
      imageAlt={t('login.imageAlt')}
      footer={
        <>
          <p>
            {t('login.noAccount')}{' '}
            <Link to="/register" className={linkClass}>
              {t('login.registerLink')}
            </Link>
          </p>
          <p>
            {t('login.orgPrompt')}{' '}
            <Link to="/register-organization" className={linkClass}>
              {t('login.orgLink')}
            </Link>
          </p>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
