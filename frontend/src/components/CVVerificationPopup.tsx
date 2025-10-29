import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { CheckCircle2, XCircle } from 'lucide-react';
import axios from 'axios';

interface CVVerificationPopupProps {
  cvData: {
    id: number;
    extracted_name: string;
    extracted_phone: string;
    extracted_city: string;
    ip_detected_city: string;
    info_confirmed: boolean;
  } | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function CVVerificationPopup({ cvData, open, onClose, onConfirm }: CVVerificationPopupProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (cvData) {
      setName(cvData.extracted_name || '');
      setPhone(cvData.extracted_phone || '');
      // Use CV city if available, otherwise IP-detected city
      setCity(cvData.extracted_city || cvData.ip_detected_city || '');
    }
  }, [cvData]);

  const handleConfirm = async () => {
    if (!cvData) return;

    setIsLoading(true);
    try {
      // Send confirmation to backend
      await axios.post(`/api/cv/${cvData.id}/confirm_info/`, {
        name,
        phone,
        city
      });

      onConfirm();
      onClose();
    } catch (error) {
      console.error('Failed to confirm CV info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!cvData || cvData.info_confirmed) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {t('verification.title')}
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            {t('verification.correct_question', {
              name: cvData.extracted_name || 'Not found',
              phone: cvData.extracted_phone || 'Not found'
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('verification.name')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('verification.phone')}</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1234567890"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">{t('verification.city')}</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="New York"
            />
          </div>

          <p className="text-sm text-muted-foreground text-center pt-2">
            {t('verification.confirm_subtitle')}
          </p>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {isLoading ? t('common.loading') : t('verification.confirm_button')}
          </Button>
          <Button
            variant="outline"
            onClick={handleSkip}
            className="w-full sm:w-auto"
          >
            <XCircle className="mr-2 h-4 w-4" />
            {t('verification.skip_button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
