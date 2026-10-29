import { Button, type ButtonVariant } from './Button';
import { useToast } from './Toast';

export interface ShareButtonProps {
  /** Text to share/copy. */
  text: string;
  /** Optional URL; appended on its own line when copying. */
  url?: string;
  title?: string;
  label?: string;
  variant?: ButtonVariant;
  block?: boolean;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the textarea trick
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** navigator.share when available, else clipboard + "Copied!" toast. */
export function ShareButton({ text, url, title = 'Urinal', label = 'Share', variant = 'default', block }: ShareButtonProps) {
  const toast = useToast();
  const full = url ? `${text}\n${url}` : text;

  const onShare = async () => {
    const data: ShareData = url ? { title, text, url } : { title, text };
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        if (!navigator.canShare || navigator.canShare(data)) {
          await navigator.share(data);
          return;
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return; // user cancelled
      }
    }
    const ok = await copyText(full);
    toast(ok ? '📋 Copied.' : "Couldn't copy to the clipboard.", {
      tone: ok ? 'success' : 'danger',
    });
  };

  return (
    <Button variant={variant} block={block} onClick={() => void onShare()}>
      {label}
    </Button>
  );
}
