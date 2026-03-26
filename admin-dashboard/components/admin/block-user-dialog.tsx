import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BlockUserDialogProps {
  userId: string;
  isBlocked: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BlockUserDialog({ isBlocked, onConfirm, onCancel }: BlockUserDialogProps) {
  return (
    <AlertDialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isBlocked ? 'Unblock User' : 'Block User'}</AlertDialogTitle>
          <AlertDialogDescription>
            {isBlocked
              ? 'This user will be able to access their account again.'
              : 'This user will be unable to access their account.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-3 justify-end">
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {isBlocked ? 'Unblock' : 'Block'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
