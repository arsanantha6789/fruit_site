import type { OrderDetail } from "@/modules/orders/types";
import type { BusinessSettings } from "@/modules/settings/types";
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/modules/payments/methods";
import { STATUS_LABEL } from "@/modules/orders/status";
import { UNIT_LABEL } from "@/modules/catalog/units";
import { formatINR } from "@/lib/money";
import { formatDateTime, formatQty } from "@/lib/utils";
import "./packing-slip.css";

/**
 * A4 packing slip. Pure presentational component with its own stylesheet,
 * deliberately independent of the dashboard UI so it prints identically
 * from any browser (or "Save as PDF").
 */
export function PackingSlip({ order, business }: { order: OrderDetail; business: BusinessSettings }) {
  const a = order.shippingAddress;
  const bizAddress = [business.addressLine, business.city, business.state, business.pincode].filter(Boolean).join(", ");
  return (
    <article className="slip">
      <header className="slip-header">
        <div>
          <h1 className="slip-brand">{business.businessName}</h1>
          {bizAddress && <p>{bizAddress}</p>}
          <p>{[business.phone, business.email].filter(Boolean).join(" · ")}</p>
          {business.gstin && <p>GSTIN: {business.gstin}</p>}
        </div>
        <div className="slip-meta">
          <p className="slip-title">Packing slip</p>
          <table>
            <tbody>
              <tr>
                <th>Order ID</th>
                <td>
                  <b>{order.orderNumber}</b>
                </td>
              </tr>
              <tr>
                <th>Order date</th>
                <td>{formatDateTime(order.placedAt)}</td>
              </tr>
              <tr>
                <th>Status</th>
                <td>{STATUS_LABEL[order.status]}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </header>

      <section className="slip-parties">
        <div className="slip-box">
          <h2>Ship to</h2>
          <p className="slip-strong">{order.customerName}</p>
          <p>Phone: +91 {order.customerPhone}</p>
          {a.removed ? (
            <p>(address removed)</p>
          ) : (
            <>
              <p>{a.line1}</p>
              {a.line2 && <p>{a.line2}</p>}
              {a.landmark && <p>Landmark: {a.landmark}</p>}
              <p>
                {a.city}, {a.state} – <b>{a.pincode}</b>
              </p>
            </>
          )}
        </div>
        <div className="slip-box">
          <h2>Payment</h2>
          <p className="slip-strong">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</p>
          <p>
            Status: <b>{PAYMENT_STATUS_LABEL[order.paymentStatus]}</b>
          </p>
          {order.paymentStatus !== "paid" && <p className="slip-collect">Collect {formatINR(order.totalPaise)}</p>}
        </div>
      </section>

      {order.instructions && (
        <section className="slip-instructions">
          <h2>Customer instructions</h2>
          <p>{order.instructions}</p>
        </section>
      )}

      <table className="slip-items">
        <thead>
          <tr>
            <th className="c-check" aria-label="Packed">
              ✓
            </th>
            <th>Product</th>
            <th className="num">Qty</th>
            <th className="num">Unit price</th>
            <th className="num">Item total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.id}>
              <td className="c-check">
                <span className="slip-tick" />
              </td>
              <td>
                <b>{i.productName}</b>
                <span className="slip-sub">
                  {i.variantLabel} · {formatQty(i.quantity * i.quantityInBase)} {UNIT_LABEL[i.unit]} in total
                </span>
              </td>
              <td className="num">
                <b>{i.quantity}</b> × {i.variantLabel}
              </td>
              <td className="num">{formatINR(i.unitPricePaise)}</td>
              <td className="num">{formatINR(i.lineTotalPaise)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="slip-totals">
        <tbody>
          <tr>
            <th>Subtotal</th>
            <td>{formatINR(order.subtotalPaise)}</td>
          </tr>
          <tr>
            <th>Delivery charges</th>
            <td>{order.deliveryFeePaise ? formatINR(order.deliveryFeePaise) : "Free"}</td>
          </tr>
          <tr>
            <th>Discounts</th>
            <td>{order.discountPaise ? `−${formatINR(order.discountPaise)}` : formatINR(0)}</td>
          </tr>
          <tr className="grand">
            <th>Grand total</th>
            <td>{formatINR(order.totalPaise)}</td>
          </tr>
        </tbody>
      </table>

      <footer className="slip-footer">
        <p>{business.packingSlipNote}</p>
        <p className="slip-fine">Items: {order.items.length} · Packed by: ____________ · Checked by: ____________</p>
      </footer>
    </article>
  );
}
