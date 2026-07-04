import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
  label?: string;
}
interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="p-6 border border-destructive/40 bg-destructive/10 rounded-lg space-y-3 text-center">
          <div className="flex items-center justify-center gap-2 text-destructive font-heading">
            <AlertTriangle className="h-5 w-5" />
            Algo deu errado {this.props.label ? `em ${this.props.label}` : ''}
          </div>
          <p className="text-xs text-muted-foreground break-words">
            {this.state.error.message}
          </p>
          <Button onClick={this.reset} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
