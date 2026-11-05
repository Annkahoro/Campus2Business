import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Stepper } from '../../components/ui/index.js';
import AuthShell from '../../features/auth/AuthShell.jsx';
import RegisterForm from '../../features/auth/RegisterForm.jsx';
import orgImage from '../../assets/images/photos/employee-upskilling.webp';

/**
 * /register-organization — step 1 of 2: create the org admin account.
 * Step 2 (organization details) is /org/setup, where the new account lands automatically.
 */
export default function RegisterOrg() {
  const { t } = useTranslation('auth');
  return (
    <AuthShell
      title={t('registerOrg.title')}
      subtitle={t('registerOrg.subtitle')}
      image={orgImage}
      imageAlt={t('registerOrg.imageAlt')}
      footer={
        <p>
          {t('register.haveAccount')}{' '}
          <Link to="/login" className="rounded font-semibold text-emerald hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald">
            {t('register.loginLink')}
          </Link>
        </p>
      }
    >
      <div className="mb-6">
        <Stepper
          label={t('registerOrg.stepsLabel')}
          current="account"
          steps={[
            { key: 'account', label: t('registerOrg.step1'), done: false },
            { key: 'organization', label: t('registerOrg.step2'), done: false },
          ]}
        />
      </div>
      <RegisterForm kind="org_admin" redirectTo="/org/setup" submitLabel={t('registerOrg.submit')} />
    </AuthShell>
  );
}
