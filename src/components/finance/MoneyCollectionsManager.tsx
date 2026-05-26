import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/utils/currency';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Eye, 
  FileText, 
  Upload, 
  X,
  Banknote,
  Smartphone,
  CreditCard,
  Search,
  Filter,
  ArrowUpDown,
  PlusCircle
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function MoneyCollectionsManager() {
  const { store } = useStoreContext();
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCollection, setSelectedCollection] = useState<any | null>(null);
  const [isAcknowledgeOpen, setIsAcknowledgeOpen] = useState(false);
  const [actualReceived, setActualReceived] = useState('');
  const [collectorNotes, setCollectorNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);
  const [newReport, setNewReport] = useState({
    cash: '',
    momo: '',
    card: '',
    notes: '',
    shopId: ''
  });

  const canAcknowledge = roles.some(r => 
    ['super_admin', 'store_owner', 'admin', 'accountant'].includes(r.role.toLowerCase())
  );

  const isSeller = roles.some(r => r.role.toLowerCase() === 'seller');

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['daily-collections', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      let query = supabase
        .from('daily_collections')
        .select(`
          *,
          seller:profiles!daily_collections_seller_id_fkey(name),
          collector:profiles!daily_collections_collector_id_fkey(name),
          shop:shops(name)
        `)
        .eq('business_id', store.id)
        .order('reported_at', { ascending: false });
      
      // If seller, only show their own collections
      if (isSeller && !canAcknowledge) {
        query = query.eq('seller_id', user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
  });

  const { data: myShops = [] } = useQuery({
    queryKey: ['my-assigned-shops', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select('shop_id, shop:shops(name)')
        .eq('user_id', user.id)
        .not('shop_id', 'is', null);
      if (error) throw error;
      return data.map((d: any) => ({ id: d.shop_id, name: d.shop?.name }));
    },
    enabled: !!user?.id && isSeller,
  });

  const createReportMutation = useMutation({
    mutationFn: async () => {
      if (!user || !store) return;
      const cash = Number(newReport.cash) || 0;
      const momo = Number(newReport.momo) || 0;
      const card = Number(newReport.card) || 0;
      
      const { error } = await supabase
        .from('daily_collections')
        .insert({
          business_id: store.id,
          shop_id: newReport.shopId,
          seller_id: user.id,
          reported_amount: cash + momo + card,
          expected_amount: 0, // Manual reporting doesn't link to a session expected amount directly here
          cash_amount: cash,
          momo_amount: momo,
          card_amount: card,
          seller_notes: newReport.notes,
          status: 'pending'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-collections'] });
      toast.success('Collection report submitted successfully');
      setIsNewReportOpen(false);
      setNewReport({ cash: '', momo: '', card: '', notes: '', shopId: '' });
    },
    onError: (error: any) => {
      toast.error('Failed to submit report: ' + error.message);
    }
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCollection || !user) return;
      
      const { error } = await supabase
        .from('daily_collections')
        .update({
          collector_id: user.id,
          actual_received_amount: Number(actualReceived),
          collector_notes: collectorNotes,
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', selectedCollection.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-collections'] });
      toast.success('Collection acknowledged successfully');
      setIsAcknowledgeOpen(false);
      setSelectedCollection(null);
      setActualReceived('');
      setCollectorNotes('');
    },
    onError: (error: any) => {
      toast.error('Failed to acknowledge collection: ' + error.message);
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCollection || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `collections/${selectedCollection.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('collection-evidence')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('collection_documents')
        .insert({
          collection_id: selectedCollection.id,
          file_path: filePath,
          file_name: file.name,
          uploaded_by: user.id
        });

      if (dbError) throw dbError;

      // Update local UI state for evidence if needed or just refetch
      queryClient.invalidateQueries({ queryKey: ['collection-documents', selectedCollection.id] });
      toast.success('Document uploaded successfully');
    } catch (error: any) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'acknowledged':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Acknowledged</Badge>;
      case 'discrepancy_reported':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><AlertTriangle className="w-3 h-3 mr-1" />Discrepancy</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-primary" />
              Daily Money Collections
            </div>
            {isSeller && (
              <Button onClick={() => setIsNewReportOpen(true)} size="sm">
                <PlusCircle className="w-4 h-4 mr-2" />
                Report Collection
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Monitor and acknowledge sales funds collected from sellers at the end of their shifts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Reported</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead className="text-right">Reported Amount</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex justify-center"><Clock className="animate-spin h-5 w-5 mr-2" /> Loading collections...</div>
                    </TableCell>
                  </TableRow>
                ) : collections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No collection reports found.
                    </TableCell>
                  </TableRow>
                ) : (
                  collections.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(c.reported_at), 'MMM dd, HH:mm')}</TableCell>
                      <TableCell>{c.shop?.name}</TableCell>
                      <TableCell>{c.seller?.name}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(c.reported_amount, store?.currency)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(c.expected_amount, store?.currency)}</TableCell>
                      <TableCell className={`text-right font-medium ${c.discrepancy_amount === 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {c.discrepancy_amount > 0 ? '+' : ''}{formatCurrency(c.discrepancy_amount, store?.currency)}
                      </TableCell>
                      <TableCell>{getStatusBadge(c.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setSelectedCollection(c);
                            setActualReceived(String(c.reported_amount));
                            setIsAcknowledgeOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Acknowledgment / Details Dialog */}
      <Dialog open={isAcknowledgeOpen} onOpenChange={setIsAcknowledgeOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Collection Details</DialogTitle>
            <DialogDescription>
              Review and acknowledge receipt of reported funds.
            </DialogDescription>
          </DialogHeader>

          {selectedCollection && (
            <ScrollArea className="flex-1 px-6 pb-6">
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase">Shop</Label>
                    <p className="font-medium">{selectedCollection.shop?.name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase">Seller</Label>
                    <p className="font-medium">{selectedCollection.seller?.name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase">Reported At</Label>
                    <p className="font-medium">{format(new Date(selectedCollection.reported_at), 'PPP p')}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase">Status</Label>
                    <div>{getStatusBadge(selectedCollection.status)}</div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border space-y-3">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Banknote className="h-4 w-4" /> Reported Breakdown
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Cash:</span>
                      <span className="font-mono">{formatCurrency(selectedCollection.cash_amount, store?.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Mobile Money:</span>
                      <span className="font-mono">{formatCurrency(selectedCollection.momo_amount, store?.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Card:</span>
                      <span className="font-mono">{formatCurrency(selectedCollection.card_amount, store?.currency)}</span>
                    </div>
                    <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                      <span>Total Reported:</span>
                      <span>{formatCurrency(selectedCollection.reported_amount, store?.currency)}</span>
                    </div>
                  </div>
                </div>

                {selectedCollection.seller_notes && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase">Seller Notes</Label>
                    <div className="p-3 bg-muted/30 rounded border text-sm italic">
                      "{selectedCollection.seller_notes}"
                    </div>
                  </div>
                )}

                {selectedCollection.status === 'pending' && canAcknowledge ? (
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Acknowledge Receipt</h4>
                    <div className="space-y-2">
                      <Label htmlFor="actual-received">Actual Amount Received *</Label>
                      <Input 
                        id="actual-received"
                        type="number"
                        value={actualReceived}
                        onChange={(e) => setActualReceived(e.target.value)}
                        placeholder="Enter the physical amount you received"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="collector-notes">Collector Notes / Comments</Label>
                      <Textarea 
                        id="collector-notes"
                        value={collectorNotes}
                        onChange={(e) => setCollectorNotes(e.target.value)}
                        placeholder="Any comments regarding the verification..."
                      />
                    </div>
                    <div className="space-y-2">
                        <Label>Proof of Transaction / Deposit</Label>
                        <div className="flex items-center gap-2">
                            <Input 
                                type="file" 
                                className="hidden" 
                                id="evidence-upload"
                                onChange={handleFileUpload}
                                disabled={uploading}
                            />
                            <Button 
                                variant="outline" 
                                className="w-full border-dashed"
                                onClick={() => document.getElementById('evidence-upload')?.click()}
                                disabled={uploading}
                            >
                                {uploading ? <Clock className="animate-spin h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                Upload Receipt/Deposit Slip
                            </Button>
                        </div>
                    </div>
                  </div>
                ) : (
                  selectedCollection.status === 'acknowledged' && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="rounded-md bg-green-50 p-4 border border-green-200">
                        <div className="flex items-center gap-2 text-green-800 font-bold mb-2">
                          <CheckCircle2 className="h-5 w-5" /> Acknowledged
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-green-700">
                          <span>By:</span> <span className="font-medium">{selectedCollection.collector?.name}</span>
                          <span>At:</span> <span className="font-medium">{format(new Date(selectedCollection.acknowledged_at), 'PPP p')}</span>
                          <span>Received:</span> <span className="font-bold">{formatCurrency(selectedCollection.actual_received_amount, store?.currency)}</span>
                        </div>
                        {selectedCollection.collector_notes && (
                          <div className="mt-3 text-sm italic border-t border-green-200 pt-2 text-green-600">
                            "{selectedCollection.collector_notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="p-6 pt-2 border-t">
            <Button variant="ghost" onClick={() => setIsAcknowledgeOpen(false)}>Close</Button>
            {selectedCollection?.status === 'pending' && canAcknowledge && (
              <Button 
                onClick={() => acknowledgeMutation.mutate()} 
                disabled={acknowledgeMutation.isPending || !actualReceived}
              >
                {acknowledgeMutation.isPending ? 'Processing...' : 'Confirm & Acknowledge'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Report Dialog for Sellers */}
      <Dialog open={isNewReportOpen} onOpenChange={setIsNewReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Collection Report</DialogTitle>
            <DialogDescription>
              Report the physical money you have collected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Shop</Label>
              <select 
                className="w-full h-10 px-3 py-2 text-sm border rounded-md bg-background"
                value={newReport.shopId}
                onChange={(e) => setNewReport({ ...newReport, shopId: e.target.value })}
              >
                <option value="">Select a shop...</option>
                {myShops.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Physical Cash</Label>
              <Input 
                type="number" 
                placeholder="0.00"
                value={newReport.cash}
                onChange={(e) => setNewReport({ ...newReport, cash: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Mobile Money</Label>
              <Input 
                type="number" 
                placeholder="0.00"
                value={newReport.momo}
                onChange={(e) => setNewReport({ ...newReport, momo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Card Terminal</Label>
              <Input 
                type="number" 
                placeholder="0.00"
                value={newReport.card}
                onChange={(e) => setNewReport({ ...newReport, card: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                placeholder="Any additional information..."
                value={newReport.notes}
                onChange={(e) => setNewReport({ ...newReport, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsNewReportOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => createReportMutation.mutate()}
              disabled={!newReport.shopId || (!newReport.cash && !newReport.momo && !newReport.card) || createReportMutation.isPending}
            >
              {createReportMutation.isPending ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
