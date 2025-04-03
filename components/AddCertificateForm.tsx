import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/config';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/auth/auth-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function AddCertificateForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const [certificateUrl, setCertificateUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const extractCertificateCode = (url: string) => {
    const match = url.match(/verify\/([A-Z0-9]+)/);
    return match ? match[1] : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const certificateCode = extractCertificateCode(certificateUrl);
    if (!certificateCode) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid Coursera certificate URL',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Verify the certificate
      const verifyCert = httpsCallable(functions, 'verifyCourseraCertificate');
      const result = await verifyCert({ certificateCode });
      
      // Add to user's profile
      const profileRef = doc(db, 'profiles', user?.uid || '');
      await updateDoc(profileRef, {
        certifications: arrayUnion({
          ...result.data, // Contains name, issuer, etc.
          credentialUrl: certificateUrl,
          verified: true,
          addedAt: new Date().toISOString()
        }),
      });

      toast({
        title: 'Success',
        description: 'Certificate added to your profile',
      });

      // Reset and close
      setCertificateUrl('');
      setIsDialogOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to verify certificate',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Add Coursera Certificate</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Coursera Certificate</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="certificateUrl">Coursera Certificate URL</Label>
            <Input
              id="certificateUrl"
              placeholder="https://www.coursera.org/account/accomplishments/verify/TKTYNBA77AB3"
              value={certificateUrl}
              onChange={(e) => setCertificateUrl(e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground">
              Paste the full URL of your Coursera certificate
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Verifying...' : 'Verify & Add'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}