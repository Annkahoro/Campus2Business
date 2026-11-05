import { Component } from 'react';
import { Bug } from 'lucide-react';
import i18n from '../../i18n/index.js';
import { Button, EmptyState } from '../ui/index.js';

/**
 * Catches render errors in a page so the layout (sidebar, topbar) keeps working.
 * Layouts mount it with key = pathname, so navigating away resets it.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Page crashed:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="py-10">
        <EmptyState
          illustration={<Bug size={32} strokeWidth={1.75} aria-hidden="true" />}
          title={i18n.t('crash.title')}
          description={i18n.t('crash.text')}
          action={<Button onClick={() => window.location.reload()}>{i18n.t('crash.reload')}</Button>}
        />
      </div>
    );
  }
}
