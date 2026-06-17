import { AlertCircle, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-md border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900">
      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
      <p className="text-sm text-red-800 dark:text-red-200 flex-1">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0 gap-1 h-7 text-xs">
          <RefreshCw className="w-3 h-3" />
          重试
        </Button>
      )}
      {onDismiss && (
        <Button variant="ghost" size="icon" onClick={onDismiss} className="shrink-0 h-7 w-7">
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
