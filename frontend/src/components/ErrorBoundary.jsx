import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary - перехватывает ошибки в дочерних компонентах
 * и показывает fallback UI вместо краша всего приложения
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Обновляем state чтобы показать fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Логируем ошибку
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Можно отправить в сервис мониторинга (Sentry, etc.)
    // if (process.env.NODE_ENV === 'production') {
    //   sentry.captureException(error);
    // }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const { darkMode } = this.props;
      
      return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${
          darkMode ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'
        }`}>
          <div className={`max-w-md w-full rounded-3xl p-8 shadow-2xl ${
            darkMode 
              ? 'bg-slate-800 border border-slate-700' 
              : 'bg-white border border-gray-200'
          }`}>
            <div className="flex items-center justify-center mb-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                darkMode ? 'bg-red-500/20' : 'bg-red-100'
              }`}>
                <AlertCircle className={`w-8 h-8 ${
                  darkMode ? 'text-red-400' : 'text-red-600'
                }`} />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-center mb-2">
              Что-то пошло не так
            </h2>
            
            <p className={`text-center mb-6 ${
              darkMode ? 'text-slate-400' : 'text-gray-600'
            }`}>
              Произошла ошибка в приложении. Мы уже знаем о проблеме и работаем над её решением.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className={`mb-6 p-4 rounded-xl overflow-auto max-h-40 text-sm font-mono ${
                darkMode 
                  ? 'bg-slate-900 text-red-300' 
                  : 'bg-red-50 text-red-700'
              }`}>
                <p className="font-semibold">{this.state.error.toString()}</p>
                {this.state.errorInfo && (
                  <pre className="mt-2 text-xs opacity-75">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Перезагрузить
              </button>
              
              {this.props.onReset && (
                <button
                  onClick={this.handleReset}
                  className={`flex-1 px-6 py-3 rounded-xl font-medium transition-colors ${
                    darkMode
                      ? 'bg-slate-700 hover:bg-slate-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Попробовать снова
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
