import React from 'react';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';

import { captureException } from '../utils/sentry.js';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    captureException(error, {
      extra: {
        componentStack: errorInfo?.componentStack,
      },
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { darkMode, onReset } = this.props;
    const isDark = Boolean(darkMode);

    return (
      <div
        className={`flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 ${
          isDark
            ? 'bg-[#0B0F19] text-white'
            : 'bg-slate-100 text-slate-900'
        }`}
      >
        <div className="w-full max-w-3xl">
          <div
            className={`overflow-hidden rounded-[2rem] border shadow-2xl backdrop-blur-md ${
              isDark
                ? 'border-slate-700/60 bg-slate-800/85 shadow-black/30'
                : 'border-slate-300/70 bg-white/92 shadow-slate-900/10'
            }`}
          >
            <div
              className={`border-b px-6 py-8 sm:px-8 sm:py-10 ${
                isDark
                  ? 'border-slate-700/60 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.18),transparent_55%),linear-gradient(180deg,rgba(30,41,59,0.82),rgba(15,23,42,0.96))]'
                  : 'border-slate-200/80 bg-[radial-gradient(circle_at_top,rgba(248,113,113,0.16),transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))]'
              }`}
            >
              <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-[1.75rem] ${
                    isDark ? 'bg-red-500/15 text-red-300' : 'bg-red-100 text-red-600'
                  }`}
                >
                  <AlertCircle className="h-10 w-10" />
                </div>

                <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
                  Что-то пошло не так
                </h1>

                <p
                  className={`mt-4 max-w-xl text-sm leading-7 sm:text-base ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  Произошла ошибка в приложении. Мы уже знаем о проблеме и работаем
                  над её решением.
                </p>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <div className="mx-auto flex max-w-2xl flex-col gap-4">
                {process.env.NODE_ENV === 'development' && this.state.error ? (
                  <div
                    className={`overflow-auto rounded-[1.5rem] border p-4 text-left font-mono text-xs sm:text-sm ${
                      isDark
                        ? 'border-slate-700/60 bg-slate-900/70 text-red-300'
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                  >
                    <p className="font-semibold">{this.state.error.toString()}</p>
                    {this.state.errorInfo ? (
                      <pre className="mt-3 whitespace-pre-wrap opacity-80">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={this.handleReload}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Перезагрузить
                  </button>

                  <button
                    type="button"
                    onClick={this.handleGoHome}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition-colors ${
                      isDark
                        ? 'border-slate-700/60 bg-slate-900/60 text-slate-100 hover:bg-slate-800'
                        : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Home className="h-4 w-4" />
                    На главную
                  </button>

                  {onReset ? (
                    <button
                      type="button"
                      onClick={this.handleReset}
                      className={`inline-flex flex-1 items-center justify-center rounded-2xl border px-5 py-3 text-sm font-semibold transition-colors ${
                        isDark
                          ? 'border-slate-700/60 text-slate-300 hover:bg-slate-800/80'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Попробовать снова
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
