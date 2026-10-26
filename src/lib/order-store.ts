import {
  Order,
  Payment,
  OrderStatus,
  PaymentMethod,
  CartItem,
  Product,
  CampusLocation,
  OrderType,
} from '@/types';
import { INITIAL_PRODUCTS } from './products-data';

// Global singleton in Node.js environment
declare global {
  // eslint-disable-next-line no-var
  var __BGN_ORDERS__: Order[] | undefined;
  // eslint-disable-next-line no-var
  var __BGN_PAYMENTS__: Payment[] | undefined;
  // eslint-disable-next-line no-var
  var __BGN_PRODUCTS__: Product[] | undefined;
  // eslint-disable-next-line no-var
  var __BGN_ORDER_COUNTER__: number | undefined;
  // eslint-disable-next-line no-var
  var __BGN_QUEUE_COUNTER__: number | undefined;
}

if (!global.__BGN_ORDERS__) {
  global.__BGN_ORDERS__ = [];
}
if (!global.__BGN_PAYMENTS__) {
  global.__BGN_PAYMENTS__ = [];
}
if (!global.__BGN_PRODUCTS__) {
  global.__BGN_PRODUCTS__ = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
}
if (!global.__BGN_ORDER_COUNTER__) {
  global.__BGN_ORDER_COUNTER__ = 1;
}
if (!global.__BGN_QUEUE_COUNTER__) {
  global.__BGN_QUEUE_COUNTER__ = 1;
}

export function getProducts(): Product[] {
  return global.__BGN_PRODUCTS__ || INITIAL_PRODUCTS;
}

export function getProductStockForCampus(product: Product, campus: CampusLocation): number {
  if (campus === 'Kampus B Halimun') return product.stock_halimun;
  if (campus === 'Kampus C Minangkabau') return product.stock_minangkabau;
  if (campus === 'Kampus SB Daan Mogot') return product.stock_daan_mogot;
  return 0;
}

export function updateAllProductStocks(
  stockList: {
    id: string;
    stock_halimun: number;
    stock_minangkabau: number;
    stock_daan_mogot: number;
    po_available: boolean;
  }[]
) {
  const products = global.__BGN_PRODUCTS__;
  if (!products) return;

  stockList.forEach((update) => {
    const p = products.find((prod) => prod.id === update.id);
    if (p) {
      p.stock_halimun = Math.max(0, Math.round(update.stock_halimun));
      p.stock_minangkabau = Math.max(0, Math.round(update.stock_minangkabau));
      p.stock_daan_mogot = Math.max(0, Math.round(update.stock_daan_mogot));
      p.po_available = Boolean(update.po_available);
    }
  });

  return products;
}

export function resetAllReadyStocksToZero(): Product[] {
  const products = global.__BGN_PRODUCTS__;
  if (!products) return INITIAL_PRODUCTS;

  products.forEach((p) => {
    p.stock_halimun = 0;
    p.stock_minangkabau = 0;
    p.stock_daan_mogot = 0;
  });

  return products;
}

export function getAllOrders(): Order[] {
  return (global.__BGN_ORDERS__ || []).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function getOrderByIdOrCode(identifier: string): Order | undefined {
  return (global.__BGN_ORDERS__ || []).find(
    (o) => o.id === identifier || o.order_code === identifier
  );
}

export function getPaymentByOrderId(orderId: string): Payment | undefined {
  return (global.__BGN_PAYMENTS__ || []).find((p) => p.order_id === orderId);
}

// Generate BGN-YYYYMMDD-XXXX
export function generateOrderCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const seq = global.__BGN_ORDER_COUNTER__ || 1;
  global.__BGN_ORDER_COUNTER__ = seq + 1;

  const numStr = String(seq % 10000).padStart(4, '0');
  return `BGN-${dateStr}-${numStr}`;
}

// Generate A-XXX
export function generateKitchenQueueNumber(): string {
  const seq = global.__BGN_QUEUE_COUNTER__ || 1;
  global.__BGN_QUEUE_COUNTER__ = seq + 1;

  const numStr = String(seq % 1000).padStart(3, '0');
  return `A-${numStr}`;
}

// Calculate MDR & Net Revenue (QRIS standard 0.7%)
export function calculateMdrAndNet(grossAmount: number, paymentMethod: PaymentMethod = 'QRIS') {
  const mdrRate = 0.7; // 0.7% QRIS standard
  const mdrFee = Math.round(grossAmount * (mdrRate / 100));
  const netRevenue = grossAmount - mdrFee;

  return { mdrRate, mdrFee, netRevenue };
}

