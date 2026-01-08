import { AppLayout } from "@/components/layout/AppLayout";
import { OrdersActivityTable } from "@/components/orders";
import { useExchangeConnections } from "@/hooks/useExchangeConnections";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";

export default function Orders() {
  const { connections, loading } = useExchangeConnections();
  
  const alpacaConnection = connections.find(c => c.exchange === "alpaca" && c.status === "connected");
  const hasAlpacaConnection = !!alpacaConnection;

  return (
    <AppLayout title="Orders Activity">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Orders Activity</h1>
          <p className="text-muted-foreground">
            View all your Alpaca orders including market, limit, and stop orders with real-time updates.
          </p>
        </div>

        {!loading && !hasAlpacaConnection && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No Alpaca Connection</AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              <span>
                Connect your Alpaca account to view and sync your orders.
              </span>
              <Button asChild variant="outline" size="sm" className="w-fit">
                <Link to="/profile">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Go to Profile to Connect
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {(loading || hasAlpacaConnection) && (
          <OrdersActivityTable />
        )}
      </div>
    </AppLayout>
  );
}