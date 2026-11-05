import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, LinkIcon } from 'lucide-react';
import { Badge, Button, EmptyState, PageSpinner } from '../../components/ui/index.js';
import AuthShell from '../../features/auth/AuthShell.jsx';
import RegisterForm from '../../features/auth/RegisterForm.jsx';
import { useInviteValidation } from '../../features/organizations/hooks.js';
import { getErrorCode } from '../../lib/axios.js';
import joinImage from '../../assets/images/photos/join-invite.webp';

/** /join/:token — employees join only through an organization invite link (docs/04 §4). */
export default function JoinInvite() {
  const { token } = useParams();
  const { t } = useTranslation('auth');
  const query = useInviteValidation(token);

  if (query.isPending) return <PageSpinner />;

  if (query.isError) {
    const code = getErrorCode(query.error);
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          illustration={<LinkIcon size={32} strokeWidth={1.75} aria-hidden="true" />}
          title={t('join.invalidTitle')}
          description={t(`errors:${code}`, { defaultValue: t('errors:INVITE_NOT_FOUND') })}
          action={
            <Button as={Link} to="/login" variant="outline">
              {t('join.haveAccount')}
            </Button>
          }
        />
      </div>
    );
  }

  const { orgName, orgLogo, department } = query.data;

  return (
    <AuthShell
      title={t('join.title', { org: orgName })}
      subtitle={t('join.subtitle')}
      image={joinImage}
      imageAlt={t('join.imageAlt')}
      footer={
        <p>
          {t('register.haveAccount')}{' '}
          <Link to="/login" className="rounded font-semibold text-emerald hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald">
            {t('register.loginLink')}
          </Link>
        </p>
      }
    >
      <div className="mb-6 flex items-center gap-3 rounded-xl bg-mint-soft p-3">
        {orgLogo?.url ? (
          <img src={orgLogo.url} alt="" className="h-12 w-12 rounded-lg bg-surface object-contain p-1" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald text-white">
            <Building2 size={24} strokeWidth={1.75} aria-hidden="true" />
          </span>
        )}
        <div>
          <p className="text-sm text-emerald-darker">{t('join.invitedBy')}</p>
          <p className="font-semibold text-ink">{orgName}</p>
          {department && <Badge variant="soft" className="mt-1">{t('join.department', { department })}</Badge>}
        </div>
      </div>
      <RegisterForm kind="employee" inviteToken={token} redirectTo="/learner/profile" submitLabel={t('join.submit')} />
    </AuthShell>
  );
}
