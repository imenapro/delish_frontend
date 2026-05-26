import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';
import { MoneyCollectionsManager } from '@/components/finance/MoneyCollectionsManager';

export default function TenantCollections() {
  return (
    <TenantPageWrapper
      title="Money Collection System"
      description="Manage and acknowledge daily sales collections from sellers."
    >
      <div className="space-y-6">
        <MoneyCollectionsManager />
      </div>
    </TenantPageWrapper>
  );
}
