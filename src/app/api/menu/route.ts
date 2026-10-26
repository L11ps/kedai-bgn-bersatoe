import { NextResponse } from 'next/server';
import {
  getProducts,
  updateAllProductStocks,
  resetAllReadyStocksToZero,
} from '@/lib/order-store';

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

    // Action: Reset all ready stocks to 0
    if (body.action === 'RESET_READY') {
      const resetProducts = resetAllReadyStocksToZero();
      return NextResponse.json({
        success: true,
        message: 'Semua stok ready harian berhasil direset ke 0',
        products: resetProducts,
      });
    }

    // Action: Batch update stocks (array body.stockList or body.stocks)
    const batchStocks = body.stockList || body.stocks;
    if (Array.isArray(batchStocks)) {
      const updated = updateAllProductStocks(batchStocks);
      return NextResponse.json({
        success: true,
        message: 'Stok kampus berhasil disimpan',
        products: updated,
      });
    }

    // Action: Toggle single product availability
    if (body.productId && typeof body.isAvailable === 'boolean') {
      const products = getProducts();
      const p = products.find((prod) => prod.id === body.productId);
      if (!p) {
        return NextResponse.json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });
      }
      p.is_available = body.isAvailable;
      return NextResponse.json({ success: true, product: p });
    }

    // Legacy fallback: single product update via productId + updates object
    if (body.productId && body.updates) {
      const updated = updateAllProductStocks([
        {
          id: body.productId,
          stock_halimun: body.updates.stock_halimun,
          stock_minangkabau: body.updates.stock_minangkabau,
          stock_daan_mogot: body.updates.stock_daan_mogot,
          po_available: body.updates.po_available,
        },
      ]);
      return NextResponse.json({ success: true, products: updated });
    }

    return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
