-- ==============================================================================
-- KEDAI BGN BERSATOE (Berasa Gurih & Nikmat) - DATABASE DDL & ACID TRANSACTIONS
-- Target: Supabase PostgreSQL (Supports Supabase Realtime)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'KITCHEN', 'COURIER', 'FINANCE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status_type AS ENUM (
        'WAITING_PAYMENT',
        'PAID',
        'COOKING',
        'READY_FOR_DELIVERY',
        'COMPLETED',
        'EXPIRED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_type AS ENUM (
        'PENDING',
        'SETTLEMENT',
        'EXPIRE',
        'FAILURE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. SEQUENCES FOR ORDER CODE AND QUEUE NUMBER
CREATE SEQUENCE IF NOT EXISTS bgn_order_seq START 1;
CREATE SEQUENCE IF NOT EXISTS bgn_queue_seq START 1;

-- 4. TABLE: USERS (Staff & Role-Based Access Control)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'KITCHEN',
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLE: PRODUCTS
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'Makanan Utama & Camilan', 'Dessert & Minuman'
    price INT NOT NULL CHECK (price >= 0),
    description TEXT,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLE: PRODUCT VARIANTS (Customization Options)
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    group_name VARCHAR(100) NOT NULL, -- 'Level Pedas', 'Opsi Penyajian', etc.
    is_required BOOLEAN DEFAULT TRUE,
    options JSONB NOT NULL, -- Array of string options
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLE: ORDERS
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code VARCHAR(30) UNIQUE NOT NULL, -- Format: BGN-YYYYMMDD-XXXX
    queue_number VARCHAR(10), -- Format: A-XXX (diterbitkan saat pembayaran lunas)
    customer_name VARCHAR(100) NOT NULL,
    customer_whatsapp VARCHAR(20) NOT NULL,
    fulfillment_type VARCHAR(20) NOT NULL CHECK (fulfillment_type IN ('DELIVERY', 'PICKUP')),
    campus_location VARCHAR(100), -- Gedung Universitas Telkom Jakarta
    location_notes TEXT, -- Detail patokan ruangan/lantai
    scheduled_time VARCHAR(50) NOT NULL, -- 'NOW' atau slot jam istirahat
    gross_amount INT NOT NULL CHECK (gross_amount >= 0),
    order_status order_status_type NOT NULL DEFAULT 'WAITING_PAYMENT',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLE: ORDER ITEMS (Snapshot item, harga, dan kustomisasi)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(100) NOT NULL,
    unit_price INT NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    selected_options JSONB NOT NULL DEFAULT '{}'::jsonb,
    special_notes VARCHAR(100),
    subtotal INT NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABLE: PAYMENTS (Payment Gateway Logs, MDR, Net Revenue, Sheet Sync)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    gateway_reference_id VARCHAR(100) UNIQUE,
    payment_method VARCHAR(50) NOT NULL, -- 'QRIS', 'GOPAY', 'SHOPEEPAY', 'OVO', 'DANA', 'VA_BCA'
    payment_status payment_status_type NOT NULL DEFAULT 'PENDING',
    gross_amount INT NOT NULL CHECK (gross_amount >= 0),
    mdr_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    mdr_fee_amount INT NOT NULL DEFAULT 0,
    net_revenue INT NOT NULL DEFAULT 0,
    qr_string TEXT,
    deeplink_url TEXT,
    expiry_time TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    sheet_sync_status BOOLEAN DEFAULT FALSE,
    sheet_row_number INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_ref ON payments(gateway_reference_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 11. HELPER FUNCTION: GENERATE ORDER CODE (BGN-YYYYMMDD-XXXX)
CREATE OR REPLACE FUNCTION generate_bgn_order_code()
RETURNS TEXT AS $$
DECLARE
    today_str TEXT;
    seq_num INT;
    result_code TEXT;
BEGIN
    today_str := to_char(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD');
    seq_num := nextval('bgn_order_seq');
    result_code := 'BGN-' || today_str || '-' || lpad((seq_num % 10000)::text, 4, '0');
    RETURN result_code;
END;
$$ LANGUAGE plpgsql;

-- 12. HELPER FUNCTION: GENERATE QUEUE NUMBER (A-XXX)
CREATE OR REPLACE FUNCTION generate_kitchen_queue_number()
RETURNS TEXT AS $$
DECLARE
    seq_num INT;
    result_queue TEXT;
BEGIN
    seq_num := nextval('bgn_queue_seq');
    result_queue := 'A-' || lpad((seq_num % 1000)::text, 3, '0');
    RETURN result_queue;
END;
$$ LANGUAGE plpgsql;

-- 13. ACID FUNCTION: PROCESS PAYMENT SETTLEMENT
CREATE OR REPLACE FUNCTION process_payment_settlement(
    p_order_id UUID,
    p_gateway_ref VARCHAR(100),
    p_payment_method VARCHAR(50)
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_payment RECORD;
    v_mdr_rate DECIMAL(5,2);
    v_mdr_fee INT;
    v_net_rev INT;
    v_new_queue TEXT;
BEGIN
    -- Select order with lock
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    -- Idempotency check: jika sudah PAID / SETTLEMENT, lewati
    IF v_order.order_status = 'PAID' OR v_order.order_status = 'COOKING' 
       OR v_order.order_status = 'READY_FOR_DELIVERY' OR v_order.order_status = 'COMPLETED' THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Order already settled',
            'order_code', v_order.order_code,
            'queue_number', v_order.queue_number
        );
    END IF;

    -- Tentukan persentase MDR
    IF p_payment_method = 'QRIS' THEN
        v_mdr_rate := 0.70;
    ELSIF p_payment_method IN ('GOPAY', 'SHOPEEPAY', 'OVO', 'DANA') THEN
        v_mdr_rate := 1.70;
    ELSE
        v_mdr_rate := 0.00;
    END IF;

    -- Hitung potongan MDR dan pendapatan bersih
    v_mdr_fee := ROUND(v_order.gross_amount * (v_mdr_rate / 100.0));
    v_net_rev := v_order.gross_amount - v_mdr_fee;

    -- Terbitkan nomor antrean dapur A-XXX
    v_new_queue := generate_kitchen_queue_number();

    -- Update Orders
    UPDATE orders
    SET order_status = 'PAID',
        queue_number = v_new_queue,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Update or Insert Payments
    UPDATE payments
    SET payment_status = 'SETTLEMENT',
        gateway_reference_id = COALESCE(p_gateway_ref, gateway_reference_id),
        mdr_percentage = v_mdr_rate,
        mdr_fee_amount = v_mdr_fee,
        net_revenue = v_net_rev,
        paid_at = NOW(),
        updated_at = NOW()
    WHERE order_id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_code', v_order.order_code,
        'queue_number', v_new_queue,
        'gross_amount', v_order.gross_amount,
        'mdr_fee', v_mdr_fee,
        'net_revenue', v_net_rev
    );
END;
$$ LANGUAGE plpgsql;

/* 14. SEED INITIAL DATA: PRODUCTS & VARIANTS */
INSERT INTO products (name, slug, category, price, description, image_url, is_available) VALUES
('Nasi Katsu Mentai', 'nasi-katsu-mentai', 'Makanan Utama & Camilan', 15000, 'Ayam katsu renyah dengan siraman saus mentai creamy gurih yang di-torch wangi, nori flakes, dan tobiko.', '/images/nasi_katsu_mentai.jpg', true),
('Pangsit Chili Oil', 'pangsit-chili-oil', 'Makanan Utama & Camilan', 12000, 'Pangsit rebus lembut gurih dengan lumuran chili oil aromatik, garlic bits renyah, dan taburan wijen harum.', '/images/pangsit_chili_oil.jpg', true),
('Jus Buah', 'jus-buah', 'Dessert & Minuman', 13000, 'Jus dari buah tropis segar pilihan tanpa pemanis buatan, disajikan dingin menyegarkan penambah energi.', '/images/jus_buah_murni.jpg', true),
('Mango bread soup', 'mango-bread-soup', 'Dessert & Minuman', 12000, 'Lapisan roti tawar lembut berpadu vla mangga creamy susu kental manis dengan limpahan keju cheddar parut melimpah.', '/images/stup_roti_mangga.jpg', true)
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, image_url = EXCLUDED.image_url;

/* SEED VARIANTS */
DO $$
DECLARE
    v_mentai UUID;
    v_pangsit UUID;
    v_jus UUID;
    v_mango UUID;
BEGIN
    SELECT id INTO v_mentai FROM products WHERE slug = 'nasi-katsu-mentai';
    SELECT id INTO v_pangsit FROM products WHERE slug = 'pangsit-chili-oil';
    SELECT id INTO v_jus FROM products WHERE slug = 'jus-buah';
    SELECT id INTO v_mango FROM products WHERE slug = 'mango-bread-soup';

    /* Katsu Mentai Variants */
    DELETE FROM product_variants WHERE product_id = v_mentai;
    INSERT INTO product_variants (product_id, group_name, is_required, options) VALUES
    (v_mentai, 'Torch Burn', false, '["Standar", "Ekstra Burn"]'::jsonb),
    (v_mentai, 'Tambah Chili Flakes', false, '["Ya", "Tidak"]'::jsonb);

    /* Pangsit Variants */
    DELETE FROM product_variants WHERE product_id = v_pangsit;
    INSERT INTO product_variants (product_id, group_name, is_required, options) VALUES
    (v_pangsit, 'Level Pedas', true, '["Level 1 Normal", "Level 2 Sedang", "Level 3 Ekstra Pedas"]'::jsonb),
    (v_pangsit, 'Opsi Penyajian', true, '["Kuah", "Kering"]'::jsonb);

    /* Jus Buah Variants */
    DELETE FROM product_variants WHERE product_id = v_jus;
    INSERT INTO product_variants (product_id, group_name, is_required, options) VALUES
    (v_jus, 'Varian Buah', true, '["Mangga", "Jambu", "Alpukat", "Naga"]'::jsonb),
    (v_jus, 'Takaran Gula', true, '["Normal Sugar", "Less Sugar", "No Sugar"]'::jsonb),
    (v_jus, 'Takaran Es', true, '["Normal Ice", "Less Ice"]'::jsonb);

    /* Mango bread soup Variants */
    DELETE FROM product_variants WHERE product_id = v_mango;
    INSERT INTO product_variants (product_id, group_name, is_required, options) VALUES
    (v_mango, 'Penyajian', false, '["Dingin", "Suhu Ruang"]'::jsonb);
END $$;

-- SEED STAFF ACCOUNTS
INSERT INTO users (email, full_name, role, phone_number) VALUES
('admin@kedai-bgn.com', 'Dina Pengelola', 'ADMIN', '6281234567890'),
('dapur@kedai-bgn.com', 'Bima Head Chef', 'KITCHEN', '6281234567891'),
('kurir@kedai-bgn.com', 'Reza Delivery Telkom', 'COURIER', '6281234567892'),
('keuangan@kedai-bgn.com', 'Siti Bendahara BGN', 'FINANCE', '6281234567893')
ON CONFLICT (email) DO NOTHING;

-- 15. ENABLE SUPABASE REALTIME REPLICATION FOR ORDERS TABLE
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
