import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { Button, toast } from '../../components/ui/index.js';
import { useGeneratePathway } from './hooks.js';

/**
 * Starts an AI generation (202) and opens the review page, which shows progress until the draft is ready.
 * `regenerate` only changes the label.
 */
export default function GenerateButton({ learnerId, disabled, regenerate = false, variant = 'primary', size }) {
  const { t } = useTranslation('pathway');
  const navigate = useNavigate();
  const generate = useGeneratePathway();

  const start = () =>
    generate.mutate(learnerId, {
      onSuccess: (data) => {
        toast.success(t('admin.generationStarted'));
        navigate(`/admin/recommendations/${data.recommendationId}`);
      },
      onError: toast.apiError,
    });

  return (
    <Button
      onClick={start}
      loading={generate.isPending}
      disabled={disabled}
      variant={variant}
      size={size}
      leftIcon={<Sparkles size={18} strokeWidth={1.75} aria-hidden="true" />}
    >
      {regenerate ? t('admin.regenerate') : t('admin.generate')}
    </Button>
  );
}
