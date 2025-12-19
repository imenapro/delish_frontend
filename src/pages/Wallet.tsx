import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Plus, Award, Star } from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Wallet() {
  const { user } = useAuth();

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['wallet-transactions', wallet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', wallet?.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!wallet?.id,
  });

  const { data: loyalty } = useQuery({
    queryKey: ['loyalty', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_loyalty')
        .select('*')
        .eq('customer_id', user?.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: loyaltyTransactions } = useQuery({
    queryKey: ['loyalty-transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      bronze: 'bg-amber-600',
      silver: 'bg-gray-400',
      gold: 'bg-yellow-500',
      platinum: 'bg-purple-500',
    };
    return colors[tier] || 'bg-gray-500';
  };

  const getTransactionIcon = (type: string) => {
    return type === 'credit' ? (
      <ArrowDownLeft className="h-5 w-5 text-success" />
    ) : (
      <ArrowUpRight className="h-5 w-5 text-destructive" />
    );
  };

  const getTransactionColor = (type: string) => {
    return type === 'credit' ? 'text-success' : 'text-destructive';
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Wallet</h1>
              <p className="text-muted-foreground mt-1">
                Manage your account balance and transactions
              </p>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Funds
            </Button>
          </div>

          {walletLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              <Card className="mb-8 shadow-[var(--shadow-medium)] bg-gradient-to-br from-primary/10 to-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <WalletIcon className="h-6 w-6" />
                    Current Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-bold text-primary">
                    {wallet?.balance ? Number(wallet.balance).toLocaleString() : '0'} RWF
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Last updated: {wallet?.updated_at ? format(new Date(wallet.updated_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                  </p>
                </CardContent>
              </Card>

              <Tabs defaultValue="transactions" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                  <TabsTrigger value="loyalty">Loyalty Rewards</TabsTrigger>
                </TabsList>

                <TabsContent value="transactions">
                  <Card className="shadow-[var(--shadow-medium)]">
                    <CardHeader>
                      <CardTitle>Transaction History</CardTitle>
                    </CardHeader>
                    <CardContent>
                  {transactionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  ) : transactions && transactions.length > 0 ? (
                    <div className="space-y-3">
                      {transactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {getTransactionIcon(transaction.type)}
                            <div>
                              <div className="font-medium text-foreground">
                                {transaction.description || 'Transaction'}
                              </div>
                              {transaction.reference && (
                                <div className="text-xs text-muted-foreground">
                                  Ref: {transaction.reference}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">
                                {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-xl font-bold ${getTransactionColor(transaction.type)}`}>
                              {transaction.type === 'credit' ? '+' : '-'}${Math.abs(Number(transaction.amount)).toFixed(2)}
                            </div>
                            <Badge variant="outline" className="mt-1">
                              {transaction.type}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <WalletIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">No transactions yet</p>
                    </div>
                  )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="loyalty">
                  <div className="space-y-6">
                    <Card className={`shadow-[var(--shadow-medium)] ${loyalty ? 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900' : ''}`}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="h-6 w-6" />
                          Loyalty Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {loyalty ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Current Tier</p>
                                <Badge className={`${getTierColor(loyalty.tier || 'bronze')} text-white mt-1 uppercase text-lg px-4 py-1`}>
                                  {loyalty.tier}
                                </Badge>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Points</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                                  <span className="text-3xl font-bold">{loyalty.points || 0}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total Spent</p>
                              <p className="text-2xl font-bold">{Number(loyalty.total_spent || 0).toLocaleString()} RWF</p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Award className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            <p className="text-muted-foreground">Start shopping to earn loyalty points!</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="shadow-[var(--shadow-medium)]">
                      <CardHeader>
                        <CardTitle>Points History</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {loyaltyTransactions && loyaltyTransactions.length > 0 ? (
                          <div className="space-y-3">
                            {loyaltyTransactions.map((transaction) => (
                              <div
                                key={transaction.id}
                                className="flex items-center justify-between p-4 rounded-lg border border-border"
                              >
                                <div>
                                  <p className="font-medium">{transaction.description || transaction.transaction_type}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                                  </p>
                                </div>
                                <Badge variant={transaction.points_change > 0 ? 'default' : 'secondary'}>
                                  {transaction.points_change > 0 ? '+' : ''}{transaction.points_change} points
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Star className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            <p className="text-muted-foreground">No loyalty transactions yet</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
