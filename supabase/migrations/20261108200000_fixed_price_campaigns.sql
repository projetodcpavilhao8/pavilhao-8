-- ============================================================================
-- Campanhas de PREÇO FECHADO (ex.: Black Friday "4 aulas por R$ 99,00").
--
-- create_booking_order ganha p_fixed_total_cents: quando informado e menor
-- que o subtotal, o pedido fecha exatamente nesse valor. Sem ele, segue o
-- desconto percentual de antes. discount_percent passa a ser gravado como o
-- percentual equivalente (só informativo) e campaign_id é gravado sempre que
-- houve desconto.
--
-- A assinatura antiga (6 parâmetros) é removida: manter as duas deixaria a
-- chamada com 6 parâmetros ambígua. Como o novo parâmetro tem DEFAULT NULL,
-- a versão da edge function "reserve" que ainda não conhece ele continua
-- funcionando até ser publicada de novo.
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_booking_order(uuid, jsonb, text, integer, integer, integer);

CREATE FUNCTION public.create_booking_order(
  p_user_id            uuid,
  p_items              jsonb,
  p_campaign_id        text,
  p_discount_percent   integer,
  p_ttl_minutes        integer,
  p_default_price      integer DEFAULT 2990,
  p_fixed_total_cents  integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_item       RECORD;
  v_capacity   INTEGER;
  v_price      INTEGER;
  v_taken      INTEGER;
  v_subtotal   INTEGER := 0;
  v_discount   INTEGER := 0;
  v_pct        INTEGER := 0;
  v_total      INTEGER;
  v_count      INTEGER;
  v_order_id   UUID;
  v_expires    TIMESTAMPTZ;
  v_class_name TEXT;
BEGIN
  v_count := jsonb_array_length(p_items);
  IF v_count IS NULL OR v_count = 0 THEN
    RAISE EXCEPTION 'EMPTY_ORDER';
  END IF;

  v_expires := now() + make_interval(mins => p_ttl_minutes);

  -- Locks em ordem determinística (class_id, class_date): dois pedidos que
  -- compartilham horários são serializados sem risco de deadlock.
  FOR v_item IN
    SELECT (it->>'class_id')::uuid AS class_id,
           (it->>'class_date')::date AS class_date
    FROM jsonb_array_elements(p_items) it
    ORDER BY 1, 2
  LOOP
    PERFORM pg_advisory_xact_lock(
      hashtextextended(v_item.class_id::text || '|' || COALESCE(v_item.class_date::text, ''), 0)
    );
  END LOOP;

  -- Valida disponibilidade de TODOS os itens e soma o subtotal
  FOR v_item IN
    SELECT (it->>'class_id')::uuid AS class_id,
           (it->>'class_date')::date AS class_date
    FROM jsonb_array_elements(p_items) it
  LOOP
    SELECT c.capacity, COALESCE(c.price, p_default_price), c.title
      INTO v_capacity, v_price, v_class_name
    FROM classes c WHERE c.id = v_item.class_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'CLASS_NOT_FOUND';
    END IF;

    IF v_capacity <= 0 THEN
      RAISE EXCEPTION 'CLASS_DISABLED:%', COALESCE(v_class_name, '');
    END IF;

    -- Dia fechado (feriado/evento): a suspensão bloqueia novas reservas.
    IF EXISTS (
      SELECT 1 FROM class_suspensions cs
      WHERE cs.class_id = v_item.class_id
        AND cs.suspended_date = v_item.class_date
    ) THEN
      RAISE EXCEPTION 'CLASS_SUSPENDED:% em %',
        COALESCE(v_class_name, 'Aula'),
        to_char(v_item.class_date, 'DD/MM');
    END IF;

    SELECT COUNT(*) INTO v_taken
    FROM reservations r
    WHERE r.class_id = v_item.class_id
      AND r.class_date = v_item.class_date
      AND (
        r.status = 'confirmed'
        OR (r.status = 'pending' AND r.expires_at IS NOT NULL AND r.expires_at > now())
      );

    IF v_taken >= v_capacity THEN
      RAISE EXCEPTION 'NO_SEATS:% em %',
        COALESCE(v_class_name, 'Aula'),
        to_char(v_item.class_date, 'DD/MM');
    END IF;

    v_subtotal := v_subtotal + v_price;
  END LOOP;

  -- Desconto em centavos, só aritmética inteira.
  IF p_fixed_total_cents IS NOT NULL THEN
    IF p_fixed_total_cents >= 0 AND p_fixed_total_cents < v_subtotal THEN
      v_discount := v_subtotal - p_fixed_total_cents;
    END IF;
  ELSIF p_discount_percent > 0 THEN
    v_discount := (v_subtotal * p_discount_percent) / 100; -- trunca
  END IF;
  v_total := v_subtotal - v_discount;

  IF v_discount > 0 THEN
    v_pct := round(v_discount * 100.0 / v_subtotal)::integer;
  END IF;

  INSERT INTO booking_orders (
    user_id, status, items_count, subtotal_cents, discount_percent,
    discount_cents, total_cents, campaign_id, campaign_applied_at, expires_at
  ) VALUES (
    p_user_id, 'pending', v_count, v_subtotal, v_pct,
    v_discount, v_total,
    CASE WHEN v_discount > 0 THEN p_campaign_id ELSE NULL END,
    CASE WHEN v_discount > 0 THEN now() ELSE NULL END,
    v_expires
  ) RETURNING id INTO v_order_id;

  INSERT INTO reservations (user_id, class_id, class_date, status, order_id, expires_at, combo_aplicado)
  SELECT p_user_id,
         (it->>'class_id')::uuid,
         (it->>'class_date')::date,
         'pending',
         v_order_id,
         v_expires,
         false
  FROM jsonb_array_elements(p_items) it;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'items_count', v_count,
    'subtotal_cents', v_subtotal,
    'discount_percent', v_pct,
    'discount_cents', v_discount,
    'total_cents', v_total,
    'expires_at', v_expires,
    'reservation_ids', (SELECT jsonb_agg(r.id ORDER BY r.created_at)
                        FROM reservations r WHERE r.order_id = v_order_id)
  );
END;
$function$;

-- Função nova nasce com EXECUTE para PUBLIC: revoga e libera só o service_role
-- (ver 20260809140000_lock_down_booking_order_rpcs.sql).
REVOKE ALL ON FUNCTION public.create_booking_order(uuid, jsonb, text, integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_order(uuid, jsonb, text, integer, integer, integer, integer) TO service_role;

-- Faz o PostgREST enxergar a nova assinatura imediatamente.
NOTIFY pgrst, 'reload schema';
