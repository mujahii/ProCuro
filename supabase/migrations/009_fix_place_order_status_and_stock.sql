-- Fix place_order (4-param version):
--   1. bank_transfer orders now correctly get 'pending_payment' status
--   2. Atomic stock check-and-decrement raises exception on insufficient stock
CREATE OR REPLACE FUNCTION public.place_order(
  p_owner_id        uuid,
  p_total_amount    numeric,
  p_groups          jsonb,
  p_delivery_address jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order_id         uuid;
  v_split_id         uuid;
  v_group            jsonb;
  v_item             jsonb;
  v_supplier_user_id uuid;
  v_split_ids        uuid[] := '{}';
  v_payment_method   text;
  v_split_status     text;
  v_product_id       uuid;
  v_qty              integer;
BEGIN
  INSERT INTO orders (restaurant_owner_id, total_amount, delivery_address)
  VALUES (p_owner_id, p_total_amount, p_delivery_address)
  RETURNING id INTO v_order_id;

  FOR v_group IN SELECT * FROM jsonb_array_elements(p_groups) LOOP
    v_payment_method := v_group->>'payment_method';

    -- bank_transfer orders wait for payment verification; COD/cash goes straight to confirmation
    v_split_status := CASE
      WHEN v_payment_method = 'bank_transfer' THEN 'pending_payment'
      ELSE 'pending_confirmation'
    END;

    INSERT INTO order_splits (
      order_id, supplier_id, payment_method, receipt_url, subtotal, status,
      restaurant_owner_id, delivery_address
    ) VALUES (
      v_order_id,
      (v_group->>'supplier_id')::uuid,
      v_payment_method,
      NULLIF(v_group->>'receipt_url', ''),
      (v_group->>'subtotal')::numeric,
      v_split_status,
      p_owner_id,
      p_delivery_address
    )
    RETURNING id INTO v_split_id;

    v_split_ids := v_split_ids || v_split_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_group->'items') LOOP
      v_product_id := (v_item->>'product_id')::uuid;
      v_qty        := (v_item->>'quantity')::integer;

      -- Atomic check-and-decrement: fails if stock is insufficient
      UPDATE products
      SET stock_quantity = stock_quantity - v_qty,
          updated_at     = NOW()
      WHERE id = v_product_id
        AND stock_quantity >= v_qty;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient stock for product %', v_product_id;
      END IF;

      INSERT INTO order_items (order_split_id, product_id, quantity, price_at_time, unit_type)
      VALUES (
        v_split_id,
        v_product_id,
        v_qty,
        (v_item->>'price')::numeric,
        v_item->>'unit_type'
      );
    END LOOP;

    SELECT user_id INTO v_supplier_user_id
    FROM supplier_profiles WHERE id = (v_group->>'supplier_id')::uuid;

    IF v_supplier_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (
        v_supplier_user_id,
        'New Order Received',
        'You have a new order for €' || round((v_group->>'subtotal')::numeric, 2)::text || '. Review and confirm it.',
        'order_placed',
        false
      );
    END IF;
  END LOOP;

  INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (
    p_owner_id,
    'Order Placed Successfully',
    'Your order of €' || round(p_total_amount, 2)::text || ' has been placed with ' ||
      jsonb_array_length(p_groups)::text || ' supplier(s).',
    'order_placed',
    false
  );

  RETURN jsonb_build_object('order_id', v_order_id, 'split_ids', v_split_ids);
END;
$$;
