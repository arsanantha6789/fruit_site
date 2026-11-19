"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintToolbar({ orderNumber }: { orderNumber: string }) {
  return (
    <div className="print-toolbar">
      <Button onClick={() => window.print()} icon={<Printer className="size-4" />}>
        Print / Save as PDF
      </Button>
      <Button variant="outline" onClick={() => window.close()}>
        Close
      </Button>
      <span className="sr-only">Packing slip for order {orderNumber}</span>
    </div>
  );
}
