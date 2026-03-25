import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-black flex items-center justify-center p-4 font-sans">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl max-w-lg w-full shadow-2xl text-center">
            <div className="bg-red-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/50 shadow-[0_0_30px_rgba(220,38,38,0.3)]">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2">System Malfunction</h1>
            <p className="text-gray-400 mb-6">
              The monitoring system encountered a critical error. 
              <br />
              <span className="text-xs font-mono text-red-400 mt-2 block bg-black/30 p-2 rounded border border-red-900/30">
                {this.state.error && this.state.error.toString()}
              </span>
            </p>

            <button 
              onClick={this.handleReload}
              className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto transition-all hover:scale-105 active:scale-95"
            >
              <RefreshCw size={18} />
              Reboot System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
