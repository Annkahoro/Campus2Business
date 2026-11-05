import { Toaster as HotToaster, toast as hotToast } from 'react-hot-toast';
import { getErrorMessage } from '../../lib/axios.js';

/** Mount once in main.jsx. Solid brand colours only. */
export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#FFFFFF',
          color: '#1C2B26',
          border: '1px solid #E6DFCC',
          borderRadius: '0.75rem',
          boxShadow: '0 1px 2px rgb(28 43 38 / 0.06), 0 4px 16px rgb(28 43 38 / 0.06)',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '0.875rem',
        },
        success: { iconTheme: { primary: '#055F46', secondary: '#FFFFFF' } },
        error: { iconTheme: { primary: '#B91C1C', secondary: '#FFFFFF' } },
      }}
    />
  );
}

/**
 * toast.success(t('…')), toast.error(t('…')), toast.apiError(error) — the last one
 * translates the API error `code` through the `errors` namespace.
 */
export const toast = {
  success: (message, opts) => hotToast.success(message, opts),
  error: (message, opts) => hotToast.error(message, opts),
  info: (message, opts) => hotToast(message, opts),
  apiError: (error, opts) => hotToast.error(getErrorMessage(error), opts),
  dismiss: (id) => hotToast.dismiss(id),
};

export default Toaster;