// Create a new order with WAITING_PAYMENT status
export function createOrderInMemory(params: {
  customer_name: string;
  customer_whatsapp: string;
  order_type: OrderType;
  campus_location: CampusLocation;
  location_notes: string;
  scheduled_time: string;
  payment_method: PaymentMethod;
  items: CartItem[];
  gross_amount: number;
  qr_string?: string;
  expiry_time: string;
}) {
  const orderId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'ord-' + Math.random().toString(36).substring(2, 9);
  const paymentId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'pay-' + Math.random().toString(36).substring(2, 9);
  const orderCode = generateOrderCode();

  // If order_type is READY, decrement stock for the selected campus
  if (params.order_type === 'READY') {
    const products = global.__BGN_PRODUCTS__;
    if (products) {
      params.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.product_id);
        if (prod) {
          if (params.campus_location === 'Kampus B Halimun') {
            prod.stock_halimun = Math.max(0, prod.stock_halimun - item.quantity);
          } else if (params.campus_location === 'Kampus C Minangkabau') {
            prod.stock_minangkabau = Math.max(0, prod.stock_minangkabau - item.quantity);
          } else if (params.campus_location === 'Kampus SB Daan Mogot') {
            prod.stock_daan_mogot = Math.max(0, prod.stock_daan_mogot - item.quantity);
          }
        }
      });
    }
  }

  const newOrder: Order = {
    id: orderId,
    order_code: orderCode,
    queue_number: null,
    customer_name: params.customer_name,
    customer_whatsapp: params.customer_whatsapp,
    order_type: params.order_type,
    campus_location: params.campus_location,
    location_notes: params.location_notes,
    scheduled_time: params.scheduled_time,
    gross_amount: params.gross_amount,
    order_status: 'WAITING_PAYMENT',
    payment_method: 'QRIS',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: params.items.map((item, index) => ({
      id: `item-${orderId}-${index + 1}`,
      order_id: orderId,
      product_id: item.product_id,
      product_name: item.name,
      unit_price: item.price,
      quantity: item.quantity,
      selected_options: item.selected_options,
      special_notes: item.special_notes,
      subtotal: item.price * item.quantity,
    })),
  };

  const { mdrRate, mdrFee, netRevenue } = calculateMdrAndNet(params.gross_amount, 'QRIS');

  const newPayment: Payment = {
    id: paymentId,
    order_id: orderId,
    gateway_reference_id: `GW-${orderCode}`,
    payment_method: 'QRIS',
    payment_status: 'PENDING',
    gross_amount: params.gross_amount,
    mdr_percentage: mdrRate,
    mdr_fee_amount: mdrFee,
    net_revenue: netRevenue,
    qr_string: params.qr_string || null,
    deeplink_url: null,
    expiry_time: params.expiry_time,
    paid_at: null,
    sheet_sync_status: false,
    sheet_row_number: null,
    created_at: new Date().toISOString(),
  };

  newOrder.payments = [newPayment];

  global.__BGN_ORDERS__?.push(newOrder);
  global.__BGN_PAYMENTS__?.push(newPayment);

  return { order: newOrder, payment: newPayment };
}

// Settle payment (PAID + generate queue number A-XXX + update payment)
export function settlePaymentInMemory(orderId: string, gatewayRef?: string) {
  const order = global.__BGN_ORDERS__?.find((o) => o.id === orderId || o.order_code === orderId);
  if (!order) return null;

  if (['PAID', 'COOKING', 'READY_FOR_DELIVERY', 'COMPLETED'].includes(order.order_status)) {
    return {
      order,
      alreadySettled: true,
      queueNumber: order.queue_number,
    };
  }

  const queueNumber = order.queue_number || generateKitchenQueueNumber();
  order.order_status = 'PAID';
  order.queue_number = queueNumber;
  order.updated_at = new Date().toISOString();

  const payment = global.__BGN_PAYMENTS__?.find((p) => p.order_id === order.id);
  if (payment) {
    payment.payment_status = 'SETTLEMENT';
    payment.paid_at = new Date().toISOString();
    if (gatewayRef) payment.gateway_reference_id = gatewayRef;
  }

  return {
    order,
    payment,
    alreadySettled: false,
    queueNumber,
  };
}

// Expire payment (EXPIRED + release stock if Ready)
export function expirePaymentInMemory(orderId: string) {
  const order = global.__BGN_ORDERS__?.find((o) => o.id === orderId || o.order_code === orderId);
  if (!order) return null;

  if (order.order_status === 'WAITING_PAYMENT') {
    order.order_status = 'EXPIRED';
    order.updated_at = new Date().toISOString();

    // Restore stock if it was a Ready order
    if (order.order_type === 'READY') {
      const products = global.__BGN_PRODUCTS__;
      if (products && order.items) {
        order.items.forEach((it) => {
          const prod = products.find((p) => p.id === it.product_id);
          if (prod) {
            if (order.campus_location === 'Kampus B Halimun') {
              prod.stock_halimun += it.quantity;
            } else if (order.campus_location === 'Kampus C Minangkabau') {
              prod.stock_minangkabau += it.quantity;
            } else if (order.campus_location === 'Kampus SB Daan Mogot') {
              prod.stock_daan_mogot += it.quantity;
            }
          }
        });
      }
    }

    const payment = global.__BGN_PAYMENTS__?.find((p) => p.order_id === order.id);
    if (payment && payment.payment_status === 'PENDING') {
      payment.payment_status = 'EXPIRE';
    }
    return { order, expired: true };
  }
  return { order, expired: false };
}

// Update order status: WAITING_PAYMENT -> COOKING -> COMPLETED
export function updateOrderStatusInMemory(orderId: string, newStatus: OrderStatus) {
  const order = global.__BGN_ORDERS__?.find((o) => o.id === orderId || o.order_code === orderId);
  if (!order) return null;

  order.order_status = newStatus;
  order.updated_at = new Date().toISOString();
  return order;
}
