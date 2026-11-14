// TypeScript Definitions for KEDAI BGN BERSATOE

export type OrderType = 'READY' | 'PO';

export type CampusLocation =
  | 'Kampus B Halimun'
  | 'Kampus C Minangkabau';

export type OrderStatus =
  | 'WAITING_PAYMENT'
  | 'PAID'
  | 'COOKING'
  | 'READY_FOR_DELIVERY'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED';

export type UserRole = 'ADMIN' | 'KITCHEN' | 'COURIER' | 'FINANCE';

export type PaymentStatus = 'PENDING' | 'SETTLEMENT' | 'EXPIRE' | 'FAILURE';

export type PaymentMethod = 'QRIS' | 'CASH';

export interface ProductVariantGroup {
  id: string;
  group_name: string;
  is_required: boolean;
  options: string[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: 'Makanan Utama & Camilan' | 'Dessert & Minuman';
  price: number;
  description: string;
  image_url: string;
  is_available: boolean;
  po_available: boolean;
  variants?: ProductVariantGroup[];
}

export interface CartItem {
  id: string; // unique cart line item id
  product_id: string;
  name: string;
  price: number;
  image_url: string;
  quantity: number;
  selected_options?: Record<string, string>;
  special_notes?: string;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  selected_options?: Record<string, string>;
  special_notes?: string;
  subtotal: number;
}

export interface Order {
  id: string;
  order_code: string;
  queue_number?: string | null;
  customer_name: string;
  customer_whatsapp: string;
  order_type: OrderType;
  fulfillment_type?: 'DELIVERY' | 'PICKUP';
  campus_location: CampusLocation;
  location_notes: string;
  order_notes?: string;
  scheduled_time: string;
  gross_amount: number;
  order_status: OrderStatus;
  payment_method: PaymentMethod;
  created_at: string;
  updated_at: string;
  delivery_proof_url?: string | null;
  items?: OrderItem[];
  payments?: Payment[];
}

export interface Payment {
  id: string;
  order_id: string;
  gateway_reference_id?: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  gross_amount: number;
  mdr_percentage: number;
  mdr_fee_amount: number;
  net_revenue: number;
  qr_string?: string | null;
  deeplink_url?: string | null;
  expiry_time?: string | null;
  paid_at?: string | null;
  sheet_sync_status?: boolean;
  sheet_row_number?: number | null;
  created_at: string;
}

export interface CheckoutPayload {
  customer_name: string;
  customer_whatsapp: string;
  order_type: OrderType;
  campus_location: CampusLocation;
  location_notes: string;
  order_notes?: string;
  scheduled_time: string;
  payment_method: PaymentMethod;
  items: {
    product_id: string;
    quantity: number;
    selected_options?: Record<string, string>;
    special_notes?: string;
  }[];
}

export interface CheckoutResponse {
  success: boolean;
  message?: string;
  order_id: string;
  order_code: string;
  gross_amount: number;
  payment_method: PaymentMethod;
  redirect_url?: string;
  snap_token?: string;
  qr_string?: string;
  qr_data_url?: string;
  expiry_time?: string;
}

export interface OperationalSettings {
  holidays: string[]; // YYYY-MM-DD
  activeTimeSlots: string[]; // ['10:00 WIB', '11:00 WIB', ...]
  allowCash: boolean;
}

export interface GoogleSheetSyncRow {
  transaction_id: string; // 1. ID Transaksi (BGN-YYYYMMDD-XXXX)
  timestamp_wib: string; // 2. Waktu (WIB)
  customer_name: string; // 3. Kontak (Nama)
  contact: string; // 4. Kontak (628xxx)
  items_summary: string; // 5. Item Menu
  gross_amount_formatted: string; // 6. Total Tagihan (Rp...)
  payment_method: string; // 7. Metode Pembayaran
  mdr_fee_formatted: string; // 8. Biaya Transaksi/MDR (Rp...)
  net_revenue_formatted: string; // 9. Pendapatan Bersih (Rp...)
  order_status: string; // 10. Status Pesanan
}
