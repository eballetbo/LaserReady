import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('LaserReady crashed:', error, info.componentStack);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleDismiss = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center h-screen bg-gray-900 text-white p-8">
                    <div className="max-w-md text-center space-y-4">
                        <h1 className="text-2xl font-bold">Something went wrong</h1>
                        <p className="text-gray-400">
                            An unexpected error occurred. Your work has been auto-saved.
                        </p>
                        <pre className="text-xs text-left bg-gray-800 p-3 rounded overflow-auto max-h-40">
                            {this.state.error?.message}
                        </pre>
                        <div className="flex gap-3 justify-center pt-4">
                            <button
                                onClick={this.handleDismiss}
                                className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition"
                            >
                                Try to recover
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 transition"
                            >
                                Reload app
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
