import { CartProvider } from "@/modules/cart/cart-context";
import { StoreHeader } from "@/components/store/header";
import { StoreFooter } from "@/components/store/footer";

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <CartProvider>
      <StoreHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <StoreFooter />
    </CartProvider>
  );
}
