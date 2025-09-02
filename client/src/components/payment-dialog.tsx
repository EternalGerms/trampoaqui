import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CreditCard, Smartphone, FileText } from "lucide-react";

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentMethodSelected: (method: string) => void;
  amount: number;
}

export default function PaymentDialog({ isOpen, onClose, onPaymentMethodSelected, amount }: PaymentDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>("");

  const handleConfirmPayment = () => {
    if (selectedMethod) {
      onPaymentMethodSelected(selectedMethod);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar Método de Pagamento</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">
              R$ {amount.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">Valor do serviço</p>
          </div>

          <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="credit_card" id="credit_card" />
                <Label htmlFor="credit_card" className="flex items-center space-x-2 cursor-pointer flex-1">
                  <CreditCard className="w-5 h-5" />
                  <span>Cartão de Crédito</span>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="pix" id="pix" />
                <Label htmlFor="pix" className="flex items-center space-x-2 cursor-pointer flex-1">
                  <Smartphone className="w-5 h-5" />
                  <span>PIX</span>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="boleto" id="boleto" />
                <Label htmlFor="boleto" className="flex items-center space-x-2 cursor-pointer flex-1">
                  <FileText className="w-5 h-5" />
                  <span>Boleto Bancário</span>
                </Label>
              </div>
            </div>
          </RadioGroup>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmPayment}
              disabled={!selectedMethod}
            >
              Confirmar Pagamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
