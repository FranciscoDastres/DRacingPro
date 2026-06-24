BEGIN;

-- Reusable predefined answers for the technical report ("informe técnico").
-- The technician can pick a preset from a selector instead of typing every
-- common item by hand, and any particular case written as free text can be
-- saved here so it becomes a reusable option later on.
CREATE TABLE service_report_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind service_report_item_kind NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  severity recommendation_severity,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT service_report_presets_usage_count_check CHECK (usage_count >= 0),
  -- severity only applies to recommendations, mirroring service_report_items.
  CONSTRAINT service_report_presets_severity_check
    CHECK (kind = 'recommendation' OR severity IS NULL)
);

-- One preset per (kind, title); lets the API upsert / dedupe by title.
CREATE UNIQUE INDEX service_report_presets_kind_title_key
  ON service_report_presets (kind, title);

-- The selector lists active presets filtered by kind.
CREATE INDEX service_report_presets_kind_active_idx
  ON service_report_presets (kind, is_active);

-- Seed a few common answers so the selector is useful out of the box.
INSERT INTO service_report_presets (kind, title, description, severity) VALUES
  ('performed', 'Cambio de aceite', 'Cambio de aceite de motor y filtro.', NULL),
  ('performed', 'Ajuste de cadena', 'Tensado y lubricación de cadena de transmisión.', NULL),
  ('performed', 'Revisión de frenos', 'Inspección y ajuste de frenos delantero y trasero.', NULL),
  ('performed', 'Cambio de bujía', 'Reemplazo de bujía y revisión de encendido.', NULL),
  ('pending', 'Cambio de neumático', 'Neumático con desgaste; se recomienda reemplazo próximo.', NULL),
  ('pending', 'Cambio de pastillas de freno', 'Pastillas de freno al límite; reemplazo pendiente.', NULL),
  ('recommendation', 'Próxima mantención', 'Agendar mantención preventiva según kilometraje.', 'info'),
  ('recommendation', 'Revisar suspensión', 'Revisar suspensión delantera en la próxima visita.', 'warning')
ON CONFLICT DO NOTHING;

COMMIT;
