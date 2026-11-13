import {
  Order,
  Payment,
  OrderStatus,
  PaymentMethod,
  CartItem,
  Product,
  CampusLocation,
  OrderType,
  OperationalSettings,
} from '@/types';
import { INITIAL_PRODUCTS } from './products-data';

export const DEFAULT_SETTINGS: OperationalSettings = {
  holidays: [],
  activeTimeSlots: [
    '10:00 WIB',
    '11:00 WIB',
    '12:00 WIB',
    '12:30 WIB',
    '13:00 WIB',
    '13:30 WIB',
    '14:00 WIB',
    '14:30 WIB',
    '15:00 WIB',
  ],
  allowCash: true,
};

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
  // eslint-disable-next-line no-var
  var __BGN_SETTINGS__: OperationalSettings | undefined;
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
if (!global.__BGN_SETTINGS__) {
  global.__BGN_SETTINGS__ = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

export function getOperationalSettings(): OperationalSettings {
  return global.__BGN_SETTINGS__ || DEFAULT_SETTINGS;
}

export function updateOperationalSettings(updates: Partial<OperationalSettings>): OperationalSettings {
  const current = getOperationalSettings();
  const next: OperationalSettings = {
    holidays: updates.holidays ?? current.holidays,
    activeTimeSlots: updates.activeTimeSlots ?? current.activeTimeSlots,
    allowCash: updates.allowCash ?? current.allowCash,
  };
  global.__BGN_SETTINGS__ = next;
  return next;
}

export interface AvailableDateOption {
  dateString: string; // YYYY-MM-DD
  displayLabel: string; // "Senin, 16 Nov 2026"
  dayName: string; // "Senin"
}

// Generate available delivery dates (minimum H-1, Monday to Friday only, excluding holidays)
export function getAvailableDeliveryDates(count = 7): AvailableDateOption[] {
  const settings = getOperationalSettings();
  const holidays = settings.holidays || [];
  const results: AvailableDateOption[] = [];

  const cursor = new Date();
  // Minimal H-1: start from tomorrow
  cursor.setDate(cursor.getDate() + 1);

  while (results.length < count) {
    const dayOfWeek = cursor.getDay(); // 0 = Sunday, 6 = Saturday
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Available only Monday (1) to Friday (5), and not in holidays
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && !holidays.includes(dateStr)) {
      const displayLabel = cursor.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const dayName = cursor.toLocaleDateString('id-ID', { weekday: 'long' });

      results.push({
        dateString: dateStr,
        displayLabel,
        dayName,
      });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return results;
}

export function getProducts(): Product[] {
  return global.__BGN_PRODUCTS__ || INITIAL_PRODUCTS;
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

// Calculate MDR & Net Revenue (QRIS standard 0.7%, Cash 0%)
export function calculateMdrAndNet(grossAmount: number, paymentMethod: PaymentMethod = 'QRIS') {
  if (paymentMethod === 'CASH') {
    return { mdrRate: 0, mdrFee: 0, netRevenue: grossAmount };
  }
  const mdrRate = 0.7; // 0.7% QRIS standard
  const mdrFee = Math.round(grossAmount * (mdrRate / 100));
  const netRevenue = grossAmount - mdrFee;

  return { mdrRate, mdrFee, netRevenue };
}

// Create a new order (QRIS or CASH)
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
  redirect_url?: string;
  expiry_time: string;
}) {
  const orderId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'ord-' + Math.random().toString(36).substring(2, 9);
  const paymentId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'pay-' + Math.random().toString(36).substring(2, 9);
  const orderCode = generateOrderCode();

  const isCash = params.payment_method === 'CASH';
  const queueNumber = isCash ? generateKitchenQueueNumber() : null;

  const newOrder: Order = {
    id: orderId,
    order_code: orderCode,
    queue_number: queueNumber,
    customer_name: params.customer_name,
    customer_whatsapp: params.customer_whatsapp,
    order_type: params.order_type,
    campus_location: params.campus_location,
    location_notes: params.location_notes,
    scheduled_time: params.scheduled_time,
    gross_amount: params.gross_amount,
    // Cash orders are registered directly as PAID/CONFIRMED or waiting cash delivery
    order_status: isCash ? 'PAID' : 'WAITING_PAYMENT',
    payment_method: params.payment_method,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: params.items.map((item, index) => ({
      id: `item-${orderId}-${index + 1}`,
      order_id: orderId,
      product_id: item.product_id,
      product_name: item.name,
      unit_price: item.price,
      quantity: item.quantity,
      selected_options: item.selected_options || {},
      special_notes: item.special_notes,
      subtotal: item.price * item.quantity,
    })),
  };

  const { mdrRate, mdrFee, netRevenue } = calculateMdrAndNet(
    params.gross_amount,
    params.payment_method
  );

  const newPayment: Payment = {
    id: paymentId,
    order_id: orderId,
    gateway_reference_id: isCash ? `CASH-${orderCode}` : `GW-${orderCode}`,
    payment_method: params.payment_method,
    payment_status: isCash ? 'SETTLEMENT' : 'PENDING',
    gross_amount: params.gross_amount,
    mdr_percentage: mdrRate,
    mdr_fee_amount: mdrFee,
    net_revenue: netRevenue,
    qr_string: params.qr_string || null,
    deeplink_url: params.redirect_url || null,
    expiry_time: isCash ? null : params.expiry_time,
    paid_at: isCash ? new Date().toISOString() : null,
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

// Expire payment (EXPIRED)
export function expirePaymentInMemory(orderId: string) {
  const order = global.__BGN_ORDERS__?.find((o) => o.id === orderId || o.order_code === orderId);
  if (!order) return null;

  if (order.order_status === 'WAITING_PAYMENT') {
    order.order_status = 'EXPIRED';
    order.updated_at = new Date().toISOString();

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
