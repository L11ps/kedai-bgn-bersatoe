import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/order-store';

export async function GET() {
  try {
    const products = getProducts();
    return NextResponse.json({ success: true, products });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    // Action: Toggle single product availability
    if (body.productId && typeof body.isAvailable === 'boolean') {
      const products = getProducts();
      const p = products.find((prod) => prod.id === body.productId);
      if (!p) {
        return NextResponse.json(
          { success: false, message: 'Produk tidak ditemukan' },
          { status: 404 }
        );
      }
      p.is_available = body.isAvailable;
      return NextResponse.json({ success: true, product: p });
    }

    // Action: Toggle single product PO availability
    if (body.productId && typeof body.poAvailable === 'boolean') {
      const products = getProducts();
      const p = products.find((prod) => prod.id === body.productId);
      if (!p) {
        return NextResponse.json(
          { success: false, message: 'Produk tidak ditemukan' },
          { status: 404 }
        );
      }
      p.po_available = body.poAvailable;
      return NextResponse.json({ success: true, product: p });
    }

    return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
