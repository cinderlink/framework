/**
 * Toast Container Component
 *
 * Displays toast notifications in the bottom-right corner of the screen.
 */

import type { Toast, ToastType } from '../hooks/useToast';

interface ToastContainerProps {
  colors: typeof import('../theme/colors').colors.dark;
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ colors, toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <box
      style={{
        position: 'absolute',
        bottom: 3,
        right: 2,
        width: 40,
        flexDirection: 'column',
      }}
    >
      {toasts.slice(-5).map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          colors={colors}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </box>
  );
}

interface ToastItemProps {
  toast: Toast;
  colors: typeof import('../theme/colors').colors.dark;
  onDismiss: () => void;
}

function ToastItem({ toast, colors, onDismiss }: ToastItemProps) {
  const typeStyles = getTypeStyles(toast.type, colors);

  return (
    <box
      style={{
        border: true,
        borderColor: typeStyles.borderColor,
        marginBottom: 1,
        padding: 1,
        flexDirection: 'column',
      }}
    >
      <box style={{ flexDirection: 'row' }}>
        {/* Icon */}
        <text fg={typeStyles.iconColor}>{typeStyles.icon} </text>

        {/* Message */}
        <text fg={colors.textPrimary}>{toast.message}</text>
      </box>

      {/* Progress indicator (visual hint that it will auto-dismiss) */}
      {toast.duration > 0 && (
        <box style={{ height: 1, marginTop: 1 }}>
          <text fg={colors.textSecondary}>(auto-dismiss)</text>
        </box>
      )}
    </box>
  );
}

function getTypeStyles(type: ToastType, colors: typeof import('../theme/colors').colors.dark) {
  switch (type) {
    case 'success':
      return {
        icon: '✓',
        iconColor: colors.accentGreen,
        borderColor: colors.accentGreen,
      };
    case 'error':
      return {
        icon: '✗',
        iconColor: colors.accentRed,
        borderColor: colors.accentRed,
      };
    case 'warning':
      return {
        icon: '!',
        iconColor: colors.accentYellow,
        borderColor: colors.accentYellow,
      };
    case 'info':
    default:
      return {
        icon: 'i',
        iconColor: colors.accentBlue,
        borderColor: colors.accentBlue,
      };
  }
}
