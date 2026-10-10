'use me'
'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PaymentsDashboard } from './payments-dashboard'
import { PaymentOrdersList } from './payment-orders-list'
import { SubscriptionsList } from './subscriptions-list'
import { GatewaySettings } from './gateway-settings'
import { LayoutDashboard, Receipt, Repeat, Settings } from 'lucide-react'

export function PaymentsManager() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Cobranças
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            Assinaturas
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Gateways
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <PaymentsDashboard />
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <PaymentOrdersList />
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-6">
          <SubscriptionsList />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <GatewaySettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
