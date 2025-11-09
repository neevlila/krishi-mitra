import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, Edit, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MarketListingsProps {
  listings: any[];
  userId: string;
  onUpdate: () => void;
}

const MarketListings = ({ listings, userId, onUpdate }: MarketListingsProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [crop, setCrop] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [price, setPrice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddListing = async () => {
    try {
      if (editingId) {
        await supabase.from("market_listings").update({
          crop,
          quantity: parseFloat(quantity),
          unit,
          price: parseFloat(price),
        }).eq('id', editingId);
        toast({ title: "Success", description: "Listing updated successfully" });
      } else {
        await supabase.from("market_listings").insert({
          user_id: userId,
          crop,
          quantity: parseFloat(quantity),
          unit,
          price: parseFloat(price),
        });
        toast({ title: "Success", description: "Listing added successfully" });
      }

      setCrop("");
      setQuantity("");
      setUnit("");
      setPrice("");
      setShowForm(false);
      setEditingId(null);
      onUpdate();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleEdit = (listing: any) => {
    setCrop(listing.crop);
    setQuantity(listing.quantity.toString());
    setUnit(listing.unit);
    setPrice(listing.price.toString());
    setEditingId(listing.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from("market_listings").delete().eq('id', id);
      toast({ title: "Success", description: "Listing deleted successfully" });
      onUpdate();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleCancel = () => {
    setCrop("");
    setQuantity("");
    setUnit("");
    setPrice("");
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-secondary" />
            {t('marketLinkage')}
          </span>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            {t('addListing')}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <Input placeholder={t('crop')} value={crop} onChange={(e) => setCrop(e.target.value)} />
            <Input placeholder={t('quantity')} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <Input placeholder={t('unit')} value={unit} onChange={(e) => setUnit(e.target.value)} />
            <Input placeholder={t('price')} value={price} onChange={(e) => setPrice(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={handleAddListing} className="flex-1">{editingId ? t('update') : t('save')}</Button>
              {editingId && <Button onClick={handleCancel} variant="outline">{t('cancel')}</Button>}
            </div>
          </div>
        )}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {listings.map((listing) => (
            <Card key={listing.id} className="border-l-4 border-l-secondary">
              <CardContent className="pt-4 space-y-2">
                <p><strong>{t('crop')}:</strong> {listing.crop}</p>
                <p><strong>{t('quantity')}:</strong> {listing.quantity}</p>
                <p><strong>{t('unit')}:</strong> {listing.unit}</p>
                <p><strong>{t('price')}:</strong> ₹{listing.price}</p>
                {listing.user_id === userId && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(listing)}>
                      <Edit className="w-4 h-4 mr-1" />
                      {t('edit')}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(listing.id)}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      {t('delete')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketListings;
